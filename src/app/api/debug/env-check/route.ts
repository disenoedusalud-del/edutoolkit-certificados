// src/app/api/debug/env-check/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Endpoint de diagnóstico para verificar variables de entorno en Vercel
 * NO exponer información sensible en producción
 */
export async function GET() {
  const envCheck = {
    // Firebase Admin
    hasFirebaseAdminBase64: !!process.env.FIREBASE_ADMIN_SA_BASE64,
    hasFirebaseAdminProjectId: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
    hasFirebaseAdminClientEmail: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    hasFirebaseAdminPrivateKey: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    
    // Firebase Client (NEXT_PUBLIC_*)
    hasFirebaseApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    hasFirebaseAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    hasFirebaseProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    hasFirebaseStorageBucket: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    hasFirebaseMessagingSenderId: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    hasFirebaseAppId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    hasFirebaseMeasurementId: !!process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    
    // Autenticación
    hasMasterAdminEmails: !!process.env.MASTER_ADMIN_EMAILS,
    masterAdminEmailsValue: process.env.MASTER_ADMIN_EMAILS ? 
      process.env.MASTER_ADMIN_EMAILS.split(",").map(e => e.trim().toLowerCase()) : [],
    hasAllowedAdminEmails: !!process.env.ALLOWED_ADMIN_EMAILS,
    
    // EmailJS
    hasEmailJsServiceId: !!process.env.EMAILJS_SERVICE_ID,
    hasEmailJsTemplateId: !!process.env.EMAILJS_TEMPLATE_ID,
    hasEmailJsPublicKey: !!process.env.EMAILJS_PUBLIC_KEY,
    hasEmailJsPrivateKey: !!process.env.EMAILJS_PRIVATE_KEY,
    
    // Apps Script Drive
    hasAppsScriptUploadUrl: !!process.env.APPS_SCRIPT_UPLOAD_URL,
    hasAppsScriptUploadToken: !!process.env.APPS_SCRIPT_UPLOAD_TOKEN,
    hasDriveCertificatesFolderId: !!process.env.DRIVE_CERTIFICATES_FOLDER_ID,
    
    // App URL
    hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
    appUrlValue: process.env.NEXT_PUBLIC_APP_URL || null,
    
    // Environment
    nodeEnv: process.env.NODE_ENV,
    vercelUrl: process.env.VERCEL_URL || null,
  };

  return NextResponse.json(envCheck, { status: 200 });
}

