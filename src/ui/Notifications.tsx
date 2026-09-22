import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from './theme';

export interface ToastSegment {
  text: string;
  color?: string;
}
export type ToastMessage = string | ToastSegment[];

export interface ToastItem {
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
  /** 現在表示中のトースト一覧。トースト自体の描画はTrackToastLayer(track内)が行う。 */
  toasts: ToastItem[];
  removeToast: (id: number) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('NotificationProviderの外で使われています');
  return ctx;
}

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

  const value = useMemo<NotificationContextValue>(
    () => ({ showToast, showPopup, toasts, removeToast }),
    [showToast, showPopup, toasts, removeToast]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
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

const styles = StyleSheet.create({
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
