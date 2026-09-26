#!/usr/bin/env node
// ビルド済みのindex.htmlにGoogleアナリティクス(GA4)のタグを差し込む。
// 測定IDはリポジトリ直下のsite.config.jsonの1か所にだけ書く。
// expo exportが生成するindex.htmlはテンプレートを持たないため、ビルド後に文字列で挿入している。
// リポジトリ直下から実行する前提(npm run build:web経由)。
const fs = require('fs');
const path = require('path');

const distDir = process.argv[2] || 'dist';
const config = JSON.parse(fs.readFileSync('site.config.json', 'utf-8'));
const id = config.gaMeasurementId;

if (!/^G-[A-Z0-9]+$/.test(id || '')) {
  console.error(`inject-analytics: site.config.jsonのgaMeasurementIdが不正です: ${id}`);
  process.exit(1);
}

const file = path.join(distDir, 'index.html');
const html = fs.readFileSync(file, 'utf-8');

if (html.includes('googletagmanager.com/gtag/js')) {
  console.log('inject-analytics: すでに挿入済みのためスキップ');
  process.exit(0);
}
if (!html.includes('</head>')) {
  console.error('inject-analytics: index.htmlに</head>が見つかりません');
  process.exit(1);
}

const snippet = [
  `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>`,
  '<script>',
  '  window.dataLayer = window.dataLayer || [];',
  '  function gtag(){dataLayer.push(arguments);}',
  "  gtag('js', new Date());",
  `  gtag('config', '${id}');`,
  '</script>',
].join('\n');

fs.writeFileSync(file, html.replace('</head>', `${snippet}\n</head>`), 'utf-8');
console.log(`inject-analytics: GA4タグ(${id})を${file}に挿入しました`);
