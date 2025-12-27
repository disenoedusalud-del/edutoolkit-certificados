import { NextRequest, NextResponse } from "next/server";
import { uploadPdfToAppsScriptDrive } from "@/lib/appsScriptDrive";
import { requireRole } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        // Verificar permisos y obtener usuario
        await requireRole("EDITOR");

        const formData = await request.formData();
        const file = formData.get("file") as File;
        const folderId = formData.get("folderId") as string;
        const fileName = formData.get("fileName") as string;
        const oldFileId = formData.get("oldFileId") as string;

        if (!file) {
            return NextResponse.json(
                { error: "No se proporcionó ningún archivo" },
                { status: 400 }
            );
        }

        // Convertir File a Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Determinar nombre del archivo
        const finalFileName = fileName || file.name;

        // Si no hay folderId, no podemos subir con Apps Script (requiere folderId)
        if (!folderId) {
            return NextResponse.json(
                { error: "No se especificó una carpeta de destino válida (folderId)" },
                { status: 400 }
            );
        }

        console.log("[API-UPLOAD] Subiendo vía Apps Script a carpeta:", folderId);

        // Subir a Drive vía Apps Script
        const result = await uploadPdfToAppsScriptDrive({
            pdfBuffer: buffer,
            fileName: finalFileName,
            folderId: folderId
        });

        if (!result.ok) {
            throw new Error(result.error || "Error desconocido al subir el archivo mediante Apps Script");
        }

        // Si se subió con éxito y había un archivo anterior, intentar eliminarlo
        if (oldFileId && result.fileId && oldFileId !== result.fileId) {
            console.log("[API-UPLOAD] 🗑️ Eliminando archivo anterior:", oldFileId);
            try {
                const { deleteFileFromAppsScriptDrive } = await import("@/lib/appsScriptDrive");
                await deleteFileFromAppsScriptDrive(oldFileId);
            } catch (delError) {
                console.error("[API-UPLOAD] Error eliminando archivo viejo:", delError);
                // No fallamos la petición si falla el borrado
            }
        }

        return NextResponse.json({
            success: true,
            fileId: result.fileId,
            webViewLink: result.webViewLink,
            name: result.name || finalFileName
        });

    } catch (error: any) {
        console.error("Error uploading file:", error);

        // Manejar errores específicos de Drive
        if (error.message && error.message.includes("Service Accounts")) {
            return NextResponse.json(
                { error: error.message },
                { status: 403 }
            );
        }

        return NextResponse.json(
            { error: "Error al subir el archivo: " + (error.message || String(error)) },
            { status: 500 }
        );
    }
}
