// src/app/api/admin-users/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireRole } from "@/lib/auth";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";

export const runtime = "nodejs";

interface AuditLog {
  id: string;
  action: "created" | "updated" | "deleted";
  email: string;
  role?: string;
  previousRole?: string;
  performedBy: string;
  timestamp: string;
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

    // 3. Obtener parámetros de paginación
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

    // 4. Obtener historial de Firestore
    const historyRef = adminDb.collection("adminUsersHistory");
    
    // Obtener total para paginación
    const totalSnapshot = await historyRef.count().get();
    const total = totalSnapshot.data().count;

    // Obtener documentos paginados (más recientes primero)
    const snapshot = await historyRef
      .orderBy("timestamp", "desc")
      .limit(limit)
      .offset((page - 1) * limit)
      .get();

    const history: AuditLog[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        action: data.action as "created" | "updated" | "deleted",
        email: data.email,
        role: data.role || undefined,
        previousRole: data.previousRole || undefined,
        performedBy: data.performedBy,
        timestamp: data.timestamp,
      };
    });

    const totalPages = Math.ceil(total / limit);

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

