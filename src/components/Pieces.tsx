import { useEffect, useRef, useState, type ReactNode } from 'react'

/** A standing game pawn with a highlight and a shadow. */
export function Pawn({ hex, dark }: { hex: string; dark: string }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 30" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
      <ellipse cx="12" cy="27.5" rx="10" ry="3" fill="rgba(20,24,46,0.35)" />
      <ellipse cx="12" cy="25.5" rx="9.5" ry="3.5" fill={dark} />
      <path d="M5.5 25 C6.5 19 9 16.5 9.2 13 L14.8 13 C15 16.5 17.5 19 18.5 25 Z" fill={hex} stroke={dark} strokeWidth="0.8" />
      <ellipse cx="12" cy="13.2" rx="4.6" ry="1.6" fill={dark} />
      <circle cx="12" cy="8" r="5.6" fill={hex} stroke={dark} strokeWidth="0.8" />
      <ellipse cx="10" cy="6" rx="2.2" ry="1.6" fill="#FFFFFF" fillOpacity="0.75" />
      <path d="M8 23.5 C8.6 20 10 18 10.4 15.5" fill="none" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }

/** An ivory die with sunken pips (red for the 1). Tumbles while rolling. */
export function Die({ face, rolling, ready, onRoll, label }: { face: number; rolling: boolean; ready: boolean; onRoll: () => void; label: string }) {
  const on = PIPS[face] ?? []
  return (
    <button type="button" className={`die${rolling ? ' die-roll' : ''}${ready ? ' die-ready' : ''}`} aria-label={label} disabled={!ready} onClick={onRoll}>
      {Array.from({ length: 9 }, (_, k) => (
        <span key={k} className={on.includes(k) ? (face === 1 ? 'pip pip-red' : 'pip') : 'pip-off'} />
      ))}
    </button>
  )
}

/** Renders a fixed-size board scaled to fit the available width. */
export function Scaled({ size, children }: { size: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setScale(Math.min(1.25, el.clientWidth / size)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [size])
  return (
    <div ref={ref} style={{ width: '100%', maxWidth: size * 1.25, height: size * scale, margin: '0 auto' }}>
      <div style={{ width: size, height: size, transform: `scale(${scale})`, transformOrigin: 'top left' }}>{children}</div>
    </div>
  )
}
