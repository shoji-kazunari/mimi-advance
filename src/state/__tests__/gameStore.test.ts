import { useGameStore, newGameState } from '../gameStore';
import { STARTER_CHARACTER } from '../../domain/characters';
import { statUpgradeCost } from '../../domain/stats';
import { shoeCostFor, SHOE_UNLOCK_COST } from '../../domain/shoes';
import { todayDateString } from '../../domain/vsRace';

function resetStore() {
  useGameStore.setState({ state: newGameState(), hydrated: true });
}

function getCharacter(defId: string = STARTER_CHARACTER.id) {
  const found = useGameStore.getState().state.characters.find((c) => c.defId === defId);
  if (!found) throw new Error('見つかりません');
  return found;
}

beforeEach(() => {
  resetStore();
});

describe('upgradeStat', () => {
  it('ランナーptが足りれば+0.1され、コスト分だけ減る', () => {
    const cost = statUpgradeCost('stamina', 1);
    useGameStore.setState((s) => ({ state: { ...s.state, runnerPt: cost } }));
    useGameStore.getState().upgradeStat(STARTER_CHARACTER.id, 'stamina');
    expect(getCharacter().stats.stamina).toBeCloseTo(1.1);
    expect(useGameStore.getState().state.runnerPt).toBe(0);
  });

  it('ランナーptが足りなければ何も変わらない', () => {
    useGameStore.setState((s) => ({ state: { ...s.state, runnerPt: 0 } }));
    useGameStore.getState().upgradeStat(STARTER_CHARACTER.id, 'stamina');
    expect(getCharacter().stats.stamina).toBe(1);
  });

  it('未解放ステータス(進化0のtechnique)は資金があっても上げられない', () => {
    useGameStore.setState((s) => ({ state: { ...s.state, runnerPt: 100000 } }));
    useGameStore.getState().upgradeStat(STARTER_CHARACTER.id, 'technique');
    expect(getCharacter().stats.technique).toBe(1);
  });

  it('上限に達していたら上げられない', () => {
    useGameStore.setState((s) => ({
      state: {
        ...s.state,
        runnerPt: 100000,
        characters: s.state.characters.map((c) => ({ ...c, stats: { ...c.stats, stamina: 30 } })),
      },
    }));
    useGameStore.getState().upgradeStat(STARTER_CHARACTER.id, 'stamina');
    expect(getCharacter().stats.stamina).toBe(30);
  });
});

describe('registerZakoPass', () => {
  it('runnerPtが増え、ゲージが進む', () => {
    useGameStore.getState().registerZakoPass();
    expect(useGameStore.getState().state.runnerPt).toBeGreaterThan(0);
    expect(getCharacter().zakoDefeated).toBe(1);
    expect(getCharacter().totalZakoDefeated).toBe(1);
  });

  it('必要数を超えて数えない(ボス待ちでカンストする)', () => {
    for (let i = 0; i < 10; i++) useGameStore.getState().registerZakoPass();
    // ステージ1の必要数は3体
    expect(getCharacter().zakoDefeated).toBe(3);
    expect(getCharacter().totalZakoDefeated).toBe(10);
  });
});

describe('シューズ', () => {
  it('Vicマネーが足りれば解放でき、Lv1からスタートする', () => {
    useGameStore.setState((s) => ({ state: { ...s.state, vicMoney: SHOE_UNLOCK_COST } }));
    useGameStore.getState().unlockShoe(STARTER_CHARACTER.id);
    expect(getCharacter().shoeUnlocked).toBe(true);
    expect(getCharacter().shoeLevel).toBe(1);
    expect(useGameStore.getState().state.vicMoney).toBe(0);
  });

  it('未解放だと強化できない', () => {
    useGameStore.getState().upgradeShoe(STARTER_CHARACTER.id);
    expect(getCharacter().shoeLevel).toBe(0);
  });

  it('解放済みならコスト分のVicで+0.1強化できる', () => {
    useGameStore.setState((s) => ({
      state: {
        ...s.state,
        vicMoney: SHOE_UNLOCK_COST,
        characters: s.state.characters.map((c) => ({ ...c, shoeUnlocked: true, shoeLevel: 1 })),
      },
    }));
    const cost = shoeCostFor(1);
    useGameStore.setState((s) => ({ state: { ...s.state, vicMoney: cost } }));
    useGameStore.getState().upgradeShoe(STARTER_CHARACTER.id);
    expect(getCharacter().shoeLevel).toBeCloseTo(1.1);
  });
});

