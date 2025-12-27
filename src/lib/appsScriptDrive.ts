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
        action: "uploadPdf",
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
 * Renombrar una carpeta en Google Drive usando Apps Script
 */
export async function renameFolderInAppsScriptDrive(args: {
  folderId: string;
  newName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.APPS_SCRIPT_UPLOAD_URL;
  const token = process.env.APPS_SCRIPT_UPLOAD_TOKEN;

  if (!url) {
    throw new Error("Falta APPS_SCRIPT_UPLOAD_URL en .env.local");
  }
  if (!token) {
    throw new Error("Falta APPS_SCRIPT_UPLOAD_TOKEN en .env.local");
  }

  console.log("[RENAME-FOLDER-AS] Renaming folder...", {
    folderId: args.folderId,
    newName: args.newName,
  });

  const requestBody = {
    action: "renameFolder",
    folderId: args.folderId,
    newName: args.newName,
  };

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
      console.error("[RENAME-FOLDER-AS] Respuesta no-JSON de Apps Script:", text.slice(0, 200));
      return {
        ok: false,
        error: `Respuesta no-JSON de Apps Script: ${text.slice(0, 200)}`,
      };
    }

    if (!res.ok || !json?.ok) {
      console.error("[RENAME-FOLDER-AS] Error en respuesta:", {
        status: res.status,
        error: json?.error,
        text: text.slice(0, 200),
      });
      return {
        ok: false,
        error: json?.error || `HTTP ${res.status}: ${text.slice(0, 200)}`,
      };
    }

    console.log("[RENAME-FOLDER-AS] Folder renamed successfully");

    return { ok: true };
  } catch (error) {
    console.error("[RENAME-FOLDER-AS] Error en fetch:", error);
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
 * Eliminar una carpeta en Google Drive usando Apps Script
 */
export async function deleteFolderInAppsScriptDrive(args: {
  folderId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.APPS_SCRIPT_UPLOAD_URL;
  const token = process.env.APPS_SCRIPT_UPLOAD_TOKEN;

  if (!url) {
    throw new Error("Falta APPS_SCRIPT_UPLOAD_URL en .env.local");
  }
  if (!token) {
    throw new Error("Falta APPS_SCRIPT_UPLOAD_TOKEN en .env.local");
  }

  console.log("[DELETE-FOLDER-AS] 🗑️ Iniciando eliminación de carpeta...", {
    folderId: args.folderId,
    url: url ? "Configurada" : "NO CONFIGURADA",
    token: token ? "Configurado" : "NO CONFIGURADO",
  });

  const requestBody = {
    action: "deleteFolder",
    folderId: args.folderId,
  };

  console.log("[DELETE-FOLDER-AS] 📤 Enviando petición a Apps Script:", {
    url: url,
    action: "deleteFolder",
    folderId: args.folderId,
  });

  try {
    const fetchUrl = `${url}?token=${encodeURIComponent(token)}`;
    console.log("[DELETE-FOLDER-AS] URL completa (sin token visible):", `${url}?token=***`);

    const res = await fetch(fetchUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    console.log("[DELETE-FOLDER-AS] 📥 Respuesta recibida:", {
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
    });

    const text = await res.text();
    console.log("[DELETE-FOLDER-AS] 📄 Texto de respuesta (primeros 500 chars):", text.slice(0, 500));

    let json: any = null;
    try {
      json = JSON.parse(text);
      console.log("[DELETE-FOLDER-AS] ✅ JSON parseado correctamente:", json);
    } catch (parseError) {
      console.error("[DELETE-FOLDER-AS] ❌ Error parseando JSON:", {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        text: text.slice(0, 500),
      });
      return {
        ok: false,
        error: `Respuesta no-JSON de Apps Script: ${text.slice(0, 200)}`,
      };
    }

    if (!res.ok || !json?.ok) {
      console.error("[DELETE-FOLDER-AS] ❌ Error en respuesta de Apps Script:", {
        status: res.status,
        statusText: res.statusText,
        jsonOk: json?.ok,
        error: json?.error,
        fullResponse: json,
      });
      return {
        ok: false,
        error: json?.error || `HTTP ${res.status}: ${text.slice(0, 200)}`,
      };
    }

    console.log("[DELETE-FOLDER-AS] ✅ Carpeta eliminada exitosamente");

    return { ok: true };
  } catch (error) {
    console.error("[DELETE-FOLDER-AS] ❌ Excepción en fetch:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
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

