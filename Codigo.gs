/**
 * ============================================
 * FUNCIONES AUXILIARES
 * ============================================
 */

/**
 * Sube un PDF a Google Drive
 */
function uploadPdf(folderId, fileName, base64) {
  try {
    var folder = DriveApp.getFolderById(folderId);
    var blob = Utilities.newBlob(Utilities.base64Decode(base64), "application/pdf", fileName);
    var file = folder.createFile(blob);
    
    return {
      ok: true,
      fileId: file.getId(),
      webViewLink: file.getUrl(),
      downloadLink: "https://drive.google.com/uc?export=download&id=" + file.getId(),
      name: file.getName()
    };
  } catch (error) {
    Logger.log("Error subiendo PDF: " + error.toString());
    return {
      ok: false,
      error: error.toString()
    };
  }
}

/**
 * Crea una carpeta en Google Drive
 */
function createFolder(folderName, parentFolderId) {
  try {
    var parentFolder = DriveApp.getFolderById(parentFolderId);
    var folder = parentFolder.createFolder(folderName);
    
    return {
      ok: true,
      folderId: folder.getId(),
      webViewLink: folder.getUrl(),
      name: folder.getName(),
      created: true
    };
  } catch (error) {
    Logger.log("Error creando carpeta: " + error.toString());
    return {
      ok: false,
      error: error.toString()
    };
  }
}

/**
 * Obtiene o crea una carpeta en Google Drive
 */
function getOrCreateFolder(folderName, parentFolderId) {
  try {
    var parentFolder = DriveApp.getFolderById(parentFolderId);
    var folders = parentFolder.getFoldersByName(folderName);
    
    if (folders.hasNext()) {
      var existingFolder = folders.next();
      return {
        ok: true,
        folderId: existingFolder.getId(),
        webViewLink: existingFolder.getUrl(),
        name: existingFolder.getName(),
        created: false
      };
    } else {
      var newFolder = parentFolder.createFolder(folderName);
      return {
        ok: true,
        folderId: newFolder.getId(),
        webViewLink: newFolder.getUrl(),
        name: newFolder.getName(),
        created: true
      };
    }
  } catch (error) {
    Logger.log("Error obteniendo/creando carpeta: " + error.toString());
    return {
      ok: false,
      error: error.toString()
    };
  }
}

/**
 * Renombra una carpeta en Google Drive
 */
function renameFolder(folderId, newName) {
  try {
    var folder = DriveApp.getFolderById(folderId);
    folder.setName(newName);
    
    return {
      ok: true,
      folderId: folderId,
      newName: newName
    };
  } catch (error) {
    Logger.log("Error renombrando carpeta: " + error.toString());
    return {
      ok: false,
      error: error.toString()
    };
  }
}

/**
 * Elimina una carpeta en Google Drive
 */
function deleteFolder(folderId) {
  try {
    Logger.log("🗑️ [deleteFolder] Obteniendo carpeta con ID: " + folderId);
    var folder = DriveApp.getFolderById(folderId);
    
    // Eliminar todos los archivos
    var files = folder.getFiles();
    while (files.hasNext()) {
      files.next().setTrashed(true);
    }
    
    // Eliminar todas las subcarpetas
    var subfolders = folder.getFolders();
    while (subfolders.hasNext()) {
      var subfolder = subfolders.next();
      deleteFolder(subfolder.getId());
    }
    
    // Eliminar carpeta principal
    folder.setTrashed(true);
    
    return {
      ok: true,
      folderId: folderId
    };
  } catch (error) {
    Logger.log("❌ [deleteFolder] Error: " + error.toString());
    return {
      ok: false,
      error: error.toString()
    };
  }
}

/**
 * FUNCIÓN PRINCIPAL: doPost
 */
function doPost(e) {
  if (!e) return resultError("No se recibieron datos");
  
  // Validar Token
  var token = e.parameter.token;
  var postData = {};
  
  try {
    if (e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
      if (!token && postData.token) token = postData.token;
    }
  } catch (error) {
    return resultError("Error parseando JSON");
  }
  
  var expectedToken = "edutk_2025_9f3c1a7b2d4e6f8a0b1c3d5e7f9a1b2c";
  if (!token || token !== expectedToken) return resultError("Token inválido");
  
  // Obtener Acción
  var action = e.parameter.action || postData.action;
  
  if (!action) return resultError("Acción no especificada");
  
  // LOGIC DE ACCIONES - AQUI ESTABA EL PROBLEMA
  
  if (action === "uploadPdf") {
    if (!postData.folderId || !postData.fileName || !postData.base64) {
      return resultError("Faltan folderId, fileName o base64");
    }
    return resultSuccess(uploadPdf(postData.folderId, postData.fileName, postData.base64));
  }
  
  if (action === "createFolder") {
    return resultSuccess(createFolder(postData.folderName, postData.parentFolderId));
  }
  
  if (action === "getOrCreateFolder") {
    return resultSuccess(getOrCreateFolder(postData.folderName, postData.parentFolderId));
  }
  
  if (action === "renameFolder") {
    return resultSuccess(renameFolder(postData.folderId, postData.newName));
  }
  
  if (action === "deleteFolder") {
    if (!postData.folderId) return resultError("folderId es requerido");
    return resultSuccess(deleteFolder(postData.folderId));
  }
  
  return resultError("Acción no reconocida: " + action);
}

function resultSuccess(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function resultError(msg) {
  return ContentService.createTextOutput(JSON.stringify({ok: false, error: msg})).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return resultSuccess({message: "Web App Activo - Usa POST"});
}