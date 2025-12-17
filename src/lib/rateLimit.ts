// src/lib/rateLimit.ts
import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // ventana de tiempo en milisegundos
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Cliente KV (Vercel KV) con fallback a memoria
let kvClient: typeof kv | null = null;
const memoryStore = new Map<string, RateLimitEntry>();

// Inicializar cliente KV si las variables de entorno están disponibles
function getKVClient(): typeof kv | null {
  if (kvClient !== null) {
    return kvClient;
  }

  // Verificar si las variables de entorno de KV están configuradas
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (kvUrl && kvToken) {
    try {
      kvClient = kv;
      console.log("[RATE-LIMIT] ✅ Usando Vercel KV para rate limiting distribuido");
      return kvClient;
    } catch (error) {
      console.warn("[RATE-LIMIT] ⚠️ Error inicializando Vercel KV, usando memoria:", error);
      return null;
    }
  }

  // Fallback a memoria si no hay configuración de KV
  if (process.env.NODE_ENV === "production") {
    console.warn("[RATE-LIMIT] ⚠️ KV_REST_API_URL o KV_REST_API_TOKEN no configurados, usando memoria (no distribuido)");
  } else {
    console.log("[RATE-LIMIT] ℹ️ Usando almacenamiento en memoria (desarrollo local)");
  }

  return null;
}

/**
 * Obtiene una entrada de rate limit desde KV o memoria
 */
async function getRateLimitEntry(key: string): Promise<RateLimitEntry | null> {
  const client = getKVClient();
  
  if (client) {
    try {
      const entry = await client.get<RateLimitEntry>(key);
      return entry || null;
    } catch (error) {
      console.error("[RATE-LIMIT] Error leyendo de KV:", error);
      // Fallback a memoria en caso de error
      return memoryStore.get(key) || null;
    }
  }
  
  return memoryStore.get(key) || null;
}

/**
 * Guarda una entrada de rate limit en KV o memoria
 */
async function setRateLimitEntry(key: string, entry: RateLimitEntry): Promise<void> {
  const client = getKVClient();
  
  if (client) {
    try {
      // Calcular TTL en segundos (tiempo hasta resetTime)
      const ttl = Math.ceil((entry.resetTime - Date.now()) / 1000);
      if (ttl > 0) {
        await client.setex(key, ttl, entry);
      }
    } catch (error) {
      console.error("[RATE-LIMIT] Error escribiendo en KV:", error);
      // Fallback a memoria en caso de error
      memoryStore.set(key, entry);
    }
  } else {
    memoryStore.set(key, entry);
  }
}

/**
 * Elimina una entrada de rate limit de KV o memoria
 */
async function deleteRateLimitEntry(key: string): Promise<void> {
  const client = getKVClient();
  
  if (client) {
    try {
      await client.del(key);
    } catch (error) {
      console.error("[RATE-LIMIT] Error eliminando de KV:", error);
    }
  }
  
  memoryStore.delete(key);
}

/**
 * Limpia entradas expiradas (solo para memoria, KV expira automáticamente)
 */
function cleanExpiredEntries() {
  const now = Date.now();
  let deleted = 0;
  for (const [key, value] of memoryStore.entries()) {
    if (now > value.resetTime) {
      memoryStore.delete(key);
      deleted++;
    }
  }
  if (deleted > 0) {
    console.log(`[RATE-LIMIT] Limpiadas ${deleted} entradas expiradas de memoria`);
  }
}

/**
 * Obtiene la IP del cliente desde el request
 */
function getClientIP(request: NextRequest): string {
  // Intentar obtener IP desde headers (Vercel, Cloudflare, etc.)
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfIP = request.headers.get("cf-connecting-ip");
  
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (cfIP) {
    return cfIP;
  }
  
  // Fallback: usar un identificador genérico
  return "unknown";
}

/**
 * Rate limiting middleware
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<{ success: boolean; remaining: number; resetTime: number }> {
  const { maxRequests, windowMs } = config;
  
  // Limpiar entradas expiradas de memoria (solo si no usamos KV)
  const client = getKVClient();
  if (!client && (memoryStore.size > 100 || Math.random() < 0.2)) {
    cleanExpiredEntries();
  }

  const clientIP = getClientIP(request);
  const now = Date.now();
  const key = `rate_limit:${clientIP}`;
  
  const current = await getRateLimitEntry(key);

  // Si la entrada existe pero está expirada, eliminarla y crear una nueva
  if (current && now > current.resetTime) {
    await deleteRateLimitEntry(key);
  }

  if (!current || now > current.resetTime) {
    // Primera request o ventana expirada
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + windowMs,
    };
    await setRateLimitEntry(key, newEntry);
    
    return {
      success: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }

  if (current.count >= maxRequests) {
    // Límite excedido
    const resetSeconds = Math.ceil((current.resetTime - now) / 1000);
    console.warn(`[RATE-LIMIT] Límite excedido para IP ${clientIP}. Reset en ${resetSeconds}s`);
    return {
      success: false,
      remaining: 0,
      resetTime: current.resetTime,
    };
  }

  // Incrementar contador
  current.count++;
  await setRateLimitEntry(key, current);

  return {
    success: true,
    remaining: maxRequests - current.count,
    resetTime: current.resetTime,
  };
}

/**
 * Helper para crear respuesta de rate limit excedido
 */
export function rateLimitResponse(resetTime: number): NextResponse {
  const resetSeconds = Math.ceil((resetTime - Date.now()) / 1000);
  
  return NextResponse.json(
    {
      error: "Demasiadas solicitudes. Intenta de nuevo más tarde.",
      retryAfter: resetSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": resetSeconds.toString(),
        "X-RateLimit-Reset": resetTime.toString(),
      },
    }
  );
}

/**
 * Configuraciones predefinidas de rate limiting
 */
export const RATE_LIMITS = {
  // Límites para autenticación
  // 20 intentos cada 15 minutos - más permisivo para evitar bloqueos accidentales
  AUTH: {
    maxRequests: 20,
    windowMs: 15 * 60 * 1000, // 15 minutos
  },
  // Límites normales para APIs
  API: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minuto
  },
  // Límites para operaciones pesadas
  HEAVY: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minuto
  },
} as const;

/**
 * Resetea el rate limit para una IP específica (útil para debugging)
 * Solo debe usarse en desarrollo o por MASTER_ADMIN
 */
export async function resetRateLimitForIP(ip: string): Promise<boolean> {
  const key = `rate_limit:${ip}`;
  const current = await getRateLimitEntry(key);
  const existed = current !== null;
  await deleteRateLimitEntry(key);
  return existed;
}

/**
 * Resetea todos los rate limits (útil para debugging)
 * Solo debe usarse en desarrollo o por MASTER_ADMIN
 * Nota: En KV esto requiere escanear todas las keys, lo cual puede ser costoso.
 * Por ahora, solo resetea las entradas en memoria.
 */
export async function resetAllRateLimits(): Promise<number> {
  const client = getKVClient();
  let count = 0;

  if (client) {
    // En KV, no podemos listar todas las keys fácilmente sin un patrón
    // Por ahora, solo reseteamos memoria y documentamos la limitación
    console.warn("[RATE-LIMIT] resetAllRateLimits: Solo resetea memoria. Para KV, usa resetRateLimitForIP con IPs específicas.");
    count = memoryStore.size;
    memoryStore.clear();
  } else {
    count = memoryStore.size;
    memoryStore.clear();
  }

  return count;
}

