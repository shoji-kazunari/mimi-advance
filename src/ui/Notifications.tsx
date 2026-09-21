import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from './theme';

interface ToastItem {
  id: number;
  message: string;
}

interface PopupContent {
  title: string;
  message: string;
}

interface NotificationContextValue {
  /** 一時的な通知(仕様書10章: 追い抜き成功・ボス出現・アタック発動・勝敗などはトースト) */
  showToast: (message: string) => void;
  /** 完了系の通知(仕様書10章: 進化・シューズ解放・新キャラ解放の完了はポップアップ) */
  showPopup: (title: string, message: string) => void;
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

  const showToast = useCallback((message: string) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2200);
  }, []);

  const showPopup = useCallback((title: string, message: string) => {
    setPopup({ title, message });
  }, []);

  return (
    <NotificationContext.Provider value={{ showToast, showPopup }}>
      {children}
      <View style={styles.toastLayer} pointerEvents="none">
        {toasts.map((t) => (
          <View key={t.id} style={styles.toast}>
            <Text style={styles.toastText}>{t.message}</Text>
          </View>
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

const styles = StyleSheet.create({
  toastLayer: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
  },
  toast: {
    backgroundColor: 'rgba(30,30,30,0.85)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  toastText: { color: '#fff', fontSize: 14 },
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
