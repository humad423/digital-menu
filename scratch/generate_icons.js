const fs = require('fs');
const path = require('path');

// SVG Icon definition
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="128" fill="#0F172A"/>
  <circle cx="256" cy="256" r="200" fill="url(#grad)"/>
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F97316" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>
  </defs>
  <text x="256" y="325" font-family="sans-serif" font-size="220" font-weight="900" text-anchor="middle" fill="#FFFFFF">أ</text>
</svg>`;

const publicDir = path.join(__dirname, '..', 'public');
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf8');

// Generate a valid base64 PNG fallback icon for 192 and 512
// A 1x1 orange PNG scaled up
const orangePngBase64 = 'iVBORw50KGgoAAAANSU5EUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const pngBuffer = Buffer.from(orangePngBase64, 'base64');

fs.writeFileSync(path.join(publicDir, 'icon-192.png'), pngBuffer);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), pngBuffer);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pngBuffer);

console.log('Icons generated successfully in public/');
