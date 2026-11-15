import { useEffect, useState } from 'react'
import { unlock } from '../audio'
import { cleanCode, Room } from '../net/room'

const load = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d } catch { return d } }
const save = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* ignore */ } }

export function roomFromUrl() {
  try { return cleanCode(new URLSearchParams(location.search).get('room') ?? '') } catch { return '' }
}

export function useName() {
  const [name, setName] = useState(load('dk-name', ''))
  useEffect(() => { save('dk-name', name) }, [name])
  return [name, setName] as const
}

export function NameField({ name, setName }: { name: string; setName: (v: string) => void }) {
  return (
    <label className="field">
      <span className="label">Your name</span>
      <input className="input" value={name} maxLength={16} placeholder="Player" onChange={(e) => setName(e.target.value)} autoComplete="nickname" />
    </label>
  )
}

export function JoinForm({ name, onOnline }: { name: string; onOnline: (r: Room, code: string) => void }) {
  const [code, setCode] = useState(roomFromUrl())
  const join = () => {
    unlock()
    const c = cleanCode(code)
    if (c.length === 4) onOnline(new Room(c, name.trim() || 'Player', false), c)
  }
  return (
    <div className="join">
      <label className="field grow">
        <span className="label">Room code</span>
        <input className="input code" value={code} placeholder="ABCD" maxLength={4} autoCapitalize="characters" autoComplete="off"
          onChange={(e) => setCode(cleanCode(e.target.value))} onKeyDown={(e) => { if (e.key === 'Enter') join() }} />
      </label>
      <button type="button" className="btn btn-gold" disabled={cleanCode(code).length !== 4} onClick={join}>Join</button>
    </div>
  )
}
