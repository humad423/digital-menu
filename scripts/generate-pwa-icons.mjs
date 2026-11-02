// Generates the app icons for the customer and partner apps.
//   npm run icons
//
// Three shapes per app: rounded for places that show the file as is, full-bleed
// with a safe margin for Android's maskable icons, and full-bleed for iOS, which
// rounds icons itself and doesn't accept transparency.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const rings = `
  <g opacity="0.95">
    <circle cx="120" cy="120" r="120" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="26"/>
    <circle cx="120" cy="120" r="80" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="22"/>
    <circle cx="120" cy="120" r="44" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="18"/>
    <circle cx="120" cy="120" r="18" fill="rgba(255,255,255,0.20)"/>
  </g>`

const footerMark = `
  <g filter="url(#shadow)" transform="translate(256, 432)">
    <rect x="-118" y="-4" width="20" height="4" rx="2" fill="#FFFFFF"/>
    <text x="0" y="8" font-family="'Segoe UI', system-ui, sans-serif" font-size="34" font-weight="900" text-anchor="middle" fill="#FFFFFF" letter-spacing="14">1000</text>
    <rect x="98" y="-4" width="20" height="4" rx="2" fill="#FFFFFF"/>
  </g>`

const apps = [
  {
    prefix: 'icon',
    apple: 'apple-touch-icon.png',
    stops: ['#FF8A00', '#FF5500', '#E53900'],
    glyph: `
      <path d="M 242 118 C 240 102, 252 86, 270 86 C 288 86, 298 98, 294 114 C 290 126, 278 132, 264 132 C 256 132, 248 128, 242 118 Z M 238 134 C 254 128, 278 126, 298 118 C 284 144, 254 156, 232 154 C 246 148, 264 142, 282 138 Z"/>
      <path d="M 252 176 C 256 176, 264 180, 267 192 C 272 232, 274 278, 275 324 C 276 346, 272 368, 248 398 C 243 404, 239 401, 241 395 C 252 362, 258 316, 257 270 C 256 234, 253 198, 249 184 C 248 178, 250 176, 252 176 Z"/>`,
  },
  {
    prefix: 'partner-icon',
    apple: 'partner-apple-touch-icon.png',
    stops: ['#22C55E', '#16A34A', '#15803D'],
    glyph: `
      <path d="M 378 178 C 370 216, 362 268, 368 288 C 345 304, 282 314, 206 312 C 162 310, 142 295, 128 248 C 123 234, 128 232, 134 242 C 146 274, 168 288, 218 288 C 285 288, 342 280, 350 264 C 348 238, 352 198, 366 174 C 369 168, 374 168, 378 178 Z"/>
      <circle cx="256" cy="365" r="16"/>`,
  },
]

function iconSvg(app, { radius, artScale }) {
  const [from, middle, to] = app.stops
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="50%" stop-color="${middle}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#000000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="${radius}" ry="${radius}" fill="url(#bg)"/>
  ${rings}
  <g transform="translate(256 256) scale(${artScale}) translate(-256 -256)">
    <g filter="url(#shadow)" fill="#FFFFFF">${app.glyph}</g>
    ${footerMark}
  </g>
</svg>`
}

const png = (svg, size, file) =>
  sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toFile(join(publicDir, file))

mkdirSync(publicDir, { recursive: true })

for (const app of apps) {
  const rounded = iconSvg(app, { radius: 108, artScale: 1 })
  // Android may crop to a circle, so everything stays inside the central 80%
  const maskable = iconSvg(app, { radius: 0, artScale: 0.78 })
  const appleIcon = iconSvg(app, { radius: 0, artScale: 0.9 })

  writeFileSync(join(publicDir, `${app.prefix}.svg`), rounded)
  await png(rounded, 192, `${app.prefix}-192.png`)
  await png(rounded, 512, `${app.prefix}-512.png`)
  await png(maskable, 192, `${app.prefix}-maskable-192.png`)
  await png(maskable, 512, `${app.prefix}-maskable-512.png`)
  await png(appleIcon, 180, app.apple)
}

console.log('Generated app icons')
