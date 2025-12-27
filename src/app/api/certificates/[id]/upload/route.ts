// src/app/api/certificates/[id]/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireRole } from "@/lib/auth";
import { rateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit";
import { uploadPdfToAppsScriptDrive, deleteFileFromAppsScriptDrive } from "@/lib/appsScriptDrive";

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

    // 10. Determinar la carpeta de destino (folderId)
    let folderId: string | null = null;
    let targetCourseDoc: any = null;

    console.log("[UPLOAD-AS] Buscando carpeta para el curso:", {
      courseName: certificateData?.courseName,
      year: certificateData?.year,
      courseId: certificateData?.courseId
    });

    try {
      // 10.1 Intentar buscar por el documento del curso
      // Primero, si tenemos el courseId con formato "CODIGO-AÑO-NUMERO", extraemos el CODIGO
      let courseCode = certificateData?.courseId;
      if (courseCode) {
        const match = courseCode.match(/^([^-]+)-(\d{4})-\d+$/);
        if (match) {
          courseCode = match[1];
        }

        // Buscar por ID de documento o campo 'id'
        const courseRef = adminDb.collection("courses").doc(courseCode);
        const courseDoc = await courseRef.get();

        if (courseDoc.exists) {
          targetCourseDoc = courseDoc;
        } else {
          // Buscar por campo 'id' y año para ser más precisos
          const coursesSnapshot = await adminDb.collection("courses")
            .where("id", "==", courseCode)
            .where("year", "==", certificateData?.year || new Date().getFullYear())
            .limit(1)
            .get();

          if (!coursesSnapshot.empty) {
            targetCourseDoc = coursesSnapshot.docs[0];
          }
        }
      }

      // 10.2 Si no se encontró por código, intentar por nombre y año
      if (!targetCourseDoc && certificateData?.courseName && certificateData?.year) {
        const coursesSnapshot = await adminDb.collection("courses")
          .where("name", "==", certificateData.courseName)
          .where("year", "==", certificateData.year)
          .limit(1)
          .get();

        if (!coursesSnapshot.empty) {
          targetCourseDoc = coursesSnapshot.docs[0];
        }
      }

      // 10.3 Si encontramos el curso, usar su driveFolderId o CREARLA si falta
      if (targetCourseDoc) {
        const courseData = targetCourseDoc.data();

        if (courseData?.driveFolderId) {
          folderId = courseData.driveFolderId;
          console.log("[UPLOAD-AS] ✅ Usando carpeta vinculada al curso:", folderId);
        } else {
          // Si el curso no tiene carpeta, intentar crear la estructura jerárquica (Año / Curso)
          console.log("[UPLOAD-AS] 📁 El curso no tiene carpeta, intentando crear estructura Año/Curso...");

          const parentFolderId = process.env.DRIVE_CERTIFICATES_FOLDER_ID;
          if (parentFolderId) {
            const courseYear = courseData?.year || certificateData?.year || new Date().getFullYear();
            const courseName = courseData?.name || certificateData?.courseName || "Sin nombre";
            const courseId = courseData?.id || targetCourseDoc.id;

            // 1. Carpeta del año
            const { getOrCreateFolderInAppsScriptDrive } = await import("@/lib/appsScriptDrive");
            const yearResult = await getOrCreateFolderInAppsScriptDrive({
              folderName: courseYear.toString(),
              parentFolderId
            });

            if (yearResult.ok && yearResult.folderId) {
              // 2. Carpeta del curso
              const courseFolderName = `${courseId} - ${courseName.trim()}`;
              const courseResult = await getOrCreateFolderInAppsScriptDrive({
                folderName: courseFolderName,
                parentFolderId: yearResult.folderId
              });

              if (courseResult.ok && courseResult.folderId) {
                folderId = courseResult.folderId;
                // Actualizar curso en DB
                await targetCourseDoc.ref.update({
                  driveFolderId: folderId,
                  updatedAt: new Date().toISOString()
                });
                console.log("[UPLOAD-AS] ✅ Carpeta creada y vinculada al curso:", folderId);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("[UPLOAD-AS] Error buscando/creando carpeta del curso:", error);
    }

    // 10.4 Fallback: Si después de todo no hay folderId, usar la carpeta general (root) solo si existe
    if (!folderId) {
      folderId = process.env.DRIVE_CERTIFICATES_FOLDER_ID || null;
      if (folderId) {
        console.warn("[UPLOAD-AS] ⚠️ Usando carpeta general como fallback (no se encontró/creó carpeta de curso)");
      }
    }

    if (!folderId) {
      return NextResponse.json(
        { error: "No se encontró ni pudo crear una carpeta de destino en Drive para este curso. Verifica que el curso tenga una carpeta configurada o que DRIVE_CERTIFICATES_FOLDER_ID esté configurado en el servidor." },
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

    // 11.5 Eliminar archivo anterior si existe (Lógica de reemplazo)
    const oldFileId = certificateData?.driveFileId;
    if (oldFileId && typeof oldFileId === 'string' && oldFileId.trim() !== '' && oldFileId !== uploadResult.fileId) {
      console.log("[UPLOAD-AS] 🗑️ Eliminando archivo anterior:", oldFileId);
      try {
        const deleteResult = await deleteFileFromAppsScriptDrive(oldFileId);
        if (deleteResult.ok) {
          console.log("[UPLOAD-AS] ✅ Archivo anterior eliminado correctamente");
        } else {
          console.warn("[UPLOAD-AS] ⚠️ No se pudo eliminar el archivo anterior:", deleteResult.error);
        }
      } catch (delError) {
        console.error("[UPLOAD-AS] ❌ Error intentando eliminar archivo anterior:", delError);
        // No fallamos la operación principal si falla la eliminación del viejo
      }
    }

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

