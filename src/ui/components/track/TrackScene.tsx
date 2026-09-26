import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useObstacleJump } from '../../hooks/useObstacleJump';
import { BOSS_SPRITES, CharacterSpriteSet } from '../../spriteAssets';
import { RunnerAvatar } from '../RunnerAvatar';
import { OpponentEntity } from './OpponentEntity';
import { TrackBackground } from './TrackBackground';
import { TrackObstacle } from './TrackObstacle';
import {
  obstacleTravelMsTo,
  opponentLeftPercentForRatios,
  RUNNER_LEFT_PERCENT,
  runnerLeftPercentForRatios,
} from './trackLayout';
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
  /** 実素材(AI下絵)があるキャラだけ渡す。無ければ従来の色付き図形にフォールバックする。 */
  runnerSpriteSet?: CharacterSpriteSet;
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
  /**
   * jumpTimesMsの各時刻に、ボスが実際に居るはずの左位置(%)。呼び出し側が
   * jumpLayoutForTimeline(trackLayout.ts)で事前計算する。ボスは仕様書5章により
   * スタミナに応じて動くため、固定位置を前提にした障害物の出現タイミングでは、
   * ボスが動いた分だけジャンプがずれてしまうため必要。
   */
  opponentLeftPercentAtJump: number[];
  /**
   * 同じ障害物が自キャラの位置に届く時刻に、自キャラが居るはずの左位置(%)。
   * 自キャラも勝ちが見えてくると前に出るため、これも事前計算した値を使う。
   */
  runnerLeftPercentAtJump: number[];
  /** frame.meStamina / timeline.meMaxStamina。詰め寄り具合(仕様書5章)の判定に使う。 */
  meRatio: number;
  /** frame.opponentStamina / timeline.opponentMaxStamina。ボスの残量に応じて、ボスは下がり自キャラは前に出る。 */
  opponentRatio: number;
  burstTrigger?: number;
  /** 勝敗演出: 'me'で自キャラが、'opponent'で相手が右へ加速して退場する(仕様書6章)。 */
  exitSide?: 'me' | 'opponent' | null;
  /** 実素材(AI下絵)があるキャラだけ渡す。無ければ従来の色付き図形にフォールバックする。 */
  runnerSpriteSet?: CharacterSpriteSet;
  /** ボス戦のときだけ渡す(VSレースには専用素材が無いため未指定のままにする)。 */
  opponentSpriteSet?: CharacterSpriteSet;
  /** timeline.attackTimesMsを、自キャラ側がattackUnlockedのときだけ渡す(呼び出し側でフィルタ済み)。 */
  meAttackTimesMs?: number[];
  /** timeline.attackTimesMsを、相手側がattackUnlockedのときだけ渡す(呼び出し側でフィルタ済み)。 */
  opponentAttackTimesMs?: number[];
}

type Props = IdleProps | BattleProps;

