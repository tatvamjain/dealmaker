import { useEffect } from 'react'
import { CircleX } from 'lucide-react'

import { SiteHeader } from '@/components/SiteHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/** PayPal sends the shopper here if they press "Cancel" on PayPal's page. */
export function OrderCancelled() {
  useEffect(() => {
    document.title = 'Payment cancelled · Dealmaker'
  }, [])

  return (
    <div className="min-h-svh">
      <SiteHeader />
      <main className="mx-auto flex max-w-xl flex-col px-4 pt-4 pb-10 sm:px-6 sm:pt-10">
        <Card className="flex flex-col items-center gap-4 rounded-3xl px-6 py-10 text-center shadow-soft ring-border sm:px-10">
          <CircleX className="size-10 text-muted-foreground" aria-hidden="true" />
          <h1 className="text-2xl font-bold tracking-tight">Payment cancelled</h1>
          <p className="max-w-sm leading-relaxed text-muted-foreground">
            No problem. You haven't been charged. Your agreed price is still in the chat tab, so you
            can go back and pay whenever you're ready.
          </p>
          <Button asChild variant="outline" className="mt-2">
            <a href="/">Back to the shop</a>
          </Button>
        </Card>
      </main>
    </div>
  )
}
