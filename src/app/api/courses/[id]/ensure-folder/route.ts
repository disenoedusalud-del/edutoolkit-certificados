
import { adminDb } from "@/lib/firebaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getOrCreateFolderInAppsScriptDrive, createFolderInAppsScriptDrive } from "@/lib/appsScriptDrive";

/**
 * Asegura que un curso tenga su carpeta correspondiente en Google Drive.
 * Si no la tiene, la crea (Año / Curso) y actualiza el curso en la DB.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const id = decodeURIComponent(resolvedParams.id);

        // Solo EDITOR o superior puede gatillar esto
        await requireRole("EDITOR");

        const docRef = adminDb.collection("courses").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
        }

        const courseData = doc.data();

        // Si ya tiene carpeta, retornar el ID directamente
        if (courseData?.driveFolderId) {
            return NextResponse.json({
                folderId: courseData.driveFolderId,
                existing: true
            });
        }

        // Si no tiene carpeta, crear la estructura Año / Curso
        const parentFolderId = process.env.DRIVE_CERTIFICATES_FOLDER_ID;
        if (!parentFolderId) {
            return NextResponse.json({
                error: "La configuración del sistema (DRIVE_CERTIFICATES_FOLDER_ID) falta"
            }, { status: 500 });
        }

        const year = courseData?.year || new Date().getFullYear();
        const name = courseData?.name || "Sin nombre";
        const courseCode = courseData?.id || id; // Usamos el código guardado o el ID del doc

        console.log(`[ENSURE-FOLDER] Creando carpeta para curso ${id}: ${courseCode} - ${name} (${year})`);

        // 1. Obtener o crear carpeta del AÑO
        const yearFolderResult = await getOrCreateFolderInAppsScriptDrive({
            folderName: year.toString(),
            parentFolderId,
        });

        if (!yearFolderResult.ok || !yearFolderResult.folderId) {
            throw new Error(`Error con carpeta del año: ${yearFolderResult.error}`);
        }

        const yearFolderId = yearFolderResult.folderId;

        // 2. Crear carpeta del CURSO dentro del año
        const courseFolderName = `${courseCode} - ${name.trim()}`;
        const courseFolderResult = await createFolderInAppsScriptDrive({
            folderName: courseFolderName,
            parentFolderId: yearFolderId,
        });

        if (!courseFolderResult.ok || !courseFolderResult.folderId) {
            throw new Error(`Error creando carpeta del curso: ${courseFolderResult.error}`);
        }

        const driveFolderId = courseFolderResult.folderId;

        // 3. Actualizar el curso en la base de datos
        await docRef.update({
            driveFolderId,
            updatedAt: new Date().toISOString(),
        });

        console.log(`[ENSURE-FOLDER] ✅ Carpeta creada y vinculada: ${driveFolderId}`);

        return NextResponse.json({
            folderId: driveFolderId,
            created: true
        });

    } catch (error: any) {
        console.error("[ENSURE-FOLDER] Error:", error);
        return NextResponse.json(
            { error: "Error al asegurar carpeta en Drive: " + (error.message || String(error)) },
            { status: 500 }
        );
    }
}
