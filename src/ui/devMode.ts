/**
 * 開発確認用の機能(手触り確認ページ・デバッグパネル)を出すかどうかの唯一の判定。
 * シェルHTML側で window.__MIMI_LAB__ = true を立てたビルドだけがtrueになる。
 * 通常の公開ビルドでは常にfalseなので、デバッグパネルのチート(pt/Vic追加・ステージ進行)が
 * ランキング機能の値を不正に積めてしまう心配がない。
 */
export const isDevBuild =
  typeof window !== 'undefined' && (window as unknown as { __MIMI_LAB__?: boolean }).__MIMI_LAB__ === true;
