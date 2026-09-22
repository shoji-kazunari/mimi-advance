import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { characterDefById } from '../../domain/characters';
import { canEvolve, nextEvolutionStep } from '../../domain/evolution';
import { isStatUnlocked, statLevelCap, characterLevel } from '../../domain/stats';
import { EvolutionStage, STAT_KEYS } from '../../domain/types';
import { useGameStore } from '../../state/gameStore';
import { useNotifications } from '../Notifications';
import { colors, STAT_LABELS } from '../theme';

interface Props {
  defId: string;
  onBack: () => void;
}

const COSTUME_STAGE_LABELS = ['どうぶつ', 'けもの脚', 'ヒト型'];

export function CharacterDetailScreen({ defId, onBack }: Props) {
  const state = useGameStore((s) => s.state);
  const setActiveCharacter = useGameStore((s) => s.setActiveCharacter);
  const tryEvolve = useGameStore((s) => s.tryEvolve);
  const setCostume = useGameStore((s) => s.setCostume);
  const { showPopup, showToast } = useNotifications();
  const [previewVisible, setPreviewVisible] = useState(false);

  const character = state.characters.find((c) => c.defId === defId);
  if (!character) return null;
  const def = characterDefById(character.defId);
  const step = def ? nextEvolutionStep(def, character.evolutionStage) : undefined;
  const charLv = characterLevel(character);
  const isActive = state.activeCharacterId === defId;
  const evolvable = canEvolve(character);

  const handleEvolve = () => {
    if (!evolvable) return;
    tryEvolve(defId);
    showPopup('進化', `${character.name} が進化しました！`);
    setPreviewVisible(false);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>← 戻る</Text>
        </Pressable>
        <Text style={styles.title}>{character.name}</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.avatarBlock}>
        <Text style={styles.avatar}>🐾</Text>
        <Text style={styles.sub}>着せ替え: {COSTUME_STAGE_LABELS[character.costumeStage]}</Text>
        <View style={styles.costumeRow}>
          {Array.from({ length: character.evolutionStage + 1 }, (_, stage) => stage as EvolutionStage).map(
            (stage) => {
              const active = character.costumeStage === stage;
              return (
                <Pressable
                  key={stage}
                  style={[styles.costumeChip, active && styles.costumeChipActive]}
                  onPress={() => setCostume(defId, stage)}
                >
                  <Text style={[styles.costumeChipText, active && styles.costumeChipTextActive]}>
                    {COSTUME_STAGE_LABELS[stage]}
                  </Text>
                </Pressable>
              );
            }
          )}
          {/* 将来の課金限定コスチューム枠(現状はダミー、仕様書4章)。 */}
          <View style={[styles.costumeChip, styles.costumeChipLocked]}>
            <Text style={styles.costumeChipLockedText}>🔒 限定</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>ステージ {character.stage}</Text>
        <Text style={styles.infoText}>キャラLv. {charLv.toFixed(1)}</Text>
        <Text style={styles.infoText}>進化段階 {character.evolutionStage}</Text>
      </View>

      <View style={styles.statList}>
        {STAT_KEYS.map((stat) => {
          const locked = !isStatUnlocked(stat, character.evolutionStage);
          const cap = statLevelCap(character.evolutionStage);
          return (
            <View key={stat} style={styles.statRow}>
              <Text style={styles.statName}>{locked ? '🔒 ' : ''}{STAT_LABELS[stat]}</Text>
              <Text style={styles.statValue}>
                {locked ? 'ロック中' : `${character.stats[stat].toFixed(1)} / ${cap === Infinity ? '∞' : cap}`}
              </Text>
            </View>
          );
        })}
      </View>

      <Pressable
        disabled={isActive}
        style={[styles.actionButton, { backgroundColor: isActive ? colors.locked : colors.primary }]}
        onPress={() => {
          setActiveCharacter(defId);
          showToast(`${character.name} に交代しました`);
        }}
      >
        <Text style={styles.actionButtonText}>{isActive ? '操作中' : 'ランナーに交代'}</Text>
      </Pressable>

      {step && (
        <Pressable style={styles.actionButtonOutline} onPress={() => setPreviewVisible(true)}>
          <Text style={styles.actionButtonOutlineText}>進化を見る</Text>
        </Pressable>
      )}

      <Modal visible={previewVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {step ? (
              <>
                <Text style={styles.previewAvatar}>❔</Text>
                <Text style={styles.modalTitle}>？？？</Text>
                <Text style={styles.modalLine}>進化条件: キャラLv. {step.requiredCharLv} 以上</Text>
                <Text style={styles.modalLine}>
                  効果: {character.evolutionStage === 0 ? 'テクニックが解放されます' : 'アタックが解放されます'}
                </Text>
                <Text style={styles.modalLine}>現在のキャラLv.: {charLv.toFixed(1)}</Text>
                <Pressable
                  disabled={!evolvable}
                  style={[styles.actionButton, { backgroundColor: evolvable ? colors.primary : colors.locked }]}
                  onPress={handleEvolve}
                >
                  <Text style={styles.actionButtonText}>{evolvable ? '進化する' : '条件未達'}</Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.modalLine}>これ以上の進化はありません</Text>
            )}
            <Pressable onPress={() => setPreviewVisible(false)}>
              <Text style={styles.closeText}>閉じる</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { color: colors.primary, width: 48 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  avatarBlock: { alignItems: 'center', gap: 6, backgroundColor: colors.card, borderRadius: 16, padding: 16 },
  avatar: { fontSize: 56 },
  sub: { fontSize: 12, color: colors.subtext },
  costumeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  costumeChip: {
    backgroundColor: colors.cardInset,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  costumeChipActive: { backgroundColor: colors.primary },
  costumeChipText: { fontSize: 12, color: colors.text },
  costumeChipTextActive: { color: '#fff', fontWeight: '700' },
  costumeChipLocked: { backgroundColor: 'transparent', borderColor: colors.border },
  costumeChipLockedText: { fontSize: 12, color: colors.lockedText },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: 12, padding: 12 },
  infoText: { fontSize: 12, color: colors.text },
  statList: { backgroundColor: colors.card, borderRadius: 16, padding: 14, gap: 10 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statName: { color: colors.text, fontWeight: '600' },
  statValue: { color: colors.subtext },
  actionButton: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontWeight: '700' },
  actionButtonOutline: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.primary },
  actionButtonOutlineText: { color: colors.primary, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '85%', backgroundColor: colors.card, borderRadius: 16, padding: 20, gap: 10, alignItems: 'center' },
  previewAvatar: { fontSize: 48 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  modalLine: { fontSize: 13, color: colors.text, textAlign: 'center' },
  closeText: { color: colors.subtext, marginTop: 8 },
});
