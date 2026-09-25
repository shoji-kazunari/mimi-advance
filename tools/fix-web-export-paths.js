#!/usr/bin/env node
// `expo export -p web`はindex.html/JSバンドルの中に、ホスティングのルート直下を前提にした
// 絶対パス(例: `/favicon.ico`, `/_expo/static/js/web/....js`, `"/assets/assets/....png"`)を
// 埋め込む。GitHub Pagesのプロジェクトサイト(https://<user>.github.io/<repo>/のようにサブパス
// 配信になる)やClaude Artifactのようにルート直下で配信される保証がない環境だと、これが原因で
// アセットが404になる。相対パスに変換すれば配信階層に依存しなくなるため、ビルドのたびにこの
// スクリプトで後処理する。
const fs = require('fs');
const path = require('path');

const distDir = process.argv[2] || 'dist';

function toRelative(content) {
  return content
    .replace(/(src|href)="\/(?!\/)/g, '$1="')
    .replace(/"\/assets\/assets\//g, '"assets/assets/');
}

function walk(dir, onFile) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, onFile);
    else onFile(full);
  }
}

let fixedCount = 0;
walk(distDir, (file) => {
  if (!/\.(html|js)$/.test(file)) return;
  const original = fs.readFileSync(file, 'utf-8');
  const fixed = toRelative(original);
  if (fixed !== original) {
    fs.writeFileSync(file, fixed, 'utf-8');
    fixedCount += 1;
  }
});

console.log(`fix-web-export-paths: rewrote absolute paths to relative in ${fixedCount} file(s) under ${distDir}/`);
