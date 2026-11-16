import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { JoinForm, NameField, useName } from './components/Join'
import { onlineAvailable, type Room } from './net/room'
import './hub.css'

// The games hub at games.codespanda.com, styled like codespanda.com.

const SITE = 'https://codespanda.com'

type Card = {
  id: string
  name: string
  href: string
  /** Opens inside this app instead of a full page load. */
  spa?: boolean
  desc: string
  tags: string[]
  filters: string[]
  best: () => string
  art: ReactNode
}

const read = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const num = (k: string, unit = '') => { const v = Number(read(k) || 0); return v ? `${v}${unit}` : '—' }

const FryArt = (
  <svg viewBox="0 0 320 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="320" height="190" fill="#7CC46A" />
    <ellipse cx="150" cy="168" rx="140" ry="16" fill="#5FA84F" />
    <g transform="translate(120 70)">
      <rect x="6" y="0" width="9" height="46" rx="3" fill="#FFD23F" transform="rotate(-8 10 40)" />
      <rect x="18" y="-8" width="9" height="54" rx="3" fill="#FFC21A" />
      <rect x="30" y="-4" width="9" height="50" rx="3" fill="#FFD23F" transform="rotate(6 34 40)" />
      <rect x="42" y="2" width="9" height="44" rx="3" fill="#FFC21A" transform="rotate(12 46 40)" />
      <path d="M0 38 H62 L54 96 H8 Z" fill="#E53945" />
      <rect x="0" y="36" width="62" height="8" fill="#C62835" />
    </g>
    <g transform="translate(200 46)">
      <path d="M72 34 L98 22 L92 46 Z" fill="#8A93A8" />
      <ellipse cx="50" cy="40" rx="40" ry="20" fill="#9AA3B6" />
      <path d="M30 40 C46 22 72 26 84 38 C70 44 50 50 30 40 Z" fill="#7A8398" />
      <circle cx="16" cy="26" r="15" fill="#9AA3B6" />
      <circle cx="12" cy="23" r="4" fill="#FFFFFF" /><circle cx="11" cy="23" r="2" fill="#1B1F2E" />
      <path d="M2 28 L-10 31 L2 33 Z" fill="#E8A13A" />
      <ellipse cx="24" cy="40" rx="8" ry="6" fill="#5FB89A" />
    </g>
    <g transform="translate(36 120)">
      <path d="M2 10 L8 -6 L16 6 L26 6 L34 -6 L40 10 C44 20 42 40 21 40 C0 40 -2 20 2 10 Z" fill="#2B2B33" />
      <circle cx="14" cy="20" r="3.5" fill="#FFD23F" /><circle cx="28" cy="20" r="3.5" fill="#FFD23F" />
    </g>
  </svg>
)

const SneezeArt = (
  <svg viewBox="0 0 320 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="320" height="190" fill="#8FD3FF" />
    <rect y="160" width="320" height="30" fill="#6CC24A" />
    <ellipse cx="70" cy="40" rx="30" ry="14" fill="#FFFFFF" /><ellipse cx="88" cy="34" rx="18" ry="12" fill="#FFFFFF" />
    <ellipse cx="250" cy="140" rx="34" ry="13" fill="#FFFFFF" /><ellipse cx="232" cy="134" rx="16" ry="10" fill="#FFFFFF" />
    <path d="M40 162 C70 110 110 70 170 62" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeDasharray="1 9" strokeLinecap="round" />
    <circle cx="150" cy="80" r="9" fill="#FFFFFF" /><circle cx="138" cy="90" r="6" fill="#FFFFFF" /><circle cx="128" cy="98" r="4" fill="#FFFFFF" />
    <g transform="translate(192 62)">
      <circle r="24" fill="#FFCB3D" stroke="#E7A813" strokeWidth="2" />
      <path d="M-13 -9 L-4 -4 M13 -9 L4 -4" stroke="#3A2A12" strokeWidth="3" strokeLinecap="round" />
      <path d="M-11 0 L-4 2 M11 0 L4 2" stroke="#3A2A12" strokeWidth="3" strokeLinecap="round" />
      <path d="M-8 12 C-3 8 3 8 8 12" fill="none" stroke="#3A2A12" strokeWidth="3" strokeLinecap="round" />
    </g>
    <circle cx="270" cy="38" r="9" fill="none" stroke="#F2B21B" strokeWidth="4" />
    <circle cx="290" cy="74" r="7" fill="none" stroke="#F2B21B" strokeWidth="4" />
  </svg>
)

