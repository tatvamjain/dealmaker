import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Lock } from 'lucide-react'

import { DealTick } from '@/components/DealTick'
import { Button } from '@/components/ui/button'
import type { Checkout } from '@/lib/api'

type PayButtonProps = {
  checkout: Checkout
  productName: string
}

/**
 * Replaces the chat input once a deal is agreed.
 * The link is checkout.approve_url from the backend, never a URL taken from the AI's text,
 * so the AI can't send the shopper somewhere else by writing a different link.
 */
export function PayButton({ checkout, productName }: PayButtonProps) {
  const linkRef = useRef<HTMLAnchorElement>(null)

  // The input the shopper was typing in just disappeared, so move keyboard focus here
  useEffect(() => {
    linkRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="relative flex flex-col items-center gap-3 border-t bg-accent/40 px-4 py-5 text-center"
    >
      <DealTick />

      <div>
        <p className="font-bold">It's a deal!</p>
        <p className="text-sm text-muted-foreground">
          {productName} for <span className="font-semibold text-foreground">${checkout.price}</span>
        </p>
      </div>

      {/* asChild: render shadcn's Button styles on our <a>, because navigating is a link's job */}
      <Button
        asChild
        size="lg"
        className="h-12 w-full max-w-sm rounded-xl bg-[#FFC439] text-base font-bold text-[#111] shadow-soft hover:bg-[#F2B830] focus-visible:ring-foreground"
      >
        <a ref={linkRef} href={checkout.approve_url} target="_blank" rel="noopener noreferrer">
          Pay ${checkout.price} with PayPal
          <ExternalLink aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </Button>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3" aria-hidden="true" />
        You'll finish paying on PayPal's secure page.
      </p>
    </motion.div>
  )
}
