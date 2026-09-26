import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { characterDefById, nextLockedCharacter, STARTER_CHARACTER } from '../domain/characters';
import { canEvolve, evolve } from '../domain/evolution';
import { calcOfflineProgress, OfflineProgress } from '../domain/offline';
import { shoeCostFor, SHOE_UNLOCK_COST } from '../domain/shoes';
import { statUpgradeCost, statLevelCap, isStatUnlocked } from '../domain/stats';
import {
  zakoRequiredCount,
  zakoPtGained,
  bossRunnerPtReward,
  bossVicMoneyReward,
} from '../domain/stage';
import { baseStats, GameState, OwnedCharacter, StatKey, STAT_KEYS } from '../domain/types';
import { resetVsRaceIfNewDay, VS_RACE_DAILY_LIMIT } from '../domain/vsRace';

const STORAGE_KEY = 'mimi-advance/save';

export function newGameState(): GameState {
  return {
    username: 'ランナー',
    runnerPt: 0,
    vicMoney: 0,
    characters: [
      {
        defId: STARTER_CHARACTER.id,
        name: STARTER_CHARACTER.name,
        evolutionStage: 0,
        costumeStage: 0,
        stats: baseStats(),
        shoeUnlocked: false,
        shoeLevel: 0,
        stage: 1,
        zakoDefeated: 0,
        totalZakoDefeated: 0,
      },
    ],
    activeCharacterId: STARTER_CHARACTER.id,
    vsRace: { remaining: VS_RACE_DAILY_LIMIT, lastResetDate: '' },
  };
}

interface GameStore {
  state: GameState;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setState: (updater: (state: GameState) => GameState) => void;

  setUsername: (name: string) => void;
  setActiveCharacter: (defId: string) => void;
  upgradeStat: (defId: string, stat: StatKey) => void;
  registerZakoPass: () => void;
  unlockShoe: (defId: string) => void;
  upgradeShoe: (defId: string) => void;
  tryEvolve: (defId: string) => void;
  setCostume: (defId: string, costumeStage: 0 | 1 | 2) => void;
  unlockCharacter: (charDefId: string) => void;
  resolveBossBattle: (defId: string, won: boolean) => void;
  resolveVsRace: (vicGained: number, won: boolean) => void;
  loadState: (state: GameState) => void;
  refreshVsRaceReset: () => void;
  /**
   * 閉じていた/離れていた間の放置報酬を受け取る(起動時とタブに戻ったときに呼ぶ)。
   * 報酬がなければnull。受け取ったら最終更新時刻も今に進める。
   */
  claimOfflineProgress: (nowMs?: number) => OfflineProgress | null;

  /** デバッグ機能。操作中のキャラのステージを10進める(追い抜きカウントはリセット)。 */
  debugAdvanceStage: () => void;
  /** デバッグ機能。操作中のキャラの、解放済みステータスをすべて+10する(上限あり)。 */
  debugMaxUnlockedStats: () => void;
  /** デバッグ機能。ランナーptを500追加する。 */
  debugAddRunnerPt: () => void;
  /** デバッグ機能。Vicマネーを500追加する。 */
  debugAddVicMoney: () => void;
}

function activeCharacter(state: GameState): OwnedCharacter {
  const found = state.characters.find((c) => c.defId === state.activeCharacterId);
  if (!found) throw new Error('活動中のキャラが見つかりません');
  return found;
}

function updateCharacter(
  state: GameState,
  defId: string,
  updater: (c: OwnedCharacter) => OwnedCharacter
): GameState {
  return {
    ...state,
    characters: state.characters.map((c) => (c.defId === defId ? updater(c) : c)),
  };
}

const PERSIST_DEBOUNCE_MS = 800;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 高ガッツ編成だとザコ通過が500ms間隔まで縮むため、その都度AsyncStorageに書くと
 * 無駄が大きい。直近の状態だけを少し遅らせてまとめて保存する(末尾デバウンス)。
 */
