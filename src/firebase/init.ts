import { initializeApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

const app = initializeApp(firebaseConfig);

/** ランキング等の非同期データはここ経由でFirestoreを読み書きする。 */
export const db: Firestore = getFirestore(app);
