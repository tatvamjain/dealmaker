import { Handshake } from 'lucide-react'

import { Button } from '@/components/ui/button'

// Temporary placeholder: proves Tailwind, the "@" alias, shadcn and lucide all work.
// Replaced by the real layout in step 3.
function App() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-4">
      <Handshake className="size-10" aria-hidden="true" />
      <h1 className="text-2xl font-semibold">Dealmaker</h1>
      <Button>Scaffold works</Button>
    </main>
  )
}

export default App
