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
 * Para obtener o crear carpeta (busca por nombre, si no existe la crea):
 * {
 *   "action": "getOrCreateFolder",
 *   "folderName": "2025",
 *   "parentFolderId": "1ABC..."
 * }
 * 
 * Para renombrar carpeta:
 * {
 *   "action": "renameFolder",
 *   "folderId": "xxxx",
 *   "newName": "LM - Nuevo Nombre"
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
    
    // Si es acción de crear carpeta
    if (data.action === "createFolder") {
      return createFolder_(data);
    }
    
    // Si es acción de obtener o crear carpeta (busca por nombre, si no existe la crea)
    if (data.action === "getOrCreateFolder") {
      return getOrCreateFolder_(data);
    }
    
    // Si es acción de renombrar carpeta
    if (data.action === "renameFolder") {
      return renameFolder_(data);
    }
    
    // Si no tiene action, es subida de archivo (comportamiento actual)
    return uploadFile_(data);
    
  } catch (err) {
    return json_(500, { ok: false, error: String(err) });
  }
}

function createFolder_(data) {
  try {
    var folderName = data.folderName;
    var parentFolderId = data.parentFolderId;

    if (!folderName || !parentFolderId) {
      return json_(400, { ok: false, error: "Faltan folderName o parentFolderId" });
    }

    var parentFolder = DriveApp.getFolderById(parentFolderId);
    var newFolder = parentFolder.createFolder(folderName);

    return json_(200, {
      ok: true,
      folderId: newFolder.getId(),
      webViewLink: "https://drive.google.com/drive/folders/" + newFolder.getId(),
      name: folderName
    });
  } catch (err) {
    return json_(500, { ok: false, error: String(err) });
  }
}

function getOrCreateFolder_(data) {
  try {
    var folderName = data.folderName;
    var parentFolderId = data.parentFolderId;

    if (!folderName || !parentFolderId) {
      return json_(400, { ok: false, error: "Faltan folderName o parentFolderId" });
    }

    var parentFolder = DriveApp.getFolderById(parentFolderId);
    var folders = parentFolder.getFoldersByName(folderName);
    
    // Si la carpeta ya existe, retornar su ID
    if (folders.hasNext()) {
      var existingFolder = folders.next();
      return json_(200, {
        ok: true,
        folderId: existingFolder.getId(),
        webViewLink: "https://drive.google.com/drive/folders/" + existingFolder.getId(),
        name: folderName,
        created: false
      });
    }
    
    // Si no existe, crearla
    var newFolder = parentFolder.createFolder(folderName);
    return json_(200, {
      ok: true,
      folderId: newFolder.getId(),
      webViewLink: "https://drive.google.com/drive/folders/" + newFolder.getId(),
      name: folderName,
      created: true
    });
  } catch (err) {
    return json_(500, { ok: false, error: String(err) });
  }
}

function renameFolder_(data) {
  try {
    var folderId = data.folderId;
    var newName = data.newName;

    if (!folderId || !newName) {
      return json_(400, { ok: false, error: "Faltan folderId o newName" });
    }

    var folder = DriveApp.getFolderById(folderId);
    folder.setName(newName);

    return json_(200, {
      ok: true,
      folderId: folderId,
      newName: newName
    });
  } catch (err) {
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

