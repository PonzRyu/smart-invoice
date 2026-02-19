/**
 * Electron ビルド後: .js を .cjs にリネーム
 * package.json の "type": "module" 環境下で .js が ESM 扱いになるのを回避
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'dist-electron');
const files = ['main.js', 'preload.js'];

for (const file of files) {
  const from = path.join(dir, file);
  const to = path.join(dir, file.replace(/\.js$/, '.cjs'));
  if (fs.existsSync(from)) {
    fs.renameSync(from, to);
    console.log(`Renamed ${file} -> ${path.basename(to)}`);
  }
}
