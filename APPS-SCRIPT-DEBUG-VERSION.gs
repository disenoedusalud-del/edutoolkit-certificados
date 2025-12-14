var PROP_TOKEN = "UPLOAD_TOKEN";

/**
 * POST JSON:
 * 
 * Para crear carpeta:
 * {
 *   "action": "createFolder",
 *   "folderName": "LM - Liderazgo y Manejo",
 *   "parentFolderId": "1ABC..."
 * }
 * 
 * Para subir archivo:
 * {
 *   "folderId": "xxxx",
 *   "fileName": "CF_LM-2025-01.pdf",
 *   "base64": "JVBERi0xLjcKJc..."
 * }
 *
 * Header requerido (o query param ?token=...):
 *   X-Upload-Token: <TOKEN>
 */
function doPost(e) {
  try {
    var token = (e && e.parameter && e.parameter.token) || "";
    var headerToken = getHeader_(e, "x-upload-token");
    var expected = PropertiesService.getScriptProperties().getProperty(PROP_TOKEN);

    if (!expected) return json_(500, { ok: false, error: "Falta Script Property UPLOAD_TOKEN" });

    if (headerToken !== expected && token !== expected) return json_(401, { ok: false, error: "Unauthorized" });

    if (!e || !e.postData || !e.postData.contents) {
      return json_(400, { ok: false, error: "Body vacío" });
    }

    var data = JSON.parse(e.postData.contents);
    
    // ⚠️ DEBUG: Log para ver qué está recibiendo
    Logger.log("doPost recibió data.action = " + (data.action || "undefined"));
    Logger.log("doPost recibió data = " + JSON.stringify(data));
    
    // Si es acción de crear carpeta
    if (data.action === "createFolder") {
      Logger.log("Llamando a createFolder_");
      return createFolder_(data);
    }
    
    // Si no tiene action, es subida de archivo (comportamiento actual)
    Logger.log("Llamando a uploadFile_");
    return uploadFile_(data);
    
  } catch (err) {
    Logger.log("Error en doPost: " + String(err));
    return json_(500, { ok: false, error: String(err) });
  }
}

function createFolder_(data) {
  try {
    Logger.log("createFolder_ llamado con: " + JSON.stringify(data));
    
    var folderName = data.folderName;
    var parentFolderId = data.parentFolderId;

    if (!folderName || !parentFolderId) {
      Logger.log("Error: Faltan folderName o parentFolderId");
      return json_(400, { ok: false, error: "Faltan folderName o parentFolderId" });
    }

    Logger.log("Creando carpeta: " + folderName + " en: " + parentFolderId);
    
    var parentFolder = DriveApp.getFolderById(parentFolderId);
    var newFolder = parentFolder.createFolder(folderName);

    Logger.log("Carpeta creada con ID: " + newFolder.getId());

    return json_(200, {
      ok: true,
      folderId: newFolder.getId(),
      webViewLink: "https://drive.google.com/drive/folders/" + newFolder.getId(),
      name: folderName
    });
  } catch (err) {
    Logger.log("Error en createFolder_: " + String(err));
    return json_(500, { ok: false, error: String(err) });
  }
}

function uploadFile_(data) {
  try {
    var folderId = data.folderId;
    var fileName = data.fileName;
    var base64 = data.base64;

    if (!folderId || !fileName || !base64) {
      return json_(400, { ok: false, error: "Faltan folderId, fileName o base64" });
    }

    var bytes = Utilities.base64Decode(base64);
    var blob = Utilities.newBlob(bytes, "application/pdf", fileName);

    var folder = DriveApp.getFolderById(folderId);
    var file = folder.createFile(blob);

    var fileId = file.getId();
    var webViewLink = "https://drive.google.com/file/d/" + fileId + "/view";
    var downloadLink = "https://drive.google.com/uc?id=" + fileId + "&export=download";

    return json_(200, {
      ok: true,
      fileId: fileId,
      webViewLink: webViewLink,
      downloadLink: downloadLink,
      name: file.getName()
    });
  } catch (err) {
    return json_(500, { ok: false, error: String(err) });
  }
}

function json_(status, obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Nota: Apps Script no expone headers siempre igual en doPost;
// por eso aceptamos también token por query (?token=...).
function getHeader_(e, keyLower) {
  try {
    var headers = (e && e.headers) || {};
    var keys = Object.keys(headers);
    for (var i = 0; i < keys.length; i++) {
      var k = String(keys[i]).toLowerCase();
      if (k === keyLower) return String(headers[keys[i]]);
    }
    return "";
  } catch (err) {
    return "";
  }
}

