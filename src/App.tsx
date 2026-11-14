import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { sfx, unlock } from './audio'
import { GameScreen, type SeatInfo } from './components/GameScreen'
import { Icon } from './components/Icon'
import { useAuthority } from './game/useAuthority'
import { applyAction, newGame, type Action, type GameKind, type GameState } from './games/engine'
import { SNAKE_PLAYER_COLORS } from './games/snakes'
import { cleanCode, makeCode, myId, onlineAvailable, Room } from './net/room'

type Screen = { s: 'home' } | { s: 'local'; kind: GameKind; n: number; cpu: boolean } | { s: 'online'; room: Room }

const load = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d } catch { return d } }
const save = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* ignore */ } }

function roomFromUrl() {
  try { return cleanCode(new URLSearchParams(location.search).get('room') ?? '') } catch { return '' }
}
function setUrlRoom(code: string | null) {
  try {
    const u = new URL(location.href)
    if (code) u.searchParams.set('room', code)
    else u.searchParams.delete('room')
    history.replaceState(null, '', u)
  } catch { /* ignore */ }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ s: 'home' })
  const home = useCallback(() => setScreen({ s: 'home' }), [])

  if (screen.s === 'local') return <LocalGame key={`${screen.kind}-${screen.n}-${screen.cpu}`} {...screen} onLeave={home} />
  if (screen.s === 'online') {
    return <OnlineGame room={screen.room} onLeave={() => { void screen.room.leave(); setUrlRoom(null); home() }} />
  }
  return (
    <Home
      onLocal={(kind, n, cpu) => setScreen({ s: 'local', kind, n, cpu })}
      onOnline={(room, code) => { setUrlRoom(code); setScreen({ s: 'online', room }) }}
    />
  )
}

/* ---------------------------------------------------------------- Home */

