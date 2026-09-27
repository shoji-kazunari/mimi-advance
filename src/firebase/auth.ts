import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from './init';

let uidPromise: Promise<string> | null = null;

/**
 * 匿名サインインしてuidを返す(初回だけサインイン、以降はキャッシュを返す)。
 * FirebaseコンソールでAuthenticationの「匿名」プロバイダを有効にしていないと失敗する。
 */
export function ensureSignedIn(): Promise<string> {
  if (uidPromise) return uidPromise;
  uidPromise = new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          unsubscribe();
          resolve(user.uid);
        }
      },
      (error) => {
        unsubscribe();
        reject(error);
      }
    );
    signInAnonymously(auth).catch((error) => {
      unsubscribe();
      reject(error);
    });
  });
  return uidPromise;
}
