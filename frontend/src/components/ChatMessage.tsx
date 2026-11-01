import { motion } from 'framer-motion'
import { RotateCw, TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type Role = 'shopper' | 'agent'

export type Message = {
  id: string
  role: Role
  text: string
}

// Shared entry animation: each new bubble fades and slides up slightly.
// MotionConfig in App turns this off for people who prefer reduced motion.
const enter = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: 'easeOut' },
} as const

type ChatMessageProps = {
  message: Message
}

/** One chat bubble: shopper on the right (brand green), agent on the left (linen). */
export function ChatMessage({ message }: ChatMessageProps) {
  const isShopper = message.role === 'shopper'

  return (
    <motion.li {...enter} className={cn('flex', isShopper ? 'justify-end' : 'justify-start')}>
      {/* Screen readers don't see bubble colours, so say who's speaking */}
      <span className="sr-only">{isShopper ? 'You said:' : 'Assistant said:'}</span>
      <p
        className={cn(
          // pre-wrap keeps line breaks from the AI; break-words stops long links overflowing
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-[0.95rem] leading-relaxed break-words whitespace-pre-wrap',
          isShopper
            ? 'rounded-br-md bg-primary text-primary-foreground'
            : 'rounded-bl-md bg-secondary text-secondary-foreground',
        )}
      >
        {message.text}
      </p>
    </motion.li>
  )
}

/** Three bouncing dots in an agent-style bubble while we wait for a reply. */
export function TypingIndicator() {
  return (
    <motion.li {...enter} className="flex justify-start">
      <span className="sr-only">The assistant is typing…</span>
      <div
        aria-hidden="true"
        className="flex gap-1 rounded-2xl rounded-bl-md bg-secondary px-4 py-3.5"
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-2 rounded-full bg-muted-foreground/60"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </motion.li>
  )
}

type ErrorBubbleProps = {
  message: string
  onRetry: () => void
}

/** Shown in place of the agent's reply when a request fails. Retry resends the same message. */
export function ErrorBubble({ message, onRetry }: ErrorBubbleProps) {
  return (
    <motion.li {...enter} className="flex justify-start">
      <div
        role="alert"
        className="flex max-w-[85%] flex-col items-start gap-2 rounded-2xl rounded-bl-md border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm"
      >
        <p className="flex items-start gap-2 text-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          {message}
        </p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RotateCw aria-hidden="true" />
          Retry
        </Button>
      </div>
    </motion.li>
  )
}
