import sharp from 'sharp'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const partnerSvgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Vibrant Emerald / Forest Green Gradient -->
    <linearGradient id="partnerBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22C55E"/>
      <stop offset="50%" stop-color="#16A34A"/>
      <stop offset="100%" stop-color="#15803D"/>
    </linearGradient>

    <!-- Soft Drop Shadow Filter -->
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#000000" flood-opacity="0.22"/>
    </filter>
  </defs>

  <!-- Squircle Base Tile Container -->
  <rect width="512" height="512" rx="108" ry="108" fill="url(#partnerBgGrad)"/>

  <!-- Top-Left Concentric Radar / Wave Rings -->
  <g opacity="0.95">
    <circle cx="120" cy="120" r="120" fill="none" stroke="rgba(255, 255, 255, 0.08)" stroke-width="26"/>
    <circle cx="120" cy="120" r="80" fill="none" stroke="rgba(255, 255, 255, 0.12)" stroke-width="22"/>
    <circle cx="120" cy="120" r="44" fill="none" stroke="rgba(255, 255, 255, 0.16)" stroke-width="18"/>
    <circle cx="120" cy="120" r="18" fill="rgba(255, 255, 255, 0.20)"/>
  </g>

  <!-- Main Symbol: Calligraphic Arabic 'ب' -->
  <g filter="url(#softShadow)" fill="#FFFFFF">
    <!-- Main Body of 'ب' -->
    <path d="
      M 378 178
      C 370 216, 362 268, 368 288
      C 345 304, 282 314, 206 312
      C 162 310, 142 295, 128 248
      C 123 234, 128 232, 134 242
      C 146 274, 168 288, 218 288
      C 285 288, 342 280, 350 264
      C 348 238, 352 198, 366 174
      C 369 168, 374 168, 378 178
      Z
    "/>

    <!-- Dot under 'ب' -->
    <circle cx="256" cy="365" r="16"/>

    <!-- Fallback Calligraphic text if font available -->
    <text x="256" y="270" font-family="'Amiri', 'Traditional Arabic', 'Arabic Typesetting', 'Segoe UI', sans-serif" font-size="280" font-weight="bold" text-anchor="middle" dominant-baseline="central" opacity="0.0">ب</text>
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
  
  fs.writeFileSync(path.join(publicDir, 'partner-icon.svg'), partnerSvgContent)

  const svgBuffer = Buffer.from(partnerSvgContent)

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'partner-icon-512.png'))

  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'partner-icon-192.png'))

  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'partner-apple-touch-icon.png'))

  console.log('✅ Generated all Partner PWA icons successfully!')
}

run().catch(console.error)
