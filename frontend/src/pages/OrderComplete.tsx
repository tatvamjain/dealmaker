import { useEffect, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Clock, LoaderCircle, RotateCw, TriangleAlert } from 'lucide-react'

import { DealTick } from '@/components/DealTick'
import { SiteHeader } from '@/components/SiteHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ApiError, confirmOrder, type OrderConfirmation } from '@/lib/api'

type ConfirmState =
  | { status: 'confirming' }
  | { status: 'error'; message: string }
  | { status: 'done'; order: OrderConfirmation }

/**
 * PayPal sends the shopper here after they approve the payment, as
 * /order-complete?token=<order id>. The money only moves once we "capture" the order,
 * so this page asks the backend to do that and then shows the result.
 */
export function OrderComplete() {
  // PayPal calls the order id "token" in the return URL. Read once on first render.
  const [orderId] = useState(() => new URLSearchParams(window.location.search).get('token'))
  const [state, setState] = useState<ConfirmState>(() =>
    orderId
      ? { status: 'confirming' }
      : { status: 'error', message: "We couldn't find an order to confirm in this link." },
  )
  const [attempt, setAttempt] = useState(0) // bump to retry

  useEffect(() => {
    if (!orderId) return
    const controller = new AbortController()

    confirmOrder(orderId, controller.signal)
      .then((order) => setState({ status: 'done', order }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setState({ status: 'error', message: friendlyError(error) })
      })

    return () => controller.abort()
  }, [orderId, attempt])

  // Tab title matches what the page is showing
  const title =
    state.status === 'confirming'
      ? 'Confirming payment'
      : state.status === 'error'
        ? 'Payment problem'
        : state.order.status === 'COMPLETED'
          ? 'Thank you!'
          : 'Payment processing'
  useEffect(() => {
    document.title = `${title} · Dealmaker`
  }, [title])

  function retry() {
    setState({ status: 'confirming' })
    setAttempt((n) => n + 1)
  }

  return (
    <div className="min-h-svh">
      <SiteHeader />
      <main className="mx-auto flex max-w-xl flex-col px-4 pt-4 pb-10 sm:px-6 sm:pt-10">
        {state.status === 'confirming' && (
          <ResultCard
            role="status"
            icon={<LoaderCircle className="size-10 animate-spin text-primary" aria-hidden="true" />}
            title="Confirming your payment…"
            body="This only takes a moment. Please don't close this page."
          />
        )}

        {state.status === 'error' && (
          <ResultCard
            role="alert"
            icon={<TriangleAlert className="size-10 text-destructive" aria-hidden="true" />}
            title="We couldn't confirm your payment"
            body={state.message}
            actions={
              <>
                {orderId && (
                  <Button onClick={retry}>
                    <RotateCw aria-hidden="true" />
                    Try again
                  </Button>
                )}
                <Button asChild variant="outline">
                  <a href="/">Back to the shop</a>
                </Button>
              </>
            }
          />
        )}

        {state.status === 'done' &&
          (state.order.status === 'COMPLETED' ? (
            <Receipt order={state.order} />
          ) : (
            // PayPal sometimes holds a payment for review (status PENDING etc.)
            <ResultCard
              icon={<Clock className="size-10 text-offer" aria-hidden="true" />}
              title="Your payment is being processed"
              body="PayPal is still reviewing this payment. You'll get an email from PayPal once it goes through."
              footer={<OrderNumber id={state.order.order_id} />}
              actions={
                <Button asChild variant="outline">
                  <a href="/">Back to the shop</a>
                </Button>
              }
            />
          ))}
      </main>
    </div>
  )
}

function Receipt({ order }: { order: OrderConfirmation }) {
  return (
    <ResultCard
      icon={<DealTick />}
      title="Thank you for your order!"
      body={
        order.amount ? (
          <>
            We've received your payment of{' '}
            <span className="font-semibold text-foreground tabular-nums">
              ${order.amount}
              {order.currency && order.currency !== 'USD' ? ` ${order.currency}` : ''}
            </span>
            . PayPal will email you a receipt.
          </>
        ) : (
          "We've received your payment. PayPal will email you a receipt."
        )
      }
      footer={<OrderNumber id={order.order_id} />}
      actions={
        <Button asChild size="lg" className="rounded-xl">
          <a href="/">Back to the shop</a>
        </Button>
      }
    />
  )
}

function OrderNumber({ id }: { id: string }) {
  return (
    <p className="text-sm text-muted-foreground">
      Order number <span className="font-mono font-medium text-foreground">{id}</span>
    </p>
  )
}

type ResultCardProps = {
  role?: 'status' | 'alert'
  icon: ReactNode
  title: string
  body: ReactNode
  footer?: ReactNode
  actions?: ReactNode
}

function ResultCard({ role, icon, title, body, footer, actions }: ResultCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <Card
        role={role}
        className="flex flex-col items-center gap-4 rounded-3xl px-6 py-10 text-center shadow-soft ring-border sm:px-10"
      >
        {icon}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="max-w-sm leading-relaxed text-muted-foreground">{body}</p>
        {footer}
        {actions && <div className="mt-2 flex flex-wrap justify-center gap-3">{actions}</div>}
      </Card>
    </motion.div>
  )
}

function friendlyError(error: unknown): string {
  // 502 = PayPal refused the capture (e.g. the payment wasn't approved, or this link is old)
  if (error instanceof ApiError && error.status === 502) {
    return "PayPal didn't confirm this payment. If you've just paid, try again in a moment. Otherwise, head back to the shop and make a new deal."
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}
