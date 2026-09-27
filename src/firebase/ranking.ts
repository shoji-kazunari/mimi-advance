import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import {
  isPlausibleStage,
  isPlausibleTotalLevel,
  isPlausibleWeeklyPt,
  vsWinRate,
  VS_WIN_RATE_MIN_ATTEMPTS,
} from '../domain/ranking';
import { db } from './init';

export interface PlayerBoardEntry {
  playerId: string;
  username: string;
  stage: number;
  totalLevel: number;
}

export interface WeeklyBoardEntry {
  playerId: string;
  username: string;
  earnedPt: number;
  vsWins: number;
  vsAttempts: number;
}

/**
 * 到達ステージ・総合Lv.をまとめて1ドキュメントに書く(playersコレクション、
 * ドキュメントIDは匿名認証のuid)。セキュリティルール側で
 * 「uid == 自分のuidのドキュメントしか書けない」を強制する前提。
 */
export async function submitPlayerStats(
  uid: string,
  data: { username: string; stage: number; totalLevel: number }
): Promise<void> {
  if (!isPlausibleStage(data.stage) || !isPlausibleTotalLevel(data.totalLevel)) return;
  await setDoc(doc(db, 'players', uid), {
    username: data.username.slice(0, 20),
    stage: data.stage,
    totalLevel: data.totalLevel,
    updatedAt: serverTimestamp(),
  });
}

/**
 * 今週の獲得pt・VSレース勝率をまとめて1ドキュメントに書く(weekKeyごとに別サブコレクション、
 * 週が変われば自然に0から再スタートする)。どちらも「長く遊んでいるだけで勝てる」を
 * 避けるために週リセットにしている。
 */
export async function submitWeeklyStats(
  uid: string,
  weekKey: string,
  data: { username: string; earnedPt: number; vsWins: number; vsAttempts: number }
): Promise<void> {
  if (!isPlausibleWeeklyPt(data.earnedPt)) return;
  const winRate = vsWinRate(data.vsWins, data.vsAttempts) ?? 0;
  await setDoc(doc(db, 'weeklyScores', weekKey, 'entries', uid), {
    username: data.username.slice(0, 20),
    earnedPt: data.earnedPt,
    vsWins: data.vsWins,
    vsAttempts: data.vsAttempts,
    vsWinRate: winRate,
    updatedAt: serverTimestamp(),
  });
}

const BOARD_LIMIT = 50;

function toPlayerEntry(d: QueryDocumentSnapshot): PlayerBoardEntry {
  const data = d.data();
  return { playerId: d.id, username: data.username, stage: data.stage, totalLevel: data.totalLevel };
}

function toWeeklyEntry(d: QueryDocumentSnapshot): WeeklyBoardEntry {
  const data = d.data();
  return {
    playerId: d.id,
    username: data.username,
    earnedPt: data.earnedPt,
    vsWins: data.vsWins,
    vsAttempts: data.vsAttempts,
  };
}

export async function fetchTopByStage(): Promise<PlayerBoardEntry[]> {
  const snap = await getDocs(query(collection(db, 'players'), orderBy('stage', 'desc'), limit(BOARD_LIMIT)));
  return snap.docs.map(toPlayerEntry);
}

export async function fetchTopByTotalLevel(): Promise<PlayerBoardEntry[]> {
  const snap = await getDocs(
    query(collection(db, 'players'), orderBy('totalLevel', 'desc'), limit(BOARD_LIMIT))
  );
  return snap.docs.map(toPlayerEntry);
}

export async function fetchTopWeekly(weekKey: string): Promise<WeeklyBoardEntry[]> {
  const snap = await getDocs(
    query(
      collection(db, 'weeklyScores', weekKey, 'entries'),
      orderBy('earnedPt', 'desc'),
      limit(BOARD_LIMIT)
    )
  );
  return snap.docs.map(toWeeklyEntry);
}

/**
 * vsWinRateは未達(規定戦数未満)なら0で保存しているので、orderByだけで上位に来ない。
 * where+orderByの複合インデックスが要る組み合わせを避けるため、少し多めに読んでから
 * クライアント側で規定戦数未満を弾く。
 */
export async function fetchTopByVsWinRate(weekKey: string): Promise<WeeklyBoardEntry[]> {
  const snap = await getDocs(
    query(
      collection(db, 'weeklyScores', weekKey, 'entries'),
      orderBy('vsWinRate', 'desc'),
      limit(BOARD_LIMIT * 4)
    )
  );
  return snap.docs
    .map(toWeeklyEntry)
    .filter((p) => p.vsAttempts >= VS_WIN_RATE_MIN_ATTEMPTS)
    .slice(0, BOARD_LIMIT);
}
