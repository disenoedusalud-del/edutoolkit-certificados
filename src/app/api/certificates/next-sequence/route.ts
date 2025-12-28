import { adminDb } from "@/lib/firebaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";

export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.API);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    await requireRole("VIEWER");

    const { searchParams } = new URL(request.url);
    const courseCode = searchParams.get("courseCode");
    const yearParam = searchParams.get("year");
    const editionParam = searchParams.get("edition");

    if (!courseCode || !yearParam) {
      return NextResponse.json(
        { error: "Se requieren courseCode y year" },
        { status: 400 }
      );
    }

    const year = parseInt(yearParam, 10);
    if (isNaN(year)) {
      return NextResponse.json(
        { error: "El año debe ser un número válido" },
        { status: 400 }
      );
    }

    const edition = editionParam ? parseInt(editionParam, 10) : null;
    if (editionParam && (isNaN(edition!) || edition! <= 0)) {
      return NextResponse.json(
        { error: "La edición debe ser un número válido mayor que 0" },
        { status: 400 }
      );
    }

    console.log("[next-sequence] Parámetros recibidos:", {
      courseCode,
      year,
      editionParam,
      edition
    });

    // Construir el prefijo para buscar certificados de forma inteligente
    // Si courseCode ya parece un ID completo (ej: LM-2025-1), no añadimos más partes
    let basePrefix = courseCode;
    const yearStr = year.toString();
    const hasYear = courseCode.includes(`-${yearStr}`);
    const hasEdition = editionParam ? courseCode.includes(`-${editionParam}-`) || courseCode.endsWith(`-${editionParam}`) : true;

    if (!hasYear) {
      basePrefix = edition ? `${courseCode}-${edition}-${year}` : `${courseCode}-${year}`;
    } else if (editionParam && !hasEdition) {
      // Si tiene año pero falta la edición (poco común), la insertamos antes del año
      basePrefix = courseCode.replace(`-${yearStr}`, `-${editionParam}-${yearStr}`);
    }

    const prefix = `${basePrefix}-`;

    console.log("[next-sequence] Prefijo de búsqueda:", prefix);

    // Buscar todos los certificados que empiecen con este prefijo
    const certificatesSnapshot = await adminDb
      .collection("certificates")
      .where("courseId", ">=", prefix)
      .where("courseId", "<", prefix + "\uf8ff")
      .get();

    console.log("[next-sequence] Certificados encontrados:", certificatesSnapshot.docs.length);

    // Patrón regex para extraer el número secuencial basado en el prefijo generado
    const escapedBasePrefix = basePrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`^${escapedBasePrefix}-(\\d+)$`);

    // Extraer todos los números existentes
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

    // Calcular el siguiente número
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = maxNumber + 1;

    console.log("[next-sequence] Cálculo de siguiente número:", {
      prefix,
      certificatesFound: certificatesSnapshot.docs.length,
      existingNumbers,
      maxNumber,
      nextNumber
    });

    // Construir el formattedId usando el basePrefix ya calculado
    const formattedId = `${basePrefix}-${nextNumber.toString().padStart(2, "0")}`;

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





