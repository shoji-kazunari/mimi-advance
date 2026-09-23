import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { bossCombatantProfile, selfCombatantProfile, staminaAtTime } from '../../domain/battle';
import { effectiveStatValue, isStatUnlocked, statLevelCap, statUpgradeCost, characterLevel, companionLevel } from '../../domain/stats';
import { bossRunnerPtReward, bossVicMoneyReward, zakoPtGained, zakoRequiredCount, zakoSpawnIntervalMs } from '../../domain/stage';
import { isVsRaceUnlocked, VS_RACE_UNLOCK_STAGE } from '../../domain/vsRace';
import { SHOE_UNLOCK_COST } from '../../domain/shoes';
import { STAT_KEYS } from '../../domain/types';
import { useGameStore } from '../../state/gameStore';
import { useActiveCharacter } from '../../state/selectors';
import { useBattlePlayback } from '../hooks/useBattlePlayback';
import { useShake } from '../hooks/useShake';
import { useNotifications } from '../Notifications';
import { BlackFade } from '../components/BlackFade';
import { BossBattleControls } from '../components/BossBattleControls';
import { BossPill } from '../components/BossPill';
import { CenterBanner } from '../components/CenterBanner';
import { FloatingPoint } from '../components/FloatingPoint';
import { ShoeCard } from '../components/ShoeCard';
import { StatCard } from '../components/StatCard';
import { opponentLeftPercentForRatios, TrackScene } from '../components/track/TrackScene';
import { TrackToastLayer } from '../components/track/TrackToastLayer';
import { SaveCodeModal } from './SaveCodeModal';
import { BOSS_SPRITES, CHARACTER_SPRITES } from '../spriteAssets';
import { colors } from '../theme';

const NG_WORDS = ['死ね', 'クソ', 'アホ'];
const ATTACK_GAUGE_EASE_MS = 350;
const NORMAL_GAUGE_MS = 50;
const RESULT_HOLD_MS = 1200;
// 仕様書6章: 自キャラ(または相手)が右へ加速して退場、0.45秒。
const EXIT_MS = 450;
// 仕様書6章: 「ステージNクリア！」の中央バナー、1.2秒。
const BANNER_MS = 1200;

type PostBattlePhase =
  | { kind: 'exiting'; side: 'me' | 'opponent'; clearedStage: number | null }
  | { kind: 'banner'; text: string }
  | { kind: 'wiping' };

// バトル中でない間、useBattlePlaybackに渡すダミーのプロファイル(フックは条件分岐で
// 呼べないため、常に呼びつつ`active: false`で再生を止めておく)。
const DUMMY_PROFILE = {
  maxStamina: 1,
  sprintDurationMs: 0,
  sprintDrainPerSec: 0,
  cruiseDrainPerSec: 0,
  obstacleLoss: 0,
  attackUnlocked: false,
  skillBonus: 0,
  pressureToOpponentPerSec: 0,
};

interface Props {
  onOpenCharacters: () => void;
  onOpenVsRace: () => void;
}

