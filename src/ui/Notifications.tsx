import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from './theme';

export interface ToastSegment {
  text: string;
  color?: string;
}
export type ToastMessage = string | ToastSegment[];

interface ToastItem {
  id: number;
  message: ToastMessage;
}

interface PopupContent {
  title: string;
  message: string;
}

interface NotificationContextValue {
  /** 一時的な通知(仕様書「UI手触り仕様書」4章: 追い抜き成功・ボス出現・アタック発動・勝敗などはトースト) */
  showToast: (message: ToastMessage) => void;
  /** 完了系の通知(進化・シューズ解放・新キャラ解放の完了はポップアップ) */
  showPopup: (title: string, message: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('NotificationProviderの外で使われています');
  return ctx;
}

// 「耳アド UI手触り仕様書」4章の数値。
const TOAST_ENTER_MS = 250;
const TOAST_HOLD_MS = 2700;
const TOAST_EXIT_MS = 400;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [popup, setPopup] = useState<PopupContent | null>(null);
  const nextId = useRef(0);

  const showToast = useCallback((message: ToastMessage) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showPopup = useCallback((title: string, message: string) => {
    setPopup({ title, message });
  }, []);

  // トースト自体の表示/消去でNotificationProviderが再レンダーされても、value のオブジェクト
  // 参照が毎回変わらないようにする。ここを素の{ showToast, showPopup }のままにすると、
  // トーストが出るたび・消えるたびに useNotifications() を使う全画面(Root, MainScreenなど)
  // が無関係に再レンダーされてしまう。
  const value = useMemo<NotificationContextValue>(
    () => ({ showToast, showPopup }),
    [showToast, showPopup]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <View style={styles.toastLayer} pointerEvents="none">
        {toasts.map((t) => (
          <ToastView key={t.id} message={t.message} onDone={() => removeToast(t.id)} />
        ))}
      </View>
      <Modal visible={!!popup} transparent animationType="fade">
        <View style={styles.popupBackdrop}>
          <View style={styles.popupCard}>
            <Text style={styles.popupTitle}>{popup?.title}</Text>
            <Text style={styles.popupMessage}>{popup?.message}</Text>
            <Pressable style={styles.popupButton} onPress={() => setPopup(null)}>
              <Text style={styles.popupButtonText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </NotificationContext.Provider>
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
    <Animated.View style={[styles.toast, { opacity: anim, transform: [{ translateY }] }]}>
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
  toastLayer: {
    position: 'absolute',
    // 画面上部、track内に浮かぶ形(仕様書4章)。ヘッダー分を避けつつtrackの高さに収まる位置。
    top: 130,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
  },
  toast: {
    backgroundColor: 'rgba(20,14,40,0.88)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.mint,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  popupBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupCard: {
    width: '80%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  popupTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  popupMessage: { fontSize: 14, color: colors.text, textAlign: 'center' },
  popupButton: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 32,
  },
  popupButtonText: { color: '#fff', fontWeight: '700' },
});
