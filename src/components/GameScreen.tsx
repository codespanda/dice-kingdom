import { useState } from 'react'
import { isMusicOn, isMuted, setMuted, setMusic, unlock } from '../audio'
import { useGameFx } from '../game/useGameFx'
import { rollDie, type Action, type GameState } from '../games/engine'
import { HOME, LUDO_COLORS, ordinal } from '../games/ludo'
import { SNAKE_PLAYER_COLORS } from '../games/snakes'
import { LudoBoard, SnakesBoard } from './Boards'
import { Die } from './Pieces'
import { Icon } from './Icon'

export type SeatInfo = { name: string; cpu: boolean; you: boolean; away?: boolean }

type Props = {
  state: GameState
  seats: SeatInfo[]
  /** Can this device play for that seat? */
  controls: (seat: number) => boolean
  onAction: (a: Action) => void
  onLeave: () => void
  onRestart?: () => void
  restartLabel?: string
  badge?: string
  waitingForHost?: boolean
}

export function GameScreen({ state, seats, controls, onAction, onLeave, onRestart, restartLabel = 'Play again', badge, waitingForHost }: Props) {
  const fx = useGameFx(state)
  const [menu, setMenu] = useState(false)
  const [muted, setMutedState] = useState(isMuted())
  const [music, setMusicState] = useState(isMusicOn())

  const colorOf = (seat: number) => (state.kind === 'ludo' ? LUDO_COLORS[state.colors[seat]] : SNAKE_PLAYER_COLORS[seat])
  const mine = controls(state.turn)
  const canRoll = mine && state.phase === 'roll' && !fx.busy
  const canPick = mine && state.kind === 'ludo' && state.phase === 'move'
  const cur = colorOf(state.turn)
  const over = state.phase === 'over' && !fx.busy

  const roll = () => { unlock(); if (canRoll) onAction({ t: 'roll', d: rollDie() }) }
  const pick = (token: number) => { unlock(); onAction({ t: 'move', token }) }

  const turnName = seats[state.turn]?.name ?? ''
  const rollLabel = fx.rolling ? 'Rolling…' : fx.busy ? 'Moving…' : state.phase === 'over' ? 'Game over'
    : !mine ? (seats[state.turn]?.cpu ? 'Computer is playing…' : `Waiting for ${turnName}…`)
    : state.phase === 'move' ? 'Pick a glowing token' : state.phase === 'roll' ? 'Roll dice' : 'Next player…'

  const standing = (seat: number) => {
    if (state.kind === 'ludo') {
      const place = state.finished.indexOf(seat)
      return place >= 0 ? ordinal(place + 1) : `${state.pos[seat].filter((p) => p === HOME).length}/4 home`
    }
    const p = state.pos[seat]
    return p === 0 ? 'Start' : `Square ${p}`
  }
  const winners = state.kind === 'ludo' ? state.finished : state.winner !== null ? [state.winner] : []

  return (
    <div className="screen game">
      <header className="topbar">
        <button type="button" className="icon-btn" aria-label="Leave game" onClick={onLeave}><Icon name="back" /></button>
        <div className="title">
          <h1>{state.kind === 'ludo' ? 'Ludo' : 'Snakes & Ladders'}</h1>
          {badge && <span className="badge">{badge}</span>}
        </div>
        <div className="row">
          <button type="button" className="icon-btn" aria-label={muted ? 'Turn sound on' : 'Mute sound'} aria-pressed={!muted}
            onClick={() => { const m = !muted; setMuted(m); setMutedState(m) }}>
            <Icon name={muted ? 'mute' : 'sound'} />
          </button>
          <button type="button" className="icon-btn" aria-label="Game menu" onClick={() => setMenu(true)}><Icon name="pause" /></button>
        </div>
      </header>

      <div className={seats.length > 2 ? 'players compact' : 'players'} style={{ gridTemplateColumns: `repeat(${seats.length}, minmax(0, 1fr))` }}>
        {seats.map((p, i) => (
          <div key={i} className={`player${i === state.turn && state.phase !== 'over' ? ' active' : ''}${p.away ? ' away' : ''}`}>
            <span className="dot" style={{ background: colorOf(i).hex }} />
            <div className="player-text">
              <span className="player-name">{p.name}{p.you && p.name !== 'You' ? ' (you)' : ''}</span>
              <span className="player-sub">{standing(i)}</span>
            </div>
          </div>
        ))}
      </div>

      {state.kind === 'ludo'
        ? <LudoBoard s={state} fx={fx} pickable={canPick} onPick={pick} />
        : <SnakesBoard s={state} fx={fx} />}

      <div className="status" role="status">
        <span className="dot small" style={{ background: cur.hex }} />
        <span>{fx.rolling ? 'Rolling…' : fx.busy && state.kind === 'snakes' ? 'Moving…' : state.msg}</span>
      </div>

      <div className="dice-panel">
        <Die face={fx.face} rolling={fx.rolling} ready={canRoll} onRoll={roll} label={canRoll ? 'Roll dice' : fx.face ? `Dice showing ${fx.face}` : 'Dice'} />
        <div className="dice-side">
          <span className="turn-title">{state.phase === 'over' ? 'Game over' : mine && seats.filter((s) => !s.cpu).length === 1 ? 'Your turn' : `${turnName}’s turn`}</span>
          <button type="button" className={canRoll ? 'btn btn-gold' : 'btn btn-muted'} disabled={!canRoll} onClick={roll}>{rollLabel}</button>
        </div>
      </div>

      {menu && (
        <div className="sheet-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setMenu(false) }}>
          <div className="sheet" role="dialog" aria-label="Game menu">
            <h2>Game menu</h2>
            <div className="setting">
              <span className="label">Music</span>
              <button type="button" className={music ? 'pill on' : 'pill'} aria-pressed={music}
                onClick={() => { const m = !music; setMusic(m); setMusicState(m) }}>{music ? 'On' : 'Off'}</button>
            </div>
            <div className="setting">
              <span className="label">Sound effects</span>
              <button type="button" className={!muted ? 'pill on' : 'pill'} aria-pressed={!muted}
                onClick={() => { const m = !muted; setMuted(m); setMutedState(m) }}>{muted ? 'Off' : 'On'}</button>
            </div>
            <div className="two">
              {onRestart && <button type="button" className="btn btn-outline" onClick={() => { setMenu(false); onRestart() }}>New game</button>}
              <button type="button" className="btn btn-gold" onClick={() => setMenu(false)}>Resume</button>
            </div>
            <button type="button" className="link-btn" onClick={onLeave}>Leave game</button>
          </div>
        </div>
      )}

      {over && (
        <div className="overlay-center">
          <div className="win-card" role="dialog" aria-label="Game over">
            <Icon name="trophy" size={96} />
            <span className="win-title">{seats[winners[0]]?.name ?? ''} wins!</span>
            {winners.length > 1 && (
              <div className="standings">
                {winners.slice(1).map((seat, k) => (
                  <span key={seat}><span className="dot small" style={{ background: colorOf(seat).hex }} />{ordinal(k + 2)} · {seats[seat]?.name}</span>
                ))}
              </div>
            )}
            {onRestart
              ? <button type="button" className="btn btn-gold big" onClick={onRestart}>{restartLabel}</button>
              : waitingForHost && <span className="muted">Waiting for the host to start the next game…</span>}
            <button type="button" className="link-btn" onClick={onLeave}>Back to home</button>
          </div>
        </div>
      )}
    </div>
  )
}