const CatsArt = (
  <svg viewBox="0 0 320 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="320" height="190" fill="#F6D7A7" />
    <rect y="160" width="320" height="30" fill="#D9A36D" />
    <g>
      <rect x="104" y="128" width="116" height="34" rx="17" fill="#E57A3A" />
      <path d="M204 132 l6 -12 l6 12 z" fill="#E57A3A" /><path d="M196 140 c4 3 8 3 12 0" stroke="#3A2414" strokeWidth="2" fill="none" />
      <rect x="112" y="100" width="98" height="30" rx="15" fill="#3A3A42" />
      <circle cx="124" cy="114" r="2.5" fill="#FFD23F" /><circle cx="134" cy="114" r="2.5" fill="#FFD23F" />
      <rect x="110" y="74" width="100" height="28" rx="14" fill="#FFFFFF" />
      <path d="M186 88 c4 3 8 3 12 0" stroke="#3A2414" strokeWidth="2" fill="none" />
      <rect x="116" y="48" width="96" height="28" rx="14" fill="#B5784B" />
      <path d="M120 52 l4 -12 l8 8 z M134 46 l6 -10 l5 10 z" fill="#B5784B" />
      <path d="M124 62 c3 -2 6 -2 9 0" stroke="#3A2414" strokeWidth="2" fill="none" />
    </g>
    <path d="M228 50 c6 6 6 14 0 20 M238 44 c9 9 9 23 0 32" fill="none" stroke="#7A5232" strokeWidth="3" strokeLinecap="round" />
  </svg>
)

const CricketArt = (
  <svg viewBox="0 0 320 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="320" height="190" fill="#0A1E38" />
    <rect width="320" height="40" fill="#06142A" />
    <g fill="#FFF7D6"><circle cx="40" cy="26" r="26" opacity="0.12" /><circle cx="40" cy="26" r="16" opacity="0.18" /><circle cx="280" cy="26" r="26" opacity="0.12" /><circle cx="280" cy="26" r="16" opacity="0.18" /></g>
    <g fill="#FFF7D6"><rect x="30" y="20" width="20" height="10" rx="2" /><rect x="270" y="20" width="20" height="10" rx="2" /></g>
    <rect y="62" width="320" height="26" fill="#1B2D4A" />
    <g fill="#38507A">{Array.from({ length: 40 }, (_, i) => <circle key={i} cx={6 + i * 8} cy={70 + (i % 3) * 6} r="2.2" />)}</g>
    <path d="M0 88 H320 V190 H0 Z" fill="#2F9A4A" />
    <path d="M0 88 H320 V104 H0 Z M0 120 H320 V140 H0 Z M0 160 H320 V182 H0 Z" fill="#2A8C43" />
    <path d="M140 90 H180 L214 190 H106 Z" fill="#D8C48E" />
    <path d="M118 158 H202" stroke="#FFFFFF" strokeWidth="2" />
    <g fill="#F4EBD0"><rect x="153" y="84" width="2.4" height="12" /><rect x="159" y="84" width="2.4" height="12" /><rect x="165" y="84" width="2.4" height="12" /></g>
    <g transform="translate(206 112) rotate(-38)">
      <rect x="-5" y="-48" width="10" height="26" rx="3" fill="#2B2B33" />
      <path d="M-10 -24 H10 L8 34 Q0 40 -8 34 Z" fill="#F2D9A6" stroke="#B88A4A" strokeWidth="1.5" />
    </g>
    <circle cx="232" cy="74" r="7" fill="#D7263D" /><path d="M226 72 Q232 76 238 72" stroke="#FFFFFF" strokeWidth="1" fill="none" />
  </svg>
)

