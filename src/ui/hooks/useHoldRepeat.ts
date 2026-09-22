import { useRef } from 'react';

interface Options {
  onFire: () => void;
  initialDelayMs?: number;
  repeatIntervalMs?: number;
}

/**
 * ボタンを押しっぱなしにすると連続で発火する(トレーニングボタンを長押しして
 * 連続強化する「気持ちよさ」のための挙動)。タップした瞬間に1回、そのまま
 * initialDelayMsだけ押し続けたらrepeatIntervalMsごとに連射する。
 */
export function useHoldRepeat({ onFire, initialDelayMs = 350, repeatIntervalMs = 80 }: Options) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  };

  const start = () => {
    clear();
    onFire();
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(onFire, repeatIntervalMs);
    }, initialDelayMs);
  };

  return { onPressIn: start, onPressOut: clear };
}
