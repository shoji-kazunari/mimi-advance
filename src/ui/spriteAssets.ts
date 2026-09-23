import { ImageSourcePropType } from 'react-native';

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
