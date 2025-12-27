
import { NextRequest, NextResponse } from "next/server";
import { uploadCertificateToDrive } from "@/lib/googleDrive";
import { requireRole } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        // Verificar permisos y obtener usuario
        const user = await requireRole("EDITOR");

        const formData = await request.formData();
        const file = formData.get("file") as File;
        const folderId = formData.get("folderId") as string;
        const fileName = formData.get("fileName") as string;

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

        // Subir a Drive y compartir con el usuario que sube
        const result = await uploadCertificateToDrive(
            buffer,
            finalFileName,
            folderId || undefined,
            user.email
        );

        if (!result) {
            throw new Error("Error desconocido al subir el archivo");
        }

        return NextResponse.json({
            success: true,
            fileId: result.fileId,
            webViewLink: result.webViewLink,
            name: result.name
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
