import { useEffect, useRef, useState } from 'react'
import { sfx } from '../audio'
import type { GameState } from '../games/engine'

export type Anim = { seat: number; token: number; value: number; jumping: boolean }
export type Fx = { rolling: boolean; face: number; anim: Anim | null; held: { seat: number; token: number; value: number }[]; busy: boolean }

/**
 * Plays the latest roll and move on every device the same way: the die tumbles, then the pawn
 * hops square by square (and slides along a ladder or snake), with sound. Captured tokens stay
 * where they were until the capturing pawn lands.
 */
export function useGameFx(state: GameState | null): Fx {
  const [rolling, setRolling] = useState(false)
  const [face, setFace] = useState(state?.die ?? 0)
  const [anim, setAnim] = useState<Anim | null>(null)
  const [held, setHeld] = useState<Fx['held']>([])
  const seen = useRef<{ roll: number; move: number } | null>(null)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const rollSeq = state?.rollSeq ?? -1, moveSeq = state?.moveSeq ?? -1
  useEffect(() => {
    if (!state) return
    const prev = seen.current
    seen.current = { roll: state.rollSeq, move: state.moveSeq }
    const at = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)) }
    if (!prev || state.rollSeq < prev.roll || state.moveSeq < prev.move) {
      // First view or a new game: show it as it is.
      timers.current.forEach(clearTimeout); timers.current = []
      setFace(state.die); setRolling(false); setAnim(null); setHeld([])
      return
    }
    const rolled = state.rollSeq !== prev.roll, moved = state.moveSeq !== prev.move
    if (!rolled && !moved) return
    timers.current.forEach(clearTimeout); timers.current = []
    let t = 0
    if (rolled) {
      setRolling(true)
      for (let k = 0; k < 7; k++) at(k * 70, () => { setFace(1 + Math.floor(Math.random() * 6)); sfx('rattle') })
      at(500, () => { setRolling(false); setFace(state.die); sfx('land') })
      t = 560
    }
    const last = state.last
    if (moved && last) {
      const token = 'token' in last ? last.token : 0
      const start = last.path[0] - 1
      setAnim({ seat: last.seat, token, value: start, jumping: false })
      setHeld('captured' in last ? last.captured.map((c) => ({ seat: c.seat, token: c.token, value: c.from })) : [])
      last.path.forEach((v, k) => at(t + (k + 1) * 190, () => { setAnim({ seat: last.seat, token, value: v, jumping: false }); sfx('step') }))
      const end = t + last.path.length * 190
      if ('jumpTo' in last && last.jumpTo !== null) {
        const to = last.jumpTo
        at(end + 150, () => { setAnim({ seat: last.seat, token, value: to, jumping: true }); sfx(state.sound) })
        at(end + 1050, () => setAnim(null))
      } else {
        at(end + 120, () => { setAnim(null); setHeld([]); sfx(state.sound) })
      }
    } else if (rolled && state.sound) {
      at(t, () => sfx(state.sound))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollSeq, moveSeq])

  return { rolling, face, anim, held, busy: rolling || anim !== null }
}
