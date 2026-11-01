import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'

import './index.css'
import App from './App.tsx'
import { OrderCancelled } from '@/pages/OrderCancelled'
import { OrderComplete } from '@/pages/OrderComplete'

// We only have three pages, so a plain pathname check is enough (no router library).
// The Vite dev server serves index.html for any path, so these URLs all land here.
function Page() {
  switch (window.location.pathname) {
    case '/order-complete':
      return <OrderComplete />
    case '/order-cancelled':
      return <OrderCancelled />
    default:
      return <App />
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* reducedMotion="user": skip animations for people who turned on "reduce motion" in their OS */}
    <MotionConfig reducedMotion="user">
      <Page />
    </MotionConfig>
  </StrictMode>,
)
