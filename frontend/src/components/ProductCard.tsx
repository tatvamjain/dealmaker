import { MessageCircle, Shirt } from 'lucide-react'

import { OfferBadge } from '@/components/OfferBadge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Offer, Product } from '@/lib/api'

type ProductCardProps = {
  product: Product
  offer: Offer | null
  dealAgreed: boolean
}

export function ProductCard({ product, offer, dealAgreed }: ProductCardProps) {
  // Only show an offer for this product, and only if it's actually below list price.
  // Comparing the strings is safe: the backend always formats prices as "120.00".
  const discounted =
    offer && offer.product_id === product.id && offer.price !== product.list_price ? offer : null

  return (
    <Card className="gap-0 rounded-3xl py-0 shadow-soft ring-border">
      <ProductImage />

      <div className="flex flex-col gap-4 p-6 sm:p-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{product.name}</h2>
          <p className="text-base leading-relaxed text-muted-foreground">{product.description}</p>
        </div>

        {/* Prices stay the backend's strings: we only add the "$" for display */}
        {discounted ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <s className="text-lg font-medium text-muted-foreground tabular-nums">
              <span className="sr-only">List price was </span>${product.list_price}
            </s>
            <OfferBadge price={discounted.price} agreed={dealAgreed} />
          </div>
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-muted-foreground">List price</span>
            <span className="text-2xl font-bold tabular-nums">${product.list_price}</span>
          </div>
        )}

        {!dealAgreed && (
          <p className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">
            <MessageCircle className="size-4 shrink-0 text-primary" aria-hidden="true" />
            Think the price is too high? Make an offer in the chat.
          </p>
        )}
      </div>
    </Card>
  )
}

/** Placeholder until we have real product photos. Decorative, so hidden from screen readers. */
function ProductImage() {
  return (
    <div
      aria-hidden="true"
      className="relative flex aspect-[4/3] items-center justify-center bg-[radial-gradient(circle_at_30%_20%,var(--offer-soft),var(--secondary)_60%)]"
    >
      <Shirt className="size-24 text-primary/70" strokeWidth={1.25} />
    </div>
  )
}

/** Same shape as ProductCard, shown while products load so the layout doesn't jump. */
export function ProductCardSkeleton() {
  return (
    <Card className="gap-0 rounded-3xl py-0 shadow-soft ring-border" aria-hidden="true">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="flex flex-col gap-4 p-6 sm:p-8">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-8 w-1/3" />
      </div>
    </Card>
  )
}
