import { characterDefById } from './characters';
import { characterLevel } from './stats';
import { CharacterDef, EvolutionStage, EvolutionStep, OwnedCharacter } from './types';

/** 次の進化ステップ。既にヒト型(進化3)なら undefined。 */
export function nextEvolutionStep(
  def: CharacterDef,
  evolutionStage: EvolutionStage
): EvolutionStep | undefined {
  if (evolutionStage >= 2) return undefined;
  return def.evolutions[evolutionStage as 0 | 1];
}

/** 進化条件はキャラLv.(シューズ倍率込み・仲間の継承は含まない、仕様書4章)。 */
export function canEvolve(character: OwnedCharacter): boolean {
  const def = characterDefById(character.defId);
  if (!def) return false;
  const step = nextEvolutionStep(def, character.evolutionStage);
  if (!step) return false;
  return characterLevel(character) >= step.requiredCharLv;
}

/** 進化: 名前変更・対応ステータス解放・costumeStageも自動でその段階に更新。 */
export function evolve(character: OwnedCharacter): OwnedCharacter {
  const def = characterDefById(character.defId);
  if (!def) return character;
  const step = nextEvolutionStep(def, character.evolutionStage);
  if (!step) return character;
  const newStage = (character.evolutionStage + 1) as EvolutionStage;
  return {
    ...character,
    name: step.toName,
    evolutionStage: newStage,
    costumeStage: newStage,
  };
}
