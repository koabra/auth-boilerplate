import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getPrivateKey() {
  const value = process.env.FIREBASE_PRIVATE_KEY ?? "";
  return value.replace(/\\n/g, "\n");
}

function ensureFirebaseAdminConfig() {
  const required = [
    process.env.FIREBASE_PROJECT_ID,
    process.env.FIREBASE_CLIENT_EMAIL,
    process.env.FIREBASE_PRIVATE_KEY,
  ];
  return required.every(Boolean);
}

export function getFirebaseAdminAuth() {
  if (!ensureFirebaseAdminConfig()) {
    throw new Error("Firebase admin env vars are missing");
  }

  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: getPrivateKey(),
      }),
    });

  return getAuth(app);
}
