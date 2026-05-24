import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '../public');
const svgPath = path.join(publicDir, 'logo.svg');

async function generateFavicon() {
  const sizes = [16, 32, 48, 64, 128, 256];

  try {
    // Generate PNG favicons
    for (const size of sizes) {
      await sharp(svgPath)
        .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toFile(path.join(publicDir, `favicon-${size}x${size}.png`));
      console.log(`✓ Generated favicon-${size}x${size}.png`);
    }

    // Generate standard favicon.ico from 32x32
    await sharp(svgPath)
      .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(path.join(publicDir, 'favicon.png'));

    console.log('✓ Generated favicon.png');
    console.log('\nFavicongenerated successfully!');
    console.log('Add these to your HTML <head>:');
    console.log('  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">');
    console.log('  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">');
    console.log('  <link rel="apple-touch-icon" href="/favicon-180x180.png">');
  } catch (error) {
    console.error('Error generating favicon:', error);
    process.exit(1);
  }
}

generateFavicon();
