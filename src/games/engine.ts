import { ludoCpuChoice, ludoMove, ludoPass, ludoRoll, movableTokens, newLudo, type LudoState } from './ludo'
import { newSnakes, snakesRoll, type SnakesState } from './snakes'

export type GameKind = 'ludo' | 'snakes'
export type GameState = LudoState | SnakesState
export type Action = { t: 'roll'; d: number } | { t: 'move'; token: number } | { t: 'pass' }

export const rollDie = () => 1 + Math.floor(Math.random() * 6)

export function newGame(kind: GameKind, names: string[]): GameState {
  return kind === 'ludo' ? newLudo(names) : newSnakes(names)
}

export function applyAction(s: GameState, a: Action): GameState {
  if (s.kind === 'ludo') {
    if (a.t === 'roll') return ludoRoll(s, a.d)
    if (a.t === 'move') return ludoMove(s, a.token)
    return ludoPass(s)
  }
  if (a.t === 'roll') return snakesRoll(s, a.d)
  return s
}

/** Is it this seat's turn to act, and what can it do? */
export const canRoll = (s: GameState) => s.phase === 'roll'

export function cpuAction(s: GameState): Action | null {
  if (s.phase === 'roll') return { t: 'roll', d: rollDie() }
  if (s.kind === 'ludo' && s.phase === 'move') return { t: 'move', token: ludoCpuChoice(s) }
  return null
}

/** Follow-up the game makes by itself, e.g. passing after a wasted roll or the only possible move. */
export function autoAction(s: GameState): Action | null {
  if (s.kind !== 'ludo') return null
  if (s.phase === 'nomove') return { t: 'pass' }
  if (s.phase === 'move') {
    const opts = movableTokens(s)
    if (opts.length && opts.every((i) => s.pos[s.turn][i] === s.pos[s.turn][opts[0]])) return { t: 'move', token: opts[0] }
  }
  return null
}

/** How long the board needs to finish animating the latest move, in ms. */
export function animTime(s: GameState) {
  if (!s.last) return 0
  const hops = s.last.path.length * 190
  return s.kind === 'snakes' && s.last.jumpTo !== null ? hops + 1000 : hops + 150
}
