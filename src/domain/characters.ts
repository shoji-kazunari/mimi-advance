import { CharacterDef } from './types';

/** 初期所持キャラ。仕様書8章: 初期所持は「ミミ」1体のみ。 */
export const STARTER_CHARACTER: CharacterDef = {
  id: 'c1',
  name: 'ミミ',
  unlockCost: 0,
  evolutions: [
    { requiredCharLv: 50, toName: 'ミミ・獣脚' },
    { requiredCharLv: 100, toName: 'ミミ・ヒト型' },
  ],
};

/**
 * Vicマネーで解放する新キャラのロック枠(仕様書8章)。
 * 3体目以降(4体目〜)は思想シートに記載がなく未定義。ここではコンの150Vicを
 * 暫定で踏襲しているだけで、追加の枠は用意していない。要調整。
 */
export const NEW_CHARACTERS: CharacterDef[] = [
  {
    id: 'c2',
    name: 'スズ',
    unlockCost: 50,
    evolutions: [
      { requiredCharLv: 50, toName: 'スズ・獣脚' },
      { requiredCharLv: 100, toName: 'スズ・ノクス' },
    ],
  },
  {
    id: 'c3',
    name: 'コン',
    unlockCost: 150,
    evolutions: [
      { requiredCharLv: 50, toName: 'コン・獣脚' },
      { requiredCharLv: 100, toName: 'コン・ヴァル' },
    ],
  },
];

export const ALL_CHARACTER_DEFS: CharacterDef[] = [STARTER_CHARACTER, ...NEW_CHARACTERS];

export function characterDefById(id: string): CharacterDef | undefined {
  return ALL_CHARACTER_DEFS.find((def) => def.id === id);
}

/** まだ解放されていない新キャラの中で、次に提示すべき1枠(仕様書8章: 1度に1枠だけ表示)。 */
export function nextLockedCharacter(ownedDefIds: string[]): CharacterDef | undefined {
  return NEW_CHARACTERS.find((def) => !ownedDefIds.includes(def.id));
}
