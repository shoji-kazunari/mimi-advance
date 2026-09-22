import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useObstacleJump } from '../../hooks/useObstacleJump';
import { RunnerAvatar } from '../RunnerAvatar';
import { ObstacleMarker } from './ObstacleMarker';
import { OpponentEntity } from './OpponentEntity';
import { TrackBackground } from './TrackBackground';
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
  /** timeline.obstacleTimesMs。自キャラ・ボス双方が同じ地点で跳ぶ。 */
  jumpTimesMs: number[];
  burstTrigger?: number;
  /** 勝敗演出: 'me'で自キャラが、'opponent'で相手が右へ加速して退場する(仕様書6章)。 */
  exitSide?: 'me' | 'opponent' | null;
}

type Props = IdleProps | BattleProps;

let zakoIdSeq = 0;
const RUNNER_LEFT_PERCENT = 12;
const OPPONENT_LEFT_PERCENT = 78;
const RUNNER_EXIT_MS = 450;
const EMPTY_JUMPS: number[] = [];

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
  const battleJumpTimes = props.mode === 'battle' ? props.jumpTimesMs : EMPTY_JUMPS;
  const burstTrigger = props.burstTrigger ?? 0;
  const exitSide = props.mode === 'battle' ? props.exitSide ?? null : null;

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

  const runnerJump = useObstacleJump(battleElapsed, battleJumpTimes);
  const opponentJump = useObstacleJump(battleElapsed, battleJumpTimes);

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
          <ObstacleMarker elapsedMs={battleElapsed} jumpTimesMs={battleJumpTimes} leftPercent={RUNNER_LEFT_PERCENT} />
          <ObstacleMarker elapsedMs={battleElapsed} jumpTimesMs={battleJumpTimes} leftPercent={OPPONENT_LEFT_PERCENT} />
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
