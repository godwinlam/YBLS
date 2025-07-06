// Copy all .ttf files from dist/assets/fonts to dist root so that
// runtime requests like /Ionicons.<hash>.ttf resolve correctly on static hosts.
// Run this after `expo export -p web`.

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const fontsSrcDir = path.join(distDir, 'assets', 'fonts');

if (!fs.existsSync(fontsSrcDir)) {
  console.warn('No fonts directory found in export, skipping font copy.');
  process.exit(0);
}

fs.readdirSync(fontsSrcDir).forEach((file) => {
  if (file.endsWith('.ttf')) {
    const src = path.join(fontsSrcDir, file);
    const dest = path.join(distDir, file);
    fs.copyFileSync(src, dest);
  }
});

console.log('Font files copied to dist root.');
