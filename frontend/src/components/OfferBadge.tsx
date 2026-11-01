import { motion } from 'framer-motion'
import { BadgeCheck, Tag } from 'lucide-react'

import { cn } from '@/lib/utils'

type OfferBadgeProps = {
  price: string
  /** true once the shopper accepted and a checkout exists */
  agreed: boolean
}

/** The negotiated price, highlighted in amber (or green once the deal is agreed). */
export function OfferBadge({ price, agreed }: OfferBadgeProps) {
  return (
    // key={price}: React treats a new price as a new element, so the pop animation replays
    // every time the agent moves the offer.
    <motion.span
      key={`${price}-${agreed}`}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5',
        agreed ? 'bg-accent text-accent-foreground' : 'bg-offer-soft text-offer',
      )}
    >
      {agreed ? (
        <BadgeCheck className="size-4" aria-hidden="true" />
      ) : (
        <Tag className="size-4" aria-hidden="true" />
      )}
      <span className="text-sm font-semibold">{agreed ? 'Your deal' : 'Offer'}</span>
      <span className="text-2xl font-bold tabular-nums">${price}</span>
    </motion.span>
  )
}
