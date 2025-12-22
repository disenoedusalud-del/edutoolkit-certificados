import { adminDb } from "@/lib/firebaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";

export async function GET(request: NextRequest) {
  try {
    // 1. Rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.API);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    // 2. Verificar autenticación
    await requireRole("VIEWER");

    // 3. Obtener parámetros
    const { searchParams } = new URL(request.url);
    const courseCode = searchParams.get("courseCode");
    const yearParam = searchParams.get("year");
    const editionParam = searchParams.get("edition");

    if (!courseCode || !yearParam) {
      return NextResponse.json(
        { error: "courseCode y year son requeridos" },
        { status: 400 }
      );
    }

    const year = parseInt(yearParam, 10);
    const edition = editionParam ? parseInt(editionParam, 10) : null;

    console.log("[next-sequence] Parámetros recibidos:", {
      courseCode,
      year,
      editionParam,
      edition
    });

    // 4. Construir el prefijo del courseId
    // Si hay edición: CODIGO-EDICION-AÑO-NUMERO (ej: NAEF-2-2019-01)
    // Si no hay edición: CODIGO-AÑO-NUMERO (ej: NAEF-2019-01)
    const prefix = edition 
      ? `${courseCode}-${edition}-${year}-`
      : `${courseCode}-${year}-`;

    // 5. Buscar certificados existentes con ese prefijo
    // Usar un rango más amplio para asegurar que encontremos todos los certificados
    const certificatesSnapshot = await adminDb
      .collection("certificates")
      .where("courseId", ">=", prefix)
      .where("courseId", "<", prefix + "\uf8ff")
      .get();

    console.log("[next-sequence] Certificados encontrados con prefijo:", {
      prefix,
      count: certificatesSnapshot.docs.length,
      courseIds: certificatesSnapshot.docs.map(d => d.data().courseId)
    });

    // 6. Extraer números secuenciales existentes
    const escapedCourseCode = courseCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    
    // Patrón regex según si hay edición o no
    const pattern = edition
      ? new RegExp(`^${escapedCourseCode}-${edition}-${year}-(\\d+)$`)
      : new RegExp(`^${escapedCourseCode}-${year}-(\\d+)$`);

    console.log("[next-sequence] Patrón regex:", pattern.toString());

    const existingNumbers = certificatesSnapshot.docs
      .map((doc) => {
        const data = doc.data() as any;
        const certCourseId = data.courseId || "";
        const match = certCourseId.match(pattern);
        const num = match ? parseInt(match[1]) : 0;
        if (num > 0) {
          console.log("[next-sequence] Certificado encontrado:", { certCourseId, num });
        }
        return num;
      })
      .filter((num) => num > 0);

    // 7. Calcular el siguiente número
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = maxNumber + 1;

    console.log("[next-sequence] Cálculo de siguiente número:", {
      prefix,
      certificatesFound: certificatesSnapshot.docs.length,
      existingNumbers,
      maxNumber,
      nextNumber
    });

    // 8. Construir el formattedId
    const formattedId = edition
      ? `${courseCode}-${edition}-${year}-${nextNumber.toString().padStart(2, "0")}`
      : `${courseCode}-${year}-${nextNumber.toString().padStart(2, "0")}`;

    console.log("[next-sequence] ID generado:", formattedId);

    return NextResponse.json(
      { formattedId },
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

    console.error("Error generating next sequence:", error);
    return NextResponse.json(
      { error: "Error al generar el siguiente ID" },
      { status: 500 }
    );
  }
}

