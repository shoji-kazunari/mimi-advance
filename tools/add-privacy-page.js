#!/usr/bin/env node
// tools/privacy.html を dist/privacy/index.html としてコピーする(公開URLは <サイト>/privacy/)。
// 外部へ送る情報(アクセス解析・広告など)を増やしたら、tools/privacy.html も必ず直すこと。
const fs = require('fs');
const path = require('path');

const distDir = process.argv[2] || 'dist';
const outDir = path.join(distDir, 'privacy');
fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(path.join(__dirname, 'privacy.html'), path.join(outDir, 'index.html'));
console.log(`add-privacy-page: ${path.join(outDir, 'index.html')} を作成しました`);
