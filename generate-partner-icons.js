const sharp = require('sharp')
const path = require('path')

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="128" fill="#052e16"/>
  <circle cx="256" cy="256" r="200" fill="url(#gp)"/>
  <defs>
    <linearGradient id="gp" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#16a34a"/>
      <stop offset="100%" stop-color="#4ade80"/>
    </linearGradient>
  </defs>
  <text x="256" y="325" font-family="Arial, sans-serif" font-size="220" font-weight="900" text-anchor="middle" fill="#FFFFFF">\u0634</text>
</svg>`

async function generate() {
  const svgBuf = Buffer.from(svgContent)

  await sharp(svgBuf)
    .resize(192, 192)
    .png()
    .toFile(path.join(__dirname, 'public', 'partner-icon-192.png'))

  await sharp(svgBuf)
    .resize(512, 512)
    .png()
    .toFile(path.join(__dirname, 'public', 'partner-icon-512.png'))

  // Also create apple-touch-icon size (180x180)
  await sharp(svgBuf)
    .resize(180, 180)
    .png()
    .toFile(path.join(__dirname, 'public', 'partner-apple-touch-icon.png'))

  console.log('✅ Partner icons generated successfully')
}

generate().catch(console.error)