describe('tryEvolve', () => {
  it('キャラLv.が条件未満だと進化しない', () => {
    useGameStore.getState().tryEvolve(STARTER_CHARACTER.id);
    expect(getCharacter().evolutionStage).toBe(0);
  });

  it('キャラLv.50以上で進化1(名前変更・costumeStage同期)ができる', () => {
    useGameStore.setState((s) => ({
      state: {
        ...s.state,
        characters: s.state.characters.map((c) => ({
          ...c,
          stats: { speed: 20, stamina: 20, guts: 10, technique: 1, damage: 1 }, // charLv=50
        })),
      },
    }));
    useGameStore.getState().tryEvolve(STARTER_CHARACTER.id);
    const c = getCharacter();
    expect(c.evolutionStage).toBe(1);
    expect(c.costumeStage).toBe(1);
    expect(c.name).not.toBe(STARTER_CHARACTER.name);
  });
});

describe('resolveBossBattle', () => {
  it('勝利: 報酬が入りステージが進み、ゲージがリセットされる', () => {
    for (let i = 0; i < 3; i++) useGameStore.getState().registerZakoPass();
    const ptBefore = useGameStore.getState().state.runnerPt;
    useGameStore.getState().resolveBossBattle(STARTER_CHARACTER.id, true);
    expect(getCharacter().stage).toBe(2);
    expect(getCharacter().zakoDefeated).toBe(0);
    expect(useGameStore.getState().state.runnerPt).toBeGreaterThan(ptBefore);
    expect(useGameStore.getState().state.vicMoney).toBeGreaterThan(0);
  });

  it('敗北: 何も変わらず再挑戦できる状態のまま', () => {
    for (let i = 0; i < 3; i++) useGameStore.getState().registerZakoPass();
    useGameStore.getState().resolveBossBattle(STARTER_CHARACTER.id, false);
    expect(getCharacter().stage).toBe(1);
    expect(getCharacter().zakoDefeated).toBe(3);
  });
});

describe('resolveVsRace', () => {
  it('勝敗によらず残り回数が減り、勝った時だけVicが増える', () => {
    const before = useGameStore.getState().state.vsRace.remaining;
    useGameStore.getState().resolveVsRace(50, true);
    expect(useGameStore.getState().state.vsRace.remaining).toBe(before - 1);
    expect(useGameStore.getState().state.vicMoney).toBe(50);

    useGameStore.getState().resolveVsRace(50, false);
    expect(useGameStore.getState().state.vsRace.remaining).toBe(before - 2);
    expect(useGameStore.getState().state.vicMoney).toBe(50);
  });
});

describe('unlockCharacter', () => {
  it('次の1枠以外は解放できない', () => {
    useGameStore.setState((s) => ({ state: { ...s.state, vicMoney: 100000 } }));
    useGameStore.getState().unlockCharacter('c3'); // c2を飛ばして指定
    expect(useGameStore.getState().state.characters).toHaveLength(1);
  });

  it('資金が足りなければ解放できない', () => {
    useGameStore.setState((s) => ({ state: { ...s.state, vicMoney: 0 } }));
    useGameStore.getState().unlockCharacter('c2');
    expect(useGameStore.getState().state.characters).toHaveLength(1);
  });

  it('次の1枠かつ資金があれば解放できる', () => {
    useGameStore.setState((s) => ({ state: { ...s.state, vicMoney: 50 } }));
    useGameStore.getState().unlockCharacter('c2');
    expect(useGameStore.getState().state.characters).toHaveLength(2);
    expect(useGameStore.getState().state.vicMoney).toBe(0);
  });
});