function persist(state: GameState) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {
      // 保存に失敗しても操作自体は継続する(次の操作で再度保存を試みる)
    });
  }, PERSIST_DEBOUNCE_MS);
  // Node(Jest)環境ではTimeoutオブジェクトにunrefがあり、保留中のデバウンスだけで
  // プロセス終了が止まらないようにする。RN/ブラウザのsetTimeoutは数値を返すため存在チェックする。
  const maybeUnref = persistTimer as unknown as { unref?: () => void };
  maybeUnref.unref?.();
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: newGameState(),
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const loaded = JSON.parse(raw) as GameState;
        set({ state: { ...loaded, vsRace: resetVsRaceIfNewDay(loaded.vsRace) }, hydrated: true });
        return;
      }
    } catch {
      // 壊れたセーブは無視して新規開始する
    }
    set({ hydrated: true });
  },

  setState: (updater) => {
    // 更新のたびに最終更新時刻を刻む。放置報酬はここからの経過時間で計算する。
    const next = { ...updater(get().state), lastActiveAt: Date.now() };
    set({ state: next });
    persist(next);
  },

  setUsername: (name) => {
    get().setState((state) => ({ ...state, username: name }));
  },

  setActiveCharacter: (defId) => {
    get().setState((state) => ({ ...state, activeCharacterId: defId }));
  },

  upgradeStat: (defId, stat) => {
    get().setState((state) => {
      const character = state.characters.find((c) => c.defId === defId);
      if (!character) return state;
      if (!isStatUnlocked(stat, character.evolutionStage)) return state;
      const currentLv = character.stats[stat];
      const cap = statLevelCap(character.evolutionStage);
      if (currentLv >= cap) return state;
      const cost = statUpgradeCost(stat, currentLv);
      if (state.runnerPt < cost) return state;
      return updateCharacter(
        { ...state, runnerPt: state.runnerPt - cost },
        defId,
        (c) => ({ ...c, stats: { ...c.stats, [stat]: Math.round((currentLv + 0.1) * 10) / 10 } })
      );
    });
  },

  registerZakoPass: () => {
    get().setState((state) => {
      const character = activeCharacter(state);
      const techniqueEff = isStatUnlocked('technique', character.evolutionStage)
        ? character.stats.technique
        : 0;
      const gained = zakoPtGained(character.stage, techniqueEff);
      const zakoDefeated = character.zakoDefeated + 1;
      const required = zakoRequiredCount(character.stage);

      return updateCharacter(
        { ...state, runnerPt: state.runnerPt + gained },
        character.defId,
        (c) => ({
          ...c,
          zakoDefeated: Math.min(zakoDefeated, required),
          totalZakoDefeated: c.totalZakoDefeated + 1,
        })
      );
    });
  },

  unlockShoe: (defId) => {
    get().setState((state) => {
      const character = state.characters.find((c) => c.defId === defId);
      if (!character || character.shoeUnlocked) return state;
      if (state.vicMoney < SHOE_UNLOCK_COST) return state;
      return updateCharacter(
        { ...state, vicMoney: state.vicMoney - SHOE_UNLOCK_COST },
        defId,
        (c) => ({ ...c, shoeUnlocked: true, shoeLevel: 1 })
      );
    });
  },

  upgradeShoe: (defId) => {
    get().setState((state) => {
      const character = state.characters.find((c) => c.defId === defId);
      if (!character || !character.shoeUnlocked) return state;
      const cost = shoeCostFor(character.shoeLevel);
      if (state.vicMoney < cost) return state;
      return updateCharacter(
        { ...state, vicMoney: state.vicMoney - cost },
        defId,
        (c) => ({ ...c, shoeLevel: Math.round((c.shoeLevel + 0.1) * 10) / 10 })
      );
    });
  },

  tryEvolve: (defId) => {
    get().setState((state) => {
      const character = state.characters.find((c) => c.defId === defId);
      if (!character || !canEvolve(character)) return state;
      return updateCharacter(state, defId, evolve);
    });
  },

  setCostume: (defId, costumeStage) => {
    get().setState((state) =>
      updateCharacter(state, defId, (c) =>
        costumeStage <= c.evolutionStage ? { ...c, costumeStage } : c
      )
    );
  },

  resolveBossBattle: (defId, won) => {
    get().setState((state) => {
      const character = state.characters.find((c) => c.defId === defId);
      if (!character) return state;
      if (!won) return state; // 敗北時は再挑戦可能なまま(仕様書5章: ボスは再戦時に元位置へ)

      const runnerPt = state.runnerPt + bossRunnerPtReward(character.stage);
      const vicMoney = state.vicMoney + bossVicMoneyReward(character.stage);
      return updateCharacter({ ...state, runnerPt, vicMoney }, defId, (c) => ({
        ...c,
        stage: c.stage + 1,
        zakoDefeated: 0,
      }));
    });
  },

  resolveVsRace: (vicGained, won) => {
    get().setState((state) => {
      const vsRace = resetVsRaceIfNewDay(state.vsRace);
      const remaining = Math.max(0, vsRace.remaining - 1);
      return {
        ...state,
        vicMoney: won ? state.vicMoney + vicGained : state.vicMoney,
        vsRace: { ...vsRace, remaining },
      };
    });
  },

  unlockCharacter: (charDefId) => {
    get().setState((state) => {
      const ownedIds = state.characters.map((c) => c.defId);
      const nextLocked = nextLockedCharacter(ownedIds);
      if (!nextLocked || nextLocked.id !== charDefId) return state;
      if (state.vicMoney < nextLocked.unlockCost) return state;
      const def = characterDefById(charDefId);
      if (!def) return state;
      return {
        ...state,
        vicMoney: state.vicMoney - nextLocked.unlockCost,
        characters: [
          ...state.characters,
          {
            defId: def.id,
            name: def.name,
            evolutionStage: 0,
            costumeStage: 0,
            stats: baseStats(),
            shoeUnlocked: false,
            shoeLevel: 0,
            stage: 1,
            zakoDefeated: 0,
            totalZakoDefeated: 0,
          },
        ],
      };
    });
  },

  loadState: (loaded) => {
    get().setState(() => ({ ...loaded, vsRace: resetVsRaceIfNewDay(loaded.vsRace) }));
  },

  refreshVsRaceReset: () => {
    const current = get().state.vsRace;
    const next = resetVsRaceIfNewDay(current);
    if (next === current) return; // 日付が変わっていなければ何もしない(無駄な保存を避ける)
    get().setState((state) => ({ ...state, vsRace: next }));
  },

  claimOfflineProgress: (nowMs = Date.now()) => {
    const { lastActiveAt } = get().state;
    if (lastActiveAt === undefined) {
      // 古いセーブ(時刻の記録が無い)は、今回を基準にするだけで報酬は出さない
      get().setState((state) => state);
      return null;
    }
    const progress = calcOfflineProgress(activeCharacter(get().state), nowMs - lastActiveAt);
    if (progress.passes === 0) return null;

    get().setState((state) => {
      const character = activeCharacter(state);
      return updateCharacter(
        { ...state, runnerPt: state.runnerPt + progress.runnerPt },
        character.defId,
        (c) => ({
          ...c,
          zakoDefeated: c.zakoDefeated + progress.passes,
          totalZakoDefeated: c.totalZakoDefeated + progress.passes,
        })
      );
    });
    return progress;
  },

  debugAdvanceStage: () => {
    get().setState((state) => {
      const character = activeCharacter(state);
      return updateCharacter(state, character.defId, (c) => ({
        ...c,
        stage: c.stage + 10,
        zakoDefeated: 0,
      }));
    });
  },

  debugMaxUnlockedStats: () => {
    get().setState((state) => {
      const character = activeCharacter(state);
      const cap = statLevelCap(character.evolutionStage);
      return updateCharacter(state, character.defId, (c) => ({
        ...c,
        stats: STAT_KEYS.reduce(
          (stats, stat) =>
            isStatUnlocked(stat, c.evolutionStage)
              ? { ...stats, [stat]: Math.min(cap, Math.round((stats[stat] + 10) * 10) / 10) }
              : stats,
          c.stats
        ),
      }));
    });
  },

  debugAddRunnerPt: () => {
    get().setState((state) => ({ ...state, runnerPt: state.runnerPt + 500 }));
  },

  debugAddVicMoney: () => {
    get().setState((state) => ({ ...state, vicMoney: state.vicMoney + 500 }));
  },
}));
