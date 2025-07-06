// CommonJS version: copy .ttf fonts from dist/assets/fonts to dist root
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
    fs.copyFileSync(path.join(fontsSrcDir, file), path.join(distDir, file));
  }
});

console.log('Font files copied to dist root.');