let zakoIdSeq = 0;
let obstacleIdSeq = 0;
// 横位置の計算(ボスが下がる/自キャラが前に出る/障害物の到達時間)はtrackLayout.tsにある。
// 決着間際は、ボスと自キャラが中間地点で重なる(レイヤーはキャラが上、下記JSXの描画順を参照)。
const RUNNER_EXIT_MS = 450;
const EMPTY_JUMPS: number[] = [];
const EMPTY_PERCENTS: number[] = [];

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
  const opponentLeftPercentAtJump =
    props.mode === 'battle' ? props.opponentLeftPercentAtJump : EMPTY_PERCENTS;
  const runnerLeftPercentAtJump =
    props.mode === 'battle' ? props.runnerLeftPercentAtJump : EMPTY_PERCENTS;
  const burstTrigger = props.burstTrigger ?? 0;
  const exitSide = props.mode === 'battle' ? props.exitSide ?? null : null;
  const opponentJumpTimesKey = opponentJumpTimes.join(',');
  // 障害物がボスの位置(呼び出し側で事前計算した、その時刻に実際にボスが居るはずの位置)に
  // 届くまでの所要時間。自キャラは同じ障害物がさらに奥まで進んでから届くので、
  // その差分だけジャンプを遅らせる。
  const msToOpponentAtJump = opponentJumpTimes.map((_, i) =>
    obstacleTravelMsTo(opponentLeftPercentAtJump[i] ?? RUNNER_LEFT_PERCENT)
  );
  const runnerJumpTimes =
    props.mode === 'battle'
      ? opponentJumpTimes.map(
          (t, i) =>
            t +
            (obstacleTravelMsTo(runnerLeftPercentAtJump[i] ?? RUNNER_LEFT_PERCENT) - msToOpponentAtJump[i])
        )
      : EMPTY_JUMPS;
  const meAttackTimesMs = props.mode === 'battle' ? props.meAttackTimesMs ?? EMPTY_JUMPS : EMPTY_JUMPS;
  const opponentAttackTimesMs = props.mode === 'battle' ? props.opponentAttackTimesMs ?? EMPTY_JUMPS : EMPTY_JUMPS;

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
  // msToOpponentAtJump分だけ早く画面右から出発させることで、ちょうどそのタイミングで
  // ボスの(その時点での)位置を通過するようにする(そのまま自キャラの位置も後から通過する)。
  const [obstacleList, setObstacleList] = useState<{ id: number }[]>([]);
  const obstacleIdxRef = useRef(0);
  useEffect(() => {
    obstacleIdxRef.current = 0;
  }, [opponentJumpTimesKey]);
  useEffect(() => {
    if (props.mode !== 'battle') return;
    while (
      obstacleIdxRef.current < opponentJumpTimes.length &&
      opponentJumpTimes[obstacleIdxRef.current] - msToOpponentAtJump[obstacleIdxRef.current] <= battleElapsed
    ) {
      obstacleIdxRef.current += 1;
      setObstacleList((prev) => [...prev, { id: obstacleIdSeq++ }]);
    }
  }, [props.mode, battleElapsed, opponentJumpTimesKey, opponentJumpTimes, msToOpponentAtJump]);
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
  // 仕様書5章: ボスはスタミナ比率に応じて下がってきて、自キャラも前に出る
  // (trackLayout.tsのopponentLeftPercentForRatios / runnerLeftPercentForRatios参照)。
  // アイドル時は両比率が1なので、それぞれ定位置のまま。
  const opponentRatio = props.mode === 'battle' ? props.opponentRatio : 1;
  const meRatio = props.mode === 'battle' ? props.meRatio : 1;
  const opponentSettleLeft = opponentLeftPercentForRatios(meRatio, opponentRatio);
  const runnerSettleLeft = runnerLeftPercentForRatios(meRatio, opponentRatio);
  // 勝利の退場は、前に出ている今の位置から右へ抜ける(決着時はスタミナ比率が止まるので位置も固定される)。
  const runnerLeft = runnerExitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [`${runnerSettleLeft}%`, '140%'],
  });

  return (
    <View style={styles.scene}>
      <TrackBackground />
      {/* ザコはキャラ・ボスの後ろを通り抜けるように、両者より先に(=下のレイヤーに)描画する。 */}
      {props.mode === 'idle' &&
        zakoList.map((z) => (
          <Zako
            key={z.id}
            name={z.name}
            color={z.color}
            onPass={props.onZakoPass}
            onExit={() => setZakoList((prev) => prev.filter((x) => x.id !== z.id))}
          />
        ))}
      {/* ボスはキャラより先に(=下のレイヤーに)描画する。勝利演出で完全に重なったとき、
          自キャラがボスの手前を通り過ぎたように見せるため。 */}
      {props.mode === 'idle' ? (
        bossReady && <OpponentEntity label="BOSS" slideIn spriteSet={BOSS_SPRITES} />
      ) : (
        <>
          <OpponentEntity
            label={props.opponentLabel}
            color={props.opponentColor}
            slideIn={false}
            exit={exitSide === 'opponent'}
            jump={opponentJump}
            settleLeftPercent={opponentSettleLeft}
            spriteSet={props.opponentSpriteSet}
            elapsedMs={battleElapsed}
            jumpTimesMs={opponentJumpTimes}
            attackTimesMs={opponentAttackTimesMs}
          />
          {obstacleList.map((o) => (
            <TrackObstacle
              key={o.id}
              onExit={() => setObstacleList((prev) => prev.filter((x) => x.id !== o.id))}
            />
          ))}
        </>
      )}
      <Animated.View style={[styles.runnerWrap, { left: runnerLeft }]} pointerEvents="none">
        <RunnerAvatar
          burstTrigger={burstTrigger}
          jump={props.mode === 'battle' && exitSide !== 'me' ? runnerJump : undefined}
          spriteSet={props.runnerSpriteSet}
          elapsedMs={battleElapsed}
          jumpTimesMs={runnerJumpTimes}
          attackTimesMs={meAttackTimesMs}
          forceRun={exitSide === 'me'}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { flex: 1, position: 'relative' },
  // 地面ライン(TrackBackgroundのgroundLayer)と同じbottom:10%を使うことで、
  // トラックの高さが変わっても常にアバターの足元が地面に一致する
  // (以前はtopをtopを固定高さ用に逆算していたため、高さを変えるたびにズレていた)。
  // RunnerAvatarの表示枠(84×84、ボスと揃えた正方形)の幅の半分だけ左にずらして中央を基準にする。
  runnerWrap: { position: 'absolute', bottom: '10%', marginLeft: -42 },
});
