import { encode, decode } from 'base-64';
import { GameState, STAT_KEYS } from './types';

/**
 * 仕様書10章。base64エンコードしたJSONによる書き出し・読み込み(環境をまたいだ引き継ぎ用)。
 * RNのHermesはbtoa/atobを持たない前提で、素のJSで動く`base-64`パッケージを使う。
 */
export function encodeSaveCode(state: GameState): string {
  const json = JSON.stringify(state);
  return encode(unescape(encodeURIComponent(json)));
}

/**
 * 貼り付けられたコードが壊れていたり別アプリのものだったりしても、
 * 個々のキャラを描画する段階で初めてクラッシュするのではなく、ここで弾く。
 */
export function isValidGameState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<GameState>;
  if (typeof v.runnerPt !== 'number' || typeof v.vicMoney !== 'number') return false;
  if (typeof v.activeCharacterId !== 'string') return false;
  if (!Array.isArray(v.characters) || v.characters.length === 0) return false;
  const hasActive = v.characters.some((c) => c && c.defId === v.activeCharacterId);
  if (!hasActive) return false;
  return v.characters.every(
    (c) =>
      c &&
      typeof c.defId === 'string' &&
      typeof c.stage === 'number' &&
      c.stats &&
      STAT_KEYS.every((stat) => typeof c.stats[stat] === 'number')
  );
}

export function decodeSaveCode(code: string): GameState {
  const json = decodeURIComponent(escape(decode(code.trim())));
  const parsed: unknown = JSON.parse(json);
  if (!isValidGameState(parsed)) {
    throw new Error('セーブコードの形式が正しくありません');
  }
  return parsed;
}
