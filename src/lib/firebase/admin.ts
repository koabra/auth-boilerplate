import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getPrivateKey() {
  const rawValue = process.env.FIREBASE_PRIVATE_KEY ?? "";
  const trimmed = rawValue.trim();
  const unquoted = trimmed.replace(/^["']/, "").replace(/["']$/, "");
  const normalized = unquoted.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");

  if (normalized.includes("BEGIN PRIVATE KEY")) {
    return normalized;
  }

  try {
    const decoded = Buffer.from(normalized, "base64").toString("utf8");
    if (decoded.includes("BEGIN PRIVATE KEY")) {
      return decoded;
    }
  } catch {
    // Ignore decode errors and return normalized as-is.
  }

  return normalized;
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
