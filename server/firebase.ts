// @ts-ignore
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

let isConnected = false;
let dbInstance: any = null;
let currentProjectId = process.env.FIREBASE_PROJECT_ID || '';

export function initFirebase(): boolean {
  if (isConnected && dbInstance) return true;

  try {
    const serviceAccountPath = path.join(process.cwd(), 'data', 'firebase-service-account.json');
    
    // 1. Try initializing with service account JSON file if present
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      }
      dbInstance = admin.firestore();
      isConnected = true;
      currentProjectId = serviceAccount.project_id || 'zerrouki-b8891';
      console.log(`[Firebase Cloud] Connected via service account JSON file (Project: ${currentProjectId}) 🟢`);
      return true;
    }

    // 2. Try initializing with environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined;

    if (projectId && clientEmail && privateKey) {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey
          })
        });
      }
      dbInstance = admin.firestore();
      isConnected = true;
      currentProjectId = projectId;
      console.log(`[Firebase Cloud] Connected via Environment Credentials (Project: ${projectId}) 🟢`);
      return true;
    }

    console.log('[Firebase Cloud] Credentials not configured yet. System running in hybrid local storage mode.');
    return false;
  } catch (err: any) {
    console.warn('[Firebase Cloud] Initialization warning:', err.message);
    isConnected = false;
    return false;
  }
}

export function isFirebaseConnected(): boolean {
  if (!isConnected) {
    initFirebase();
  }
  return isConnected;
}

export function getFirebaseProjectId(): string {
  return currentProjectId || 'zerrouki-store-cloud';
}

export function getFirestoreDb(): any {
  if (!isConnected) {
    initFirebase();
  }
  return dbInstance;
}

// Push a single document to Firebase Firestore Collection
export async function saveToFirestoreDoc(collectionName: string, docId: string, data: any): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;
  try {
    await db.collection(collectionName).doc(docId).set(data, { merge: true });
    return true;
  } catch (err: any) {
    console.error(`[Firebase Cloud] Failed to save doc to ${collectionName}/${docId}:`, err.message);
    return false;
  }
}

// Delete a document from Firebase Firestore Collection
export async function deleteFromFirestoreDoc(collectionName: string, docId: string): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;
  try {
    await db.collection(collectionName).doc(docId).delete();
    return true;
  } catch (err: any) {
    console.error(`[Firebase Cloud] Failed to delete doc ${collectionName}/${docId}:`, err.message);
    return false;
  }
}

// Save an entire array of items to a Firestore Collection
export async function saveEntireCollectionToFirestore(collectionName: string, items: any[]): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db || !Array.isArray(items)) return false;
  if (items.length === 0) return true;

  try {
    const collectionRef = db.collection(collectionName);
    const chunkSize = 400;

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const batch = db.batch();
      let count = 0;

      chunk.forEach(item => {
        if (item && item.id !== undefined && item.id !== null) {
          const docRef = collectionRef.doc(String(item.id));
          batch.set(docRef, item, { merge: true });
          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
      }
    }
    return true;
  } catch (err: any) {
    console.error(`[Firebase Cloud] Failed to save collection ${collectionName}:`, err.message);
    return false;
  }
}

// Fetch all documents from a Firestore Collection
export async function fetchCollectionFromFirestore(collectionName: string): Promise<any[] | null> {
  const db = getFirestoreDb();
  if (!db) return null;
  try {
    const snapshot = await db.collection(collectionName).get();
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => doc.data());
  } catch (err: any) {
    console.error(`[Firebase Cloud] Failed to fetch collection ${collectionName}:`, err.message);
    return null;
  }
}
