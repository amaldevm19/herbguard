// scripts/generate-icons.js
// Run once: node scripts/generate-icons.js

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const svgPath  = path.join(__dirname, '..', 'public', 'icons', 'icon.svg');
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
const svgBuffer = fs.readFileSync(svgPath);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generate() {
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));
    console.log(`✅ icon-${size}x${size}.png`);
  }

  // Also generate favicon
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(iconsDir, 'favicon-32.png'));

  console.log('\n🌿 All icons generated!');
}

generate().catch(console.error);