// src/lib/firebaseAdmin.ts

import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

let adminApp: App | null = null;

function normalizePrivateKey(input: string) {
  return (input || "")
    .replace(/^"+|"+$/g, "")   // quita comillas pegadas
    .replace(/\\n/g, "\n")     // \n literal
    .replace(/\r\n/g, "\n")    // CRLF
    .replace(/\r/g, "\n")      // CR
    .trim();
}

function normalizeBase64(b64: string) {
  // Quitar espacios/saltos y soportar base64 “url-safe”
  let s = (b64 || "").trim().replace(/\s+/g, "");
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  // padding
  while (s.length % 4 !== 0) s += "=";
  return s;
}

function getAdmin(): App {
  if (adminApp) return adminApp;

  const b64raw = process.env.FIREBASE_ADMIN_SA_BASE64;

  console.log("[FIREBASE-ADMIN] hasBase64:", !!b64raw);
  console.log("[FIREBASE-ADMIN] hasPk:", !!process.env.FIREBASE_ADMIN_PRIVATE_KEY);

  if (b64raw) {
    const b64 = normalizeBase64(b64raw);

    const jsonStr = Buffer.from(b64, "base64").toString("utf-8");
    const sa = JSON.parse(jsonStr);

    const projectId = sa.project_id;
    const clientEmail = sa.client_email;
    const privateKey = normalizePrivateKey(sa.private_key);

    // Logs seguros (no filtran secretos)
    console.log("[FIREBASE-ADMIN] base64 projectId:", projectId);
    console.log("[FIREBASE-ADMIN] base64 email ok:", !!clientEmail);
    console.log("[FIREBASE-ADMIN] pk has BEGIN:", privateKey.includes("BEGIN PRIVATE KEY"));
    console.log("[FIREBASE-ADMIN] pk has END:", privateKey.includes("END PRIVATE KEY"));

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("FIREBASE_ADMIN_SA_BASE64 inválido: faltan project_id/client_email/private_key");
    }

    console.log("[FIREBASE-ADMIN] ✅ usando base64");

    adminApp =
      getApps().length === 0
        ? initializeApp({
            credential: cert({
              projectId,
              clientEmail,
              privateKey,
            }),
            projectId,
          })
        : getApps()[0];

    return adminApp;
  }

  // Fallback a vars individuales
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY || "");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Faltan variables de Firebase Admin. Configure FIREBASE_ADMIN_SA_BASE64 o (FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY)."
    );
  }

  console.log("[FIREBASE-ADMIN] ⚠️ usando vars individuales");

  adminApp =
    getApps().length === 0
      ? initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
          projectId,
        })
      : getApps()[0];

  return adminApp;
}

let _adminDb: Firestore | null = null;
let _adminAuth: Auth | null = null;

function getAdminDb(): Firestore {
  if (!_adminDb) _adminDb = getFirestore(getAdmin());
  return _adminDb;
}

function getAdminAuth(): Auth {
  if (!_adminAuth) _adminAuth = getAuth(getAdmin());
  return _adminAuth;
}

export const adminDb = new Proxy({} as Firestore, {
  get(_target, prop) {
    return (getAdminDb() as any)[prop];
  },
});

export const adminAuth = new Proxy({} as Auth, {
  get(_target, prop) {
    return (getAdminAuth() as any)[prop];
  },
});
