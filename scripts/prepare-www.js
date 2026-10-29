const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const wwwDir = path.resolve(rootDir, 'www');

// Clean and create www directory
if (fs.existsSync(wwwDir)) {
  fs.rmSync(wwwDir, { recursive: true, force: true });
}
fs.mkdirSync(wwwDir, { recursive: true });

// Assets to copy
const assets = ['index.html', 'manifest.json', 'sw.js', 'css', 'js', 'icons'];

for (const item of assets) {
  const src = path.resolve(rootDir, item);
  const dest = path.resolve(wwwDir, item);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
  }
}

console.log('✓ Web assets preparados exitosamente en carpeta www/');
