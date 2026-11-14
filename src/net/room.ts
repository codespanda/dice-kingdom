import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import { applyAction, newGame, rollDie, type Action, type GameKind, type GameState } from '../games/engine'

// Online rooms over Supabase Realtime (broadcast + presence; nothing is stored in the database).
// The player who creates a room is the host: their device holds the official game state, applies
// every move and broadcasts the result. Other players send their roll/move requests to the host.

export type Seat = { id: string; name: string; cpu: boolean }
export type RoomSnap = {
  code: string
  hostId: string
  game: GameKind
  size: number
  seats: Seat[]
  status: 'lobby' | 'playing'
  state: GameState | null
  v: number
}
export type RoomView = { snap: RoomSnap | null; error: string | null; hostLeft: boolean; online: string[] }

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const onlineAvailable = Boolean(URL && KEY)

let client: SupabaseClient | null = null
const supa = () => (client ??= createClient(URL!, KEY!, { realtime: { params: { eventsPerSecond: 20 } } }))

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
export const makeCode = () => Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('')
export const cleanCode = (c: string) => c.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)
const cleanName = (n: string) => n.replace(/\s+/g, ' ').trim().slice(0, 16) || 'Player'

export const myId = (() => {
  try {
    const saved = sessionStorage.getItem('dk-id')
    if (saved) return saved
    const id = crypto.randomUUID()
    sessionStorage.setItem('dk-id', id)
    return id
  } catch {
    return crypto.randomUUID()
  }
})()

export class Room {
  view: RoomView = { snap: null, error: null, hostLeft: false, online: [] }
  private ch: RealtimeChannel
  private listeners = new Set<() => void>()
  private isHost: boolean
  private name: string
  private joinTimer: number | null = null

  constructor(code: string, name: string, host: boolean) {
    this.isHost = host
    this.name = cleanName(name)
    if (host) {
      this.view = {
        ...this.view,
        snap: { code, hostId: myId, game: 'ludo', size: 4, seats: [{ id: myId, name: this.name, cpu: false }], status: 'lobby', state: null, v: 1 },
      }
    }
    this.ch = supa().channel(`dk-room-${code}`, { config: { broadcast: { self: false }, presence: { key: myId } } })
    this.ch
      .on('broadcast', { event: 'snap' }, ({ payload }) => this.onSnap(payload as RoomSnap))
      .on('broadcast', { event: 'hello' }, () => { if (this.isHost) this.send() })
      .on('broadcast', { event: 'intent' }, ({ payload }) => this.onIntent(payload as { from: string; action: Action }))
      .on('presence', { event: 'sync' }, () => this.onPresence())
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await this.ch.track({ id: myId, name: this.name, host: this.isHost })
          if (this.isHost) this.send()
          else {
            void this.ch.send({ type: 'broadcast', event: 'hello', payload: {} })
            this.joinTimer = window.setTimeout(() => {
              if (!this.view.snap) this.set({ error: 'Room not found. Check the code and that the host has the room open.' })
            }, 7000)
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.set({ error: 'Could not connect to the game server. Check your internet connection.' })
        }
      })
  }

  get amHost() { return this.isHost }
  get mySeat() { return this.view.snap?.seats.findIndex((s) => s.id === myId) ?? -1 }

  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  getView = () => this.view

  private set(p: Partial<RoomView>) {
    this.view = { ...this.view, ...p }
    this.listeners.forEach((l) => l())
  }

  private send() {
    if (this.view.snap) void this.ch.send({ type: 'broadcast', event: 'snap', payload: this.view.snap })
  }

  private update(snap: RoomSnap) {
    this.set({ snap: { ...snap, v: snap.v + 1 } })
    this.send()
  }

  private onSnap(snap: RoomSnap) {
    if (this.isHost) return
    if (this.joinTimer) { window.clearTimeout(this.joinTimer); this.joinTimer = null }
    if (this.view.snap && snap.v < this.view.snap.v) return
    this.set({ snap, error: null })
  }

  private onPresence() {
    const state = this.ch.presenceState<{ id: string; name: string; host: boolean }>()
    const people = Object.values(state).map((list) => list[0]).filter(Boolean)
    const online = people.map((p) => p.id)
    this.set({ online })
    const snap = this.view.snap
    if (!snap) return
    if (!this.isHost) {
      if (!online.includes(snap.hostId)) this.set({ hostLeft: true })
      return
    }
    let seats = snap.seats
    if (snap.status === 'lobby') {
      // Seat new arrivals in join order (up to 4), drop people who left.
      seats = seats.filter((s) => s.cpu || online.includes(s.id))
      for (const p of people) {
        if (!seats.some((s) => s.id === p.id) && seats.filter((s) => !s.cpu).length < 4) seats = [...seats, { id: p.id, name: cleanName(p.name), cpu: false }]
      }
      seats = [...seats.filter((s) => !s.cpu), ...seats.filter((s) => s.cpu)].slice(0, 4)
    } else {
      // A player who drops out mid-game is replaced by the computer.
      seats = seats.map((s) => (!s.cpu && !online.includes(s.id) ? { ...s, cpu: true, name: `${s.name} (bot)` } : s))
    }
    if (JSON.stringify(seats) !== JSON.stringify(snap.seats)) {
      let next = { ...snap, seats }
      if (snap.state) next = { ...next, state: { ...snap.state, names: seats.map((s) => s.name) } as GameState }
      this.update(next)
    }
  }

  private onIntent({ from, action }: { from: string; action: Action }) {
    const snap = this.view.snap
    if (!this.isHost || !snap?.state || snap.status !== 'playing') return
    if (snap.seats[snap.state.turn]?.id !== from) return
    const a: Action = action.t === 'roll' ? { t: 'roll', d: rollDie() } : action.t === 'move' ? { t: 'move', token: Number(action.token) } : { t: 'pass' }
    this.apply(a)
  }

  /** Host only: apply an action to the official state and share it. */
  apply(a: Action) {
    const snap = this.view.snap
    if (!this.isHost || !snap?.state) return
    const state = applyAction(snap.state, a)
    if (state !== snap.state) this.update({ ...snap, state })
  }

  /** Any player: roll or move on your own turn. */
  act(a: Action) {
    if (this.isHost) this.apply(a.t === 'roll' ? { t: 'roll', d: rollDie() } : a)
    else void this.ch.send({ type: 'broadcast', event: 'intent', payload: { from: myId, action: a } })
  }

  setup(p: { game?: GameKind; size?: number }) {
    const snap = this.view.snap
    if (!this.isHost || !snap || snap.status !== 'lobby') return
    this.update({ ...snap, ...p })
  }

  start() {
    const snap = this.view.snap
    if (!this.isHost || !snap) return
    const humans = snap.seats.filter((s) => !s.cpu)
    const size = Math.max(2, humans.length, Math.min(4, snap.size))
    const seats = [...humans]
    for (let k = 1; seats.length < size; k++) seats.push({ id: `cpu-${k}`, name: `Computer ${k}`, cpu: true })
    this.update({ ...snap, seats, status: 'playing', state: newGame(snap.game, seats.map((s) => s.name)) })
  }

  backToLobby() {
    const snap = this.view.snap
    if (!this.isHost || !snap) return
    this.update({ ...snap, seats: snap.seats.filter((s) => !s.cpu && !s.name.endsWith('(bot)')), status: 'lobby', state: null })
  }

  async leave() {
    if (this.joinTimer) window.clearTimeout(this.joinTimer)
    try { await this.ch.untrack() } catch { /* ignore */ }
    await supa().removeChannel(this.ch)
    this.listeners.clear()
  }
}
