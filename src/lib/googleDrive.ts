/**
 * Google Drive Integration
 * 
 * Esta función prepara la integración con Google Drive para:
 * - Subir PDFs de certificados
 * - Obtener enlaces de visualización
 * - Gestionar archivos en Drive
 * 
 * NOTA: Para usar esta funcionalidad, necesitarás:
 * 1. Habilitar Google Drive API en Google Cloud Console
 * 2. Crear Service Account y descargar JSON
 * 3. Configurar GOOGLE_DRIVE_SERVICE_ACCOUNT en .env.local
 * 4. Compartir la carpeta de Drive (si usas folderId) con el email del Service Account
 */

import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";

export interface DriveFileInfo {
  fileId: string;
  name: string;
  webViewLink: string;
  webContentLink: string;
  thumbnailLink?: string;
}

/**
 * Obtiene un cliente autenticado de Google Drive usando Service Account
 */
async function getDriveClient() {
  const serviceAccountJson = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT;

  if (!serviceAccountJson) {
    console.error("[GOOGLE-DRIVE] GOOGLE_DRIVE_SERVICE_ACCOUNT no está configurado");
    throw new Error(
      "GOOGLE_DRIVE_SERVICE_ACCOUNT no está configurado en .env.local"
    );
  }

  let serviceAccount;
  try {
    // Intentar parsear como JSON string
    serviceAccount = JSON.parse(serviceAccountJson);
    console.log("[GOOGLE-DRIVE] Service Account parseado correctamente, email:", serviceAccount.client_email);
  } catch (parseError) {
    console.error("[GOOGLE-DRIVE] Error parseando JSON:", parseError);
    throw new Error(
      `GOOGLE_DRIVE_SERVICE_ACCOUNT debe ser un JSON válido: ${parseError instanceof Error ? parseError.message : String(parseError)}`
    );
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key,
      },
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const drive: drive_v3.Drive = google.drive({ version: "v3", auth });

    console.log("[GOOGLE-DRIVE] Cliente de Drive creado exitosamente");
    return drive;
  } catch (authError) {
    console.error("[GOOGLE-DRIVE] Error creando cliente de autenticación:", authError);
    throw new Error(
      `Error autenticando con Google Drive: ${authError instanceof Error ? authError.message : String(authError)}`
    );
  }
}

/**
 * Obtener información de un archivo en Drive por su ID
 */
export async function getDriveFileInfo(
  fileId: string
): Promise<DriveFileInfo | null> {
  try {
    const drive = await getDriveClient();

    const response = await drive.files.get({
      fileId,
      fields: "id, name, webViewLink, webContentLink, thumbnailLink",
    });

    const file = response.data as drive_v3.Schema$File;

    if (!file.id || !file.name) {
      return null;
    }

    return {
      fileId: file.id,
      name: file.name ?? null,
      webViewLink: file.webViewLink || getDriveViewLink(file.id),
      webContentLink: file.webContentLink || getDriveDownloadLink(file.id),
      thumbnailLink: file.thumbnailLink || undefined,
    };
  } catch (error) {
    console.error("[GOOGLE-DRIVE] Error obteniendo información del archivo:", error);
    return null;
  }
}

/**
 * Verificar que el Service Account tiene acceso a una carpeta
 */
