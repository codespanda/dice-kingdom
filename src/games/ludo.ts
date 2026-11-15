// Ludo rules engine. Pure functions over plain, JSON-safe state so the same state can be
// played locally or sent over the network. Rules: a token leaves the yard on a 6;
// three 6s lose the turn; play continues for 2nd and 3rd place. No blocks.

export type Color = 'red' | 'green' | 'yellow' | 'blue'

export const LUDO_COLORS: Record<Color, { hex: string; dark: string; ink: string; start: number; yard: [number, number]; lane: [number, number][]; goal: [number, number] }> = {
  red: { hex: '#E5484D', dark: '#9E2328', ink: '#FFFFFF', start: 0, yard: [0, 0], lane: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]], goal: [7, 6] },
  green: { hex: '#2BA471', dark: '#176B47', ink: '#FFFFFF', start: 13, yard: [216, 0], lane: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]], goal: [6, 7] },
  yellow: { hex: '#F5B400', dark: '#A87800', ink: '#14182E', start: 26, yard: [216, 216], lane: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]], goal: [7, 8] },
  blue: { hex: '#3E7BFA', dark: '#1F4FB8', ink: '#FFFFFF', start: 39, yard: [0, 216], lane: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]], goal: [8, 7] },
}

export const LUDO_SAFE = [0, 8, 13, 21, 26, 34, 39, 47]
export const LUDO_ORDER: Record<number, Color[]> = { 2: ['red', 'yellow'], 3: ['red', 'green', 'yellow'], 4: ['red', 'green', 'yellow', 'blue'] }
export const HOME = 56
const ENTRY_ROLL = 6

/** The 52 main-track squares as [row, col], starting at red's start square, clockwise. */
export const LUDO_PATH: [number, number][] = (() => {
  const p: [number, number][] = []
  for (let i = 1; i <= 5; i++) p.push([6, i])
  for (let i = 5; i >= 0; i--) p.push([i, 6])
  p.push([0, 7], [0, 8])
  for (let i = 1; i <= 5; i++) p.push([i, 8])
  for (let i = 9; i <= 14; i++) p.push([6, i])
  p.push([7, 14], [8, 14])
  for (let i = 13; i >= 9; i--) p.push([8, i])
  for (let i = 9; i <= 14; i++) p.push([i, 8])
  p.push([14, 7], [14, 6])
  for (let i = 13; i >= 9; i--) p.push([i, 6])
  for (let i = 5; i >= 0; i--) p.push([8, i])
  p.push([7, 0], [6, 0])
  return p
})()

export type LudoMove = {
  seat: number
  token: number
  /** Progress values the token passes through, ending where it lands. */
  path: number[]
  captured: { seat: number; token: number; from: number }[]
}

export type LudoState = {
  kind: 'ludo'
  names: string[]
  colors: Color[]
  /** pos[seat][token]: -1 yard, 0..50 track, 51..55 home lane, 56 home. */
  pos: number[][]
  turn: number
  die: number
  sixes: number
  phase: 'roll' | 'move' | 'nomove' | 'over'
  finished: number[]
  msg: string
  rollSeq: number
  moveSeq: number
  last: LudoMove | null
  /** Sound to play for the latest event. */
  sound: string
}

export function newLudo(names: string[]): LudoState {
  const n = names.length
  return {
    kind: 'ludo', names, colors: LUDO_ORDER[n], pos: names.map(() => [-1, -1, -1, -1]),
    turn: 0, die: 0, sixes: 0, phase: 'roll', finished: [], rollSeq: 0, moveSeq: 0, last: null, sound: '',
    msg: `${names[0]} starts. Roll a ${ENTRY_ROLL} to bring a token out of your yard.`,
  }
}

const trackIdx = (s: LudoState, seat: number, p: number) => (LUDO_COLORS[s.colors[seat]].start + p) % 52

export function canMove(s: LudoState, seat: number, token: number, d = s.die) {
  const p = s.pos[seat][token]
  if (p === -1) return d === ENTRY_ROLL
  return p + d <= HOME
}

export const movableTokens = (s: LudoState) => [0, 1, 2, 3].filter((i) => canMove(s, s.turn, i))

export function nextTurn(s: LudoState, from: number, finished = s.finished) {
  const n = s.names.length
  let t = from
  for (let k = 0; k < n; k++) {
    t = (t + 1) % n
    if (!finished.includes(t)) return t
  }
  return from
}

