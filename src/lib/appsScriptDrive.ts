/**
 * Apps Script Drive Integration
 * 
 * Esta función sube PDFs a Google Drive usando un Web App de Apps Script.
 * El Apps Script se ejecuta como un usuario real de la organización,
 * lo cual permite guardar archivos en Drive con la cuota y permisos de esa cuenta.
 */

export type AppsScriptUploadResult = {
  ok: boolean;
  fileId?: string;
  webViewLink?: string;
  downloadLink?: string;
  name?: string;
  error?: string;
};

export type AppsScriptCreateFolderResult = {
  ok: boolean;
  folderId?: string;
  webViewLink?: string;
  name?: string;
  created?: boolean; // true si se creó, false si ya existía
  error?: string;
};

export async function uploadPdfToAppsScriptDrive(args: {
  pdfBuffer: Buffer;
  fileName: string;
  folderId: string;
}): Promise<AppsScriptUploadResult> {
  const url = process.env.APPS_SCRIPT_UPLOAD_URL;
  const token = process.env.APPS_SCRIPT_UPLOAD_TOKEN;

  if (!url) {
    throw new Error("Falta APPS_SCRIPT_UPLOAD_URL en .env.local");
  }
  if (!token) {
    throw new Error("Falta APPS_SCRIPT_UPLOAD_TOKEN en .env.local");
  }

  const base64 = args.pdfBuffer.toString("base64");

  console.log("[UPLOAD-AS] Starting upload...", {
    fileName: args.fileName,
    fileSize: args.pdfBuffer.length,
    folderId: args.folderId,
  });

  try {
    const res = await fetch(`${url}?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        folderId: args.folderId,
        fileName: args.fileName,
        base64,
      }),
    });

    const text = await res.text();

    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      console.error("[UPLOAD-AS] Respuesta no-JSON de Apps Script:", text.slice(0, 200));
      return {
        ok: false,
        error: `Respuesta no-JSON de Apps Script: ${text.slice(0, 200)}`,
      };
    }

    if (!res.ok || !json?.ok) {
      console.error("[UPLOAD-AS] Error en respuesta:", {
        status: res.status,
        error: json?.error,
        text: text.slice(0, 200),
      });
      return {
        ok: false,
        error: json?.error || `HTTP ${res.status}: ${text.slice(0, 200)}`,
      };
    }

    console.log("[UPLOAD-AS] Uploaded fileId=", json.fileId);

    return json as AppsScriptUploadResult;
  } catch (error) {
    console.error("[UPLOAD-AS] Error en fetch:", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : `Error desconocido: ${String(error)}`,
    };
  }
}

/**
 * Obtener o crear una carpeta en Google Drive usando Apps Script
 * Si la carpeta ya existe, retorna su ID. Si no existe, la crea.
 */
export async function getOrCreateFolderInAppsScriptDrive(args: {
  folderName: string;
  parentFolderId: string;
}): Promise<AppsScriptCreateFolderResult> {
  const url = process.env.APPS_SCRIPT_UPLOAD_URL;
  const token = process.env.APPS_SCRIPT_UPLOAD_TOKEN;

  if (!url) {
    throw new Error("Falta APPS_SCRIPT_UPLOAD_URL en .env.local");
  }
  if (!token) {
    throw new Error("Falta APPS_SCRIPT_UPLOAD_TOKEN en .env.local");
  }

  console.log("[GET-OR-CREATE-FOLDER-AS] Getting or creating folder...", {
    folderName: args.folderName,
    parentFolderId: args.parentFolderId,
  });

  const requestBody = {
    action: "getOrCreateFolder",
    folderName: args.folderName,
    parentFolderId: args.parentFolderId,
  };

  console.log("[GET-OR-CREATE-FOLDER-AS] Request body:", JSON.stringify(requestBody));
  console.log("[GET-OR-CREATE-FOLDER-AS] URL:", url);
  console.log("[GET-OR-CREATE-FOLDER-AS] Token presente:", !!token);

  try {
    const res = await fetch(`${url}?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const text = await res.text();

    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      console.error("[GET-OR-CREATE-FOLDER-AS] Respuesta no-JSON de Apps Script:", text.slice(0, 200));
      return {
        ok: false,
        error: `Respuesta no-JSON de Apps Script: ${text.slice(0, 200)}`,
      };
    }

    if (!res.ok || !json?.ok) {
      console.error("[GET-OR-CREATE-FOLDER-AS] Error en respuesta:", {
        status: res.status,
        error: json?.error,
        text: text.slice(0, 200),
      });
      return {
        ok: false,
        error: json?.error || `HTTP ${res.status}: ${text.slice(0, 200)}`,
      };
    }

    console.log("[GET-OR-CREATE-FOLDER-AS] Folder result:", {
      folderId: json.folderId,
      created: json.created,
    });

    return json as AppsScriptCreateFolderResult;
  } catch (error) {
    console.error("[GET-OR-CREATE-FOLDER-AS] Error en fetch:", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : `Error desconocido: ${String(error)}`,
    };
  }
}

/**
 * Crear una carpeta en Google Drive usando Apps Script
 * (Siempre crea una nueva carpeta, incluso si ya existe una con el mismo nombre)
 */
export async function createFolderInAppsScriptDrive(args: {
  folderName: string;
  parentFolderId: string;
}): Promise<AppsScriptCreateFolderResult> {
  const url = process.env.APPS_SCRIPT_UPLOAD_URL;
  const token = process.env.APPS_SCRIPT_UPLOAD_TOKEN;

  if (!url) {
    throw new Error("Falta APPS_SCRIPT_UPLOAD_URL en .env.local");
  }
  if (!token) {
    throw new Error("Falta APPS_SCRIPT_UPLOAD_TOKEN en .env.local");
  }

  console.log("[CREATE-FOLDER-AS] Creating folder...", {
    folderName: args.folderName,
    parentFolderId: args.parentFolderId,
  });

  const requestBody = {
    action: "createFolder",
    folderName: args.folderName,
    parentFolderId: args.parentFolderId,
  };

  console.log("[CREATE-FOLDER-AS] Request body:", JSON.stringify(requestBody));

  try {
    const res = await fetch(`${url}?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const text = await res.text();

    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      console.error("[CREATE-FOLDER-AS] Respuesta no-JSON de Apps Script:", text.slice(0, 200));
      return {
        ok: false,
        error: `Respuesta no-JSON de Apps Script: ${text.slice(0, 200)}`,
      };
    }

    if (!res.ok || !json?.ok) {
      console.error("[CREATE-FOLDER-AS] Error en respuesta:", {
        status: res.status,
        error: json?.error,
        text: text.slice(0, 200),
      });
      return {
        ok: false,
        error: json?.error || `HTTP ${res.status}: ${text.slice(0, 200)}`,
      };
    }

    console.log("[CREATE-FOLDER-AS] Created folderId=", json.folderId);

    return json as AppsScriptCreateFolderResult;
  } catch (error) {
    console.error("[CREATE-FOLDER-AS] Error en fetch:", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : `Error desconocido: ${String(error)}`,
    };
  }
}

