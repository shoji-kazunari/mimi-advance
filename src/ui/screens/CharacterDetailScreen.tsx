import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { characterDefById } from '../../domain/characters';
import { canEvolve, nextEvolutionStep } from '../../domain/evolution';
import { isStatUnlocked, statLevelCap, characterLevel } from '../../domain/stats';
import { EvolutionStage, STAT_KEYS } from '../../domain/types';
import { useGameStore } from '../../state/gameStore';
import { EarAvatar } from '../components/EarAvatar';
import { ModalCard } from '../components/ModalCard';
import { useNotifications } from '../Notifications';
import { colors, STAT_LABELS } from '../theme';

interface Props {
  defId: string;
  onBack: () => void;
  /**
   * 進化成功時に呼ぶ。キャラ一覧・詳細のポップアップ(どちらもModal)は、進化完了
   * ポップアップ(Notifications.tsx、こちらもModal)より後から開くため、react-native-webの
   * ModalはDOM追加順(=後から開いた方が上)で重なり、開いたままだと完了ポップアップが
   * 裏に隠れて見えなくなる。進化した瞬間は一覧・詳細ごと閉じて、隠れず見えるようにする。
   */
  onEvolved: () => void;
}

const COSTUME_STAGE_LABELS = ['どうぶつ', 'けもの脚', 'ヒト型'];

