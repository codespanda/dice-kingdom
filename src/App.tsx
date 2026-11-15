import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { sfx, unlock } from './audio'
import { GameScreen, type SeatInfo } from './components/GameScreen'
import { Icon } from './components/Icon'
import { JoinForm, NameField, useName } from './components/Join'
import { Hub } from './Hub'
import { useAuthority } from './game/useAuthority'
import { applyAction, newGame, type Action, type GameKind, type GameState } from './games/engine'
import { SNAKE_PLAYER_COLORS } from './games/snakes'
import { makeCode, myId, onlineAvailable, Room } from './net/room'

/* ---------------------------------------------------------------- Catalogue and routing */

type GameInfo = { kind: GameKind; path: string; name: string; blurb: string; title: string; description: string; art: ReactNode; tone: string }

const LudoArt = (
  <svg width="84" height="84" viewBox="0 0 104 104" aria-hidden="true">
    <rect width="104" height="104" rx="18" fill="#FFFFFF" />
    <rect x="6" y="6" width="40" height="40" rx="10" fill="#E5484D" /><rect x="58" y="6" width="40" height="40" rx="10" fill="#2BA471" />
    <rect x="58" y="58" width="40" height="40" rx="10" fill="#F5B400" /><rect x="6" y="58" width="40" height="40" rx="10" fill="#3E7BFA" />
    <g fill="#FFFFFF"><circle cx="26" cy="26" r="9" /><circle cx="78" cy="26" r="9" /><circle cx="78" cy="78" r="9" /><circle cx="26" cy="78" r="9" /></g>
    <path d="M52 40 L64 52 L52 64 L40 52 Z" fill="#14182E" />
  </svg>
)
const SnakesArt = (
  <svg width="84" height="84" viewBox="0 0 104 104" aria-hidden="true">
    <rect width="104" height="104" rx="18" fill="#FFFFFF" />
    <g fill="#CDEBDC"><rect x="8" y="8" width="22" height="22" rx="4" /><rect x="52" y="8" width="22" height="22" rx="4" /><rect x="30" y="30" width="22" height="22" rx="4" /><rect x="74" y="30" width="22" height="22" rx="4" /><rect x="8" y="52" width="22" height="22" rx="4" /><rect x="52" y="52" width="22" height="22" rx="4" /><rect x="30" y="74" width="22" height="22" rx="4" /><rect x="74" y="74" width="22" height="22" rx="4" /></g>
    <g stroke="#8A5A2B" strokeWidth="4" strokeLinecap="round"><line x1="22" y1="90" x2="54" y2="20" /><line x1="36" y1="94" x2="68" y2="24" /><line x1="26" y1="76" x2="38" y2="82" /><line x1="33" y1="61" x2="45" y2="67" /><line x1="40" y1="46" x2="52" y2="52" /><line x1="47" y1="31" x2="59" y2="37" /></g>
    <path d="M84 18 C60 34 98 56 74 86" fill="none" stroke="#4E9A2B" strokeWidth="9" strokeLinecap="round" />
    <circle cx="84" cy="18" r="8" fill="#4E9A2B" /><circle cx="81" cy="16" r="2" fill="#F7E36A" /><circle cx="87" cy="17" r="2" fill="#F7E36A" />
  </svg>
)

export const GAMES: GameInfo[] = [
  {
    kind: 'ludo', path: '/ludo', name: 'Ludo', tone: 'ludo-card', art: LudoArt,
    blurb: 'Roll a 6 to leave your yard, capture rivals and race all four tokens home.',
    title: 'Play Ludo Online Free — with Friends or the Computer | CodesPanda Games',
    description: 'Play Ludo free in your browser: pass and play on one phone, against the computer, or online with friends using a room code.',
  },
  {
    kind: 'snakes', path: '/snakes-and-ladders', name: 'Snakes & Ladders', tone: 'snakes-card', art: SnakesArt,
    blurb: 'Roll a 1 to enter, climb the ladders, dodge the snakes and land exactly on 100.',
    title: 'Play Snakes and Ladders Online Free | CodesPanda Games',
    description: 'Play Snakes and Ladders free in your browser: on one phone, against the computer, or online with friends using a room code.',
  },
]
const HUB_TITLE = 'CodesPanda Games — Free Browser Games: Cricket, Ludo, Snakes & Ladders'
const HUB_DESC = 'Free games in your browser: Reality Cricket T20, Ludo and Snakes & Ladders online with friends, and quick arcade games. No download, no sign-up.'

