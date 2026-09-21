import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { effectiveStatValue, isStatUnlocked, statLevelCap, statUpgradeCost, characterLevel, companionLevel } from '../../domain/stats';
import { zakoRequiredCount, zakoSpawnIntervalMs } from '../../domain/stage';
import { isVsRaceUnlocked, VS_RACE_UNLOCK_STAGE } from '../../domain/vsRace';
import { SHOE_UNLOCK_COST } from '../../domain/shoes';
import { STAT_KEYS } from '../../domain/types';
import { useGameStore } from '../../state/gameStore';
import { useActiveCharacter } from '../../state/selectors';
import { useNotifications } from '../Notifications';
import { GaugeBar } from '../components/GaugeBar';
import { ShoeCard } from '../components/ShoeCard';
import { StatCard } from '../components/StatCard';
import { SaveCodeModal } from './SaveCodeModal';
import { colors } from '../theme';

const NG_WORDS = ['死ね', 'クソ', 'アホ'];

interface Props {
  onOpenCharacters: () => void;
  onStartBossBattle: () => void;
  onOpenVsRace: () => void;
}

export function MainScreen({ onOpenCharacters, onStartBossBattle, onOpenVsRace }: Props) {
  const state = useGameStore((s) => s.state);
  const registerZakoPass = useGameStore((s) => s.registerZakoPass);
  const upgradeStat = useGameStore((s) => s.upgradeStat);
  const unlockShoe = useGameStore((s) => s.unlockShoe);
  const upgradeShoe = useGameStore((s) => s.upgradeShoe);
  const setUsername = useGameStore((s) => s.setUsername);
  const { showToast, showPopup } = useNotifications();
  const character = useActiveCharacter();

  const [usernameModal, setUsernameModal] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(state.username);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [helpVisible, setHelpVisible] = useState(false);
  const [saveCodeVisible, setSaveCodeVisible] = useState(false);

  const required = zakoRequiredCount(character.stage);
  const bossReady = character.zakoDefeated >= required;
  const gutsEff = effectiveStatValue(character.stats, 'guts', character.evolutionStage);

  const lastZakoToastAt = useRef(0);
  useEffect(() => {
    if (bossReady) return;
    const intervalMs = zakoSpawnIntervalMs(gutsEff);
    const id = setInterval(() => {
      registerZakoPass();
      // ガッツで出現間隔が縮むと通知が積み重なって見づらくなるため、
      // ptの加算は毎回行いつつ、トースト表示だけは間引く。
      const now = Date.now();
      if (now - lastZakoToastAt.current >= 1000) {
        lastZakoToastAt.current = now;
        showToast('ザコを追い抜いた！');
      }
    }, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gutsEff, bossReady, character.defId, character.stage]);

  const prevBossReady = useRef(bossReady);
  useEffect(() => {
    if (bossReady && !prevBossReady.current) {
      showToast('ボス出現！');
    }
    prevBossReady.current = bossReady;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bossReady]);

  const charLv = characterLevel(character);
  const compLv = companionLevel(state.characters, state.activeCharacterId);
  const totalLv = charLv + compLv;

  const vsUnlocked = isVsRaceUnlocked(state.characters);

  const handleUsernameSave = () => {
    const trimmed = usernameDraft.trim();
    if (trimmed.length === 0 || trimmed.length > 8) {
      setUsernameError('8文字以内で入力してください');
      return;
    }
    if (NG_WORDS.some((w) => trimmed.includes(w))) {
      setUsernameError('使用できない言葉が含まれています');
      return;
    }
    setUsernameError(null);
    setUsername(trimmed);
    setUsernameModal(false);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>耳アド</Text>
        <View style={styles.headerButtons}>
          <Pressable
            style={styles.iconButton}
            onPress={() => {
              setUsernameDraft(state.username);
              setUsernameModal(true);
            }}
          >
            <Text>👤 {state.username}</Text>
          </Pressable>
          <Pressable style={styles.iconButton} onPress={() => setSaveCodeVisible(true)}>
            <Text>💾</Text>
          </Pressable>
          <Pressable style={styles.iconButton} onPress={() => setHelpVisible(true)}>
            <Text>❓</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.runnerRow}>
        <Text style={styles.runnerName}>{character.name}</Text>
        <Pressable style={styles.linkButton} onPress={onOpenCharacters}>
          <Text style={styles.linkButtonText}>📖 一覧・進化</Text>
        </Pressable>
      </View>

      <Text style={styles.stageRow}>
        ステージ {character.stage} / 総追い抜き数 {character.totalZakoDefeated}
      </Text>

      <View style={styles.track}>
        <Text style={styles.trackEmoji}>🏃</Text>
        <Text style={styles.trackHint}>{bossReady ? 'ボスが待ち構えている！' : '自動で走行中…'}</Text>
      </View>

      <View style={styles.bossPanel}>
        <View style={styles.bossGaugeArea}>
          <Text style={styles.bossLabel}>
            追い抜き {character.zakoDefeated}/{required}
          </Text>
          <GaugeBar ratio={character.zakoDefeated / required} color={colors.danger} />
        </View>
        <Pressable
          disabled={!bossReady}
          onPress={onStartBossBattle}
          style={[styles.bossButton, { backgroundColor: bossReady ? colors.danger : colors.locked }]}
        >
          <Text style={styles.bossButtonText}>ボス{'\n'}バトル</Text>
        </Pressable>
      </View>

      <View style={styles.trainingCard}>
        <View style={styles.walletRow}>
          <View style={styles.walletChip}>
            <Text style={styles.walletLabel}>ランナーpt</Text>
            <Text style={styles.walletValue}>{Math.floor(state.runnerPt)}</Text>
          </View>
          <View style={styles.walletChip}>
            <Text style={styles.walletLabel}>Vicマネー</Text>
            <Text style={styles.walletValue}>{Math.floor(state.vicMoney)}</Text>
          </View>
        </View>

        <View style={styles.statGrid}>
          {STAT_KEYS.map((stat) => {
            const locked = !isStatUnlocked(stat, character.evolutionStage);
            const cap = statLevelCap(character.evolutionStage);
            const level = character.stats[stat];
            const cost = locked ? null : statUpgradeCost(stat, level);
            return (
              <StatCard
                key={stat}
                statKey={stat}
                level={level}
                cost={cost}
                locked={locked}
                lockedHint={stat === 'technique' ? '進化2で解放' : stat === 'damage' ? '進化3で解放' : undefined}
                atCap={level >= cap}
                onUpgrade={() => upgradeStat(character.defId, stat)}
              />
            );
          })}
          <View style={[styles.statCardSlot]}>
            <ShoeCard
              shoeUnlocked={character.shoeUnlocked}
              shoeLevel={character.shoeLevel}
              vicMoney={state.vicMoney}
              onUnlock={() => {
                if (character.shoeUnlocked || state.vicMoney < SHOE_UNLOCK_COST) return;
                unlockShoe(character.defId);
                showPopup('シューズ解放', 'シューズが解放されました！');
              }}
              onUpgrade={() => upgradeShoe(character.defId)}
            />
          </View>
        </View>

        <View style={styles.levelBox}>
          <Text style={styles.levelBoxText}>
            キャラLv. {charLv.toFixed(1)} + 仲間Lv. {compLv.toFixed(1)} = 総合Lv. {totalLv.toFixed(1)}
          </Text>
        </View>
      </View>

      <View style={styles.vsCard}>
        <Text style={styles.vsTitle}>VSレース</Text>
        {vsUnlocked ? (
          <>
            <Text style={styles.vsBody}>本日の残り回数: {state.vsRace.remaining}</Text>
            <Pressable
              disabled={state.vsRace.remaining <= 0}
              style={[
                styles.vsButton,
                { backgroundColor: state.vsRace.remaining > 0 ? colors.primary : colors.locked },
              ]}
              onPress={onOpenVsRace}
            >
              <Text style={styles.vsButtonText}>対戦相手を選ぶ</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.vsBody}>ステージ{VS_RACE_UNLOCK_STAGE}到達で解放されます</Text>
        )}
      </View>

      <Modal visible={usernameModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>ユーザー名を変更</Text>
            <TextInput
              style={styles.input}
              value={usernameDraft}
              onChangeText={setUsernameDraft}
              maxLength={8}
            />
            {usernameError && <Text style={styles.errorText}>{usernameError}</Text>}
            <View style={styles.modalButtonRow}>
              <Pressable style={styles.modalCancel} onPress={() => setUsernameModal(false)}>
                <Text>キャンセル</Text>
              </Pressable>
              <Pressable style={styles.modalSave} onPress={handleUsernameSave}>
                <Text style={{ color: '#fff' }}>保存</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={helpVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>用語集</Text>
            <ScrollView style={{ maxHeight: 260 }}>
              <Text style={styles.helpItem}>ランナーpt: ザコを追い抜くと入る。ステータス育成に使う。</Text>
              <Text style={styles.helpItem}>Vicマネー: ボス撃破やVSレース勝利で入る。シューズ・新キャラ解放に使う。</Text>
              <Text style={styles.helpItem}>キャラLv.: 自キャラのステータス合計(シューズ倍率込み)。</Text>
              <Text style={styles.helpItem}>仲間Lv.: 操作していない仲間キャラのステータスの10%を合算したもの。</Text>
              <Text style={styles.helpItem}>進化: キャラLv.が条件を満たすと行える。新しいステータスが解放される。</Text>
            </ScrollView>
            <Pressable style={styles.modalSave} onPress={() => setHelpVisible(false)}>
              <Text style={{ color: '#fff' }}>閉じる</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <SaveCodeModal visible={saveCodeVisible} onClose={() => setSaveCodeVisible(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 48, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  headerButtons: { flexDirection: 'row', gap: 8 },
  iconButton: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  runnerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  runnerName: { fontSize: 18, fontWeight: '700', color: colors.text },
  linkButton: { backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  linkButtonText: { color: colors.primary, fontWeight: '600' },
  stageRow: { color: colors.subtext },
  track: {
    height: 120,
    backgroundColor: '#dfeeff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  trackEmoji: { fontSize: 36 },
  trackHint: { color: colors.subtext },
  bossPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
  },
  bossGaugeArea: { flex: 0.73, gap: 6 },
  bossLabel: { fontSize: 12, color: colors.subtext },
  bossButton: { flex: 0.27, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  bossButtonText: { color: '#fff', fontWeight: '700', fontSize: 12, textAlign: 'center' },
  trainingCard: { backgroundColor: colors.card, borderRadius: 16, padding: 14, gap: 12 },
  walletRow: { flexDirection: 'row', gap: 10 },
  walletChip: { flex: 1, backgroundColor: '#f1efe8', borderRadius: 12, padding: 10, alignItems: 'center' },
  walletLabel: { fontSize: 12, color: colors.subtext },
  walletValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 10 },
  statCardSlot: { flexBasis: '30%' },
  levelBox: { backgroundColor: '#f1efe8', borderRadius: 12, padding: 10, alignItems: 'center' },
  levelBoxText: { fontSize: 13, color: colors.text },
  vsCard: { backgroundColor: colors.card, borderRadius: 16, padding: 14, gap: 8 },
  vsTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  vsBody: { color: colors.subtext },
  vsButton: { borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  vsButtonText: { color: '#fff', fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '85%', backgroundColor: colors.card, borderRadius: 16, padding: 20, gap: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10 },
  errorText: { color: colors.danger, fontSize: 12 },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalCancel: { paddingVertical: 8, paddingHorizontal: 14 },
  modalSave: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  helpItem: { color: colors.text, marginBottom: 8, lineHeight: 20 },
});
