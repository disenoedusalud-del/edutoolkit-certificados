import { adminDb } from "@/lib/firebaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { Course } from "@/types/Course";
import { requireRole } from "@/lib/auth";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";

// Versión simplificada y sintácticamente segura del handler de cursos individuales.
// Mantiene:
// - GET: obtener un curso por id.
// - PUT: actualizar campos básicos de un curso existente.
// No incluye (de momento) la lógica avanzada de:
// - renombrar carpeta en Drive
// - mover documentos por combinación código + edición + año
// Eso se puede re-incorporar luego, pero ahora priorizamos que el build pase
// y que la app vuelva a estar operativa en Vercel.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.API);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    await requireRole("VIEWER");

    const { id } = await params;
    const doc = await adminDb.collection("courses").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Curso no encontrado" },
        { status: 404 }
      );
    }

    const data = { id: doc.id, ...doc.data() } as Course;

    return NextResponse.json(data, {
      headers: {
        "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      },
    });
  } catch (error) {
    console.error("[COURSE-GET] Error obteniendo curso:", error);
    return NextResponse.json(
      { error: "Error al obtener el curso" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.API);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    const currentUser = await requireRole("ADMIN");
    const { id } = await params;
    const body = await request.json();

    const docRef = adminDb.collection("courses").doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      return NextResponse.json(
        { error: "Curso no encontrado" },
        { status: 404 }
      );
    }

    // Campos permitidos a actualizar de forma simplificada
    const allowedFields: (keyof Course)[] = [
      "name",
      "courseType",
      "year",
      "month",
      "edition",
      "origin",
      "status",
    ];

    const updateData: Partial<Course> = {
      updatedAt: new Date().toISOString(),
    };

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        const value = (body as any)[field];
        if (value !== undefined) {
          (updateData as any)[field] = value;
        }
      }
    }

    await docRef.update(updateData);

    const updated = await docRef.get();
    const data = { id: updated.id, ...updated.data() } as Course;

    await adminDb.collection("systemHistory").add({
      action: "updated",
      entityType: "course",
      entityId: id,
      entityName: data.name || id,
      performedBy: currentUser.email,
      timestamp: new Date().toISOString(),
      details: {
        changes: updateData,
        simplified: true,
      },
    });

    return NextResponse.json(data, {
      headers: {
        "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      },
    });
  } catch (error) {
    console.error("[COURSE-PUT] Error actualizando curso (simplificado):", error);
    return NextResponse.json(
      { error: "Error al actualizar el curso" },
      { status: 500 }
    );
  }
}