const gameByPath = (p: string) => GAMES.find((g) => g.path === p.replace(/\/+$/, ''))
const gameByKind = (k: GameKind) => GAMES.find((g) => g.kind === k)!

function setMeta(title: string, description: string, path: string) {
  document.title = title
  document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', `https://games.codespanda.com${path === '/' ? '/' : path}`)
}

function usePath() {
  const [path, setPath] = useState(location.pathname)
  useEffect(() => {
    const on = () => setPath(location.pathname)
    window.addEventListener('popstate', on)
    return () => window.removeEventListener('popstate', on)
  }, [])
  const go = useCallback((p: string, search = '') => {
    history.pushState(null, '', p + search)
    setPath(p)
    window.scrollTo(0, 0)
  }, [])
  return [path, go] as const
}

const load = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d } catch { return d } }
const save = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* ignore */ } }

function setUrlRoom(code: string | null) {
  try {
    const u = new URL(location.href)
    if (code) u.searchParams.set('room', code)
    else u.searchParams.delete('room')
    history.replaceState(null, '', u)
  } catch { /* ignore */ }
}

type Play = { s: 'local'; kind: GameKind; n: number; cpu: boolean } | { s: 'online'; room: Room } | null

export default function App() {
  const [path, go] = usePath()
  const [play, setPlay] = useState<Play>(null)
  const game = gameByPath(path)

  useEffect(() => {
    if (game) setMeta(game.title, game.description, game.path)
    else setMeta(HUB_TITLE, HUB_DESC, '/')
  }, [game])

  const stop = useCallback(() => setPlay(null), [])
  const startOnline = (room: Room, code: string) => { setUrlRoom(code); setPlay({ s: 'online', room }) }

  if (play?.s === 'local') return <LocalGame key={`${play.kind}-${play.n}-${play.cpu}`} {...play} onLeave={stop} />
  if (play?.s === 'online') return <OnlineGame room={play.room} onLeave={() => { void play.room.leave(); setUrlRoom(null); stop() }} />
  if (game) {
    return <GamePage key={game.kind} game={game} onBack={() => go('/')} onLocal={(n, cpu) => setPlay({ s: 'local', kind: game.kind, n, cpu })} onOnline={startOnline} />
  }
  return <Hub onOpen={(p) => go(p)} onOnline={startOnline} />
}

/* ---------------------------------------------------------------- One game's page */

function GamePage({ game, onBack, onLocal, onOnline }: { game: GameInfo; onBack: () => void; onLocal: (n: number, cpu: boolean) => void; onOnline: (r: Room, code: string) => void }) {
  const [n, setN] = useState(Number(load('dk-n', '4')) || 4)
  const [cpu, setCpu] = useState(load('dk-cpu', '0') === '1')
  const [name, setName] = useName()
  const [help, setHelp] = useState(false)
  useEffect(() => { save('dk-n', String(n)); save('dk-cpu', cpu ? '1' : '0') }, [n, cpu])

  const create = () => {
    unlock()
    const c = makeCode()
    const r = new Room(c, name.trim() || 'Player', true)
    r.setup({ game: game.kind, size: n })
    onOnline(r, c)
  }

  return (
    <div className="screen home">
      <header className="topbar">
        <a href="/" className="icon-btn" aria-label="All games" onClick={(e) => { e.preventDefault(); onBack() }}><Icon name="back" /></a>
        <div className="title"><h1>{game.name}</h1></div>
        <button type="button" className="icon-btn" aria-label="How to play" onClick={() => setHelp(true)}><Icon name="help" /></button>
      </header>

      <div className={`game-card hero ${game.tone}`}>
        {game.art}
        <span className="game-text"><strong>{game.name}</strong><span>{game.blurb}</span></span>
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
        <button type="button" className="btn btn-gold big" onClick={() => { unlock(); onLocal(n, cpu) }}>
          <Icon name="play" />Play {game.name}
        </button>
      </section>

      <section className="panel" aria-label="Play online">
        <h2><Icon name="globe" size={20} />Play online</h2>
        {onlineAvailable ? (
          <>
            <NameField name={name} setName={setName} />
            <button type="button" className="btn btn-outline" onClick={create}>Create a {game.name} room</button>
            <JoinForm name={name} onOnline={onOnline} />
          </>
        ) : (
          <p className="muted">Online play isn’t switched on in this build yet.</p>
        )}
      </section>

      <p className="foot"><a href="/" onClick={(e) => { e.preventDefault(); onBack() }}>All games</a> · Made by <a href="https://codespanda.com" target="_blank" rel="noreferrer">CodesPanda</a></p>
      {help && <HowToPlay only={game.kind} onClose={() => setHelp(false)} />}
    </div>
  )
}