function Home({ onLocal, onOnline }: { onLocal: (k: GameKind, n: number, cpu: boolean) => void; onOnline: (r: Room, code: string) => void }) {
  const [kind, setKind] = useState<GameKind>(load('dk-game', 'ludo') === 'snakes' ? 'snakes' : 'ludo')
  const [n, setN] = useState(Number(load('dk-n', '4')) || 4)
  const [cpu, setCpu] = useState(load('dk-cpu', '0') === '1')
  const [name, setName] = useState(load('dk-name', ''))
  const [code, setCode] = useState(roomFromUrl())
  const [help, setHelp] = useState(false)

  useEffect(() => { save('dk-game', kind); save('dk-n', String(n)); save('dk-cpu', cpu ? '1' : '0') }, [kind, n, cpu])
  useEffect(() => { save('dk-name', name) }, [name])

  const playerName = name.trim() || 'Player'
  const create = () => {
    unlock()
    const c = makeCode()
    const r = new Room(c, playerName, true)
    r.setup({ game: kind, size: n })
    onOnline(r, c)
  }
  const join = () => {
    unlock()
    const c = cleanCode(code)
    if (c.length !== 4) return
    onOnline(new Room(c, playerName, false), c)
  }
  const gameName = kind === 'ludo' ? 'Ludo' : 'Snakes & Ladders'

  return (
    <div className="screen home">
      <header className="topbar">
        <div className="brand"><Icon name="logo" size={40} /><span>Dice Kingdom</span></div>
        <button type="button" className="icon-btn" aria-label="How to play" onClick={() => setHelp(true)}><Icon name="help" /></button>
      </header>

      <div className="intro">
        <h1>Pick a board, roll the dice.</h1>
        <p>Ludo and Snakes &amp; Ladders. Play with friends on one phone, against the computer, or online.</p>
      </div>

      <div className="games">
        <button type="button" className={`game-card ludo-card${kind === 'ludo' ? ' picked' : ''}`} aria-pressed={kind === 'ludo'} onClick={() => setKind('ludo')}>
          <svg width="84" height="84" viewBox="0 0 104 104" aria-hidden="true">
            <rect width="104" height="104" rx="18" fill="#FFFFFF" />
            <rect x="6" y="6" width="40" height="40" rx="10" fill="#E5484D" /><rect x="58" y="6" width="40" height="40" rx="10" fill="#2BA471" />
            <rect x="58" y="58" width="40" height="40" rx="10" fill="#F5B400" /><rect x="6" y="58" width="40" height="40" rx="10" fill="#3E7BFA" />
            <g fill="#FFFFFF"><circle cx="26" cy="26" r="9" /><circle cx="78" cy="26" r="9" /><circle cx="78" cy="78" r="9" /><circle cx="26" cy="78" r="9" /></g>
            <path d="M52 40 L64 52 L52 64 L40 52 Z" fill="#14182E" />
          </svg>
          <span className="game-text"><strong>Ludo</strong><span>Roll a 6 to leave your yard and race all four tokens home.</span></span>
        </button>
        <button type="button" className={`game-card snakes-card${kind === 'snakes' ? ' picked' : ''}`} aria-pressed={kind === 'snakes'} onClick={() => setKind('snakes')}>
          <svg width="84" height="84" viewBox="0 0 104 104" aria-hidden="true">
            <rect width="104" height="104" rx="18" fill="#FFFFFF" />
            <g fill="#CDEBDC"><rect x="8" y="8" width="22" height="22" rx="4" /><rect x="52" y="8" width="22" height="22" rx="4" /><rect x="30" y="30" width="22" height="22" rx="4" /><rect x="74" y="30" width="22" height="22" rx="4" /><rect x="8" y="52" width="22" height="22" rx="4" /><rect x="52" y="52" width="22" height="22" rx="4" /><rect x="30" y="74" width="22" height="22" rx="4" /><rect x="74" y="74" width="22" height="22" rx="4" /></g>
            <g stroke="#8A5A2B" strokeWidth="4" strokeLinecap="round"><line x1="22" y1="90" x2="54" y2="20" /><line x1="36" y1="94" x2="68" y2="24" /><line x1="26" y1="76" x2="38" y2="82" /><line x1="33" y1="61" x2="45" y2="67" /><line x1="40" y1="46" x2="52" y2="52" /><line x1="47" y1="31" x2="59" y2="37" /></g>
            <path d="M84 18 C60 34 98 56 74 86" fill="none" stroke="#4E9A2B" strokeWidth="9" strokeLinecap="round" />
            <circle cx="84" cy="18" r="8" fill="#4E9A2B" /><circle cx="81" cy="16" r="2" fill="#F7E36A" /><circle cx="87" cy="17" r="2" fill="#F7E36A" />
          </svg>
          <span className="game-text"><strong>Snakes &amp; Ladders</strong><span>Roll a 1 to enter, climb ladders, dodge snakes, land on 100.</span></span>
        </button>
      </div>

      <section className="panel" aria-label="Play on this phone">
        <h2>Play on this phone</h2>
        <div className="field">
          <span className="label">Players</span>
          <div className="seg three">
            {[2, 3, 4].map((k) => <button key={k} type="button" className={n === k ? 'on' : ''} aria-pressed={n === k} onClick={() => setN(k)}>{k}</button>)}
          </div>
        </div>
        <div className="field">
          <span className="label">Opponents</span>
          <div className="seg two">
            <button type="button" className={!cpu ? 'on' : ''} aria-pressed={!cpu} onClick={() => setCpu(false)}><Icon name="users" size={18} />Friends</button>
            <button type="button" className={cpu ? 'on' : ''} aria-pressed={cpu} onClick={() => setCpu(true)}><Icon name="cpu" size={18} />Computer</button>
          </div>
        </div>
        <button type="button" className="btn btn-gold big" onClick={() => { unlock(); onLocal(kind, n, cpu) }}>
          <Icon name="play" />Play {gameName}
        </button>
      </section>

      <section className="panel" aria-label="Play online">
        <h2><Icon name="globe" size={20} />Play online</h2>
        {onlineAvailable ? (
          <>
            <label className="field">
              <span className="label">Your name</span>
              <input className="input" value={name} maxLength={16} placeholder="Player" onChange={(e) => setName(e.target.value)} autoComplete="nickname" />
            </label>
            <button type="button" className="btn btn-outline" onClick={create}>Create a {gameName} room</button>
            <div className="join">
              <label className="field grow">
                <span className="label">Room code</span>
                <input className="input code" value={code} placeholder="ABCD" maxLength={4} autoCapitalize="characters" autoComplete="off"
                  onChange={(e) => setCode(cleanCode(e.target.value))} onKeyDown={(e) => { if (e.key === 'Enter') join() }} />
              </label>
              <button type="button" className="btn btn-gold" disabled={code.length !== 4} onClick={join}>Join</button>
            </div>
          </>
        ) : (
          <p className="muted">Online play isn’t switched on in this build yet.</p>
        )}
      </section>

      <p className="foot">Made by <a href="https://codespanda.com" target="_blank" rel="noreferrer">CodesPanda</a> · Online rooms keep no data after the game.</p>

      {help && <HowToPlay onClose={() => setHelp(false)} />}
    </div>
  )
}

