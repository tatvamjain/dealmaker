import { useEffect, useState, type ReactNode } from 'react'
import { PackageOpen, RotateCw, TriangleAlert } from 'lucide-react'

import { NegotiationChat } from '@/components/NegotiationChat'
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard'
import { SiteHeader } from '@/components/SiteHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  getProducts,
  type Checkout,
  type NegotiateResponse,
  type Offer,
  type Product,
} from '@/lib/api'

// One value describing where the product fetch is up to. A union like this makes
// impossible combinations (e.g. "loading" AND "error") impossible to write.
type ProductsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; products: Product[] }

function App() {
  // One ID per page load: the backend keys the conversation (history + current offer) on it.
  // Passing a function means randomUUID runs once, not on every re-render. Reloading the
  // page starts a fresh negotiation.
  const [sessionId] = useState(() => crypto.randomUUID())
  const [productsState, setProductsState] = useState<ProductsState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0) // bump to re-run the fetch (Retry button)
  // Lives here (not in the chat) because both columns need it: the product card shows the
  // offer, and the chat swaps its input for the pay button once checkout exists.
  const [offer, setOffer] = useState<Offer | null>(null)
  const [checkout, setCheckout] = useState<Checkout | null>(null)

  useEffect(() => {
    // AbortController cancels the request if the component unmounts (or React's
    // StrictMode runs the effect twice in development), so we never set stale state.
    const controller = new AbortController()

    getProducts(controller.signal)
      .then((products) => setProductsState({ status: 'ready', products }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        const message = error instanceof Error ? error.message : 'Could not load products.'
        setProductsState({ status: 'error', message })
      })

    return () => controller.abort()
  }, [reloadKey])

  // The backend sends the full current state with every reply, so we just copy it
  function handleResponse(response: NegotiateResponse) {
    setOffer(response.current_offer)
    setCheckout(response.checkout)
  }

  function retry() {
    setProductsState({ status: 'loading' })
    setReloadKey((key) => key + 1)
  }

  return (
    <div className="min-h-svh">
      <SiteHeader />
      <h1 className="sr-only">Dealmaker: make an offer and pay with PayPal</h1>

      {/* Phones: one column (product, then chat). Large screens: side by side. */}
      <main className="mx-auto grid max-w-6xl gap-6 px-4 pb-10 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10">
        <section aria-label="Product">
          <ProductSection
            state={productsState}
            offer={offer}
            dealAgreed={checkout !== null}
            onRetry={retry}
          />
        </section>

        <section aria-label="Negotiation chat">
          {/* The chat needs the product's name, so it waits until the product has loaded */}
          {productsState.status === 'ready' && productsState.products[0] ? (
            <NegotiationChat
              sessionId={sessionId}
              productName={productsState.products[0].name}
              checkout={checkout}
              onResponse={handleResponse}
            />
          ) : (
            <ChatPlaceholder />
          )}
        </section>
      </main>
    </div>
  )
}

type ProductSectionProps = {
  state: ProductsState
  offer: Offer | null
  dealAgreed: boolean
  onRetry: () => void
}

function ProductSection({ state, offer, dealAgreed, onRetry }: ProductSectionProps) {
  if (state.status === 'loading') {
    return (
      <>
        <span className="sr-only" role="status">
          Loading product…
        </span>
        <ProductCardSkeleton />
      </>
    )
  }

  if (state.status === 'error') {
    return (
      <StatusCard
        icon={<TriangleAlert className="size-8 text-destructive" aria-hidden="true" />}
        isError
        title="We couldn't load the shop"
        message={state.message}
        action={
          <Button onClick={onRetry} variant="outline">
            <RotateCw aria-hidden="true" />
            Try again
          </Button>
        }
      />
    )
  }

  // The agent is set up to sell one product for now, so we show the first one.
  const product = state.products[0]
  if (!product) {
    return (
      <StatusCard
        icon={<PackageOpen className="size-8 text-muted-foreground" aria-hidden="true" />}
        title="Nothing for sale yet"
        message="The shop is empty right now. Check back soon."
      />
    )
  }

  return <ProductCard product={product} offer={offer} dealAgreed={dealAgreed} />
}

/** Empty chat frame shown while the product loads (or if it failed), so the layout doesn't jump. */
function ChatPlaceholder() {
  return (
    <Card
      aria-hidden="true"
      className="hidden h-[min(42rem,calc(100svh-6rem))] min-h-[28rem] rounded-3xl shadow-soft ring-border lg:flex"
    />
  )
}

type StatusCardProps = {
  isError?: boolean
  icon: ReactNode
  title: string
  message: string
  action?: ReactNode
}

function StatusCard({ isError = false, icon, title, message, action }: StatusCardProps) {
  return (
    <Card
      // role="alert" makes screen readers announce errors immediately
      role={isError ? 'alert' : undefined}
      className="flex flex-col items-center gap-3 rounded-3xl px-6 py-12 text-center shadow-soft ring-border"
    >
      {icon}
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {action}
    </Card>
  )
}

export default App
