import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const firestoreDbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId || 'ai-studio-aistudiohub-f1167e9a-7aa3-46ff-b5f2-94576b48f7b2';
export const db = getFirestore(app, firestoreDbId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/tasks');
googleProvider.addScope('https://www.googleapis.com/auth/tasks.readonly');

// In-memory access token for Google Tasks & Workspace
let cachedGoogleAccessToken: string | null = null;
export function setCachedGoogleAccessToken(token: string | null) {
  cachedGoogleAccessToken = token;
}
export function getCachedGoogleAccessToken(): string | null {
  return cachedGoogleAccessToken;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Strict validation constants matching firebase-blueprint.json & firestore.rules
const ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const VALID_NEWS_CATEGORIES = ['general', 'urgent', 'weather', 'roads', 'events', 'jobs'] as const;

export function sanitizeId(rawId: string, fallbackPrefix = 'item'): string {
  const cleaned = String(rawId || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 128);
  if (!cleaned || !ID_REGEX.test(cleaned)) {
    return `${fallbackPrefix}_${Date.now()}`;
  }
  return cleaned;
}

export function clampString(value: string | undefined | null, maxLen: number, minLen = 0, fallback = ''): string {
  const str = String(value ?? '').trim().slice(0, maxLen);
  if (str.length < minLen) {
    return fallback.slice(0, maxLen);
  }
  return str;
}

export async function signInWithGooglePopup(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (credential?.accessToken) {
    cachedGoogleAccessToken = credential.accessToken;
  }
  await ensureUserProfile(result.user);
  try {
    fetch('/api/sync-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: result.user.uid,
        email: result.user.email,
        name: result.user.displayName,
      }),
    }).catch(() => {});
  } catch {}
  return result.user;
}

export async function signOutUser(): Promise<void> {
  cachedGoogleAccessToken = null;
  await firebaseSignOut(auth);
}

export function subscribeToAuthChanges(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        await ensureUserProfile(user);
      } catch (err) {
        console.warn('Could not sync user profile on auth change:', err);
      }
    }
    callback(user);
  });
}