export const ordinal = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`)

export function ludoRoll(s: LudoState, d: number): LudoState {
  if (s.phase !== 'roll') return s
  const name = s.names[s.turn]
  const sixes = d === 6 ? s.sixes + 1 : 0
  const base = { ...s, die: d, rollSeq: s.rollSeq + 1, last: null }
  if (sixes === 3) {
    return { ...base, sixes: 0, phase: 'nomove', sound: 'nomove', msg: `${name} rolled three 6s in a row and loses the turn.` }
  }
  const next = { ...base, sixes }
  const opts = movableTokens(next)
  if (!opts.length) {
    return { ...next, phase: 'nomove', sound: 'nomove', msg: `${name} rolled ${d}. No token can move.${d === 6 ? ' Roll again.' : ''}` }
  }
  return { ...next, phase: 'move', sound: '', msg: `${name} rolled ${d}. Pick a glowing token.` }
}

/** After a roll with no possible move: same player again on a 6, otherwise the next player. */
export function ludoPass(s: LudoState): LudoState {
  if (s.phase !== 'nomove') return s
  const again = s.die === 6 && s.sixes > 0
  const turn = again ? s.turn : nextTurn(s, s.turn)
  return { ...s, turn, sixes: again ? s.sixes : 0, phase: 'roll', sound: '', msg: `${s.names[turn]}, your roll.` }
}

export function ludoMove(s: LudoState, token: number): LudoState {
  if (s.phase !== 'move' || !canMove(s, s.turn, token)) return s
  const seat = s.turn, d = s.die, name = s.names[seat]
  const p = s.pos[seat][token]
  const np = p === -1 ? 0 : p + d
  const path: number[] = []
  for (let q = p === -1 ? 0 : p + 1; q <= np; q++) path.push(q)
  const pos = s.pos.map((t) => t.slice())
  pos[seat][token] = np
  let bonus = d === 6, msg = '', sound = path[0] === 0 && p === -1 ? 'out' : ''
  const captured: LudoMove['captured'] = []

  if (np <= 50) {
    const idx = trackIdx(s, seat, np)
    if (!LUDO_SAFE.includes(idx)) {
      pos.forEach((toks, o) => {
        if (o === seat) return
        toks.forEach((q, j) => {
          if (q >= 0 && q <= 50 && trackIdx(s, o, q) === idx) {
            captured.push({ seat: o, token: j, from: q })
            pos[o][j] = -1
            bonus = true
            msg = `${name} captured a token from ${s.names[o]}!`
            sound = 'capture'
          }
        })
      })
    }
  }
  const last: LudoMove = { seat, token, path, captured }
  let finished = s.finished
  if (np === HOME) {
    bonus = true
    msg = `${name} brought a token home!`
    sound = 'home'
    if (pos[seat].every((q) => q === HOME)) {
      finished = [...finished, seat]
      const left = s.names.map((_, i) => i).filter((i) => !finished.includes(i))
      if (left.length <= 1) {
        finished = [...finished, ...left]
        return { ...s, pos, finished, last, phase: 'over', sound: 'win', moveSeq: s.moveSeq + 1, msg: `${s.names[finished[0]]} wins!` }
      }
      const nt = nextTurn(s, seat, finished)
      return {
        ...s, pos, finished, last, turn: nt, sixes: 0, phase: 'roll', sound: 'win', moveSeq: s.moveSeq + 1,
        msg: `${name} finishes ${ordinal(finished.length)}! The game goes on for the next places. ${s.names[nt]}, your roll.`,
      }
    }
  }
  const turn = bonus ? seat : nextTurn(s, seat, finished)
  if (!msg) msg = bonus ? `${name} rolled a 6. Roll again!` : `${s.names[turn]}, your roll.`
  else msg += bonus ? ' Roll again.' : ` ${s.names[turn]}, your roll.`
  return { ...s, pos, finished, last, turn, sixes: turn === seat ? s.sixes : 0, phase: 'roll', sound, moveSeq: s.moveSeq + 1, msg }
}

/** Computer player's pick: captures, getting home, leaving the yard, blocks and safe squares first. */
export function ludoCpuChoice(s: LudoState) {
  const seat = s.turn, d = s.die
  const score = (i: number) => {
    const p = s.pos[seat][i], np = p === -1 ? 0 : p + d
    let v = np
    if (np === HOME) v += 200
    if (p === -1) v += 80
    if (np <= 50) {
      const idx = trackIdx(s, seat, np)
      if (LUDO_SAFE.includes(idx)) v += 30
      s.pos.forEach((toks, o) => {
        if (o !== seat) toks.forEach((q) => { if (q >= 0 && q <= 50 && trackIdx(s, o, q) === idx && !LUDO_SAFE.includes(idx)) v += 150 })
      })
    }
    return v
  }
  return movableTokens(s).sort((a, b) => score(b) - score(a))[0]
}

/** Board cell [row, col] for a token on the track, lane or home. */
export function ludoCell(s: LudoState, seat: number, p: number): [number, number] {
  const c = LUDO_COLORS[s.colors[seat]]
  if (p <= 50) return LUDO_PATH[(c.start + p) % 52]
  if (p <= 55) return c.lane[p - 51]
  return c.goal
}