const LudoArt = (
  <svg viewBox="0 0 320 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="320" height="190" fill="#FFF3DC" />
    <g transform="translate(100 25) rotate(-6 60 70)">
      <rect width="140" height="140" rx="14" fill="#8A5228" />
      <rect x="6" y="6" width="128" height="128" rx="8" fill="#FBF6EA" />
      <rect x="6" y="6" width="52" height="52" fill="#E5484D" /><rect x="82" y="6" width="52" height="52" fill="#2BA471" />
      <rect x="82" y="82" width="52" height="52" fill="#F5B400" /><rect x="6" y="82" width="52" height="52" fill="#3E7BFA" />
      <g fill="#FFFFFF"><circle cx="32" cy="32" r="16" /><circle cx="108" cy="32" r="16" /><circle cx="108" cy="108" r="16" /><circle cx="32" cy="108" r="16" /></g>
      <path d="M58 58 H82 L70 70 Z" fill="#2BA471" /><path d="M82 58 V82 L70 70 Z" fill="#F5B400" /><path d="M82 82 H58 L70 70 Z" fill="#3E7BFA" /><path d="M58 82 V58 L70 70 Z" fill="#E5484D" />
    </g>
    <g transform="translate(250 112) rotate(14)">
      <rect width="40" height="40" rx="9" fill="#FFFFFF" stroke="#D9D6CE" strokeWidth="2" />
      <g fill="#15182B"><circle cx="11" cy="11" r="4" /><circle cx="29" cy="11" r="4" /><circle cx="20" cy="20" r="4" /><circle cx="11" cy="29" r="4" /><circle cx="29" cy="29" r="4" /></g>
    </g>
    <g transform="translate(46 108)">
      <ellipse cx="12" cy="40" rx="12" ry="4" fill="rgba(0,0,0,0.2)" />
      <path d="M2 38 C3 28 7 24 8 18 H16 C17 24 21 28 22 38 Z" fill="#E5484D" /><circle cx="12" cy="11" r="8" fill="#E5484D" />
    </g>
  </svg>
)

