import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useObstacleJump } from '../../hooks/useObstacleJump';
import { RunnerAvatar } from '../RunnerAvatar';
import { OpponentEntity } from './OpponentEntity';
import { TrackBackground } from './TrackBackground';
import { OBSTACLE_END_PERCENT, OBSTACLE_START_PERCENT, OBSTACLE_TRAVEL_MS, TrackObstacle } from './TrackObstacle';
import { Zako } from './Zako';

/** すれ違うザコの名前(見た目だけの演出用、ゲーム性には影響しない)。 */
const ZAKO_NAMES = [
  'きつね商店', 'たぬ吉', 'うさぎ団長', 'ねこみみ_42', 'モモンガ屋',
  'はりねずみ野郎', 'くまごろう', 'ひつじ係長', 'ふくろう堂', 'りすの助',
];
const ZAKO_COLORS = ['#7c8cff', '#ff8e6e', '#5ce0c6', '#e685e0', '#f2c14e'];

interface IdleProps {
  mode: 'idle';
  /** ザコの出現間隔(zakoSpawnIntervalMs)。 */
  spawnIntervalMs: number;
  /** trueの間はザコの出現を止める(ボス戦中・演出中)。 */
  paused: boolean;
  /** ボス出現中かどうか(仕様書6章のスライドイン)。 */
  bossReady: boolean;
  /** ザコが自キャラの位置を追い抜いた瞬間に呼ばれる(pt付与などはこの中で行う)。 */
  onZakoPass: () => void;
  burstTrigger: number;
}

interface BattleProps {
  mode: 'battle';
  opponentLabel: string;
  opponentColor?: string;
  /** useBattlePlaybackのelapsed。障害物ジャンプの同期に使う。 */
  elapsedMs: number;
  /** timeline.obstacleTimesMs。障害物がボスの位置を通過する時刻として使う
   *  (自キャラは同じ障害物がさらに奥まで進んでから届くよう、下でずらして使う)。 */
  jumpTimesMs: number[];
  burstTrigger?: number;
  /** 勝敗演出: 'me'で自キャラが、'opponent'で相手が右へ加速して退場する(仕様書6章)。 */
  exitSide?: 'me' | 'opponent' | null;
}

type Props = IdleProps | BattleProps;

let zakoIdSeq = 0;
let obstacleIdSeq = 0;
const RUNNER_LEFT_PERCENT = 12;
const OPPONENT_LEFT_PERCENT = 78;
const RUNNER_EXIT_MS = 450;
const EMPTY_JUMPS: number[] = [];

// 障害物は右(OBSTACLE_START_PERCENT)から左(OBSTACLE_END_PERCENT)へ一定速度で
// トラック全体を横切る(ザコと同じ動き)。ボスの位置(78%)を先に通り、
// そのあと自キャラの位置(12%)を通る。domain側のobstacleTimesMsは「ボスの位置を
// 通過する時刻」として扱い、自キャラのジャンプだけその分だけ遅らせて同期させる。
const OBSTACLE_SPAN = OBSTACLE_START_PERCENT - OBSTACLE_END_PERCENT;
const MS_TO_OPPONENT = ((OBSTACLE_START_PERCENT - OPPONENT_LEFT_PERCENT) / OBSTACLE_SPAN) * OBSTACLE_TRAVEL_MS;
const MS_TO_RUNNER = ((OBSTACLE_START_PERCENT - RUNNER_LEFT_PERCENT) / OBSTACLE_SPAN) * OBSTACLE_TRAVEL_MS;
const RUNNER_JUMP_DELAY_MS = MS_TO_RUNNER - MS_TO_OPPONENT;

/**
 * 「耳アド UI手触り仕様書」0章: 走行シーン(トラック)の実体。アイドル時(ザコ追い抜きループ)と
 * バトル中(ボス戦・VSレース)の両方で同じコンポーネントを使う。バトル中はキャラ・背景を
 * 表示したまま、スタミナゲージ側だけ呼び出し元(BossBattleControls等)が別パネルで切り替える。
 */