export function CharacterDetailScreen({ defId, onBack, onEvolved }: Props) {
  const state = useGameStore((s) => s.state);
  const setActiveCharacter = useGameStore((s) => s.setActiveCharacter);
  const tryEvolve = useGameStore((s) => s.tryEvolve);
  const setCostume = useGameStore((s) => s.setCostume);
  const { showPopup, showToast } = useNotifications();
  const [previewVisible, setPreviewVisible] = useState(false);
  const [costumeVisible, setCostumeVisible] = useState(false);

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
    onEvolved();
    showPopup('進化', `${character.name} が進化しました！`);
  };

  return (
    <>
      <ModalCard onClose={onBack}>
        <View style={styles.avatarBlock}>
          {/* 「耳アド」らしい遊びとして、名前を斜めに2つ重ねてzzz風に見せる装飾。 */}
          <View style={styles.sleepyRow}>
            <Text style={styles.sleepyTextSmall}>{character.name}</Text>
            <Text style={styles.sleepyTextBig}>{character.name}</Text>
          </View>
          <EarAvatar size={80} />
        </View>

        <Text style={styles.infoLine}>
          ステージ {character.stage} ・ キャラLv.{charLv.toFixed(1)} ・ 進化 {character.evolutionStage}/2
        </Text>

        <View style={styles.statList}>
          {STAT_KEYS.map((stat) => {
            const locked = !isStatUnlocked(stat, character.evolutionStage);
            const cap = statLevelCap(character.evolutionStage);
            return (
              <View key={stat} style={styles.statRow}>
                <Text style={styles.statName}>{STAT_LABELS[stat]}</Text>
                <Text style={locked ? styles.statLocked : styles.statValue}>
                  {locked ? '🔒 ロック中' : `Lv.${character.stats[stat].toFixed(1)} / 上限${cap === Infinity ? '∞' : cap}`}
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
          <Text style={[styles.actionButtonText, isActive && styles.actionButtonTextLocked]}>
            {isActive ? '現在操作中のランナーです' : 'ランナーに交代'}
          </Text>
        </Pressable>

        <Pressable style={styles.evolveButtonWrap} onPress={() => setPreviewVisible(true)}>
          <LinearGradient
            colors={[colors.gaugeReadyStart, colors.gaugeReadyEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.evolveButton}
          >
            <Text style={styles.evolveButtonText}>
              {evolvable
                ? '進化可能'
                : step
                  ? `進化 (キャラLv.${step.requiredCharLv}で可能)`
                  : '進化 (最大進化済み)'}
            </Text>
          </LinearGradient>
        </Pressable>

        <Pressable style={styles.costumeButton} onPress={() => setCostumeVisible(true)}>
          <Text style={styles.costumeButtonText}>👗 着せ替え</Text>
        </Pressable>
      </ModalCard>

      {previewVisible && (
        <ModalCard title="進化プレビュー" onClose={() => setPreviewVisible(false)}>
          {step ? (
            <>
              <View style={styles.previewRow}>
                <View style={styles.previewSide}>
                  <EarAvatar size={64} />
                  <Text style={styles.previewLabel}>
                    {character.name}({COSTUME_STAGE_LABELS[character.costumeStage]})
                  </Text>
                </View>
                <Text style={styles.previewArrow}>→</Text>
                <View style={styles.previewSide}>
                  <EarAvatar size={64} silhouette />
                  <Text style={styles.previewLabel}>？？？</Text>
                </View>
              </View>
              <View style={styles.previewInfoBox}>
                <Text style={styles.previewInfoLabel}>進化条件</Text>
                <Text style={styles.previewInfoValue}>キャラLv.{step.requiredCharLv}</Text>
              </View>
              <View style={styles.previewInfoBox}>
                <Text style={styles.previewInfoLabel}>効果</Text>
                <Text style={styles.previewInfoValue}>
                  {character.evolutionStage === 0 ? 'テクニックステータス解放' : 'アタックステータス解放'}
                </Text>
              </View>
              <Pressable
                disabled={!evolvable}
                style={[styles.actionButton, { backgroundColor: evolvable ? colors.primary : colors.locked }]}
                onPress={handleEvolve}
              >
                <Text style={[styles.actionButtonText, !evolvable && styles.actionButtonTextLocked]}>
                  {evolvable ? '進化する' : 'まだ進化できません'}
                </Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.previewLabel}>これ以上の進化はありません</Text>
          )}
        </ModalCard>
      )}

      {costumeVisible && (
        <ModalCard
          title="着せ替え"
          description="これまでに進化した見た目に戻したり、切り替えて楽しめます。"
          onClose={() => setCostumeVisible(false)}
        >
          <View style={styles.grid}>
            {Array.from({ length: character.evolutionStage + 1 }, (_, stage) => stage as EvolutionStage).map(
              (stage) => {
                const active = character.costumeStage === stage;
                return (
                  <Pressable
                    key={stage}
                    style={[styles.card, active && styles.cardActive]}
                    onPress={() => setCostume(defId, stage)}
                  >
                    <EarAvatar size={56} />
                    <Text style={styles.name}>{COSTUME_STAGE_LABELS[stage]}</Text>
                    <Text style={styles.sub}>{active ? '選択中' : ''}</Text>
                  </Pressable>
                );
              }
            )}
            {/* 将来の課金限定コスチューム枠(現状はダミー、仕様書4章)。 */}
            <View style={styles.card}>
              <View style={styles.lockedCircle} />
              <Text style={styles.name}>🔒 ???</Text>
              <Text style={styles.sub}>課金で解放予定</Text>
            </View>
          </View>
        </ModalCard>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  avatarBlock: { alignItems: 'center', gap: 4 },
  sleepyRow: { flexDirection: 'row', gap: 2, height: 18 },
  sleepyTextSmall: { fontSize: 11, fontWeight: '800', color: colors.gold, marginTop: 4 },
  sleepyTextBig: { fontSize: 14, fontWeight: '800', color: colors.gold },
  infoLine: { fontSize: 12, color: colors.subtext, textAlign: 'center' },
  statList: { width: '100%', backgroundColor: colors.cardInset, borderRadius: 16, padding: 14, gap: 10 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statName: { color: colors.text, fontWeight: '600' },
  statValue: { color: colors.mint, fontWeight: '700' },
  statLocked: { color: colors.lockedText },
  actionButton: { width: '100%', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontWeight: '700' },
  actionButtonTextLocked: { color: colors.lockedText },
  evolveButtonWrap: { width: '100%' },
  evolveButton: { borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  evolveButtonText: { color: '#1a0f00', fontWeight: '800' },
  costumeButton: { width: '100%', backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  costumeButtonText: { color: '#fff', fontWeight: '700' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  previewSide: { alignItems: 'center', gap: 6 },
  previewArrow: { fontSize: 20, color: colors.subtext },
  previewLabel: { fontSize: 12, color: colors.subtext, textAlign: 'center' },
  previewInfoBox: { width: '100%', backgroundColor: colors.cardInset, borderRadius: 12, padding: 10, gap: 2 },
  previewInfoLabel: { fontSize: 11, color: colors.subtext },
  previewInfoValue: { fontSize: 14, color: colors.text, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, width: '100%' },
  card: {
    flexBasis: '45%',
    flexGrow: 1,
    backgroundColor: colors.cardInset,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  cardActive: { borderColor: colors.accent },
  lockedCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: colors.border },
  name: { fontWeight: '700', color: colors.text },
  sub: { fontSize: 12, color: colors.subtext },
});
