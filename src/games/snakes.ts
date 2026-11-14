// Snakes & Ladders rules engine. House rules: a 1 enters the board; exact roll to land on 100;
// a 6 rolls again; three 6s in a row lose the turn.

export const SNAKE_JUMPS: Record<number, number> = {
  4: 25, 13: 46, 33: 49, 42: 63, 50: 69, 62: 81, 74: 92,
  27: 5, 40: 3, 43: 18, 54: 31, 66: 45, 76: 58, 89: 53, 99: 41,
}
export const LADDERS: [number, number][] = [[4, 25], [13, 46], [33, 49], [42, 63], [50, 69], [62, 81], [74, 92]]
export const SNAKES: [number, number][] = [[27, 5], [40, 3], [43, 18], [54, 31], [66, 45], [76, 58], [89, 53], [99, 41]]

export const SNAKE_PLAYER_COLORS = [
  { hex: '#E5484D', dark: '#9E2328', ink: '#FFFFFF' },
  { hex: '#3E7BFA', dark: '#1F4FB8', ink: '#FFFFFF' },
  { hex: '#F5B400', dark: '#A87800', ink: '#14182E' },
  { hex: '#2BA471', dark: '#176B47', ink: '#FFFFFF' },
]

export type SnakesMove = { seat: number; path: number[]; jumpTo: number | null }

export type SnakesState = {
  kind: 'snakes'
  names: string[]
  /** 0 = off the board. */
  pos: number[]
  turn: number
  die: number
  sixes: number
  phase: 'roll' | 'over'
  winner: number | null
  msg: string
  rollSeq: number
  moveSeq: number
  last: SnakesMove | null
  sound: string
}

export function newSnakes(names: string[]): SnakesState {
  return {
    kind: 'snakes', names, pos: names.map(() => 0), turn: 0, die: 0, sixes: 0, phase: 'roll', winner: null,
    rollSeq: 0, moveSeq: 0, last: null, sound: '',
    msg: `Roll a 1 to enter the board. Land exactly on 100 to win. ${names[0]}, roll!`,
  }
}

export function snakesRoll(s: SnakesState, d: number): SnakesState {
  if (s.phase !== 'roll') return s
  const i = s.turn, name = s.names[i], n = s.names.length
  const sixes = d === 6 ? s.sixes + 1 : 0
  const next = (i + 1) % n
  const base = { ...s, die: d, rollSeq: s.rollSeq + 1, last: null }
  if (sixes === 3) {
    return { ...base, sixes: 0, turn: next, sound: 'nomove', msg: `${name} rolled three 6s in a row and loses the turn. ${s.names[next]}, your roll.` }
  }
  const turnAfter = d === 6 ? i : next
  const tail = d === 6 ? ' Roll again.' : ` ${s.names[turnAfter]}, your roll.`
  const keep = d === 6 ? sixes : 0
  const p = s.pos[i]
  if (p === 0 && d !== 1) {
    return { ...base, sixes: keep, turn: turnAfter, sound: 'nomove', msg: `${name} rolled ${d}. You need a 1 to start.${tail}` }
  }
  const np = p === 0 ? 1 : p + d
  if (np > 100) {
    return { ...base, sixes: keep, turn: turnAfter, sound: 'nomove', msg: `${name} rolled ${d} but needs exactly ${100 - p} to reach 100.${tail}` }
  }
  const path: number[] = []
  for (let q = p === 0 ? 1 : p + 1; q <= np; q++) path.push(q)
  const pos = s.pos.slice()
  if (np === 100) {
    pos[i] = 100
    return { ...base, pos, sixes: 0, phase: 'over', winner: i, sound: 'win', moveSeq: s.moveSeq + 1, last: { seat: i, path, jumpTo: null }, msg: `${name} wins!` }
  }
  const to = SNAKE_JUMPS[np] ?? null
  pos[i] = to ?? np
  let msg = `${name} rolled ${d} and moved to ${np}.`
  let sound = ''
  if (to !== null) {
    msg = to > np ? `${name} climbed a ladder from ${np} to ${to}!` : `Oh no! A snake took ${name} from ${np} down to ${to}.`
    sound = to > np ? 'ladder' : 'snake'
  }
  return { ...base, pos, sixes: keep, turn: turnAfter, sound, moveSeq: s.moveSeq + 1, last: { seat: i, path, jumpTo: to }, msg: msg + tail }
}

export function squareCenter(n: number) {
  const rb = Math.floor((n - 1) / 10), p = (n - 1) % 10, c = rb % 2 === 0 ? p : 9 - p
  return { x: c * 36 + 18, y: (9 - rb) * 36 + 18 }
}