async function verifyFolderAccess(drive: any, folderId: string): Promise<boolean> {
  try {
    console.log("[GOOGLE-DRIVE] Verificando acceso a carpeta:", folderId);
    const response = await drive.files.get({
      fileId: folderId,
      fields: "id, name, mimeType, parents",
    });

    const file = response.data;
    console.log("[GOOGLE-DRIVE] ✅ Carpeta encontrada:", {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
    });

    // Verificar que sea una carpeta
    if (file.mimeType !== "application/vnd.google-apps.folder") {
      throw new Error(
        `El ID "${folderId}" no corresponde a una carpeta. Es un archivo. ` +
        `Necesitas el ID de la carpeta, no de un archivo.`
      );
    }

    return true;
  } catch (error: any) {
    console.error("[GOOGLE-DRIVE] ❌ Error verificando acceso a carpeta:", {
      code: error?.code,
      message: error?.message,
      response: error?.response?.data,
    });

    if (error?.code === 404) {
      throw new Error(
        `La carpeta con ID "${folderId}" no existe o no está compartida con el Service Account.\n\n` +
        `⚠️ SI LA CARPETA ESTÁ EN UN SHARED DRIVE (Unidad Compartida):\n` +
        `El Service Account debe ser agregado al SHARED DRIVE directamente, no solo a la carpeta.\n\n` +
        `PASOS PARA SHARED DRIVE:\n` +
        `1. Abre Google Drive: https://drive.google.com/\n` +
        `2. Ve a "Unidades compartidas" (Shared Drives) en el menú izquierdo\n` +
        `3. Encuentra el Shared Drive que contiene la carpeta\n` +
        `4. Clic derecho en el Shared Drive → "Gestionar miembros"\n` +
        `5. Agrega: edutoolkit-drive-sa@edusalud-platfor.iam.gserviceaccount.com\n` +
        `6. Permisos: "Colaborador" o "Administrador de contenido"\n` +
        `7. Guarda y reinicia el servidor\n\n` +
        `PASOS PARA CARPETA EN DRIVE PERSONAL:\n` +
        `1. Abre Google Drive: https://drive.google.com/\n` +
        `2. Ve a la carpeta con ID: ${folderId}\n` +
        `3. Clic derecho → "Compartir"\n` +
        `4. Pega este email: edutoolkit-drive-sa@edusalud-platfor.iam.gserviceaccount.com\n` +
        `5. Permisos: "Editor"\n` +
        `6. Clic en "Enviar"\n` +
        `7. Espera 10-15 segundos y reinicia el servidor`
      );
    }
    if (error?.code === 403) {
      throw new Error(
        `No tienes permisos para acceder a la carpeta "${folderId}".\n\n` +
        `SOLUCIÓN:\n` +
        `1. Abre la carpeta en Google Drive\n` +
        `2. Clic derecho → "Compartir"\n` +
        `3. Agrega: edutoolkit-drive-sa@edusalud-platfor.iam.gserviceaccount.com\n` +
        `4. Permisos: "Editor" (no solo "Lector")\n` +
        `5. Guarda y reinicia el servidor`
      );
    }
    throw error;
  }
}

/**
 * Subir un PDF a Google Drive
 */
