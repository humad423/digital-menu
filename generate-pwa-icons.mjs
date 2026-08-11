import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Vibrant Radiant Orange Gradient -->
    <linearGradient id="pwaBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF8A00"/>
      <stop offset="50%" stop-color="#FF5500"/>
      <stop offset="100%" stop-color="#E53900"/>
    </linearGradient>

    <!-- Soft Drop Shadow Filter -->
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#000000" flood-opacity="0.25"/>
    </filter>
  </defs>

  <!-- Squircle Base Tile -->
  <rect width="512" height="512" rx="108" ry="108" fill="url(#pwaBgGrad)"/>

  <!-- Top-Left Concentric Radar / Wave Rings -->
  <g opacity="0.95">
    <circle cx="120" cy="120" r="120" fill="none" stroke="rgba(255, 255, 255, 0.08)" stroke-width="26"/>
    <circle cx="120" cy="120" r="80" fill="none" stroke="rgba(255, 255, 255, 0.12)" stroke-width="22"/>
    <circle cx="120" cy="120" r="44" fill="none" stroke="rgba(255, 255, 255, 0.16)" stroke-width="18"/>
    <circle cx="120" cy="120" r="18" fill="rgba(255, 255, 255, 0.20)"/>
  </g>

  <!-- Main Symbol: Calligraphic 'أ' -->
  <g filter="url(#softShadow)" fill="#FFFFFF">
    <!-- Calligraphic Hamza (ء) -->
    <path d="
      M 242 118
      C 240 102, 252 86, 270 86
      C 288 86, 298 98, 294 114
      C 290 126, 278 132, 264 132
      C 256 132, 248 128, 242 118
      Z
      M 238 134
      C 254 128, 278 126, 298 118
      C 284 144, 254 156, 232 154
      C 246 148, 264 142, 282 138
      Z
    "/>

    <!-- Calligraphic Alef Stem (|) -->
    <path d="
      M 252 176
      C 256 176, 264 180, 267 192
      C 272 232, 274 278, 275 324
      C 276 346, 272 368, 248 398
      C 243 404, 239 401, 241 395
      C 252 362, 258 316, 257 270
      C 256 234, 253 198, 249 184
      C 248 178, 250 176, 252 176
      Z
    "/>

    <!-- Text Component for 'أ' fallback if system font provides even higher precision calligraphic typography -->
    <text x="256" y="380" font-family="'Amiri', 'Traditional Arabic', 'Arabic Typesetting', 'Segoe UI', sans-serif" font-size="270" font-weight="bold" text-anchor="middle" dominant-baseline="central" opacity="0.0">أ</text>
  </g>

  <!-- Bottom Label: - 1 0 0 0 - -->
  <g filter="url(#softShadow)" transform="translate(256, 432)">
    <!-- Dash Left -->
    <rect x="-118" y="-4" width="20" height="4" rx="2" fill="#FFFFFF"/>
    
    <!-- Numbers '1 0 0 0' -->
    <text x="0" y="8" font-family="'Segoe UI', system-ui, -apple-system, sans-serif" font-size="34" font-weight="900" text-anchor="middle" fill="#FFFFFF" letter-spacing="14">1000</text>
    
    <!-- Dash Right -->
    <rect x="98" y="-4" width="20" height="4" rx="2" fill="#FFFFFF"/>
  </g>
</svg>`

async function run() {
  const publicDir = path.join(__dirname, 'public')
  
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent)
  fs.writeFileSync(path.join(publicDir, 'pwa-icon.svg'), svgContent)

  const svgBuffer = Buffer.from(svgContent)

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'))

  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'))

  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'))

  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'shortcut-192.png'))

  console.log('✅ Generated all PWA icons successfully!')
}

run().catch(console.error)
