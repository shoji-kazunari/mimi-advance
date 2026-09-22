import { Platform } from 'react-native';

/**
 * iOS Safari(claude.aiアプリ内のWebView含む)で、長押しすると選択の拡大鏡と
 * 選択ハンドルが出てしまう問題への対策。
 *
 * ボタン側にだけ user-select: none を付けても足りない。iOSは「押した場所が選択できない場合、
 * 近くの選択できる文字を掴む」ため、少し離れたラベル(スタミナ/ガッツ等)が選択されて
 * 拡大鏡が出る。そのためページ全体を選択不可にし、入力欄だけ選択を戻す。
 *
 * また `-webkit-touch-callout` はRN Webのstyleプロパティ経由では落ちる可能性があるため、
 * 生のCSSとして流し込む(Chromiumは無視するがiOS Safariが解釈する)。
 */
export function applyWebTouchFix() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('mimi-touch-fix')) return;

  const style = document.createElement('style');
  style.id = 'mimi-touch-fix';
  style.textContent = `
    html, body, #root {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }
    #root * {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    }
    input, textarea {
      -webkit-user-select: text;
      user-select: text;
    }
  `;
  document.head.appendChild(style);
}