function HowToPlay({ onClose, only }: { onClose: () => void; only?: GameKind }) {
  return (
    <div className="sheet-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet" role="dialog" aria-label="How to play">
        <h2>How to play</h2>
        {only !== 'snakes' && (
          <>
            <h3>Ludo</h3>
            <ul>
              <li>Roll a 6 to bring a token out of your yard.</li>
              <li>Go clockwise round the board, then up your coloured lane. You need the exact roll to get home.</li>
              <li>Land on a rival to send them back to their yard. Star and start squares are safe.</li>
              <li>A 6, a capture or a token home earns another roll. Three 6s in a row lose your turn.</li>
            </ul>
          </>
        )}
        {only !== 'ludo' && (
          <>
            <h3>Snakes &amp; Ladders</h3>
            <ul>
              <li>Everyone starts off the board. Roll a 1 to enter on square 1.</li>
              <li>Ladders take you up, snakes take you down. Land exactly on 100 to win.</li>
              <li>A 6 rolls again; three 6s in a row lose your turn.</li>
            </ul>
          </>
        )}
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
        <div className="card-msg"><h2>Couldn’t join</h2><p>{view.error}</p><button type="button" className="btn btn-gold" onClick={onLeave}>Back</button></div>
      </div>
    )
  }
  if (view.hostLeft) {
    return (
      <div className="screen center">
        <div className="card-msg"><h2>The host left</h2><p>This room has closed because the player who created it left.</p><button type="button" className="btn btn-gold" onClick={onLeave}>Back</button></div>
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
  const game = gameByKind(snap.game)
  const link = `${location.origin}${game.path}?room=${snap.code}`
  const total = Math.max(2, humans.length, snap.size)

  const share = async () => {
    const text = `Join my ${game.name} game on CodesPanda Games. Room code: ${snap.code}`
    try {
      if (navigator.share) { await navigator.share({ title: 'CodesPanda Games', text, url: link }); return }
    } catch { /* cancelled */ }
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* ignore */ }
  }

  return (
    <div className="screen lobby">
      <header className="topbar">
        <button type="button" className="icon-btn" aria-label="Leave room" onClick={onLeave}><Icon name="back" /></button>
        <div className="title"><h1>Online room</h1><span className="badge">{game.name}</span></div>
        <span style={{ width: 44 }} />
      </header>

      <section className="panel code-panel">
        <span className="label">Room code</span>
        <span className="room-code">{snap.code}</span>
        <p className="muted">Friends open games.codespanda.com and enter the code, or use your link.</p>
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
              {GAMES.map((g) => (
                <button key={g.kind} type="button" className={snap.game === g.kind ? 'on' : ''} aria-pressed={snap.game === g.kind} onClick={() => room.setup({ game: g.kind })}>{g.name}</button>
              ))}
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
            <Icon name="play" />Start {game.name}
          </button>
        </section>
      ) : (
        <section className="panel">
          <p className="waiting"><span className="spinner small" aria-hidden="true" />Waiting for the host to start {game.name}…</p>
        </section>
      )}
    </div>
  )
}
