import { motion } from 'framer-motion'

// Little dots that burst outwards from the tick when the deal lands
const SPARKS = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2)

/** Green circle whose tick draws itself in, with a small burst of sparks. */
export function DealTick() {
  return (
    <div className="relative size-12" aria-hidden="true">
      {SPARKS.map((angle) => (
        <motion.span
          key={angle}
          className="absolute top-1/2 left-1/2 size-1.5 rounded-full bg-offer"
          initial={{ x: '-50%', y: '-50%', opacity: 1, scale: 1 }}
          animate={{
            x: `calc(-50% + ${Math.cos(angle) * 34}px)`,
            y: `calc(-50% + ${Math.sin(angle) * 34}px)`,
            opacity: 0,
            scale: 0.4,
          }}
          transition={{ duration: 0.7, delay: 0.25, ease: 'easeOut' }}
        />
      ))}
      <motion.svg
        viewBox="0 0 48 48"
        className="relative size-12"
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 14 }}
      >
        <circle cx="24" cy="24" r="24" className="fill-primary" />
        <motion.path
          d="M14 24.5l6.5 6.5L34 17.5"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-primary-foreground"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.15, ease: 'easeOut' }}
        />
      </motion.svg>
    </div>
  )
}
