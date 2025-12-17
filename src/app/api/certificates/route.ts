import { adminDb } from "@/lib/firebaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import type { Certificate } from "@/types/Certificate";
import { requireRole } from "@/lib/auth";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { validateCertificate, validationErrorResponse } from "@/lib/validation";
import { logger } from "@/lib/logger";

// GET /api/certificates
export async function GET(request: NextRequest) {
  try {
    // 1. Rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.API);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    // 2. Verificar autenticación (VIEWER puede leer)
    await requireRole("VIEWER");

    // 3. Obtener parámetros de paginación
    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    // Si no hay parámetros de paginación, mantener comportamiento original (retornar todos)
    if (!pageParam && !limitParam) {
      const snapshot = await adminDb.collection("certificates").get();
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      return NextResponse.json(data, {
        headers: {
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      });
    }

    // 4. Paginación: parsear y validar parámetros
    const page = Math.max(1, parseInt(pageParam || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(limitParam || "50", 10))); // Max 100, default 50
    const offset = (page - 1) * limit;

    // 5. Obtener total de documentos (para calcular totalPages)
    const totalSnapshot = await adminDb.collection("certificates").count().get();
    const total = totalSnapshot.data().count;

    // 6. Obtener documentos paginados
    const snapshot = await adminDb
      .collection("certificates")
      .limit(limit)
      .offset(offset)
      .get();

    const data = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    const totalPages = Math.ceil(total / limit);

    // 7. Retornar con estructura de paginación
    return NextResponse.json(
      {
        data,
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
        return NextResponse.json(
          { error: "No autenticado" },
          { status: 401 }
        );
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { error: "No tienes permisos para realizar esta acción" },
          { status: 403 }
        );
      }
    }

    logger.error("Error obteniendo certificados", error, { endpoint: "/api/certificates" });

    return NextResponse.json(
      {
        error: "Error al obtener certificados",
        details:
          error instanceof Error ? error.message : JSON.stringify(error),
      },
      { status: 500 }
    );
  }
}

// POST /api/certificates
export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.API);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    // 2. Verificar permisos (EDITOR o superior puede crear)
    await requireRole("EDITOR");

    // 3. Validar entrada
    const body = await request.json();
    const validation = validateCertificate(body);
    
    if (!validation.valid) {
      return validationErrorResponse(validation.errors);
    }

    const {
      fullName,
      courseName,
      courseId,
      courseType,
      year,
      origin = "nuevo",
      email = null,
      phone = null,
      contactSource = "ninguno",
      driveFileId = null,
      deliveryStatus = "en_archivo",
      deliveryDate = null,
      deliveredTo = null,
      physicalLocation = null,
      folioCode = null,
      emailSent = false,
      whatsappSent = false,
      marketingConsent = false,
    } = body;

    let finalCourseId = courseId.trim();
    const courseIdPattern = /^(.+)-(\d{4})-(\d+)$/;
    const match = finalCourseId.match(courseIdPattern);

    if (match) {
      const [, courseCode, courseYear, currentNumber] = match;
      const courseYearNum = parseInt(courseYear);

      if (courseYearNum === year) {
        const prefix = `${courseCode}-${year}-`;
        const certificatesSnapshot = await adminDb
          .collection("certificates")
          .where("courseId", ">=", prefix)
          .where("courseId", "<", prefix + "\uf8ff")
          .get();

        const escapedCourseCode = courseCode.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

        const existingNumbers = certificatesSnapshot.docs
          .map((doc) => {
            const data = doc.data() as any;
            const certCourseId = data.courseId || "";
            const certMatch = certCourseId.match(
              new RegExp(`^${escapedCourseCode}-${year}-(\\d+)$`)
            );
            return certMatch ? parseInt(certMatch[1]) : 0;
          })
          .filter((num) => num > 0);

        const maxNumber =
          existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
        const nextNumber = maxNumber + 1;
        finalCourseId = `${courseCode}-${year}-${nextNumber
          .toString()
          .padStart(2, "0")}`;
      }
    }

    const certificateData: Omit<Certificate, "id"> = {
      fullName: fullName.trim(),
      courseName: courseName.trim(),
      courseId: finalCourseId,
      courseType: courseType.trim(),
      year: Number(year),
      origin,
      email: email ? email.trim().toLowerCase() : null,
      phone: phone ? phone.trim() : null,
      contactSource,
      driveFileId,
      deliveryStatus,
      deliveryDate,
      deliveredTo,
      physicalLocation,
      folioCode,
      emailSent: Boolean(emailSent),
      whatsappSent: Boolean(whatsappSent),
      marketingConsent: Boolean(marketingConsent),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await adminDb.collection("certificates").add(certificateData);

    return NextResponse.json(
      { id: docRef.id, ...certificateData },
      {
        status: 201,
        headers: {
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          { error: "No autenticado" },
          { status: 401 }
        );
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json(
          { error: "No tienes permisos para crear certificados" },
          { status: 403 }
        );
      }
    }

    logger.error("Error creando certificado", error, { endpoint: "/api/certificates", method: "POST" });
    return NextResponse.json(
      {
        error: "Error al crear el certificado",
        details:
          error instanceof Error ? error.message : JSON.stringify(error),
      },
      { status: 500 }
    );
  }
}
