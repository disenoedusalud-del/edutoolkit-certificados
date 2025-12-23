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

    // 5. Obtener total de documentos (para calcular totalPages)
    const totalSnapshot = await adminDb.collection("certificates").count().get();
    const total = totalSnapshot.data().count;

    // 6. Obtener documentos paginados
    // Usar el mismo patrón que en /api/courses
    const certificatesRef = adminDb.collection("certificates");

    // Intentar ordenar por createdAt, pero si falla (por falta de índice o campo), obtener sin ordenar
    try {
      const orderedQuery = certificatesRef.orderBy("createdAt", "desc");
      const snapshot = await orderedQuery.limit(limit).offset((page - 1) * limit).get();
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
    } catch (orderError: any) {
      // Si falla el ordenamiento, obtener sin ordenar y paginar en memoria
      logger.warn("No se pudo ordenar certificados, obteniendo sin orden", {
        error: orderError.message,
        endpoint: "/api/certificates"
      });

      const allSnapshot = await adminDb.collection("certificates").get();
      const allDocs = allSnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Array<{ id: string; createdAt?: string;[key: string]: any }>;

      // Ordenar en memoria por createdAt si existe
      allDocs.sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate; // Descendente
      });

      // Paginar en memoria
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const data = allDocs.slice(startIndex, endIndex);

      const totalPages = Math.ceil(total / limit);

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
    }
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
      month = null,
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

    // Normalizar nombre: Trim y Title Case
    const normalizedFullName = fullName.trim().replace(/\w\S*/g, (txt: string) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });

    // Ejecutar lógica crítica dentro de una transacción para evitar duplicados y condiciones de carrera
    const result = await adminDb.runTransaction(async (transaction) => {
      let finalCourseId = courseId.trim();
      const courseIdPattern = /^(.+)-(\d{4})-(\d+)$/;
      const match = finalCourseId.match(courseIdPattern);

      // Si el courseId tiene formato de secuencia (ej: CURSO-2023-01), recalculamos la secuencia
      // para asegurar que sea correcta y única
      if (match) {
        const [, courseCode, courseYear,] = match;
        const courseYearNum = parseInt(courseYear);

        // Solo recalcular si el año coincide con el año del certificado
        if (courseYearNum === year) {
          const prefix = `${courseCode}-${year}-`;

          // 1. Buscamos certificados del mismo curso (por prefijo)
          const certificatesQuery = adminDb
            .collection("certificates")
            .where("courseId", ">=", prefix)
            .where("courseId", "<", prefix + "\uf8ff");

          const certificatesSnapshot = await transaction.get(certificatesQuery);

          // 2. VERIFICACIÓN DE DUPLICADOS:
          // Chequear si ya existe un certificado para esta persona en este curso
          // Filtramos en memoria es eficiente porque un curso no tendrá millones de alumnos
          const duplicateCert = certificatesSnapshot.docs.find(doc => {
            const data = doc.data();
            return data.fullName.toLowerCase() === normalizedFullName.toLowerCase();
          });

          if (duplicateCert) {
            throw new Error(`DUPLICATE: Ya existe un certificado para "${normalizedFullName}" en este curso (ID: ${duplicateCert.id})`);
          }

          const escapedCourseCode = courseCode.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );

          // 3. Calcular siguiente número de secuencia
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
      } else {
        // Si el courseId NO tiene formato de secuencia (ej: es un código manual o nuevo),
        // Aún así deberíamos verificar duplicados por nombre + courseId exacto
        const duplicatesQuery = adminDb.collection("certificates")
          .where("courseId", "==", finalCourseId)
          .where("fullName", "==", normalizedFullName);

        const duplicatesSnapshot = await transaction.get(duplicatesQuery);
        if (!duplicatesSnapshot.empty) {
          throw new Error(`DUPLICATE: Ya existe un certificado para "${normalizedFullName}" con el ID de curso "${finalCourseId}"`);
        }
      }

      const certificateData: Omit<Certificate, "id"> = {
        fullName: normalizedFullName, // Usar nombre normalizado
        courseName: courseName.trim(),
        courseId: finalCourseId,
        courseType: courseType.trim(),
        year: Number(year),
        month: month ? Number(month) : null,
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

      const newDocRef = adminDb.collection("certificates").doc();
      transaction.set(newDocRef, certificateData);

      return { id: newDocRef.id, ...certificateData };
    });

    return NextResponse.json(
      result,
      {
        status: 201,
        headers: {
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith("DUPLICATE:")) {
        return NextResponse.json(
          { error: error.message.replace("DUPLICATE: ", "") },
          { status: 409 } // 409 Conflict
        );
      }
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
