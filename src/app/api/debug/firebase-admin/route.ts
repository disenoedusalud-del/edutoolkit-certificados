// src/app/api/debug/firebase-admin/route.ts
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

function readServiceAccountFromBase64() {
  const b64raw = process.env.FIREBASE_ADMIN_SA_BASE64 || "";
  if (!b64raw) {
    return {
      base64DecodeOk: false,
      saClientEmail: null,
      saProjectId: null,
      saDecodeError: "FIREBASE_ADMIN_SA_BASE64 missing",
    };
  }

  try {
    // Normalizar: quitar espacios + soportar url-safe + padding
    let s = b64raw.trim().replace(/\s+/g, "");
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4 !== 0) s += "=";

    let jsonStr = Buffer.from(s, "base64").toString("utf8");
    jsonStr = jsonStr.replace(/^\uFEFF/, "").replace(/\u0000/g, "").trim();

    const sa: any = JSON.parse(jsonStr);

    return {
      base64DecodeOk: true,
      saClientEmail: sa.client_email || sa.clientEmail || null,
      saProjectId: sa.project_id || sa.projectId || null,
      saDecodeError: null,
    };
  } catch (e: any) {
    return {
      base64DecodeOk: false,
      saClientEmail: null,
      saProjectId: null,
      saDecodeError: e?.message || String(e),
    };
  }
}

export async function GET() {
  const saInfo = readServiceAccountFromBase64();

  // NO imprime llaves ni base64, solo info segura
  const info: any = {
    ok: false,

    // Env
    env: process.env.VERCEL_ENV || null,

    // Base64 status
    hasBase64: !!process.env.FIREBASE_ADMIN_SA_BASE64,
    base64DecodeOk: saInfo.base64DecodeOk,
    saClientEmail: saInfo.saClientEmail,
    saProjectId: saInfo.saProjectId,
    saDecodeError: saInfo.saDecodeError,

    // Si usa SOLO base64, esto debería ser null
    projectIdEnvVar: process.env.FIREBASE_ADMIN_PROJECT_ID || null,
  };

  // 1) Probar Auth
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
