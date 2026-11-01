import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Handshake, SendHorizontal } from 'lucide-react'

import { ChatMessage, ErrorBubble, TypingIndicator, type Message } from '@/components/ChatMessage'
import { PayButton } from '@/components/PayButton'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { negotiate, type Checkout, type NegotiateResponse } from '@/lib/api'
import { cn } from '@/lib/utils'

// Must match max_length on ChatRequest.message in backend/app/main.py
const MAX_LENGTH = 500
// Only show the character counter once the shopper gets close to the limit
const COUNTER_FROM = 400

type NegotiationChatProps = {
  sessionId: string
  productName: string
  /** Set once the shopper accepts; the input is swapped for the pay button. */
  checkout: Checkout | null
  /** Hands each response to App, which owns the offer and checkout. */
  onResponse: (response: NegotiateResponse) => void
}

/** A failed send: what went wrong, and the text to resend when the shopper hits Retry. */
type FailedSend = {
  error: string
  text: string
}

export function NegotiationChat({
  sessionId,
  productName,
  checkout,
  onResponse,
}: NegotiationChatProps) {
  // The greeting is written by the frontend; every later agent message comes from the backend.
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'greeting',
      role: 'agent',
      text: `Hi! I'm the shop's assistant. Ask me anything about the ${productName}, or make me an offer.`,
    },
  ])
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [failed, setFailed] = useState<FailedSend | null>(null)
  // Latest agent reply, read aloud by screen readers through the aria-live region below
  const [announcement, setAnnouncement] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasSent = useRef(false) // a ref, not state: changing it shouldn't re-render

  // Keep the newest message in view. We scroll the chat box itself (not the page),
  // so on phones the page doesn't jump around while you read the product.
  useEffect(() => {
    const box = scrollRef.current
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' })
  }, [messages, isSending, failed])

  // The input is disabled while sending, which drops keyboard focus. Put it back once the
  // reply arrives. Skipped on first load so phones don't pop the keyboard up uninvited.
  useEffect(() => {
    if (!isSending && hasSent.current) inputRef.current?.focus({ preventScroll: true })
  }, [isSending])

  /** Sends text to the agent. The shopper's bubble must already be on screen. */
  async function send(text: string) {
    hasSent.current = true
    setIsSending(true)
    setFailed(null)
    try {
      const response = await negotiate(sessionId, text)
      onResponse(response)
      if (response.reply.trim()) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: 'agent', text: response.reply },
        ])
        setAnnouncement(response.reply)
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong. Please try again.'
      setFailed({ error: message, text })
    } finally {
      setIsSending(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault() // stop the browser from reloading the page
    const text = draft.trim()
    if (!text || isSending) return

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'shopper', text }])
    setDraft('')
    void send(text)
  }

  function retry() {
    // The shopper's bubble is still on screen, so just resend the same text
    if (failed) void send(failed.text)
  }

  return (
    <Card className="h-[min(42rem,calc(100svh-6rem))] min-h-[28rem] gap-0 rounded-3xl py-0 shadow-soft ring-border">
      <header className="flex items-center gap-3 border-b px-5 py-4">
        <span className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Handshake className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-semibold leading-tight">Sales assistant</h2>
          <p className="text-sm text-muted-foreground">
            Make an offer. It usually replies in seconds.
          </p>
        </div>
      </header>

      {/* tabIndex makes the scrollable area reachable by keyboard (arrow keys to scroll) */}
      <div ref={scrollRef} tabIndex={0} className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
        <ol aria-label="Conversation" className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isSending && <TypingIndicator key="typing" />}
            {failed && !isSending && (
              <ErrorBubble key="error" message={failed.error} onRetry={retry} />
            )}
          </AnimatePresence>
        </ol>
      </div>

      {/* Visually hidden; screen readers announce each new agent reply */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {checkout ? (
        <PayButton checkout={checkout} productName={productName} />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 border-t p-4">
          <label htmlFor="chat-input" className="sr-only">
            Message the sales assistant
          </label>
          <div className="flex gap-2">
            {/* An <input> inside a <form> sends on Enter by default, so no key handler needed */}
            <Input
              ref={inputRef}
              id="chat-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={MAX_LENGTH}
              disabled={isSending}
              placeholder={isSending ? 'Waiting for a reply…' : 'e.g. Would you take $100?'}
              autoComplete="off"
              aria-describedby="chat-counter"
              className="h-11 rounded-xl bg-background px-4 disabled:bg-muted"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isSending || !draft.trim()}
              aria-label="Send message"
              className="size-11 shrink-0 rounded-xl"
            >
              <SendHorizontal aria-hidden="true" />
            </Button>
          </div>
          <p
            id="chat-counter"
            className={cn(
              'text-right text-xs tabular-nums text-muted-foreground',
              draft.length < COUNTER_FROM && 'sr-only',
            )}
          >
            {draft.length}/{MAX_LENGTH} characters
          </p>
        </form>
      )}
    </Card>
  )
}