function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="sheet-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet" role="dialog" aria-label="How to play">
        <h2>How to play</h2>
        <h3>Ludo</h3>
        <ul>
          <li>Roll a 6 to bring a token out of your yard.</li>
          <li>Go clockwise round the board, then up your coloured lane. You need the exact roll to get home.</li>
          <li>Land on a rival to send them back to their yard. Star and start squares are safe.</li>
          <li>Two of your tokens on one square make a block that nobody can pass.</li>
          <li>A 6, a capture or a token home earns another roll. Three 6s in a row lose your turn.</li>
        </ul>
        <h3>Snakes &amp; Ladders</h3>
        <ul>
          <li>Everyone starts off the board. Roll a 1 to enter on square 1.</li>
          <li>Ladders take you up, snakes take you down. Land exactly on 100 to win.</li>
          <li>A 6 rolls again; three 6s in a row lose your turn.</li>
        </ul>
        <h3>Online</h3>
        <ul>
          <li>Create a room and share its 4-letter code or link. Up to 4 people can join.</li>
          <li>The host can fill empty seats with the computer. If someone drops out, the computer takes over for them.</li>
        </ul>
        <button type="button" className="btn btn-gold" onClick={onClose}>Got it</button>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- Local play */

function LocalGame({ kind, n, cpu, onLeave }: { kind: GameKind; n: number; cpu: boolean; onLeave: () => void }) {
  const names = Array.from({ length: n }, (_, i) => (cpu ? (i === 0 ? 'You' : `Computer ${i}`) : `Player ${i + 1}`))
  const cpuSeats = names.map((_, i) => cpu && i > 0)
  const [state, setState] = useState<GameState>(() => newGame(kind, names))
  const apply = useCallback((a: Action) => setState((s) => applyAction(s, a)), [])
  useAuthority(state, cpuSeats, apply, true)
  const seats: SeatInfo[] = names.map((name, i) => ({ name, cpu: cpuSeats[i], you: cpu && i === 0 }))
  return (
    <GameScreen
      state={state} seats={seats}
      controls={(seat) => !cpuSeats[seat]}
      onAction={apply} onLeave={onLeave}
      onRestart={() => setState(newGame(kind, names))}
      badge={cpu ? 'vs Computer' : 'Pass & play'}
    />
  )
}

/* ---------------------------------------------------------------- Online play */

function OnlineGame({ room, onLeave }: { room: Room; onLeave: () => void }) {
  const view = useSyncExternalStore(room.subscribe, room.getView)
  const snap = view.snap
  const state = snap?.status === 'playing' ? snap.state : null
  const cpuSeats = snap?.seats.map((s) => s.cpu) ?? []
  useAuthority(state, cpuSeats, (a) => room.apply(a), room.amHost)

  const seatCount = snap?.seats.filter((s) => !s.cpu).length ?? 0
  const [prevCount, setPrevCount] = useState(seatCount)
  if (seatCount !== prevCount) { setPrevCount(seatCount); if (seatCount > prevCount) sfx('join') }

  if (view.error) {
    return (
      <div className="screen center">
        <div className="card-msg"><h2>Couldn’t join</h2><p>{view.error}</p><button type="button" className="btn btn-gold" onClick={onLeave}>Back to home</button></div>
      </div>
    )
  }
  if (view.hostLeft) {
    return (
      <div className="screen center">
        <div className="card-msg"><h2>The host left</h2><p>This room has closed because the player who created it left.</p><button type="button" className="btn btn-gold" onClick={onLeave}>Back to home</button></div>
      </div>
    )
  }
  if (!snap) {
    return <div className="screen center"><div className="card-msg"><div className="spinner" aria-hidden="true" /><p>Joining room…</p><button type="button" className="link-btn" onClick={onLeave}>Cancel</button></div></div>
  }
  if (state) {
    const seats: SeatInfo[] = snap.seats.map((s) => ({ name: s.name, cpu: s.cpu, you: s.id === myId, away: !s.cpu && !view.online.includes(s.id) }))
    return (
      <GameScreen
        state={state} seats={seats}
        controls={(seat) => snap.seats[seat]?.id === myId}
        onAction={(a) => room.act(a)}
        onLeave={onLeave}
        onRestart={room.amHost ? () => room.backToLobby() : undefined}
        restartLabel="Back to lobby"
        waitingForHost={!room.amHost}
        badge={`Room ${snap.code}`}
      />
    )
  }
  return <Lobby room={room} onLeave={onLeave} />
}

