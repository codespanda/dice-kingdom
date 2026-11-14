import { useEffect, useRef } from 'react'
import { animTime, autoAction, cpuAction, type Action, type GameState } from '../games/engine'

/**
 * Runs on the device that owns the game (local play, or the online host): makes the moves the
 * game makes by itself (passing after a wasted roll, the only possible move) and plays for the
 * computer seats, after waiting for the latest animation to finish.
 */
export function useAuthority(state: GameState | null, cpu: boolean[], apply: (a: Action) => void, enabled: boolean) {
  const applyRef = useRef(apply)
  applyRef.current = apply
  const cpuKey = cpu.join(',')
  useEffect(() => {
    if (!enabled || !state || state.phase === 'over') return
    let delay = 600 + animTime(state)
    let a: Action | null = autoAction(state)
    if (a) delay += a.t === 'pass' ? 700 : 250
    else if (cpu[state.turn]) { a = cpuAction(state); delay += 450 }
    if (!a) return
    const action = a
    const id = window.setTimeout(() => applyRef.current(action), delay)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, enabled, cpuKey])
}
