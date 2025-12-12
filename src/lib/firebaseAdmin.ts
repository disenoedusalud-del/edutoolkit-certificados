// src/lib/firebaseAdmin.ts

import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  throw new Error(
    "Faltan variables de entorno de Firebase Admin. Revisa .env.local"
  );
}

// El private key viene con '\n' en .env.local, aquí lo convertimos a saltos de línea reales
privateKey = privateKey.replace(/\\n/g, "\n");

const adminApp: App =
  getApps().length === 0
    ? initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      })
    : getApps()[0];

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);




