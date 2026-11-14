import type { CSSProperties } from 'react'
import type { Fx } from '../game/useGameFx'
import { canMove, HOME, LUDO_COLORS, ludoCell, type Color, type LudoState } from '../games/ludo'
import { SNAKE_PLAYER_COLORS, squareCenter, type SnakesState } from '../games/snakes'
import { LADDER_ART, SNAKE_ART } from '../games/snakesArt'
import { Pawn, Scaled } from './Pieces'

const C = 24
const STAR_CELLS = new Set(['8,2', '2,6', '6,12', '12,8'])
const START_CELLS: Record<string, Color> = { '6,1': 'red', '1,8': 'green', '8,13': 'yellow', '13,6': 'blue' }

function ludoCellFill(r: number, c: number) {
  const k = `${r},${c}`
  if (START_CELLS[k]) return LUDO_COLORS[START_CELLS[k]].hex
  if (r === 7 && c >= 1 && c <= 5) return LUDO_COLORS.red.hex
  if (c === 7 && r >= 1 && r <= 5) return LUDO_COLORS.green.hex
  if (r === 7 && c >= 9 && c <= 13) return LUDO_COLORS.yellow.hex
  if (c === 7 && r >= 9 && r <= 13) return LUDO_COLORS.blue.hex
  return null
}

const LUDO_CELLS = Array.from({ length: 225 }, (_, i) => {
  const r = Math.floor(i / 15), c = i % 15
  const hidden = ((r < 6 || r > 8) && (c < 6 || c > 8)) || (r >= 6 && r <= 8 && c >= 6 && c <= 8)
  return { key: i, hidden, fill: ludoCellFill(r, c), star: STAR_CELLS.has(`${r},${c}`), arrow: !!START_CELLS[`${r},${c}`] }
})