function Lobby({ room, onLeave }: { room: Room; onLeave: () => void }) {
  const view = useSyncExternalStore(room.subscribe, room.getView)
  const snap = view.snap!
  const [copied, setCopied] = useState(false)
  const humans = snap.seats.filter((s) => !s.cpu)
  const link = `${location.origin}${location.pathname}?room=${snap.code}`
  const total = Math.max(2, humans.length, snap.size)
  const gameName = snap.game === 'ludo' ? 'Ludo' : 'Snakes & Ladders'

  const share = async () => {
    const text = `Join my ${gameName} game on Dice Kingdom. Room code: ${snap.code}`
    try {
      if (navigator.share) { await navigator.share({ title: 'Dice Kingdom', text, url: link }); return }
    } catch { /* cancelled */ }
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* ignore */ }
  }

  return (
    <div className="screen lobby">
      <header className="topbar">
        <button type="button" className="icon-btn" aria-label="Leave room" onClick={onLeave}><Icon name="back" /></button>
        <div className="title"><h1>Online room</h1></div>
        <span style={{ width: 44 }} />
      </header>

      <section className="panel code-panel">
        <span className="label">Room code</span>
        <span className="room-code">{snap.code}</span>
        <p className="muted">Friends open this site and enter the code, or use your link.</p>
        <button type="button" className="btn btn-outline" onClick={share}><Icon name="share" size={18} />{copied ? 'Link copied' : 'Share invite link'}</button>
      </section>

      <section className="panel">
        <h2>Players</h2>
        <ul className="seat-list">
          {Array.from({ length: total }, (_, i) => {
            const s = humans[i]
            return (
              <li key={i}>
                <span className="dot" style={{ background: SNAKE_PLAYER_COLORS[i].hex }} />
                {s ? <span>{s.name}{s.id === snap.hostId ? ' · host' : ''}{s.id === myId ? ' (you)' : ''}</span> : <span className="muted">Computer (if nobody joins)</span>}
              </li>
            )
          })}
        </ul>
      </section>

      {room.amHost ? (
        <section className="panel">
          <div className="field">
            <span className="label">Game</span>
            <div className="seg two">
              <button type="button" className={snap.game === 'ludo' ? 'on' : ''} aria-pressed={snap.game === 'ludo'} onClick={() => room.setup({ game: 'ludo' })}>Ludo</button>
              <button type="button" className={snap.game === 'snakes' ? 'on' : ''} aria-pressed={snap.game === 'snakes'} onClick={() => room.setup({ game: 'snakes' })}>Snakes &amp; Ladders</button>
            </div>
          </div>
          <div className="field">
            <span className="label">Seats (empty ones go to the computer)</span>
            <div className="seg three">
              {[2, 3, 4].map((k) => (
                <button key={k} type="button" className={total === k ? 'on' : ''} aria-pressed={total === k} disabled={k < humans.length} onClick={() => room.setup({ size: k })}>{k}</button>
              ))}
            </div>
          </div>
          <button type="button" className="btn btn-gold big" onClick={() => { unlock(); room.start() }}>
            <Icon name="play" />Start {gameName}
          </button>
        </section>
      ) : (
        <section className="panel">
          <p className="waiting"><span className="spinner small" aria-hidden="true" />Waiting for the host to start {gameName}…</p>
        </section>
      )}
    </div>
  )
}
