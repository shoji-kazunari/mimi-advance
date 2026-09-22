import { useEffect, useRef } from 'react';
import { GestureResponderEvent, PanResponder } from 'react-native';

interface Options {
  onFire: () => void;
  disabled?: boolean;
  onPressStateChange?: (pressed: boolean) => void;
  initialDelayMs?: number;
  repeatIntervalMs?: number;
  /** 指がこれ以上動いたら連打をキャンセルする(スクロール操作との誤反応防止)。 */
  moveCancelPx?: number;
}

/**
 * ボタンを押しっぱなしにすると連続で発火する(トレーニングボタンを長押しして連続強化する
 * 「気持ちよさ」のための挙動)。タップした瞬間に1回、そのままinitialDelayMsだけ押し続けたら
 * repeatIntervalMsごとに連射する。
 *
 * Pressableの標準pressハンドラではなくPanResponderで自前実装しているのは、
 * ブラウザの「長押し=テキスト選択/コールアウトメニュー」を確実に避けるため
 * (Pressableの上にonTouchMove等を足すと責任者システムが競合する)と、
 * 「8px以上動いたらキャンセル」という移動量ベースの判定がPressable単体では取れないため。
 *
 * PanResponderはメモ化せず毎レンダーで作り直している(生成コスト自体は軽く、
 * onFire/disabledを常に最新の値で直接クロージャに取り込めるので、コールバックを
 * refで持ち回す必要がなくなる)。timeoutRef/intervalRef/startXYRefはレンダーには
 * 使わない可変値(タイマーIDと開始座標)なのでrefで持つ。
 * react-hooks/refsは「レンダー中に生成される関数がrefを読む」パターンを
 * PanResponder.create()のような外部APIに渡す場合まで一律で警告してくるが、
 * PanResponderの各コールバックはジェスチャー発生時にしか呼ばれずレンダー中には
 * 実行されないため、ここでは安全と判断してこの1箇所だけ無効化する。
 */
export function useHoldRepeat({
  onFire,
  disabled = false,
  onPressStateChange,
  initialDelayMs = 90,
  repeatIntervalMs = 110,
  moveCancelPx = 8,
}: Options) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startXYRef = useRef({ x: 0, y: 0 });

  // 連打中にptが尽きてdisabledになったら、その場で連打を止めるためのもの。
  // 走り出したsetIntervalのコールバックは開始時のdisabledを掴んだままなので、refで最新を見る。
  const disabledRef = useRef(disabled);
  useEffect(() => {
    disabledRef.current = disabled;
  });

  const clear = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  };

  // eslint-disable-next-line react-hooks/refs -- 上記コメント参照: PanResponderのコールバックはレンダー中には呼ばれない
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onStartShouldSetPanResponderCapture: () => !disabled,
    onMoveShouldSetPanResponder: () => false,
    onPanResponderTerminationRequest: () => true,
    onPanResponderGrant: (evt: GestureResponderEvent) => {
      const { pageX, pageY } = evt.nativeEvent;
      startXYRef.current = { x: pageX, y: pageY };
      onPressStateChange?.(true);
      clear();
      onFire();
      timeoutRef.current = setTimeout(() => {
        intervalRef.current = setInterval(() => {
          if (disabledRef.current) {
            clear();
            return;
          }
          onFire();
        }, repeatIntervalMs);
      }, initialDelayMs);
    },
    onPanResponderMove: (evt: GestureResponderEvent) => {
      const { pageX, pageY } = evt.nativeEvent;
      const dx = pageX - startXYRef.current.x;
      const dy = pageY - startXYRef.current.y;
      if (Math.hypot(dx, dy) > moveCancelPx) {
        clear();
        onPressStateChange?.(false);
      }
    },
    onPanResponderRelease: () => {
      clear();
      onPressStateChange?.(false);
    },
    onPanResponderTerminate: () => {
      clear();
      onPressStateChange?.(false);
    },
  });

  return panResponder.panHandlers;
}