export function LudoBoard({ s, fx, pickable, onPick }: { s: LudoState; fx: Fx; pickable: boolean; onPick: (token: number) => void }) {
  const stack: Record<string, number> = {}
  const pawns: { key: string; style: CSSProperties; hex: string; dark: string; live: boolean; label: string; token: number }[] = []
  s.colors.forEach((col, seat) => {
    const y = LUDO_COLORS[col]
    s.pos[seat].forEach((real, i) => {
      let p = real
      const held = fx.held.find((h) => h.seat === seat && h.token === i)
      if (held) p = held.value
      const moving = fx.anim && fx.anim.seat === seat && fx.anim.token === i
      if (moving) p = fx.anim!.value
      let x: number, top: number, w: number, h: number
      if (p === -1) {
        w = 26; h = 32
        x = y.yard[0] + 48 + (i % 2) * 48 - w / 2
        top = y.yard[1] + 48 + Math.floor(i / 2) * 48 - 22
      } else {
        const cell = ludoCell(s, seat, p)
        const k = cell.join(','), n = stack[k] ?? 0
        stack[k] = n + 1
        w = 20; h = 25
        x = cell[1] * C + 2 + n * 4
        top = cell[0] * C - 4 - n * 3
      }
      const live = pickable && !fx.busy && s.phase === 'move' && seat === s.turn && canMove(s, seat, i)
      const where = real === -1 ? 'in the yard' : real === HOME ? 'home' : real > 50 ? 'in the home lane' : 'on the track'
      pawns.push({
        key: `${seat}-${i}`, hex: y.hex, dark: y.dark, live, token: i,
        label: `${s.names[seat]} token ${i + 1}, ${where}${live ? ', can move' : ''}`,
        style: {
          left: x, top, width: w, height: h,
          zIndex: moving ? 50 : live ? 40 : 10 + Math.max(0, Math.round(top / 24)),
          transform: moving ? 'scale(1.18) translateY(-3px)' : undefined,
        },
      })
    })
  })

  return (
    <Scaled size={374}>
      <div className="frame">
        <section className="board ludo" aria-label="Ludo board">
          <div className="ludo-grid">
            {LUDO_CELLS.map((c) => (
              <div key={c.key} className={c.hidden ? 'cell-hidden' : c.fill ? 'cell cell-color' : 'cell'} style={c.fill ? { background: c.fill } : undefined}>
                {c.star && <svg width="16" height="16" viewBox="0 0 24 24" fill="#C3C8DE" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6-4.9-4.6 6.6-.8z" /></svg>}
                {c.arrow && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>}
              </div>
            ))}
          </div>
          {(Object.keys(LUDO_COLORS) as Color[]).map((col) => {
            const y = LUDO_COLORS[col]
            return (
              <div key={col} className="yard" style={{ left: y.yard[0], top: y.yard[1], backgroundColor: y.hex, opacity: s.colors.includes(col) ? 1 : 0.35 }}>
                <div className="nest">
                  {[0, 1, 2, 3].map((k) => <span key={k} className="slot" style={{ borderColor: y.hex }} />)}
                </div>
              </div>
            )
          })}
          <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true" style={{ position: 'absolute', left: 144, top: 144 }}>
            <path d="M0 0 L72 0 L36 36 Z" fill="#2BA471" />
            <path d="M72 0 L72 72 L36 36 Z" fill="#F5B400" />
            <path d="M72 72 L0 72 L36 36 Z" fill="#3E7BFA" />
            <path d="M0 72 L0 0 L36 36 Z" fill="#E5484D" />
          </svg>
          {pawns.map((p) => (
            <button key={p.key} type="button" className="pawn" aria-label={p.label} disabled={!p.live} onClick={() => onPick(p.token)} style={p.style}>
              <span className={p.live ? 'pawn-live' : undefined}><Pawn hex={p.hex} dark={p.dark} /></span>
            </button>
          ))}
        </section>
      </div>
    </Scaled>
  )
}

const SNAKE_CELLS = Array.from({ length: 100 }, (_, i) => {
  const r = Math.floor(i / 10), c = i % 10, rb = 9 - r
  const n = rb * 10 + (rb % 2 === 0 ? c + 1 : 10 - c)
  const bg = n === 100 ? '#FFC53D' : n === 1 ? '#CFE0FF' : (r + c) % 2 === 0 ? '#FFF8EC' : '#DDF2E7'
  return { n, bg }
})

export function SnakesBoard({ s, fx }: { s: SnakesState; fx: Fx }) {
  const shown = s.pos.map((p, i) => (fx.anim && fx.anim.seat === i ? fx.anim.value : p))
  const groups: Record<number, number[]> = {}
  shown.forEach((p, i) => { (groups[Math.max(p, 1)] ??= []).push(i) })
  const offs = [[-7, -7], [7, -7], [-7, 7], [7, 7]]
  return (
    <Scaled size={374}>
      <div className="frame">
        <section className="board" aria-label="Snakes and Ladders board">
          <div className="snakes-grid">
            {SNAKE_CELLS.map((c) => <div key={c.n} className="square" style={{ background: c.bg }}>{c.n}</div>)}
          </div>
          {LADDER_ART.map((l, k) => (
            <svg key={`l${k}`} className="overlay" width="360" height="360" viewBox="0 0 360 360" aria-hidden="true">
              <path d={l.all} fill="none" stroke="rgba(30,18,6,0.35)" strokeWidth="4.5" strokeLinecap="round" transform="translate(2 2.5)" />
              <path d={l.rungs} fill="none" stroke="#6B3F18" strokeWidth="3.6" strokeLinecap="round" />
              <path d={l.rungs} fill="none" stroke="#C8894A" strokeWidth="1.6" strokeLinecap="round" />
              <path d={l.rails} fill="none" stroke="#5A3313" strokeWidth="4.8" strokeLinecap="round" />
              <path d={l.rails} fill="none" stroke="#B87A3D" strokeWidth="2.8" strokeLinecap="round" />
              <path d={l.rails} fill="none" stroke="#E2AE73" strokeWidth="0.9" strokeLinecap="round" transform="translate(-0.6 -0.6)" />
            </svg>
          ))}
          {SNAKE_ART.map((sn, k) => (
            <svg key={`s${k}`} className="overlay" width="360" height="360" viewBox="0 0 360 360" aria-hidden="true">
              <path d={sn.body} fill="rgba(20,14,6,0.3)" transform="translate(2 3)" />
              <path d={sn.body} fill={sn.col} stroke={sn.dark} strokeWidth="1" strokeLinejoin="round" />
              <path d={sn.bands} fill="none" stroke={sn.dark} strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
              <path d={sn.spots} fill="none" stroke={sn.belly} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
              <path d={sn.shine} fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="1.3" strokeLinecap="round" />
              <g transform={sn.head}>
                <path d="M7 0 L13 -1.2 M13 -1.2 L15.5 -3.2 M13 -1.2 L15.5 0.8" stroke="#D7263D" strokeWidth="1.1" fill="none" strokeLinecap="round" />
                <path d="M-7 -6.4 C-1 -8.4 6 -6 9.2 -1.6 C10 -0.5 10 0.5 9.2 1.6 C6 6 -1 8.4 -7 6.4 C-9 4 -9 -4 -7 -6.4 Z" fill={sn.dark} />
                <path d="M-6.4 -5.6 C-1 -7.4 5.6 -5.3 8.4 -1.4 C9 -0.5 9 0.5 8.4 1.4 C5.6 5.3 -1 7.4 -6.4 5.6 C-8 3.6 -8 -3.6 -6.4 -5.6 Z" fill={sn.col} />
                <path d="M-4 -2.5 L2 -1.5 M-4 2.5 L2 1.5" stroke={sn.dark} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
                <ellipse cx="-1.5" cy="-2.8" rx="3.6" ry="1.3" fill="#FFFFFF" fillOpacity="0.3" />
                <circle cx="3" cy="-3.6" r="2" fill="#F7E36A" stroke={sn.dark} strokeWidth="0.6" />
                <ellipse cx="3.2" cy="-3.6" rx="0.5" ry="1.6" fill="#111111" />
                <circle cx="3" cy="3.6" r="2" fill="#F7E36A" stroke={sn.dark} strokeWidth="0.6" />
                <ellipse cx="3.2" cy="3.6" rx="0.5" ry="1.6" fill="#111111" />
                <circle cx="7.6" cy="-1.1" r="0.5" fill={sn.dark} />
                <circle cx="7.6" cy="1.1" r="0.5" fill={sn.dark} />
              </g>
            </svg>
          ))}
          {shown.map((p, i) => {
            const sq = Math.max(p, 1), ct = squareCenter(sq), grp = groups[sq]
            const o = grp.length > 1 ? offs[grp.indexOf(i)] : [0, 0]
            const moving = fx.anim?.seat === i
            const waiting = !fx.busy && s.turn === i && s.phase === 'roll'
            const col = SNAKE_PLAYER_COLORS[i]
            return (
              <span
                key={i}
                className={`token${moving && fx.anim?.jumping ? ' token-jump' : ''}`}
                aria-hidden="true"
                style={{
                  left: ct.x - 12 + o[0], top: ct.y - 22 + o[1], opacity: p === 0 ? 0.75 : 1,
                  zIndex: moving ? 50 : waiting ? 40 : 10 + Math.round(ct.y / 36),
                  transform: moving ? 'scale(1.18) translateY(-3px)' : undefined,
                  filter: waiting ? 'drop-shadow(0 0 4px #FFC53D) drop-shadow(0 0 8px rgba(255,197,61,0.9))' : undefined,
                }}
              >
                <span className={waiting ? 'pawn-live' : undefined}><Pawn hex={col.hex} dark={col.dark} /></span>
              </span>
            )
          })}
        </section>
      </div>
    </Scaled>
  )
}
