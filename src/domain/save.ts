import { encode, decode } from 'base-64';
import { GameState } from './types';

/**
 * 仕様書10章。base64エンコードしたJSONによる書き出し・読み込み(環境をまたいだ引き継ぎ用)。
 * RNのHermesはbtoa/atobを持たない前提で、素のJSで動く`base-64`パッケージを使う。
 */
export function encodeSaveCode(state: GameState): string {
  const json = JSON.stringify(state);
  return encode(unescape(encodeURIComponent(json)));
}

export function decodeSaveCode(code: string): GameState {
  const json = decodeURIComponent(escape(decode(code.trim())));
  return JSON.parse(json) as GameState;
}
