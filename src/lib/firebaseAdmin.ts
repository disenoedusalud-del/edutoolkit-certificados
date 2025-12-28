// src/lib/firebaseAdmin.ts
import { getApps, initializeApp, cert, App, getApp } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

let adminApp: App | null = null;
const ADMIN_APP_NAME = "edutoolkit-admin";

function normalizePrivateKey(input: string) {
  let s = (input || "");

  // quitar BOM / nulls / chars raros comunes
  s = s.replace(/^\uFEFF/, "").replace(/\u0000/g, "");

  s = s
    .replace(/^"+|"+$/g, "")   // quita comillas pegadas
    .replace(/\\n/g, "\n")     // \n literal
    .replace(/\r\n/g, "\n")    // CRLF
    .replace(/\r/g, "\n")      // CR
    .trim();

  // Asegurar header/footer en líneas separadas (evita “footer pegado”)
  s = s
    .replace(/-----BEGIN PRIVATE KEY-----\s*/g, "-----BEGIN PRIVATE KEY-----\n")
    .replace(/\s*-----END PRIVATE KEY-----/g, "\n-----END PRIVATE KEY-----");

  return s.trim();
}

function normalizeBase64(b64: string) {
  // Quitar espacios/saltos y soportar base64 “url-safe”
  let s = (b64 || "").trim().replace(/\s+/g, "");
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4 !== 0) s += "="; // padding
  return s;
}

function getAdmin(): App {
  if (adminApp) return adminApp;

  try {
    adminApp = getApp(ADMIN_APP_NAME);
    return adminApp;
  } catch (e) { }

  try {
    const b64raw = process.env.FIREBASE_ADMIN_SA_BASE64;
    if (b64raw) {
      console.log("[FIREBASE-ADMIN] intentando inicializar vía BASE64...");
      const b64 = normalizeBase64(b64raw);
      let jsonStr = Buffer.from(b64, "base64").toString("utf-8");
      jsonStr = jsonStr.replace(/^\uFEFF/, "").replace(/\u0000/g, "").trim();

      const sa = JSON.parse(jsonStr);
      const projectId = sa.project_id || sa.projectId;
      const clientEmail = sa.client_email || sa.clientEmail;
      const privateKey = normalizePrivateKey(sa.private_key || sa.privateKey || "");

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error("Faltan campos en el JSON del Service Account");
      }

      adminApp = initializeApp(
        {
          credential: cert({ projectId, clientEmail, privateKey } as any),
          projectId,
        },
        ADMIN_APP_NAME
      );
      console.log("[FIREBASE-ADMIN] ✅ Inicializado vía BASE64");
      return adminApp;
    }

    // Fallback a vars individuales
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY || "");

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Faltan variables de entorno para Firebase Admin");
    }

    adminApp = initializeApp(
      {
        credential: cert({ projectId, clientEmail, privateKey } as any),
        projectId,
      },
      ADMIN_APP_NAME
    );
    console.log("[FIREBASE-ADMIN] ✅ Inicializado vía vars individuales");
    return adminApp;
  } catch (err: any) {
    console.error("[FIREBASE-ADMIN] ❌ ERROR CRÍTICO:", err.message);
    throw err;
  }
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
