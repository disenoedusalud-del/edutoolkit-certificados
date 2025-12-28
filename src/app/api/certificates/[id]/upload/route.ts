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
    let finalFolderId = certData.driveFolderId;
    if (!finalFolderId) {
      // Buscar en el curso
      const courseDoc = await adminDb.collection("courses").doc(baseCode).get();
      finalFolderId = courseDoc.exists ? courseDoc.data()?.driveFolderId : null;
    }
    finalFolderId = finalFolderId || process.env.DRIVE_CERTIFICATES_FOLDER_ID || "";

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No hay archivo" }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadResult = await uploadPdfToAppsScriptDrive({
      pdfBuffer: buffer,
      fileName: standardizedName,
      folderId: finalFolderId,
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