export function TrackScene(props: Props) {
  const spawnIntervalMs = props.mode === 'idle' ? props.spawnIntervalMs : 0;
  const paused = props.mode === 'idle' ? props.paused : true;
  const bossReady = props.mode === 'idle' ? props.bossReady : false;
  const battleElapsed = props.mode === 'battle' ? props.elapsedMs : 0;
  const opponentJumpTimes = props.mode === 'battle' ? props.jumpTimesMs : EMPTY_JUMPS;
  const burstTrigger = props.burstTrigger ?? 0;
  const exitSide = props.mode === 'battle' ? props.exitSide ?? null : null;
  const opponentJumpTimesKey = opponentJumpTimes.join(',');
  // 自キャラは同じ障害物がさらに奥まで進んでから届くので、その分だけジャンプを遅らせる。
  const runnerJumpTimes =
    props.mode === 'battle' ? opponentJumpTimes.map((t) => t + RUNNER_JUMP_DELAY_MS) : EMPTY_JUMPS;

  const [zakoList, setZakoList] = useState<{ id: number; name: string; color: string }[]>([]);

  useEffect(() => {
    if (props.mode !== 'idle' || paused) return;
    const id = setInterval(() => {
      const name = ZAKO_NAMES[Math.floor(Math.random() * ZAKO_NAMES.length)];
      const color = ZAKO_COLORS[Math.floor(Math.random() * ZAKO_COLORS.length)];
      setZakoList((prev) => [...prev, { id: zakoIdSeq++, name, color }]);
    }, spawnIntervalMs);
    return () => clearInterval(id);
  }, [props.mode, paused, spawnIntervalMs]);

  // ボス戦などでpausedになったら、流れている途中のザコを一掃する
  // (仕様書上、バトル中はザコは出ないため)。
  const wasPausedRef = useRef(paused);
  useEffect(() => {
    if (paused && !wasPausedRef.current) setZakoList([]);
    wasPausedRef.current = paused;
  }, [paused]);

  const runnerJump = useObstacleJump(battleElapsed, runnerJumpTimes);
  const opponentJump = useObstacleJump(battleElapsed, opponentJumpTimes);

  // 障害物本体(見た目)。ボスの位置に届く時刻(=jumpTimesMsの各要素)より
  // MS_TO_OPPONENT分だけ早く画面右から出発させることで、ちょうどそのタイミングで
  // ボスの位置(78%)を通過するようにする(そのまま自キャラの位置も後から通過する)。
  const [obstacleList, setObstacleList] = useState<{ id: number }[]>([]);
  const obstacleIdxRef = useRef(0);
  useEffect(() => {
    obstacleIdxRef.current = 0;
  }, [opponentJumpTimesKey]);
  useEffect(() => {
    if (props.mode !== 'battle') return;
    while (
      obstacleIdxRef.current < opponentJumpTimes.length &&
      opponentJumpTimes[obstacleIdxRef.current] - MS_TO_OPPONENT <= battleElapsed
    ) {
      obstacleIdxRef.current += 1;
      setObstacleList((prev) => [...prev, { id: obstacleIdSeq++ }]);
    }
  }, [props.mode, battleElapsed, opponentJumpTimesKey, opponentJumpTimes]);
  const wasObstaclePausedRef = useRef(paused);
  useEffect(() => {
    if (paused && !wasObstaclePausedRef.current) setObstacleList([]);
    wasObstaclePausedRef.current = paused;
  }, [paused]);

  // 仕様書6章: 勝敗時、自キャラ(または相手)が右へ加速して退場する(0.45秒)。
  const [runnerExitAnim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (exitSide === 'me') {
      Animated.timing(runnerExitAnim, {
        toValue: 1,
        duration: RUNNER_EXIT_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false, // leftはネイティブドライバー非対応
      }).start();
    } else {
      runnerExitAnim.setValue(0);
    }
  }, [exitSide, runnerExitAnim]);
  const runnerLeft = runnerExitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [`${RUNNER_LEFT_PERCENT}%`, '140%'],
  });

  return (
    <View style={styles.scene}>
      <TrackBackground />
      <Animated.View style={[styles.runnerWrap, { left: runnerLeft }]} pointerEvents="none">
        <RunnerAvatar burstTrigger={burstTrigger} jump={props.mode === 'battle' ? runnerJump : undefined} />
      </Animated.View>
      {props.mode === 'idle' ? (
        <>
          {bossReady && <OpponentEntity label="BOSS" slideIn />}
          {zakoList.map((z) => (
            <Zako
              key={z.id}
              name={z.name}
              color={z.color}
              onPass={props.onZakoPass}
              onExit={() => setZakoList((prev) => prev.filter((x) => x.id !== z.id))}
            />
          ))}
        </>
      ) : (
        <>
          <OpponentEntity
            label={props.opponentLabel}
            color={props.opponentColor}
            slideIn={false}
            exit={exitSide === 'opponent'}
            jump={opponentJump}
          />
          {obstacleList.map((o) => (
            <TrackObstacle
              key={o.id}
              onExit={() => setObstacleList((prev) => prev.filter((x) => x.id !== o.id))}
            />
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { flex: 1, position: 'relative' },
  // 地面ライン(TrackBackgroundのgroundLayer、bottom:10%)に足が着くように、
  // アバターの高さ(56)分を逆算した位置。
  runnerWrap: { position: 'absolute', top: '50%', marginLeft: -20 },
});
