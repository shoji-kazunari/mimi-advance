import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { ToastMessage, ToastSegment, useNotifications } from '../../Notifications';
import { colors } from '../../theme';

// 「耳アド UI手触り仕様書」4章の数値。
const TOAST_ENTER_MS = 250;
const TOAST_HOLD_MS = 2700;
const TOAST_EXIT_MS = 400;

/**
 * トーストの描画レイヤー。仕様書4章「画面上部、track内に浮かぶ形」を満たすため、
 * NotificationProviderが全画面に出すのではなく、各画面がこれを自分のtrack(演出画面)の
 * Viewの中に直接置く(MainScreenの追い抜きシーン、BattleScreenのバトルシーンなど)。
 * どちらもoverflow:hiddenなtrackの内側に置かれるので、trackの外にはみ出さない。
 */
export function TrackToastLayer() {
  const { toasts, removeToast } = useNotifications();

  return (
    <View style={styles.layer} pointerEvents="none">
      {toasts.map((t) => (
        <ToastView key={t.id} message={t.message} onDone={() => removeToast(t.id)} />
      ))}
    </View>
  );
}

/**
 * トースト1件の入退場アニメーション。仕様書4章:
 * 入場0.25秒(フェード+translateY(-6px)→0)、表示2.7秒キープ、退場0.4秒でフェードアウト。
 */
function ToastView({ message, onDone }: { message: ToastMessage; onDone: () => void }) {
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let holdTimer: ReturnType<typeof setTimeout> | null = null;
    const enterAnim = Animated.timing(anim, {
      toValue: 1,
      duration: TOAST_ENTER_MS,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    });
    enterAnim.start(({ finished }) => {
      if (!finished) return;
      holdTimer = setTimeout(() => {
        Animated.timing(anim, {
          toValue: 0,
          duration: TOAST_EXIT_MS,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }).start(({ finished: exited }) => {
          if (exited) onDone();
        });
      }, TOAST_HOLD_MS);
    });
    return () => {
      enterAnim.stop();
      if (holdTimer) clearTimeout(holdTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] });
  const segments: ToastSegment[] = typeof message === 'string' ? [{ text: message }] : message;

  return (
    <Animated.View style={[styles.toast, { opacity: anim, transform: [{ translateY }] }]} pointerEvents="none">
      <Text style={styles.toastText}>
        {segments.map((seg, i) => (
          <Text key={i} style={seg.color ? { color: seg.color } : undefined}>
            {i > 0 ? '   ' : ''}
            {seg.text}
          </Text>
        ))}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toast: {
    alignSelf: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(20,14,40,0.88)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.mint,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxWidth: '85%',
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
