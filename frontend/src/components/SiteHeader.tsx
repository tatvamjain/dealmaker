import { Handshake } from 'lucide-react'

/** Brand bar at the top of every page. The logo links back to the shop. */
export function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-6xl items-center px-4 py-5 sm:px-6">
      <a href="/" className="flex items-center gap-2 rounded-md">
        <Handshake className="size-6 text-primary" aria-hidden="true" />
        <span className="text-lg font-bold tracking-tight">Dealmaker</span>
      </a>
    </header>
  )
}
