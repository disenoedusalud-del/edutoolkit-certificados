// src/app/api/certificates/[id]/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireRole } from "@/lib/auth";
import { uploadPdfToAppsScriptDrive, deleteFileFromAppsScriptDrive } from "@/lib/appsScriptDrive";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    console.log(`[UPLOAD-API] 🚀 Reemplazo extremo para: ${id}`);
    await requireRole("EDITOR");

    const certRef = adminDb.collection("certificates").doc(id);
    const certDoc = await certRef.get();
    if (!certDoc.exists) return NextResponse.json({ error: "No existe el certificado" }, { status: 404 });

    const certData = certDoc.data() || {};

    // --- LÓGICA DE NOMBRE ULTRA-SEGURA ---
    // Si fullName es "Cc" o muy corto, sospechamos que está mal y buscamos alternativas
    let rawName = (certData.fullName || "").trim();

    if (rawName.length <= 2) {
      console.warn(`[UPLOAD-API] ⚠️ El nombre encontrado ("${rawName}") es demasiado corto. Buscando en campos alternativos...`);
      rawName = certData.studentName || certData.name || rawName || "Sin_Nombre_Definido";
    }

    const cleanName = rawName.replace(/\s+/g, "_").replace(/[/\\?%*:|"<>]/g, "");

    const baseCode = (certData.courseId || "CURSO").split("-")[0];
    const year = certData.year || new Date().getFullYear();

    const standardizedName = `${baseCode}-${year}_${cleanName}.pdf`;

    console.log(`[UPLOAD-API] 🛡️ Nombre Final Generado: ${standardizedName}`);
    // ---------------------------------------

    // Carpeta (Solo DB)
    const ROOT_ID = process.env.DRIVE_CERTIFICATES_FOLDER_ID;
    if (!ROOT_ID) throw new Error("Falta configuración DRIVE_CERTIFICATES_FOLDER_ID");

    let finalFolderId = certData.driveFolderId;

    // Validación estricta: Si es la carpeta raíz, consideramos que no tiene carpeta válida
    if (finalFolderId === ROOT_ID) {
      console.warn(`[UPLOAD-API] ⚠️ El certificado tiene la carpeta RAÍZ (${ROOT_ID}) asignada. Ignorando...`);
      finalFolderId = null;
    }

    // Si no tenemos carpeta válida, intentamos recuperarla
    if (!finalFolderId) {
      // Estrategia 1: Buscar el curso por nombre y año (más confiable que el ID derivado)
      if (certData.courseName) {
        console.log(`[UPLOAD-API] 🔍 Buscando curso por nombre: "${certData.courseName}" (Año: ${year})`);
        const coursesSnap = await adminDb.collection("courses")
          .where("name", "==", certData.courseName)
          .where("year", "==", year)
          .limit(1)
          .get();

        if (!coursesSnap.empty) {
          const foundCourse = coursesSnap.docs[0].data();
          if (foundCourse.driveFolderId && foundCourse.driveFolderId !== ROOT_ID) {
            finalFolderId = foundCourse.driveFolderId;
            console.log(`[UPLOAD-API] ✅ Carpeta recuperada del curso encontrado: ${finalFolderId}`);
          }
        }
      }

      // Estrategia 2: Fallback a búsqueda por ID base (lógica original)
      if (!finalFolderId) {
        const courseDoc = await adminDb.collection("courses").doc(baseCode).get();
        const cData = courseDoc.exists ? courseDoc.data() : null;
        if (cData?.driveFolderId && cData.driveFolderId !== ROOT_ID) {
          finalFolderId = cData.driveFolderId;
        }
      }

      // Estrategia 3: Si NADA funciona, recrear la estructura de carpetas (Año -> Curso)
      if (!finalFolderId) {
        console.log(`[UPLOAD-API] ⚠️ No se encontró carpeta. Recreando estructura para: ${baseCode} - ${certData.courseName || "Curso"}`);
        try {
          const { getOrCreateFolderInAppsScriptDrive } = await import("@/lib/appsScriptDrive");

          // 1. Carpeta Año
          const yearRes = await getOrCreateFolderInAppsScriptDrive({
            folderName: year.toString(),
            parentFolderId: ROOT_ID
          });

          if (yearRes.ok && yearRes.folderId) {
            // 2. Carpeta Curso
            const courseFolderName = `${baseCode} - ${(certData.courseName || "Curso").trim()}`;
            const courseRes = await getOrCreateFolderInAppsScriptDrive({
              folderName: courseFolderName,
              parentFolderId: yearRes.folderId
            });

            if (courseRes.ok && courseRes.folderId) {
              finalFolderId = courseRes.folderId;
              console.log(`[UPLOAD-API] ✅ Estructura recreada. Nueva carpeta: ${finalFolderId}`);
            }
          }
        } catch (err) {
          console.error("[UPLOAD-API] Error recreando carpetas:", err);
        }
      }
    }

    // Fallback final (solo si todo falla, usar raíz para no perder el archivo, pero logueando error)
    if (!finalFolderId) {
      console.error("[UPLOAD-API] ❌ FATAL: No se pudo determinar/crear carpeta específica. Usando RAÍZ.");
      finalFolderId = ROOT_ID;
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No hay archivo" }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadResult = await uploadPdfToAppsScriptDrive({
      pdfBuffer: buffer,
      fileName: standardizedName,
      folderId: finalFolderId!,
    });

    if (!uploadResult.ok) throw new Error(uploadResult.error);

    // Limpieza
    const oldFileId = certData.driveFileId;
    if (oldFileId && oldFileId !== uploadResult.fileId) {
      deleteFileFromAppsScriptDrive(oldFileId).catch(() => { });
    }

    await certRef.update({
      driveFileId: uploadResult.fileId,
      driveWebViewLink: uploadResult.webViewLink || null,
      driveFolderId: finalFolderId,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ ok: true, fileName: standardizedName });

  } catch (error: any) {
    console.error(`[UPLOAD-API] ❌: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(r: NextRequest, { params }: any) {
  const { id } = await params;
  await requireRole("EDITOR");
  await adminDb.collection("certificates").doc(id).update({
    driveFileId: null, driveWebViewLink: null, updatedAt: new Date().toISOString()
  });
  return NextResponse.json({ ok: true });
}