export function MainScreen({ onOpenCharacters, onOpenVsRace }: Props) {
  const state = useGameStore((s) => s.state);
  const registerZakoPass = useGameStore((s) => s.registerZakoPass);
  const upgradeStat = useGameStore((s) => s.upgradeStat);
  const unlockShoe = useGameStore((s) => s.unlockShoe);
  const upgradeShoe = useGameStore((s) => s.upgradeShoe);
  const setUsername = useGameStore((s) => s.setUsername);
  const resolveBossBattle = useGameStore((s) => s.resolveBossBattle);
  const refreshVsRaceReset = useGameStore((s) => s.refreshVsRaceReset);
  const debugAdvanceStage = useGameStore((s) => s.debugAdvanceStage);
  const debugMaxUnlockedStats = useGameStore((s) => s.debugMaxUnlockedStats);
  const debugAddRunnerPt = useGameStore((s) => s.debugAddRunnerPt);
  const debugAddVicMoney = useGameStore((s) => s.debugAddVicMoney);
  const { showPopup, showToast } = useNotifications();
  const character = useActiveCharacter();

  // アプリを起動したまま日付をまたいだ場合でも、VSレースの残り回数が
  // 次のアクションを待たずに更新されるように定期チェックする。
  useEffect(() => {
    const id = setInterval(refreshVsRaceReset, 60000);
    return () => clearInterval(id);
  }, [refreshVsRaceReset]);

  const [inBossBattle, setInBossBattle] = useState(false);
  const [enteringBattle, setEnteringBattle] = useState(false);
  const [postBattle, setPostBattle] = useState<PostBattlePhase | null>(null);
  // 退場したのがどちら側かをbanner・wiping中も覚えておく(PostBattlePhaseの
  // それらのkindはsideを持たないため)。退場後、終了ワイプが完全に覆うまでは
  // 元の位置に戻さない(仕様書6章: バナー表示中に元の位置へワープして見えるのを防ぐ)。
  const [exitedSide, setExitedSide] = useState<'me' | 'opponent' | null>(null);

  // 「ボスバトル」ボタンを押した瞬間の値で固定する。inBossBattleの真偽値自体は
  // ボタンを押した時にしか変わらないため、これをキーにすることで、バトル中に
  // ザコの自動追い抜きなど他の理由でMainScreenが再レンダーされても、
  // 毎回新しいプロファイルが作られて再生がリセットされることを防いでいる。
  const bossBattleProfiles = useMemo(() => {
    if (!inBossBattle) return null;
    return {
      me: selfCombatantProfile(character.stats, character.evolutionStage),
      boss: bossCombatantProfile(character.stage),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inBossBattle]);

  const { translateX: shakeTranslateX, trigger: triggerShake } = useShake();
  const [meGaugeMs, setMeGaugeMs] = useState(NORMAL_GAUGE_MS);
  const [bossGaugeMs, setBossGaugeMs] = useState(NORMAL_GAUGE_MS);
  const meBoostTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bossBoostTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const boostGauge = (setter: (ms: number) => void, timerRef: { current: ReturnType<typeof setTimeout> | null }) => {
    setter(ATTACK_GAUGE_EASE_MS);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setter(NORMAL_GAUGE_MS), ATTACK_GAUGE_EASE_MS);
  };

  useEffect(
    () => () => {
      if (meBoostTimer.current) clearTimeout(meBoostTimer.current);
      if (bossBoostTimer.current) clearTimeout(bossBoostTimer.current);
    },
    []
  );

  // フックは条件分岐で呼べないため、バトル中でなくても常に呼ぶ(activeで再生を止める)。
  const battlePlayback = useBattlePlayback(
    bossBattleProfiles?.me ?? DUMMY_PROFILE,
    bossBattleProfiles?.boss ?? DUMMY_PROFILE,
    {
      active: inBossBattle,
      onMyAttack: () => {
        showToast('アタック発動！スタミナを削った！');
        triggerShake();
        boostGauge(setBossGaugeMs, bossBoostTimer);
      },
      onOpponentAttack: () => {
        triggerShake();
        boostGauge(setMeGaugeMs, meBoostTimer);
      },
    }
  );

  // 各障害物イベント時刻に、ボスが実際に居るはずの位置を事前計算する(仕様書5章、ボスは
  // スタミナに応じて動くため)。TrackScene側の障害物出現タイミング・ジャンプ同期に使う。
  const opponentLeftPercentAtJump = useMemo(
    () =>
      battlePlayback.timeline.obstacleTimesMs.map((t) => {
        const frame = staminaAtTime(battlePlayback.timeline, t);
        const meR = frame.meStamina / battlePlayback.timeline.meMaxStamina;
        const opponentR = frame.opponentStamina / battlePlayback.timeline.opponentMaxStamina;
        return opponentLeftPercentForRatios(meR, opponentR);
      }),
    [battlePlayback.timeline]
  );

  // 実素材(AI下絵)があるキャラだけ渡す。無いキャラ(スズなど)は従来の色付き図形にフォールバックする。
  const runnerSpriteSet = CHARACTER_SPRITES[character.defId];
  // アタックは発動側がattackUnlockedのときだけ起きる(仕様書5章)ので、演出もそれに合わせて出し分ける。
  const meAttackTimesMs = bossBattleProfiles?.me.attackUnlocked ? battlePlayback.timeline.attackTimesMs : [];
  const opponentAttackTimesMs = bossBattleProfiles?.boss.attackUnlocked ? battlePlayback.timeline.attackTimesMs : [];

  const settledRef = useRef(false);
  useEffect(() => {
    if (!inBossBattle) settledRef.current = false;
  }, [inBossBattle]);

  const handleBossSettledRef = useRef<(won: boolean) => void>(() => {});
  useEffect(() => {
    handleBossSettledRef.current = (won: boolean) => {
      const clearedStage = character.stage;
      resolveBossBattle(character.defId, won);
      if (won) {
        showToast([
          { text: `+${bossRunnerPtReward(clearedStage)}ランナーpt`, color: colors.gold },
          { text: `+${bossVicMoneyReward(clearedStage)} Vicマネー`, color: colors.mint },
        ]);
        setExitedSide('me');
        setPostBattle({ kind: 'exiting', side: 'me', clearedStage });
      } else {
        showToast('逃げられた...');
        showToast('トレーニングして再挑戦しよう');
        setExitedSide('opponent');
        setPostBattle({ kind: 'exiting', side: 'opponent', clearedStage: null });
      }
    };
  });

  useEffect(() => {
    if (!inBossBattle || !battlePlayback.finished || settledRef.current) return;
    settledRef.current = true;
    // ボタンに「勝利！」と固定表示する代わりに、決着した瞬間トーストで知らせる。
    if (battlePlayback.won) showToast('勝利！');
    const timer = setTimeout(() => handleBossSettledRef.current(battlePlayback.won), RESULT_HOLD_MS);
    return () => clearTimeout(timer);
  }, [inBossBattle, battlePlayback.finished, battlePlayback.won, showToast]);

  // 勝敗が決まった後の演出の段取り(仕様書6章): 退場(0.45秒)→[勝利のみ]中央バナー(1.2秒)
  // →黒ワイプ。ゲージ表示(BossBattleControls)はinBossBattleがtrueのままの間ずっと
  // 最終結果を表示し続け、ワイプが完全に覆った瞬間にまとめて通常表示へ切り替える。
  useEffect(() => {
    if (!postBattle) return;
    if (postBattle.kind === 'exiting') {
      const timer = setTimeout(() => {
        setPostBattle(
          postBattle.side === 'me' && postBattle.clearedStage !== null
            ? { kind: 'banner', text: `ステージ${postBattle.clearedStage} クリア！` }
            : { kind: 'wiping' }
        );
      }, EXIT_MS);
      return () => clearTimeout(timer);
    }
    if (postBattle.kind === 'banner') {
      const timer = setTimeout(() => setPostBattle({ kind: 'wiping' }), BANNER_MS);
      return () => clearTimeout(timer);
    }
  }, [postBattle]);

  const [burstTrigger, setBurstTrigger] = useState(0);
  const [usernameModal, setUsernameModal] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(state.username);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [helpVisible, setHelpVisible] = useState(false);
  const [saveCodeVisible, setSaveCodeVisible] = useState(false);
  const [rankingVisible, setRankingVisible] = useState(false);
  const [debugVisible, setDebugVisible] = useState(false);

  const [popups, setPopups] = useState<{ id: number; text: string }[]>([]);
  const nextPopupId = useRef(0);

  const required = zakoRequiredCount(character.stage);
  const bossReady = character.zakoDefeated >= required;
  const gutsEff = effectiveStatValue(character.stats, 'guts', character.evolutionStage);
  const techniqueEff = effectiveStatValue(character.stats, 'technique', character.evolutionStage);

  const wasBossReadyRef = useRef(bossReady);
  useEffect(() => {
    if (bossReady && !wasBossReadyRef.current) {
      showToast('ボス出現！');
    }
    wasBossReadyRef.current = bossReady;
  }, [bossReady, showToast]);

  const handleZakoPass = () => {
    registerZakoPass();
    const gained = zakoPtGained(character.stage, techniqueEff);
    const popupId = nextPopupId.current++;
    setPopups((prev) => [...prev, { id: popupId, text: `+${gained}pt` }]);
  };

  const charLv = characterLevel(character);
  const compLv = companionLevel(state.characters, state.activeCharacterId);
  const totalLv = charLv + compLv;

  const vsUnlocked = isVsRaceUnlocked(state.characters);

  const handleUsernameSave = () => {
    const trimmed = usernameDraft.trim();
    if (trimmed.length === 0 || trimmed.length > 8) {
      setUsernameError('8文字以内で入力してください');
      return;
    }
    if (NG_WORDS.some((w) => trimmed.includes(w))) {
      setUsernameError('使用できない言葉が含まれています');
      return;
    }
    setUsernameError(null);
    setUsername(trimmed);
    setUsernameModal(false);
  };

  return (
    <View style={styles.root}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>耳アド</Text>
            <Text style={styles.subtitle}>MIMI ADVANCE</Text>
          </View>
          <View style={styles.headerButtons}>
            <Pressable
              style={styles.pillButton}
              onPress={() => {
                setUsernameDraft(state.username);
                setUsernameModal(true);
              }}
            >
              <Text style={styles.pillButtonText} numberOfLines={1}>
                👤 {state.username}
              </Text>
            </Pressable>
            <Pressable style={styles.circleButton} onPress={() => setSaveCodeVisible(true)}>
              <Text>💾</Text>
            </Pressable>
            <Pressable style={styles.circleButton} onPress={() => setHelpVisible(true)}>
              <Text>❓</Text>
            </Pressable>
            <Pressable style={styles.circleButton} onPress={() => setDebugVisible(true)}>
              <Text>🐞</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.runnerRow}>
          <Text style={styles.runnerName}>{character.name}</Text>
          <Pressable style={styles.linkButton} onPress={onOpenCharacters}>
            <Text style={styles.linkButtonText}>📖 一覧・進化</Text>
          </Pressable>
        </View>

        <Text style={styles.stageRow}>
          ステージ {character.stage} / 総追い抜き {character.totalZakoDefeated}
        </Text>

        <Animated.View style={[styles.track, inBossBattle && { transform: [{ translateX: shakeTranslateX }] }]}>
          {inBossBattle && bossBattleProfiles ? (
            <TrackScene
              mode="battle"
              opponentLabel="BOSS"
              elapsedMs={battlePlayback.elapsed}
              jumpTimesMs={battlePlayback.timeline.obstacleTimesMs}
              opponentLeftPercentAtJump={opponentLeftPercentAtJump}
              meRatio={battlePlayback.frame.meStamina / battlePlayback.timeline.meMaxStamina}
              opponentRatio={battlePlayback.frame.opponentStamina / battlePlayback.timeline.opponentMaxStamina}
              burstTrigger={burstTrigger}
              exitSide={exitedSide}
              runnerSpriteSet={runnerSpriteSet}
              opponentSpriteSet={BOSS_SPRITES}
              meAttackTimesMs={meAttackTimesMs}
              opponentAttackTimesMs={opponentAttackTimesMs}
            />
          ) : (
            <TrackScene
              mode="idle"
              spawnIntervalMs={zakoSpawnIntervalMs(gutsEff)}
              paused={false}
              bossReady={bossReady}
              onZakoPass={handleZakoPass}
              burstTrigger={burstTrigger}
              runnerSpriteSet={runnerSpriteSet}
            />
          )}
          <View style={styles.popupLayer} pointerEvents="none">
            {popups.map((p) => (
              <FloatingPoint
                key={p.id}
                text={p.text}
                onDone={() => setPopups((prev) => prev.filter((x) => x.id !== p.id))}
              />
            ))}
          </View>
          <TrackToastLayer />
          {postBattle?.kind === 'banner' && <CenterBanner text={postBattle.text} />}

          {postBattle?.kind === 'wiping' && (
            <BlackFade
              exitAfterCovered
              onCovered={() => {
                setInBossBattle(false);
                setExitedSide(null);
              }}
              onDone={() => setPostBattle(null)}
            />
          )}

          {enteringBattle && (
            <BlackFade
              exitAfterCovered
              onCovered={() => setInBossBattle(true)}
              onDone={() => setEnteringBattle(false)}
            />
          )}
        </Animated.View>

        <Animated.View
          style={[styles.bossPanelWrap, inBossBattle && { transform: [{ translateX: shakeTranslateX }] }]}
        >
          {inBossBattle && bossBattleProfiles ? (
            <BossBattleControls
              meRatio={battlePlayback.frame.meStamina / battlePlayback.timeline.meMaxStamina}
              bossRatio={battlePlayback.frame.opponentStamina / battlePlayback.timeline.opponentMaxStamina}
              meGaugeMs={meGaugeMs}
              bossGaugeMs={bossGaugeMs}
              sprinting={battlePlayback.sprinting}
              finished={battlePlayback.finished}
              won={battlePlayback.won}
              onSkip={battlePlayback.skip}
            />
          ) : (
            <BossPill
              ratio={character.zakoDefeated / required}
              ready={bossReady}
              current={character.zakoDefeated}
              required={required}
              onPress={() => setEnteringBattle(true)}
            />
          )}
        </Animated.View>

        <View style={styles.trainingCard}>
          <View style={styles.trainingHeaderRow}>
            <Text style={styles.trainingTitle}>トレーニング</Text>
            <View style={styles.walletRow}>
              <View style={styles.walletChip}>
                <Text style={styles.walletLabel}>ランナーpt</Text>
                <Text style={styles.walletValue}>{Math.floor(state.runnerPt).toLocaleString()}</Text>
              </View>
              <View style={styles.walletChip}>
                <Text style={styles.walletLabel}>Vicマネー</Text>
                <Text style={styles.walletValue}>{Math.floor(state.vicMoney).toLocaleString()}</Text>
              </View>
            </View>
          </View>

          <View style={styles.statGrid}>
            {STAT_KEYS.map((stat) => {
              const locked = !isStatUnlocked(stat, character.evolutionStage);
              const cap = statLevelCap(character.evolutionStage);
              const level = character.stats[stat];
              const cost = locked ? null : statUpgradeCost(stat, level);
              return (
                <StatCard
                  key={stat}
                  statKey={stat}
                  level={level}
                  cost={cost}
                  locked={locked}
                  lockedHint={stat === 'technique' ? '進化2で解放' : stat === 'damage' ? '進化3で解放' : undefined}
                  atCap={level >= cap}
                  runnerPt={state.runnerPt}
                  onUpgrade={() => {
                    upgradeStat(character.defId, stat);
                    setBurstTrigger((v) => v + 1);
                  }}
                />
              );
            })}
            <View style={styles.statCardSlot}>
              <ShoeCard
                shoeUnlocked={character.shoeUnlocked}
                shoeLevel={character.shoeLevel}
                vicMoney={state.vicMoney}
                onUnlock={() => {
                  if (character.shoeUnlocked || state.vicMoney < SHOE_UNLOCK_COST) return;
                  unlockShoe(character.defId);
                  showPopup('シューズ解放', 'シューズが解放されました！');
                }}
                onUpgrade={() => {
                  upgradeShoe(character.defId);
                  setBurstTrigger((v) => v + 1);
                }}
              />
            </View>
          </View>

          <View style={styles.levelRow}>
            <View style={styles.levelChip}>
              <Text style={styles.levelChipLabel}>キャラLv.</Text>
              <Text style={styles.levelChipValue}>{charLv.toFixed(1)}</Text>
            </View>
            <Text style={styles.levelOperator}>+</Text>
            <View style={styles.levelChip}>
              <Text style={styles.levelChipLabel}>仲間Lv.</Text>
              <Text style={styles.levelChipValue}>{compLv.toFixed(1)}</Text>
            </View>
            <Text style={styles.levelOperator}>=</Text>
            <View style={[styles.levelChip, styles.levelChipTotal]}>
              <Text style={styles.levelChipLabel}>総合Lv.</Text>
              <Text style={styles.levelChipValue}>{totalLv.toFixed(1)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.vsCard}>
          <Text style={styles.vsTitle}>{vsUnlocked ? '' : '✗ '}VSレース</Text>
          {vsUnlocked ? (
            <>
              <Text style={styles.vsBody}>本日の残り回数: {state.vsRace.remaining}</Text>
              <Pressable
                disabled={state.vsRace.remaining <= 0}
                style={[
                  styles.vsButton,
                  { backgroundColor: state.vsRace.remaining > 0 ? colors.primary : colors.locked },
                ]}
                onPress={onOpenVsRace}
              >
                <Text style={styles.vsButtonText}>対戦相手を選ぶ</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.vsBody}>
              ステージ{VS_RACE_UNLOCK_STAGE}で解放されます(現在の最高ステージ: {character.stage})
            </Text>
          )}
          <Pressable style={styles.rankingLink} onPress={() => setRankingVisible(true)}>
            <Text style={styles.rankingLinkText}>🏆 みんなのランキングを見る</Text>
          </Pressable>
        </View>

        <Modal visible={usernameModal} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>ユーザー名を変更</Text>
              <TextInput
                style={styles.input}
                value={usernameDraft}
                onChangeText={setUsernameDraft}
                maxLength={8}
                placeholderTextColor={colors.subtext}
              />
              {usernameError && <Text style={styles.errorText}>{usernameError}</Text>}
              <View style={styles.modalButtonRow}>
                <Pressable style={styles.modalCancel} onPress={() => setUsernameModal(false)}>
                  <Text style={styles.modalCancelText}>キャンセル</Text>
                </Pressable>
                <Pressable style={styles.modalSave} onPress={handleUsernameSave}>
                  <Text style={styles.modalSaveText}>保存</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={helpVisible} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>用語集</Text>
              <ScrollView style={{ maxHeight: 260 }}>
                <Text style={styles.helpItem}>ランナーpt: ザコを追い抜くと入る。ステータス育成に使う。</Text>
                <Text style={styles.helpItem}>Vicマネー: ボス撃破やVSレース勝利で入る。シューズ・新キャラ解放に使う。</Text>
                <Text style={styles.helpItem}>キャラLv.: 自キャラのステータス合計(シューズ倍率込み)。</Text>
                <Text style={styles.helpItem}>総合Lv.: キャラLv.と仲間Lv.を合わせた値。バトルでの強さに直結する。</Text>
                <Text style={styles.helpItem}>仲間Lv.: 操作していない仲間キャラのステータスの10%を合算したもの。</Text>
                <Text style={styles.helpItem}>スピード: バトル中、相手にプレッシャーをかけて相手の消耗を早める。自分の消費には影響しない。</Text>
                <Text style={styles.helpItem}>スタミナ: バトルでの自分の最大スタミナ量。</Text>
                <Text style={styles.helpItem}>ガッツ: バトルで全力疾走を維持できる時間。ステージ到達時間もわずかに短縮する。</Text>
                <Text style={styles.helpItem}>テクニック(進化2で解放): 追い抜きの獲得ptを増やし、障害物によるスタミナ消費を軽減する。</Text>
                <Text style={styles.helpItem}>アタック(進化3で解放): バトル中、一定のタイミングで相手に追加ダメージを与える「アタック」が発動するようになる。</Text>
                <Text style={styles.helpItem}>シューズ: Vicマネーで解放・強化できる装備。全ステータスに微量の倍率をかける。キャラごとに別管理。</Text>
                <Text style={styles.helpItem}>進化: キャラLv.が条件を満たすと行える。新しいステータスが解放される。</Text>
                <Text style={styles.helpItem}>着せ替え: これまでに到達した進化段階の見た目に、いつでも切り替えて表示できる。ステータスには影響しない。</Text>
                <Text style={styles.helpItem}>VSレース: ステージ100で解放。総合Lv.が近い他ユーザーと非同期で対戦し、勝つとVicマネーを獲得できる。1日5回まで。</Text>
                <Text style={styles.helpItem}>ランキング: 全ランナー中のステージ進行度ランキング。</Text>
              </ScrollView>
              <Pressable style={styles.modalSave} onPress={() => setHelpVisible(false)}>
                <Text style={styles.modalSaveText}>閉じる</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={rankingVisible} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>🏆 みんなのランキング</Text>
              <Text style={styles.rankingNote}>
                (ダミーデータです。実際の非同期対戦データは未実装 — 仕様書11章)
              </Text>
              <ScrollView style={{ maxHeight: 260 }}>
                {DUMMY_RANKING.map((row, i) => (
                  <View key={row.name} style={styles.rankingRow}>
                    <Text style={styles.rankingRank}>{i + 1}</Text>
                    <Text style={styles.rankingName} numberOfLines={1}>
                      {row.name}
                    </Text>
                    <Text style={styles.rankingStage}>ステージ{row.stage}</Text>
                  </View>
                ))}
              </ScrollView>
              <Pressable style={styles.modalSave} onPress={() => setRankingVisible(false)}>
                <Text style={styles.modalSaveText}>閉じる</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={debugVisible} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>🐞 デバッグ</Text>
              <Pressable
                style={styles.modalSave}
                onPress={() => {
                  debugAdvanceStage();
                  showToast('ステージを10進めました');
                }}
              >
                <Text style={styles.modalSaveText}>ステージを10進める</Text>
              </Pressable>
              <Pressable
                style={styles.modalSave}
                onPress={() => {
                  debugMaxUnlockedStats();
                  showToast('解放中のステータスを全て+10しました');
                }}
              >
                <Text style={styles.modalSaveText}>解放中ステータスを全て+10</Text>
              </Pressable>
              <Pressable
                style={styles.modalSave}
                onPress={() => {
                  debugAddRunnerPt();
                  showToast('ランナーpt+500');
                }}
              >
                <Text style={styles.modalSaveText}>ランナーpt +500</Text>
              </Pressable>
              <Pressable
                style={styles.modalSave}
                onPress={() => {
                  debugAddVicMoney();
                  showToast('Vicマネー+500');
                }}
              >
                <Text style={styles.modalSaveText}>Vicマネー +500</Text>
              </Pressable>
              <Pressable style={styles.modalCancel} onPress={() => setDebugVisible(false)}>
                <Text style={styles.modalCancelText}>閉じる</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <SaveCodeModal visible={saveCodeVisible} onClose={() => setSaveCodeVisible(false)} />
      </ScrollView>
    </View>
  );
}

