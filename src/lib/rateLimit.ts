// src/lib/rateLimit.ts
import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // ventana de tiempo en milisegundos
}

// Almacenamiento en memoria (en producción usar Redis o similar)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

/**
 * Limpia entradas expiradas del mapa de rate limiting
 */
function cleanExpiredEntries() {
  const now = Date.now();
  for (const [key, value] of requestCounts.entries()) {
    if (now > value.resetTime) {
      requestCounts.delete(key);
    }
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
  
  // Limpiar entradas expiradas periódicamente
  if (Math.random() < 0.1) {
    // 10% de probabilidad de limpiar (para no hacerlo en cada request)
    cleanExpiredEntries();
  }

  const clientIP = getClientIP(request);
  const now = Date.now();
  const key = `rate_limit:${clientIP}`;
  
  const current = requestCounts.get(key);

  if (!current || now > current.resetTime) {
    // Primera request o ventana expirada
    requestCounts.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    
    return {
      success: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }

  if (current.count >= maxRequests) {
    // Límite excedido
    return {
      success: false,
      remaining: 0,
      resetTime: current.resetTime,
    };
  }

  // Incrementar contador
  current.count++;
  requestCounts.set(key, current);

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
  // Límites estrictos para autenticación
  // 10 intentos cada 15 minutos - balance entre seguridad y usabilidad
  AUTH: {
    maxRequests: 10,
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

