import { initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

const app = initializeApp(firebaseConfig);

/** ランキング等の非同期データはここ経由でFirestoreを読み書きする。 */
export const db: Firestore = getFirestore(app);

/**
 * 匿名認証でuidを発行し、Firestoreのセキュリティルールで
 * 「自分のplayers/{uid}ドキュメントしか書けない」を強制するために使う。
 * (認証なしで任意のplayerIdに書けてしまうと、他人のランキング記録を
 * 誰でも上書きできてしまうため)
 */
export const auth: Auth = getAuth(app);
