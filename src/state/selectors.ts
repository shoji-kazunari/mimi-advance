import { OwnedCharacter } from '../domain/types';
import { useGameStore } from './gameStore';

export function useActiveCharacter(): OwnedCharacter {
  return useGameStore((s) => {
    const found = s.state.characters.find((c) => c.defId === s.state.activeCharacterId);
    if (!found) throw new Error('活動中のキャラが見つかりません');
    return found;
  });
}
