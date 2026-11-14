import { LADDERS, SNAKES, squareCenter } from './snakes'

// Precomputed SVG paths for the wooden ladders and the tapered, banded snakes.

const f = (v: number) => v.toFixed(1)
const PALETTE = [['#4E9A2B', '#2C5A14', '#C9E07A'], ['#B5652B', '#4E2A10', '#F0C38A'], ['#D9A21B', '#5E3E06', '#F7E08F'], ['#B83A2E', '#4A140E', '#F2A08F']]

export const LADDER_ART = LADDERS.map(([from, to]) => {
  const a = squareCenter(from), b = squareCenter(to)
  const dx = b.x - a.x, dy = b.y - a.y
  let L = Math.hypot(dx, dy)
  const ux = dx / L, uy = dy / L, nx = -uy * 7.5, ny = ux * 7.5
  const x1 = a.x - ux * 6, y1 = a.y - uy * 6, x2 = b.x + ux * 6, y2 = b.y + uy * 6
  L += 12
  const rails = `M${f(x1 + nx)} ${f(y1 + ny)} L${f(x2 + nx)} ${f(y2 + ny)} M${f(x1 - nx)} ${f(y1 - ny)} L${f(x2 - nx)} ${f(y2 - ny)}`
  let rungs = ''
  const k = Math.floor(L / 11)
  for (let i = 1; i < k; i++) {
    const t = i / k, cx = x1 + (x2 - x1) * t, cy = y1 + (y2 - y1) * t
    rungs += `M${f(cx + nx)} ${f(cy + ny)} L${f(cx - nx)} ${f(cy - ny)} `
  }
  return { rails, rungs, all: `${rails} ${rungs}` }
})

export const SNAKE_ART = SNAKES.map(([head, tail], k) => {
  const [col, dark, belly] = PALETTE[k % PALETTE.length]
  const a = squareCenter(head), b = squareCenter(tail)
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, w = L * 0.28
  const P = [[a.x, a.y], [a.x + dx * 0.33 + nx * w, a.y + dy * 0.33 + ny * w], [a.x + dx * 0.66 - nx * w, a.y + dy * 0.66 - ny * w], [b.x, b.y]]
  const B = (t: number) => {
    const p = (1 - t) ** 3, q = 3 * t * (1 - t) ** 2, r = 3 * t * t * (1 - t), u = t ** 3
    return [p * P[0][0] + q * P[1][0] + r * P[2][0] + u * P[3][0], p * P[0][1] + q * P[1][1] + r * P[2][1] + u * P[3][1]]
  }
  const D = (t: number) => [
    3 * (1 - t) ** 2 * (P[1][0] - P[0][0]) + 6 * (1 - t) * t * (P[2][0] - P[1][0]) + 3 * t * t * (P[3][0] - P[2][0]),
    3 * (1 - t) ** 2 * (P[1][1] - P[0][1]) + 6 * (1 - t) * t * (P[2][1] - P[1][1]) + 3 * t * t * (P[3][1] - P[2][1]),
  ]
  const N = 48
  const left: number[][] = [], right: number[][] = []
  const pts: { x: number; y: number; px: number; py: number; tx: number; ty: number; wd: number }[] = []
  for (let i = 0; i <= N; i++) {
    const t = i / N, p = B(t), d = D(t), l = Math.hypot(d[0], d[1]) || 1
    const px = -d[1] / l, py = d[0] / l, wd = 5.6 * Math.pow(1 - t, 0.75) + 0.6
    left.push([p[0] + px * wd, p[1] + py * wd])
    right.push([p[0] - px * wd, p[1] - py * wd])
    pts.push({ x: p[0], y: p[1], px, py, tx: d[0] / l, ty: d[1] / l, wd })
  }
  const body = 'M' + left.concat(right.reverse()).map((q) => `${f(q[0])} ${f(q[1])}`).join(' L') + ' Z'
  let bands = '', spots = '', shine = ''
  for (let i = 4; i < N - 2; i += 4) {
    const c = pts[i], m = pts[i + 2]
    bands += `M${f(c.x + c.px * c.wd * 0.9)} ${f(c.y + c.py * c.wd * 0.9)} Q${f(c.x + c.tx * 2.4)} ${f(c.y + c.ty * 2.4)} ${f(c.x - c.px * c.wd * 0.9)} ${f(c.y - c.py * c.wd * 0.9)} `
    spots += `M${f(m.x - m.tx * 0.8)} ${f(m.y - m.ty * 0.8)} L${f(m.x + m.tx * 0.8)} ${f(m.y + m.ty * 0.8)} `
  }
  for (let i = 2; i < N - 2; i++) {
    const h = pts[i]
    shine += `${i === 2 ? 'M' : ' L'}${f(h.x - h.px * h.wd * 0.45)} ${f(h.y - h.py * h.wd * 0.45)}`
  }
  const d0 = D(0), l0 = Math.hypot(d0[0], d0[1]), ux = -d0[0] / l0, uy = -d0[1] / l0
  return {
    col, dark, belly, body, bands, spots, shine,
    head: `translate(${f(a.x + ux * 3)} ${f(a.y + uy * 3)}) rotate(${f((Math.atan2(uy, ux) * 180) / Math.PI)})`,
  }
})
