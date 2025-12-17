// src/app/api/health/route.ts
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Health check endpoint
 * Verifica el estado de los servicios críticos:
 * - Firebase Admin Auth
 * - Firestore
 * - Vercel KV (si está configurado)
 */
export async function GET() {
  const services: Record<string, "ok" | "error"> = {};
  const errors: Record<string, string> = {};
  let allHealthy = true;

  // 1. Verificar Firebase Admin Auth
  try {
    await adminAuth.listUsers(1);
    services.firebaseAuth = "ok";
  } catch (error) {
    allHealthy = false;
    services.firebaseAuth = "error";
    errors.firebaseAuth = error instanceof Error ? error.message : String(error);
    logger.error("Health check: Firebase Auth falló", error);
  }

  // 2. Verificar Firestore
  try {
    await adminDb.listCollections();
    services.firestore = "ok";
  } catch (error) {
    allHealthy = false;
    services.firestore = "error";
    errors.firestore = error instanceof Error ? error.message : String(error);
    logger.error("Health check: Firestore falló", error);
  }

  // 3. Verificar Vercel KV (si está configurado)
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (kvUrl && kvToken) {
    try {
      // Intentar importar y usar KV
      const { kv } = await import("@vercel/kv");
      // Hacer un ping simple (get de una key que no existe es rápido)
      await kv.get("__health_check__");
      services.vercelKv = "ok";
    } catch (error) {
      // KV no es crítico, solo lo marcamos como error pero no fallamos el health check completo
      services.vercelKv = "error";
      errors.vercelKv = error instanceof Error ? error.message : String(error);
      logger.warn("Health check: Vercel KV falló (no crítico)", { error: error instanceof Error ? error.message : String(error) });
    }
  } else {
    // KV no está configurado, no es un error
    services.vercelKv = "ok";
  }

  const response = {
    status: allHealthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    services,
    ...(Object.keys(errors).length > 0 && { errors }),
  };

  return NextResponse.json(response, {
    status: allHealthy ? 200 : 503,
  });
}

