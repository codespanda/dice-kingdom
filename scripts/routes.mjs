// After `vite build`: give each game its own static page (so search engines and shared links
// see the right title and description), plus a 404.html fallback for GitHub Pages.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const ROUTES = [
  {
    path: 'ludo',
    title: 'Play Ludo Online Free — with Friends or the Computer | CodesPanda Games',
    description: 'Play Ludo free in your browser: pass and play on one phone, against the computer, or online with friends using a room code.',
  },
  {
    path: 'snakes-and-ladders',
    title: 'Play Snakes and Ladders Online Free | CodesPanda Games',
    description: 'Play Snakes and Ladders free in your browser: on one phone, against the computer, or online with friends using a room code.',
  },
]

const html = readFileSync('dist/index.html', 'utf8')
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

for (const r of ROUTES) {
  const url = `https://games.codespanda.com/${r.path}`
  const page = html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(r.title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*"/, `$1${esc(r.description)}"`)
    .replace(/(<link rel="canonical" href=")[^"]*"/, `$1${url}"`)
    .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${esc(r.title)}"`)
    .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${esc(r.description)}"`)
    .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${url}"`)
  mkdirSync(`dist/${r.path}`, { recursive: true })
  writeFileSync(`dist/${r.path}/index.html`, page)
}
writeFileSync('dist/404.html', html.replace('<head>', '<head>\n    <meta name="robots" content="noindex" />'))

const today = new Date().toISOString().slice(0, 10)
writeFileSync('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${['', ...ROUTES.map((r) => r.path)].map((p) => `  <url><loc>https://games.codespanda.com/${p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`)
writeFileSync('dist/robots.txt', 'User-agent: *\nAllow: /\n\nSitemap: https://games.codespanda.com/sitemap.xml\n')
console.log(`✓ wrote ${ROUTES.length} game pages, 404.html, sitemap.xml and robots.txt`)
