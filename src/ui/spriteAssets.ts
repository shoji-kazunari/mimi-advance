import { Image, ImageSourcePropType } from 'react-native';

export interface CharacterSpriteSet {
  run: [ImageSourcePropType, ImageSourcePropType, ImageSourcePropType];
  jump: [ImageSourcePropType, ImageSourcePropType, ImageSourcePropType];
  attack: [ImageSourcePropType, ImageSourcePropType, ImageSourcePropType];
}

const MIMI_SPRITES: CharacterSpriteSet = {
  run: [
    require('../../assets/characters/mimi/run1.png'),
    require('../../assets/characters/mimi/run2.png'),
    require('../../assets/characters/mimi/run3.png'),
  ],
  jump: [
    require('../../assets/characters/mimi/jump1.png'),
    require('../../assets/characters/mimi/jump2.png'),
    require('../../assets/characters/mimi/jump3.png'),
  ],
  attack: [
    require('../../assets/characters/mimi/attack1.png'),
    require('../../assets/characters/mimi/attack2.png'),
    require('../../assets/characters/mimi/attack3.png'),
  ],
};

export const BOSS_SPRITES: CharacterSpriteSet = {
  run: [
    require('../../assets/characters/boss/run1.png'),
    require('../../assets/characters/boss/run2.png'),
    require('../../assets/characters/boss/run3.png'),
  ],
  jump: [
    require('../../assets/characters/boss/jump1.png'),
    require('../../assets/characters/boss/jump2.png'),
    require('../../assets/characters/boss/jump3.png'),
  ],
  attack: [
    require('../../assets/characters/boss/attack1.png'),
    require('../../assets/characters/boss/attack2.png'),
    require('../../assets/characters/boss/attack3.png'),
  ],
};

/**
 * 実素材(AI下絵)があるキャラのdefIdだけここに登録する(現状はミミのみ)。
 * 登録が無いキャラは呼び出し側で従来の色付き図形にフォールバックする。
 */
export const CHARACTER_SPRITES: Record<string, CharacterSpriteSet> = {
  c1: MIMI_SPRITES,
};

/**
 * Web(react-native-web)ではrequire()した画像は最初から{uri, width, height}を
 * 持つプレーンオブジェクトなのでそのままuriが取れる。ネイティブ側は数値の
 * アセットIDになるため、Image.resolveAssetSource(RNのみに存在、RNWには無い)で
 * 解決する。どちらにも無ければ何もしない。
 */
function resolveUri(source: ImageSourcePropType): string | undefined {
  if (typeof source === 'object' && source !== null && 'uri' in source) {
    return (source as { uri?: string }).uri;
  }
  const resolveAssetSource = (Image as unknown as { resolveAssetSource?: (s: ImageSourcePropType) => { uri: string } | null })
    .resolveAssetSource;
  return resolveAssetSource?.(source)?.uri ?? undefined;
}

/**
 * 走り/ジャンプ/アタックの各フレームは、実際に必要になった瞬間(そのpose.frameIndexに
 * 切り替わった瞬間)までブラウザが取得を始めない。そのため初回の1ループ目だけ、
 * まだ取得していないフレームに切り替わるたびに一瞬表示が止まる(取得済みになる
 * 2周目以降は瞬時)。アプリ起動時にまとめて先読みしておくことで、トラック画面が
 * 実際に表示される頃には大半が取得済みになっているようにする。
 */
export function prefetchAllCharacterSprites() {
  // あくまで体感速度の最適化なので、ここで例外が出てもアプリ起動自体は絶対に止めない。
  try {
    const sets = [...Object.values(CHARACTER_SPRITES), BOSS_SPRITES];
    sets.forEach((set) => {
      [...set.run, ...set.jump, ...set.attack].forEach((source) => {
        const uri = resolveUri(source);
        if (uri) Image.prefetch(uri);
      });
    });
  } catch {
    // 先読みに失敗しても、フレーム表示自体は従来どおり(必要時にJITで)取得される。
  }
}