export async function uploadCertificateToDrive(
  pdfBuffer: Buffer,
  fileName: string,
  folderId?: string,
  shareWithEmail?: string // Nuevo parámetro opcional
): Promise<DriveFileInfo | null> {
  try {
    console.log("[GOOGLE-DRIVE] Iniciando subida de archivo:", {
      fileName,
      fileSize: pdfBuffer.length,
      folderId: folderId || "raíz del Service Account",
      shareWithEmail
    });

    const drive = await getDriveClient();

    // Si se especifica una carpeta, verificar acceso primero
    if (folderId) {
      console.log("[GOOGLE-DRIVE] Verificando acceso a carpeta:", folderId);
      await verifyFolderAccess(drive, folderId);
      console.log("[GOOGLE-DRIVE] ✅ Acceso a carpeta verificado");
    }

    // Metadatos del archivo
    const fileMetadata: any = {
      name: fileName,
      mimeType: "application/pdf",
    };

    // Si se especifica una carpeta, agregarla
    if (folderId) {
      fileMetadata.parents = [folderId];
      console.log("[GOOGLE-DRIVE] Subiendo a carpeta:", folderId);
    } else {
      console.log("[GOOGLE-DRIVE] Subiendo a raíz del Service Account");
    }

    // Subir el archivo
    const stream = Readable.from(pdfBuffer);

    console.log("[GOOGLE-DRIVE] Llamando a drive.files.create...");
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: "application/pdf",
        body: stream,
      },
      fields: "id, name, webViewLink, webContentLink, thumbnailLink",
    });

    const file = response.data as drive_v3.Schema$File;
    console.log("[GOOGLE-DRIVE] Respuesta de Drive:", {
      fileId: file.id,
      fileName: file.name,
      hasWebViewLink: !!file.webViewLink,
    });

    if (!file.id || !file.name) {
      throw new Error("No se pudo obtener el ID del archivo subido");
    }

    // COMPARTIR ARCHIVO: Si se proporcionó un email, compartir el archivo explícitamente
    // Esto es crucial porque los archivos subidos por Service Account no son visibles
    // por defecto para el usuario, a menos que estén en una carpeta compartida correctamente.
    // Al compartir explícitamente, aseguramos que el usuario pueda verlo.
    if (shareWithEmail) {
      try {
        console.log(`[GOOGLE-DRIVE] Compartiendo archivo con ${shareWithEmail}...`);
        await drive.permissions.create({
          fileId: file.id,
          requestBody: {
            role: "writer", // Dar permisos de edición para que puedan moverlo/borrarlo
            type: "user",
            emailAddress: shareWithEmail
          },
        });
        console.log("[GOOGLE-DRIVE] ✅ Archivo compartido exitosamente");
      } catch (permError) {
        console.warn("[GOOGLE-DRIVE] ⚠️ No se pudo compartir el archivo automáticamente:", permError);
        // No lanzamos error para no interrumpir el flujo principal, pero logueamos
      }
    }

    const result = {
      fileId: file.id,
      name: file.name ?? null,
      webViewLink: file.webViewLink || getDriveViewLink(file.id),
      webContentLink: file.webContentLink || getDriveDownloadLink(file.id),
      thumbnailLink: file.thumbnailLink || undefined,
    };

    console.log("[GOOGLE-DRIVE] ✅ Archivo subido exitosamente:", result.fileId);
    return result;
  } catch (error: any) {
    console.error("[GOOGLE-DRIVE] ❌ Error subiendo archivo:");
    console.error("[GOOGLE-DRIVE] Error type:", error?.constructor?.name);
    console.error("[GOOGLE-DRIVE] Error message:", error?.message);
    console.error("[GOOGLE-DRIVE] Error code:", error?.code);
    console.error("[GOOGLE-DRIVE] Error details:", JSON.stringify(error, null, 2));

    // Proporcionar mensaje de error más específico
    if (error?.code === 404) {
      throw new Error("La carpeta especificada no existe o no tienes acceso a ella");
    }
    if (error?.code === 403) {
      const errorMessage = error?.message || "";
      if (errorMessage.includes("storage quota") || errorMessage.includes("Service Accounts do not have storage")) {
        throw new Error(
          "Los Service Accounts no pueden subir archivos directamente. " +
          "Debes compartir una carpeta de TU Drive personal con el Service Account " +
          "(edutoolkit-drive-sa@edusalud-platfor.iam.gserviceaccount.com) y usar esa carpeta. " +
          "Ver: COMPARTIR-CARPETA-DRIVE.md"
        );
      }
      throw new Error(
        "No tienes permisos para subir archivos a esta carpeta. " +
        "Verifica que compartiste la carpeta con edutoolkit-drive-sa@edusalud-platfor.iam.gserviceaccount.com " +
        "y que le diste permisos de 'Editor'"
      );
    }
    if (error?.message?.includes("GOOGLE_DRIVE_SERVICE_ACCOUNT")) {
      throw error; // Ya tiene un mensaje claro
    }

    throw new Error(
      `Error subiendo archivo a Google Drive: ${error?.message || String(error)}`
    );
  }
}

/**
 * Generar enlace de visualización de un archivo en Drive
 */
export function getDriveViewLink(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

/**
 * Generar enlace de descarga de un archivo en Drive
 */
export function getDriveDownloadLink(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