const SnakesArt = (
  <svg viewBox="0 0 320 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="320" height="190" fill="#DDF2E7" />
    <g>{Array.from({ length: 40 }, (_, i) => {
      const r = Math.floor(i / 8), c = i % 8
      return <rect key={i} x={c * 40} y={r * 40 - 10} width="40" height="40" fill={(r + c) % 2 ? '#FFF8EC' : '#DDF2E7'} />
    })}</g>
    <g stroke="#6B3F18" strokeWidth="6" strokeLinecap="round"><line x1="70" y1="190" x2="140" y2="20" /><line x1="98" y1="190" x2="168" y2="20" /></g>
    <g stroke="#C8894A" strokeWidth="4" strokeLinecap="round">{[0, 1, 2, 3, 4, 5].map((k) => <line key={k} x1={77 + k * 11} y1={172 - k * 27} x2={105 + k * 11} y2={172 - k * 27} />)}</g>
    <path d="M250 30 C200 60 290 100 230 150 C210 166 196 170 186 176" fill="none" stroke="#2C5A14" strokeWidth="16" strokeLinecap="round" />
    <path d="M250 30 C200 60 290 100 230 150 C210 166 196 170 186 176" fill="none" stroke="#4E9A2B" strokeWidth="12" strokeLinecap="round" />
    <circle cx="252" cy="28" r="12" fill="#4E9A2B" stroke="#2C5A14" strokeWidth="2" />
    <circle cx="248" cy="24" r="3" fill="#F7E36A" /><circle cx="257" cy="25" r="3" fill="#F7E36A" />
    <path d="M262 30 l10 2 m0 0 l4 -3 m-4 3 l4 3" stroke="#D7263D" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const LudoHdArt = (
  <svg viewBox="0 0 320 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="320" height="190" fill="#2A1F3D" />
    <circle cx="40" cy="30" r="46" fill="#3E7BFA" opacity="0.22" /><circle cx="292" cy="170" r="56" fill="#E5484D" opacity="0.2" />
    <circle cx="282" cy="24" r="30" fill="#F2B10C" opacity="0.18" />
    <g transform="translate(108 30) rotate(8 52 64)">
      <rect width="104" height="104" rx="18" fill="#FFF8EE" />
      <rect x="8" y="8" width="40" height="40" rx="10" fill="#E5484D" /><rect x="56" y="8" width="40" height="40" rx="10" fill="#2FA46C" />
      <rect x="56" y="56" width="40" height="40" rx="10" fill="#F2B10C" /><rect x="8" y="56" width="40" height="40" rx="10" fill="#3E7BFA" />
      <circle cx="52" cy="52" r="12" fill="#FFFFFF" />
    </g>
    <g transform="translate(58 116) rotate(-14)">
      <rect width="44" height="44" rx="11" fill="#FFFFFF" />
      <g fill="#2A1F3D"><circle cx="12" cy="12" r="4.5" /><circle cx="32" cy="12" r="4.5" /><circle cx="12" cy="22" r="4.5" /><circle cx="32" cy="22" r="4.5" /><circle cx="12" cy="32" r="4.5" /><circle cx="32" cy="32" r="4.5" /></g>
    </g>
    <g transform="translate(232 112) rotate(12)">
      <rect width="34" height="34" rx="9" fill="#FFFFFF" />
      <g fill="#2A1F3D"><circle cx="9" cy="9" r="3.5" /><circle cx="17" cy="17" r="3.5" /><circle cx="25" cy="25" r="3.5" /></g>
    </g>
  </svg>
)

function cricketBest() {
  try { const b = JSON.parse(read('rcBest') || 'null'); return b?.runs ? `${b.runs} runs` : '—' } catch { return '—' }
}

const CARDS: Card[] = [
  { id: 'cricket', name: 'Reality Cricket T20', href: '/cricket/', desc: 'T20 cricket in 3D. Swipe to play every shot, aim your bowling, or play a full match with a toss, DRS reviews and scorecards.', tags: ['Sports', '3D', 'Cricket'], filters: ['Sports'], best: cricketBest, art: CricketArt },
  { id: 'ludo', name: 'Ludo', href: '/ludo', spa: true, desc: 'Roll a 6 to leave your yard, capture rivals and race all four tokens home. Play on one phone, vs the computer or online.', tags: ['Board game', 'Online'], filters: ['Board games'], best: () => '2–4 players', art: LudoArt },
  { id: 'ludo-hd', name: 'Ludo HD', href: '/ludo-hd/', desc: 'Ludo with crisp HD graphics. Play the computer, or make a room and share its ID so friends can join from anywhere.', tags: ['Board game', 'Online'], filters: ['Board games'], best: () => '2–4 players', art: LudoHdArt },
  { id: 'snakes', name: 'Snakes & Ladders', href: '/snakes-and-ladders', spa: true, desc: 'Roll a 1 to enter, climb the ladders, dodge the snakes and land exactly on 100. With friends or online.', tags: ['Board game', 'Online'], filters: ['Board games'], best: () => '2–4 players', art: SnakesArt },
  { id: 'fry', name: 'Fry Defender', href: '/fry-defender/', desc: 'Pigeons want your fries. Bonk them before they grab one, and whatever you do, do not bonk the cat.', tags: ['Tap', 'Reflexes'], filters: ['Tap'], best: () => num('silly-pigeons-best'), art: FryArt },
  { id: 'sneeze', name: 'Sneeze Rocket', href: '/sneeze-rocket/', desc: 'Hold to build up a sneeze, let go and launch yourself into the sky. Hold too long and it misfires.', tags: ['Hold & release', 'Distance'], filters: ['Hold & release'], best: () => num('silly-sneeze-best', ' m'), art: SneezeArt },
  { id: 'cats', name: 'Cat Tower', href: '/cat-tower/', desc: 'Stack cats as high as you can. Every cat has a name, and none of them are happy about it.', tags: ['Timing', 'Stacking'], filters: ['Timing'], best: () => num('silly-cats-best'), art: CatsArt },
]
const FILTERS = ['All', 'Board games', 'Sports', 'Tap', 'Hold & release', 'Timing']
const FEATURED = CARDS[0]

function Ico({ d, fill }: { d: string; fill?: boolean }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
}
const I = {
  play: 'M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z',
  code: 'M8 7l-5 5 5 5M16 7l5 5-5 5',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  frame: 'M4 5h16v14H4zM9 10l-2 2 2 2M15 10l2 2-2 2',
  sound: 'M11 5L6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13',
  phone: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',
  ticket: 'M4 8a2 2 0 0 0 0 4v4h16v-4a2 2 0 0 0 0-4V4H4zM9 4v12',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18',
}

export function Hub({ onOpen, onOnline }: { onOpen: (path: string) => void; onOnline: (r: Room, code: string) => void }) {
  const [filter, setFilter] = useState('All')
  const [menu, setMenu] = useState(false)
  const [name, setName] = useName()
  const [, setTick] = useState(0)
  // Refresh best scores when coming back from a game in another tab or via back navigation.
  useEffect(() => {
    const on = () => setTick((t) => t + 1)
    window.addEventListener('pageshow', on)
    window.addEventListener('focus', on)
    return () => { window.removeEventListener('pageshow', on); window.removeEventListener('focus', on) }
  }, [])

  const shown = useMemo(() => CARDS.filter((c) => filter === 'All' || c.filters.includes(filter)), [filter])
  const open = (c: Card) => (e: MouseEvent) => { if (c.spa) { e.preventDefault(); onOpen(c.href) } }

  return (
    <div className="hub">
      <header className="hub-nav">
        <div className="hub-wrap hub-nav-row">
          <a href={SITE} className="hub-logo" aria-label="CodesPanda home"><img src="/logo-160.webp" alt="CodesPanda" width="40" height="40" /></a>
          <nav className="hub-links" aria-label="Main">
            <a href={`${SITE}/templates`}>Templates</a>
            <a href={`${SITE}/templates?type=admin`}>Admin panels</a>
            <a href="/" aria-current="page" className="on">Games</a>
            <a href={`${SITE}/blog`}>Blog</a>
          </nav>
          <a className="hub-btn hub-btn-sm hub-hide-sm" href={`${SITE}/templates`}>Browse templates</a>
          <button type="button" className="hub-menu-btn" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} onClick={() => setMenu(!menu)}>
            <Ico d={menu ? I.close : I.menu} />
          </button>
        </div>
        {menu && (
          <nav className="hub-drawer" aria-label="Main">
            <a href={`${SITE}/templates`}>Templates</a>
            <a href={`${SITE}/templates?type=admin`}>Admin panels</a>
            <a href="/" aria-current="page">Games</a>
            <a href={`${SITE}/blog`}>Blog</a>
            <a className="hub-btn" href={`${SITE}/templates`}>Browse templates</a>
          </nav>
        )}
      </header>

      <main>
        <section className="hub-wrap hub-hero">
          <div className="hub-hero-text">
            <span className="hub-pill"><Ico d={I.ticket} />Free to play · no sign-up</span>
            <h1>Silly little <span>games</span> for your coffee break</h1>
            <p>Seven free browser games: quick arcade bonks, a 3D T20 cricket match, and Ludo and Snakes &amp; Ladders to play with friends online. Nothing to install: open one on your phone, turn the sound on and play.</p>
            <div className="hub-hero-cta">
              <a className="hub-btn" href={FEATURED.href} onClick={open(FEATURED)}><Ico d={I.play} fill />Play {FEATURED.name}</a>
              <a className="hub-btn hub-btn-ghost hub-hide-sm" href="#under-the-hood"><Ico d={I.code} />See how they’re built</a>
            </div>
          </div>
          <a className="hub-featured hub-hide-sm" href={FEATURED.href} onClick={open(FEATURED)}>
            <div className="hub-featured-art">{FEATURED.art}</div>
            <div className="hub-featured-bar">
              <div><span className="hub-eyebrow">Featured</span><strong>{FEATURED.name}</strong></div>
              <span className="hub-btn hub-btn-sm">Play now</span>
            </div>
          </a>
        </section>

        <section className="hub-wrap hub-games" aria-labelledby="all-games">
          <div className="hub-games-head">
            <div>
              <h2 id="all-games">All games</h2>
              <p>Each one runs full-screen on a phone and remembers your best score.</p>
            </div>
            <div className="hub-filters" role="group" aria-label="Filter games">
              {FILTERS.map((f) => (
                <button key={f} type="button" className={filter === f ? 'on' : ''} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>
              ))}
            </div>
          </div>

          <div className="hub-grid">
            {shown.map((c) => (
              <article key={c.id} className="hub-card">
                <a href={c.href} onClick={open(c)} className="hub-card-art" tabIndex={-1} aria-hidden="true">{c.art}</a>
                <div className="hub-card-body">
                  <div className="hub-tags">{c.tags.map((t) => <span key={t}>{t}</span>)}</div>
                  <h3><a href={c.href} onClick={open(c)}>{c.name}</a></h3>
                  <p>{c.desc}</p>
                  <div className="hub-card-foot">
                    <span className="hub-best"><Ico d={I.trophy} />{c.spa ? c.best() : `Best: ${c.best()}`}</span>
                    <a className="hub-btn hub-btn-sm" href={c.href} onClick={open(c)} aria-label={`Play ${c.name}`}>Play</a>
                  </div>
                </div>
              </article>
            ))}
            {filter === 'All' && (
              <article className="hub-card hub-card-next">
                <span className="hub-plus"><Ico d={I.plus} /></span>
                <h3>Next game: you pick</h3>
                <p>We add a new game when inspiration (or procrastination) strikes. Tell us what we should build next.</p>
                <a href="mailto:contact@codespanda.com?subject=Game%20idea%20for%20CodesPanda%20Games">Suggest a game →</a>
              </article>
            )}
          </div>

          {onlineAvailable && (
            <div className="hub-join">
              <div className="hub-join-text">
                <h3><Ico d={I.globe} />Got a room code?</h3>
                <p>A friend made a Ludo or Snakes &amp; Ladders room and sent you its 4-letter code. Enter it to join their game.</p>
              </div>
              <div className="hub-join-form">
                <NameField name={name} setName={setName} />
                <JoinForm name={name} onOnline={onOnline} />
              </div>
            </div>
          )}
        </section>

        <section id="under-the-hood" className="hub-under">
          <div className="hub-wrap">
            <span className="hub-eyebrow">Under the hood</span>
            <h2>Small games, built the way we build templates</h2>
            <p className="hub-lead">No game engine to download. Every game is a web page that loads in seconds and works offline once it’s open.</p>
            <div className="hub-features">
              <div><span className="hub-feat-ico"><Ico d={I.frame} /></span><h3>Drawn live</h3><p>Canvas 2D for the arcade games, crisp SVG boards, and three.js for 3D cricket, sharp on any screen.</p></div>
              <div><span className="hub-feat-ico"><Ico d={I.sound} /></span><h3>A tiny synth</h3><p>Bonks, dice rattles and crowd roars come from the Web Audio API, generated live. Not a single sound file to download.</p></div>
              <div><span className="hub-feat-ico"><Ico d={I.trophy} /></span><h3>Remembers your best</h3><p>High scores are saved on your device, so this page shows your best for each game. No account needed.</p></div>
              <div><span className="hub-feat-ico"><Ico d={I.phone} /></span><h3>Made for phones</h3><p>One-thumb controls and safe-area aware layouts. Add a game to your Home Screen to play it full-screen.</p></div>
            </div>
          </div>
        </section>

        <section className="hub-wrap hub-cta-wrap">
          <div className="hub-cta">
            <div>
              <h2>Enjoyed the break? Ship your next project faster.</h2>
              <p>Production-ready React templates built with Vite and Tailwind CSS, with the same attention to detail.</p>
            </div>
            <a className="hub-btn hub-btn-white" href={`${SITE}/templates`}>Browse templates <Ico d={I.arrow} /></a>
          </div>
        </section>
      </main>

      <footer className="hub-footer">
        <div className="hub-wrap hub-footer-row">
          <a href={SITE} className="hub-logo" aria-label="CodesPanda home"><img src="/logo-160.webp" alt="CodesPanda" width="36" height="36" /></a>
          <nav aria-label="Footer">
            <a href={`${SITE}/templates`}>Templates</a>
            <a href="/">Games</a>
            <a href={`${SITE}/blog`}>Blog</a>
            <a href="mailto:contact@codespanda.com">Contact</a>
          </nav>
          <span className="hub-copy">© 2026 CodesPanda</span>
        </div>
      </footer>
    </div>
  )
}