const DUMMY_RANKING = [
  { name: 'ねこみみ_42', stage: 342 },
  { name: 'たぬ吉', stage: 288 },
  { name: 'うさぎ団長', stage: 210 },
  { name: 'きつね商店', stage: 175 },
  { name: 'ひつじ係長', stage: 140 },
];

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 48, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 24, fontWeight: '800', color: colors.accent },
  subtitle: { fontSize: 11, color: colors.subtext, letterSpacing: 1, marginTop: 2 },
  headerButtons: { flexDirection: 'row', gap: 8 },
  pillButton: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: 140,
  },
  pillButtonText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  circleButton: {
    backgroundColor: colors.card,
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  runnerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  runnerName: { fontSize: 18, fontWeight: '700', color: colors.text },
  linkButton: { backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  linkButtonText: { color: colors.text, fontWeight: '600', fontSize: 12 },
  stageRow: { color: colors.subtext },
  track: {
    height: 220,
    backgroundColor: colors.card,
    borderRadius: 20,
    overflow: 'hidden',
  },
  // 自キャラの頭上に小さく浮かぶポップテキスト用のレイヤー。RunnerAvatarの位置
  // (TrackScene内、left:12%・top:50%)のすぐ上に置く(浮動距離が短い間隔しかないと
  // トラック上端まで飛んでいるように見えてしまうため、頭のすぐ上に余裕を持たせる)。
  popupLayer: {
    position: 'absolute',
    top: '38%',
    left: '12%',
    marginLeft: -20,
    width: 40,
    alignItems: 'center',
  },
  bossPanelWrap: {},
  trainingCard: { backgroundColor: colors.card, borderRadius: 20, padding: 14, gap: 12 },
  trainingHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trainingTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  walletRow: { flexDirection: 'row', gap: 8 },
  walletChip: {
    backgroundColor: colors.cardInset,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  walletLabel: { fontSize: 10, color: colors.subtext },
  walletValue: { fontSize: 14, fontWeight: '800', color: colors.text },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 10 },
  statCardSlot: { flexGrow: 1, flexBasis: '28%', flexDirection: 'row' },
  levelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  levelChip: {
    backgroundColor: colors.cardInset,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  levelChipTotal: { borderWidth: 1, borderColor: colors.accent },
  levelChipLabel: { fontSize: 10, color: colors.subtext },
  levelChipValue: { fontSize: 14, fontWeight: '800', color: colors.text },
  levelOperator: { color: colors.subtext, fontWeight: '700' },
  vsCard: { backgroundColor: colors.card, borderRadius: 20, padding: 14, gap: 8 },
  vsTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  vsBody: { color: colors.subtext },
  vsButton: { borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  vsButtonText: { color: '#fff', fontWeight: '700' },
  rankingLink: { alignSelf: 'center', marginTop: 4 },
  rankingLinkText: { color: colors.subtext, fontSize: 12 },
  rankingNote: { fontSize: 11, color: colors.subtext, marginBottom: 8 },
  rankingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  rankingRank: { color: colors.accent, fontWeight: '800', width: 20 },
  rankingName: { flex: 1, color: colors.text },
  rankingStage: { color: colors.subtext, fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '85%', backgroundColor: colors.card, borderRadius: 16, padding: 20, gap: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    color: colors.text,
    backgroundColor: colors.cardInset,
  },
  errorText: { color: colors.danger, fontSize: 12 },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalCancel: { paddingVertical: 8, paddingHorizontal: 14 },
  modalCancelText: { color: colors.subtext },
  modalSave: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  modalSaveText: { color: '#fff', fontWeight: '700' },
  helpItem: { color: colors.text, marginBottom: 8, lineHeight: 20 },
});
