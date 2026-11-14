type Name = 'back' | 'sound' | 'mute' | 'pause' | 'trophy' | 'help' | 'logo' | 'share' | 'copy' | 'play' | 'globe' | 'users' | 'cpu' | 'arrow'

/** Inline stroke icons, sized in px; decorative unless the parent labels them. */
export function Icon({ name, size = 22 }: { name: Name; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  switch (name) {
    case 'back': return <svg {...common} strokeWidth={2.4}><path d="M15 6l-6 6 6 6" /></svg>
    case 'arrow': return <svg {...common} strokeWidth={2.4}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
    case 'sound': return <svg {...common}><path d="M11 5L6 9H3v6h3l5 4z" fill="currentColor" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></svg>
    case 'mute': return <svg {...common}><path d="M11 5L6 9H3v6h3l5 4z" fill="currentColor" /><path d="M16 9l6 6M22 9l-6 6" /></svg>
    case 'pause': return <svg {...common} fill="currentColor" stroke="none"><rect x="6" y="5" width="4" height="14" rx="1.5" /><rect x="14" y="5" width="4" height="14" rx="1.5" /></svg>
    case 'play': return <svg {...common} fill="currentColor" stroke="none"><path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z" /></svg>
    case 'help': return <svg {...common}><circle cx="12" cy="12" r="9.5" /><path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.4-2.7 4" /><circle cx="12" cy="17.4" r="0.6" fill="currentColor" /></svg>
    case 'share': return <svg {...common}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
    case 'copy': return <svg {...common}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
    case 'globe': return <svg {...common}><circle cx="12" cy="12" r="9.5" /><path d="M2.5 12h19M12 2.5c2.8 3 2.8 16 0 19M12 2.5c-2.8 3-2.8 16 0 19" /></svg>
    case 'users': return <svg {...common}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.9.7 3.1 2.4 3.5 5.2" /></svg>
    case 'cpu': return <svg {...common}><rect x="5" y="7" width="14" height="12" rx="3" /><path d="M12 3v4M9 12h.01M15 12h.01M9.5 16h5" /></svg>
    case 'trophy':
      return (
        <svg width={size} height={size} viewBox="0 0 168 168" aria-hidden="true">
          <path d="M52 40 H116 V70 C116 92 102 106 84 106 C66 106 52 92 52 70 Z" fill="#FFC53D" />
          <path d="M52 50 H36 C36 70 44 80 56 82" fill="none" stroke="#FFC53D" strokeWidth="7" strokeLinecap="round" />
          <path d="M116 50 H132 C132 70 124 80 112 82" fill="none" stroke="#FFC53D" strokeWidth="7" strokeLinecap="round" />
          <rect x="76" y="104" width="16" height="18" fill="#E0A600" />
          <rect x="58" y="120" width="52" height="14" rx="5" fill="#FFC53D" />
          <path d="M84 56 l5 10 11 1.5 -8 7.5 2 11 -10 -5.5 -10 5.5 2 -11 -8 -7.5 11 -1.5z" fill="#FFFFFF" />
        </svg>
      )
    case 'logo':
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
          <g transform="rotate(-8 20 20)">
            <rect x="3" y="3" width="34" height="34" rx="9" fill="#FFC53D" />
            <g fill="#14182E"><circle cx="12" cy="12" r="3" /><circle cx="28" cy="12" r="3" /><circle cx="20" cy="20" r="3" /><circle cx="12" cy="28" r="3" /><circle cx="28" cy="28" r="3" /></g>
          </g>
        </svg>
      )
  }
}