export async function ensureUserProfile(user: User): Promise<void> {
  if (!user || !user.uid) return;
  const uid = sanitizeId(user.uid, 'usr');
  const userRef = doc(db, 'users', uid);

  const displayName = clampString(user.displayName || user.email?.split('@')[0] || 'مستخدم تديكلت', 120, 1, 'مستخدم تديكلت');
  const photoURL = clampString(user.photoURL || '', 1024, 0, '');

  try {
    const snap = await getDoc(userRef).catch(() => null);
    if (!snap || !snap.exists()) {
      await setDoc(userRef, {
        uid,
        displayName,
        photoURL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } else {
      await updateDoc(userRef, {
        displayName,
        photoURL,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.warn('Could not sync user profile to cloud (running in offline/local mode):', error);
  }
}

export interface CloudChatSessionInput {
  id: string;
  title: string;
  preview?: string;
  lastUserPrompt?: string;
  lastAiResponse?: string;
  agentId?: string;
  messagesCount: number;
}

export async function syncChatSessionToCloud(session: CloudChatSessionInput): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  const uid = sanitizeId(user.uid, 'usr');
  const sessionId = sanitizeId(session.id, 'sess');
  const path = `users/${uid}/chatSessions/${sessionId}`;
  const sessionRef = doc(db, 'users', uid, 'chatSessions', sessionId);

  const title = clampString(session.title, 200, 1, 'محادثة جديدة');
  const preview = clampString(session.preview || '', 1000, 0, '');
  const lastUserPrompt = clampString(session.lastUserPrompt || '', 2000, 0, '');
  const lastAiResponse = clampString(session.lastAiResponse || '', 8000, 0, '');
  const agentId = sanitizeId(session.agentId || 'guide', 'guide').slice(0, 64);
  const messagesCount = Math.max(0, Math.min(5000, Math.floor(Number(session.messagesCount) || 0)));

  try {
    const existingSnap = await getDoc(sessionRef);
    if (!existingSnap.exists()) {
      await setDoc(sessionRef, {
        sessionId,
        ownerId: uid,
        title,
        preview,
        lastUserPrompt,
        lastAiResponse,
        agentId,
        messagesCount,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(sessionRef, {
        title,
        preview,
        lastUserPrompt,
        lastAiResponse,
        agentId,
        messagesCount,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function renameChatSessionInCloud(rawSessionId: string, newTitle: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  const uid = sanitizeId(user.uid, 'usr');
  const sessionId = sanitizeId(rawSessionId, 'sess');
  const path = `users/${uid}/chatSessions/${sessionId}`;
  const sessionRef = doc(db, 'users', uid, 'chatSessions', sessionId);
  const title = clampString(newTitle, 200, 1, 'محادثة');

  try {
    const snap = await getDoc(sessionRef);
    if (snap.exists()) {
      await updateDoc(sessionRef, {
        title,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteChatSessionFromCloud(rawSessionId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  const uid = sanitizeId(user.uid, 'usr');
  const sessionId = sanitizeId(rawSessionId, 'sess');
  const path = `users/${uid}/chatSessions/${sessionId}`;
  const sessionRef = doc(db, 'users', uid, 'chatSessions', sessionId);

  try {
    await deleteDoc(sessionRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export interface CloudChatSessionRecord {
  sessionId: string;
  ownerId: string;
  title: string;
  preview: string;
  lastUserPrompt: string;
  lastAiResponse: string;
  agentId: string;
  messagesCount: number;
  updatedAtMs: number;
}

export function subscribeToCloudChatSessions(
  userId: string,
  onUpdate: (sessions: CloudChatSessionRecord[]) => void
): Unsubscribe {
  const uid = sanitizeId(userId, 'usr');
  const path = `users/${uid}/chatSessions`;
  const q = query(collection(db, 'users', uid, 'chatSessions'), where('ownerId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const records: CloudChatSessionRecord[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const updatedAtMs =
          d.updatedAt && typeof d.updatedAt.toMillis === 'function'
            ? d.updatedAt.toMillis()
            : Date.now();
        records.push({
          sessionId: String(d.sessionId || docSnap.id),
          ownerId: String(d.ownerId || uid),
          title: String(d.title || 'محادثة'),
          preview: String(d.preview || ''),
          lastUserPrompt: String(d.lastUserPrompt || ''),
          lastAiResponse: String(d.lastAiResponse || ''),
          agentId: String(d.agentId || 'guide'),
          messagesCount: Number(d.messagesCount || 0),
          updatedAtMs,
        });
      });
      records.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      onUpdate(records);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export interface CloudSavedNewsInput {
  id: string;
  source: string;
  text: string;
  category?: string;
}

export async function saveNewsItemToCloud(item: CloudSavedNewsInput): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  const uid = sanitizeId(user.uid, 'usr');
  const newsId = sanitizeId(item.id, 'news');
  const path = `users/${uid}/savedNews/${newsId}`;
  const newsRef = doc(db, 'users', uid, 'savedNews', newsId);

  const source = clampString(item.source, 160, 1, 'مصدر محلي');
  const text = clampString(item.text, 4000, 1, 'خبر محلي');
  const rawCategory = String(item.category || 'general').toLowerCase();
  const category = (VALID_NEWS_CATEGORIES as readonly string[]).includes(rawCategory)
    ? rawCategory
    : 'general';

  try {
    const snap = await getDoc(newsRef);
    if (!snap.exists()) {
      await setDoc(newsRef, {
        newsId,
        ownerId: uid,
        source,
        text,
        category,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(newsRef, {
        source,
        text,
        category,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteNewsItemFromCloud(rawNewsId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  const uid = sanitizeId(user.uid, 'usr');
  const newsId = sanitizeId(rawNewsId, 'news');
  const path = `users/${uid}/savedNews/${newsId}`;
  const newsRef = doc(db, 'users', uid, 'savedNews', newsId);

  try {
    await deleteDoc(newsRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export interface CloudSavedNewsRecord {
  newsId: string;
  ownerId: string;
  source: string;
  text: string;
  category: string;
  updatedAtMs: number;
}

export function subscribeToCloudSavedNews(
  userId: string,
  onUpdate: (items: CloudSavedNewsRecord[]) => void,
  onError?: (errMessage: string) => void
): Unsubscribe {
  const uid = sanitizeId(userId, 'usr');
  const path = `users/${uid}/savedNews`;
  const q = query(collection(db, 'users', uid, 'savedNews'), where('ownerId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const records: CloudSavedNewsRecord[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const updatedAtMs =
          d.updatedAt && typeof d.updatedAt.toMillis === 'function'
            ? d.updatedAt.toMillis()
            : Date.now();
        records.push({
          newsId: String(d.newsId || docSnap.id),
          ownerId: String(d.ownerId || uid),
          source: String(d.source || 'مصدر محلي'),
          text: String(d.text || ''),
          category: String(d.category || 'general'),
          updatedAtMs,
        });
      });
      records.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      onUpdate(records);
    },
    (error) => {
      if (onError) {
        onError(error instanceof Error ? error.message : 'تعذر مزامنة الأخبار السحابية');
      }
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
