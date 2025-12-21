// src/app/api/admin-users/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireRole } from "@/lib/auth";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";

export const runtime = "nodejs";

interface AuditLog {
  id: string;
  action: "created" | "updated" | "deleted";
  entityType: "adminUser" | "course" | "certificate";
  entityId: string;
  entityName?: string;
  email?: string;
  role?: string;
  previousRole?: string;
  performedBy: string;
  timestamp: string;
  details?: Record<string, any>;
}

// GET /api/admin-users/history - Obtener historial de cambios
export async function GET(request: NextRequest) {
  try {
    // 1. Rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.API);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    // 2. Solo MASTER_ADMIN puede ver el historial
    await requireRole("MASTER_ADMIN");

    // 3. Obtener parámetros de paginación y filtros
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const entityType = searchParams.get("entityType") as "adminUser" | "course" | "certificate" | null;

    // 4. Obtener historial de Firestore (colección unificada)
    const historyRef = adminDb.collection("systemHistory");
    
    // Obtener todos los registros ordenados (sin filtro para evitar necesidad de índice compuesto)
    // Filtrar por entityType en memoria si se especifica
    const snapshot = await historyRef
      .orderBy("timestamp", "desc")
      .limit(1000) // Límite razonable para filtrar en memoria
      .get();

    // Mapear y filtrar
    let allHistory: AuditLog[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        action: data.action as "created" | "updated" | "deleted",
        entityType: data.entityType || "adminUser",
        entityId: data.entityId || data.email || "",
        entityName: data.entityName || data.email || undefined,
        email: data.email || undefined,
        role: data.role || undefined,
        previousRole: data.previousRole || undefined,
        performedBy: data.performedBy,
        timestamp: data.timestamp,
        details: data.details || undefined,
      };
    });

    // Filtrar por tipo de entidad si se especifica
    if (entityType) {
      allHistory = allHistory.filter((log) => log.entityType === entityType);
    }

    // Aplicar paginación
    const total = allHistory.length;
    const totalPages = Math.ceil(total / limit);
    const history = allHistory.slice((page - 1) * limit, page * limit);

    return NextResponse.json(
      {
        data: history,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
      {
        headers: {
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { error: "Solo MASTER_ADMIN puede ver el historial" },
          { status: 403 }
        );
      }
    }
    return NextResponse.json(
      { error: "Error al obtener historial" },
      { status: 500 }
    );
  }
}