describe('loadState', () => {
  it('渡したGameStateで丸ごと置き換わる', () => {
    const incoming = {
      ...newGameState(),
      username: 'よそから',
      runnerPt: 999,
    };
    useGameStore.getState().loadState(incoming);
    expect(useGameStore.getState().state.username).toBe('よそから');
    expect(useGameStore.getState().state.runnerPt).toBe(999);
  });

  it('日付が変わっていればVSレース回数をリセットする', () => {
    const incoming = {
      ...newGameState(),
      vsRace: { remaining: 0, lastResetDate: '2000-01-01' },
    };
    useGameStore.getState().loadState(incoming);
    expect(useGameStore.getState().state.vsRace.remaining).toBeGreaterThan(0);
  });
});

describe('claimOfflineProgress', () => {
  const MIN = 60 * 1000;

  function setLastActiveAgo(ms: number) {
    useGameStore.setState((s) => ({ state: { ...s.state, lastActiveAt: Date.now() - ms } }));
  }

  it('時刻の記録が無い古いセーブは報酬なしで、今を基準として記録するだけ', () => {
    expect(useGameStore.getState().state.lastActiveAt).toBeUndefined();
    expect(useGameStore.getState().claimOfflineProgress()).toBeNull();
    expect(useGameStore.getState().state.lastActiveAt).toBeDefined();
    expect(useGameStore.getState().state.runnerPt).toBe(0);
  });

  it('離れていた分のザコ追い抜きとptが反映され、ボス手前で止まる', () => {
    setLastActiveAgo(3 * MIN); // ステージ1はザコ3体でボス出現(18体ぶん進めるがボス手前で頭打ち)
    const before = Date.now();
    const result = useGameStore.getState().claimOfflineProgress();

    expect(result).not.toBeNull();
    expect(result?.passes).toBe(3);
    expect(result?.reachedBoss).toBe(true);
    expect(getCharacter().zakoDefeated).toBe(3);
    expect(getCharacter().totalZakoDefeated).toBe(3);
    expect(useGameStore.getState().state.runnerPt).toBe(30);
    expect(useGameStore.getState().state.lastActiveAt).toBeGreaterThanOrEqual(before);
  });

  it('1分未満の離席では何も変わらない', () => {
    setLastActiveAgo(10 * 1000);
    expect(useGameStore.getState().claimOfflineProgress()).toBeNull();
    expect(getCharacter().zakoDefeated).toBe(0);
    expect(useGameStore.getState().state.runnerPt).toBe(0);
  });

  it('続けて呼んでも二重には受け取れない', () => {
    setLastActiveAgo(3 * MIN);
    expect(useGameStore.getState().claimOfflineProgress()).not.toBeNull();
    const ptAfterFirst = useGameStore.getState().state.runnerPt;
    expect(useGameStore.getState().claimOfflineProgress()).toBeNull();
    expect(useGameStore.getState().state.runnerPt).toBe(ptAfterFirst);
  });

  it('通常の操作(状態更新)で最終更新時刻が進む', () => {
    setLastActiveAgo(5 * 60 * MIN);
    const stale = useGameStore.getState().state.lastActiveAt as number;
    useGameStore.getState().setUsername('あ');
    expect(useGameStore.getState().state.lastActiveAt as number).toBeGreaterThan(stale);
  });
});

describe('refreshVsRaceReset', () => {
  it('日付が変わっていれば残り回数をリセットする', () => {
    useGameStore.setState((s) => ({
      state: { ...s.state, vsRace: { remaining: 0, lastResetDate: '2000-01-01' } },
    }));
    useGameStore.getState().refreshVsRaceReset();
    expect(useGameStore.getState().state.vsRace.remaining).toBeGreaterThan(0);
  });

  it('既に今日の日付なら残り回数は変えない', () => {
    useGameStore.setState((s) => ({
      state: { ...s.state, vsRace: { remaining: 3, lastResetDate: todayDateString() } },
    }));
    useGameStore.getState().refreshVsRaceReset();
    expect(useGameStore.getState().state.vsRace.remaining).toBe(3);
  });
});
