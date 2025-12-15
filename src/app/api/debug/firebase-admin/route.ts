// src/app/api/debug/firebase-admin/route.ts
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET() {
  // NO imprime llaves ni base64, solo info segura
  const info: any = {
    ok: false,
    hasBase64: !!process.env.FIREBASE_ADMIN_SA_BASE64,
    env: process.env.VERCEL_ENV || null,
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || null, // debería ser null si usa SOLO base64
  };

  // 1) Probar Auth (esto es lo que actualmente le está fallando)
  try {
    const list = await adminAuth.listUsers(1);
    info.authOk = true;
    info.authUsersReturned = list.users.length;
  } catch (e: any) {
    info.authOk = false;
    info.authErrorCode = e?.code || null;
    info.authErrorMessage = e?.message || String(e);
  }

  // 2) Probar Firestore
  try {
    const cols = await adminDb.listCollections();
    info.firestoreOk = true;
    info.firestoreCollections = cols.map((c) => c.id).slice(0, 10);
  } catch (e: any) {
    info.firestoreOk = false;
    info.fsErrorCode = e?.code || null;
    info.fsErrorMessage = e?.message || String(e);
  }

  info.ok = !!info.authOk && !!info.firestoreOk;

  return NextResponse.json(info, { status: info.ok ? 200 : 500 });
}
