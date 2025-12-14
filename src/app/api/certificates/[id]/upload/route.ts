// src/app/api/certificates/[id]/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireRole } from "@/lib/auth";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { uploadPdfToAppsScriptDrive } from "@/lib/appsScriptDrive";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.API);
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetTime);
    }

    // 2. Verificar permisos (EDITOR puede subir archivos)
    await requireRole("EDITOR");

    // 3. Obtener ID del certificado
    const { id } = await params;

    // 4. Verificar que el certificado existe
    const doc = await adminDb.collection("certificates").doc(id).get();
    if (!doc.exists) {
      return NextResponse.json(
        { error: "Certificado no encontrado" },
        { status: 404 }
      );
    }

    // 5. Obtener el archivo del FormData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo" },
        { status: 400 }
      );
    }

    // 6. Validar que sea un PDF
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "El archivo debe ser un PDF" },
        { status: 400 }
      );
    }

    // 7. Validar tamaño (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "El archivo es demasiado grande. Máximo 10MB" },
        { status: 400 }
      );
    }

    // 8. Convertir File a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 9. Generar nombre del archivo
    const certificateData = doc.data();
    const fileName = file.name || `${certificateData?.fullName || "certificado"}_${certificateData?.courseId || id}.pdf`;

    // 10. Obtener folderId: primero intentar la carpeta del curso, sino usar la carpeta general
    let folderId: string | null = null;

    console.log("[UPLOAD-AS] Datos del certificado:", {
      certificateId: id,
      courseId: certificateData?.courseId,
      courseName: certificateData?.courseName,
    });

    // Intentar obtener la carpeta del curso
    if (certificateData?.courseId) {
      try {
        // El courseId del certificado puede ser "LM-2025-01" (con año y número)
        // Necesitamos extraer el código del curso (ej: "LM") para buscar en Firestore
        let courseCode = certificateData.courseId;
        
        // Si el courseId tiene formato "CODIGO-AÑO-NUMERO", extraer solo el código
        const courseIdPattern = /^([A-Z0-9]+)-(\d{4})-(\d+)$/;
        const match = courseCode.match(courseIdPattern);
        if (match) {
          courseCode = match[1]; // Extraer solo el código (ej: "LM" de "LM-2025-01")
          console.log("[UPLOAD-AS] CourseId del certificado:", certificateData.courseId, "→ Código extraído:", courseCode);
        }
        
        console.log("[UPLOAD-AS] Buscando curso con código:", courseCode);
        const courseDoc = await adminDb.collection("courses").doc(courseCode).get();
        
        if (courseDoc.exists) {
          const courseData = courseDoc.data();
          console.log("[UPLOAD-AS] Curso encontrado:", {
            courseId: courseDoc.id,
            courseName: courseData?.name,
            driveFolderId: courseData?.driveFolderId,
          });
          
          if (courseData?.driveFolderId) {
            folderId = courseData.driveFolderId;
            console.log("[UPLOAD-AS] ✅ Usando carpeta del curso:", {
              courseCode: courseCode,
              courseName: courseData?.name,
              folderId,
            });
          } else {
            console.warn("[UPLOAD-AS] ⚠️ El curso no tiene driveFolderId configurado:", {
              courseId: courseCode,
              courseName: courseData?.name,
            });
          }
        } else {
          console.warn("[UPLOAD-AS] ⚠️ Curso no encontrado en Firestore:", courseCode);
        }
      } catch (courseError) {
        console.error("[UPLOAD-AS] ❌ Error obteniendo carpeta del curso:", courseError);
      }
    } else {
      console.warn("[UPLOAD-AS] ⚠️ El certificado no tiene courseId configurado");
    }

    // Si no hay carpeta del curso, usar la carpeta general
    if (!folderId) {
      folderId = process.env.DRIVE_CERTIFICATES_FOLDER_ID || null;
      if (folderId) {
        console.log("[UPLOAD-AS] ⚠️ Usando carpeta general (fallback):", folderId);
      }
    }

    if (!folderId) {
      return NextResponse.json(
        { error: "No se encontró carpeta para subir el archivo. Verifica que el curso tenga una carpeta configurada o que DRIVE_CERTIFICATES_FOLDER_ID esté configurado." },
        { status: 500 }
      );
    }

    // 11. Subir a Google Drive usando Apps Script
    console.log("[UPLOAD-AS] Starting upload...", {
      fileName,
      fileSize: buffer.length,
      folderId,
    });

    const uploadResult = await uploadPdfToAppsScriptDrive({
      pdfBuffer: buffer,
      fileName,
      folderId,
    });

    if (!uploadResult.ok || !uploadResult.fileId) {
      console.error("[UPLOAD-AS] Error subiendo archivo:", uploadResult.error);
      return NextResponse.json(
        {
          ok: false,
          error: uploadResult.error || "Error al subir el archivo a Google Drive",
        },
        { status: uploadResult.error?.includes("HTTP") ? 502 : 500 }
      );
    }

    console.log("[UPLOAD-AS] ✅ Uploaded fileId=", uploadResult.fileId, "Apps Script OK");

    // 12. Actualizar el certificado con el driveFileId y driveWebViewLink
    await adminDb.collection("certificates").doc(id).update({
      driveFileId: uploadResult.fileId,
      driveWebViewLink: uploadResult.webViewLink || null,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        ok: true,
        fileId: uploadResult.fileId,
        webViewLink: uploadResult.webViewLink,
        downloadLink: uploadResult.downloadLink,
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
          { error: "No tienes permisos para subir archivos" },
          { status: 403 }
        );
      }
      
      // Error específico de Apps Script
      if (error.message.includes("APPS_SCRIPT_UPLOAD_URL") || error.message.includes("APPS_SCRIPT_UPLOAD_TOKEN")) {
        return NextResponse.json(
          { error: "Apps Script no está configurado correctamente. Verifica las variables de entorno." },
          { status: 500 }
        );
      }
      if (error.message.includes("DRIVE_CERTIFICATES_FOLDER_ID")) {
        return NextResponse.json(
          { error: "DRIVE_CERTIFICATES_FOLDER_ID no está configurado en .env.local" },
          { status: 500 }
        );
      }
    }

    console.error("[UPLOAD-AS] Error subiendo archivo:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Error al subir el archivo",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

