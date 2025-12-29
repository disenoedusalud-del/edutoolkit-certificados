// src/app/api/courses/[id]/ensure-folder/route.ts
import { adminDb } from "@/lib/firebaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getOrCreateFolderInAppsScriptDrive } from "@/lib/appsScriptDrive";

/**
 * Asegura que un curso tenga su carpeta correspondiente en Google Drive.
 * Prioriza encontrar la carpeta existente para evitar duplicados.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const id = decodeURIComponent(resolvedParams.id);

        await requireRole("EDITOR");

        let docRef = adminDb.collection("courses").doc(id);
        let doc = await docRef.get();

        // Buscar por campo 'id' si por ID de documento no aparece
        if (!doc.exists) {
            const coursesSnapshot = await adminDb.collection("courses")
                .where("id", "==", id)
                .limit(1)
                .get();

            if (!coursesSnapshot.empty) {
                doc = coursesSnapshot.docs[0];
                docRef = doc.ref;
            }
        }

        if (!doc.exists) {
            return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
        }

        const courseData = doc.data();

        const rootFolderId = process.env.DRIVE_CERTIFICATES_FOLDER_ID;
        if (!rootFolderId) {
            throw new Error("Configuración DRIVE_CERTIFICATES_FOLDER_ID ausente");
        }

        if (courseData?.driveFolderId && courseData.driveFolderId !== rootFolderId) {
            console.log(`[ENSURE-FOLDER] ✅ Carpeta ya vinculada en DB: ${courseData.driveFolderId}`);
            return NextResponse.json({
                folderId: courseData.driveFolderId,
                existing: true
            });
        }

        if (courseData?.driveFolderId === rootFolderId) {
            console.warn(`[ENSURE-FOLDER] ⚠️ Curso ${id} tenía vinculada la carpeta RAÍZ (${rootFolderId}). Re-generando estructura...`);
        }

        // SI NO TIENE CARPETA VINCULADA O ES INCORRECTA:


        const year = courseData?.year || new Date().getFullYear();
        const name = courseData?.name || "Curso";
        const courseCode = courseData?.id || id;

        console.log(`[ENSURE-FOLDER] 🔍 Buscando/Asegurando carpeta: ${courseCode} - ${name} (${year})`);

        // Estructura Año / Curso
        // Step 1: Carpeta del Año
        const yearFolderRes = await getOrCreateFolderInAppsScriptDrive({
            folderName: year.toString(),
            parentFolderId: rootFolderId,
        });

        if (!yearFolderRes.ok || !yearFolderRes.folderId) {
            throw new Error(`Fallo con carpeta del año: ${yearFolderRes.error}`);
        }

        // Step 2: Carpeta del Curso (Formato consistente: ID - NOMBRE)
        const courseFolderName = `${courseCode} - ${name.trim()}`;
        const courseFolderRes = await getOrCreateFolderInAppsScriptDrive({
            folderName: courseFolderName,
            parentFolderId: yearFolderRes.folderId,
        });

        if (!courseFolderRes.ok || !courseFolderRes.folderId) {
            throw new Error(`Fallo con carpeta del curso: ${courseFolderRes.error}`);
        }

        const driveFolderId = courseFolderRes.folderId;

        // Guardar en DB para evitar repetir este proceso
        await docRef.update({
            driveFolderId,
            updatedAt: new Date().toISOString(),
        });

        console.log(`[ENSURE-FOLDER] ✅ Carpeta localizada/creada: ${driveFolderId}`);

        return NextResponse.json({
            folderId: driveFolderId,
            created: courseFolderRes.created
        });

    } catch (error: any) {
        console.error("[ENSURE-FOLDER] ❌ ERROR:", error.message);
        return NextResponse.json(
            { error: "Error al asegurar carpeta: " + error.message },
            { status: 500 }
        );
    }
}
