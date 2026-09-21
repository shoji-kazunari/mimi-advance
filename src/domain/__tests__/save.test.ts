import { encode } from 'base-64';
import { encodeSaveCode, decodeSaveCode, isValidGameState } from '../save';
import { baseStats, GameState } from '../types';

describe('セーブコード', () => {
  it('エンコード→デコードで元のGameStateに戻る(日本語の名前も含めて)', () => {
    const state: GameState = {
      username: 'たろう',
      runnerPt: 1234,
      vicMoney: 56,
      characters: [
        {
          defId: 'c1',
          name: 'ミミ',
          evolutionStage: 1,
          costumeStage: 0,
          stats: baseStats(),
          shoeUnlocked: true,
          shoeLevel: 3,
          stage: 42,
          zakoDefeated: 5,
          totalZakoDefeated: 500,
        },
      ],
      activeCharacterId: 'c1',
      vsRace: { remaining: 3, lastResetDate: '2026-09-21' },
    };

    const code = encodeSaveCode(state);
    const decoded = decodeSaveCode(code);
    expect(decoded).toEqual(state);
  });

  it('壊れた・別物のコードは例外を投げて弾く(クラッシュではなくエラー表示に倒す)', () => {
    expect(() => decodeSaveCode('これはセーブコードではない')).toThrow();
    expect(() => decodeSaveCode(encode(JSON.stringify({ hello: 'world' })))).toThrow();
  });

  it('isValidGameState: 必須フィールドが欠けたものはfalse', () => {
    expect(isValidGameState({})).toBe(false);
    expect(isValidGameState(null)).toBe(false);
    expect(isValidGameState({ runnerPt: 0, vicMoney: 0, activeCharacterId: 'c1', characters: [] })).toBe(
      false
    );
  });
});
