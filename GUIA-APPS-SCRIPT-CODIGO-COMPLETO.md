# 📜 Código Completo de Apps Script para Google Drive

Este documento contiene el código completo del Apps Script que debes usar en tu proyecto de Google Apps Script para manejar todas las operaciones de Drive.

## ⚠️ IMPORTANTE: Compatibilidad con Apps Script

**Apps Script solo soporta JavaScript ES5**, por lo tanto:
- ❌ NO uses `export` ni `import`
- ❌ NO uses `const` ni `let`, usa `var`
- ❌ NO uses arrow functions `() =>`, usa `function`
- ❌ NO uses `console.log`, usa `Logger.log()`
- ✅ Usa solo JavaScript ES5 puro

---

## 📋 Código Completo

Copia y pega este código completo en tu proyecto de Apps Script:

```javascript
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
 * Si la carpeta ya existe, retorna su ID. Si no existe, la crea.
 */
function getOrCreateFolder(folderName, parentFolderId) {
  try {
    var parentFolder = DriveApp.getFolderById(parentFolderId);
    var folders = parentFolder.getFoldersByName(folderName);
    
    if (folders.hasNext()) {
      // La carpeta ya existe
      var existingFolder = folders.next();
      return {
        ok: true,
        folderId: existingFolder.getId(),
        webViewLink: existingFolder.getUrl(),
        name: existingFolder.getName(),
        created: false
      };
    } else {
      // La carpeta no existe, crearla
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
 * Elimina recursivamente todos los archivos y subcarpetas
 */
function deleteFolder(folderId) {
  try {
    var folder = DriveApp.getFolderById(folderId);
    
    // Eliminar todos los archivos dentro de la carpeta primero
    var files = folder.getFiles();
    while (files.hasNext()) {
      var file = files.next();
      file.setTrashed(true);
    }
    
    // Eliminar todas las subcarpetas recursivamente
    var subfolders = folder.getFolders();
    while (subfolders.hasNext()) {
      var subfolder = subfolders.next();
      deleteFolder(subfolder.getId()); // Llamada recursiva
    }
    
    // Finalmente, eliminar la carpeta principal
    folder.setTrashed(true);
    
    return {
      ok: true,
      folderId: folderId
    };
  } catch (error) {
    Logger.log("Error eliminando carpeta: " + error.toString());
    return {
      ok: false,
      error: error.toString()
    };
  }
}

/**
 * ============================================
 * FUNCIÓN PRINCIPAL: doPost
 * ============================================
 * 
 * Esta función maneja todas las peticiones POST del Web App
 */
function doPost(e) {
  // Validar token de seguridad
  var token = e.parameter.token;
  var expectedToken = "TU_TOKEN_SECRETO"; // ⚠️ CAMBIA ESTO por tu token real
  
  if (token !== expectedToken) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: "Token inválido"
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Parsear datos de la petición
  var postData = {};
  try {
    if (e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    }
  } catch (error) {
    Logger.log("Error parseando postData: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: "Error parseando datos de la petición"
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var action = e.parameter.action || postData.action;
  
  if (!action) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: "Acción no especificada"
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // ============================================
  // ACCIÓN: uploadPdf
  // ============================================
  if (action === "uploadPdf") {
    var folderId = postData.folderId;
    var fileName = postData.fileName;
    var base64 = postData.base64;
    
    if (!folderId || !fileName || !base64) {
      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        error: "folderId, fileName y base64 son requeridos"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var result = uploadPdf(folderId, fileName, base64);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // ============================================
  // ACCIÓN: createFolder
  // ============================================
  if (action === "createFolder") {
    var folderName = postData.folderName;
    var parentFolderId = postData.parentFolderId;
    
    if (!folderName || !parentFolderId) {
      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        error: "folderName y parentFolderId son requeridos"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var result = createFolder(folderName, parentFolderId);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // ============================================
  // ACCIÓN: getOrCreateFolder
  // ============================================
  if (action === "getOrCreateFolder") {
    var folderName = postData.folderName;
    var parentFolderId = postData.parentFolderId;
    
    if (!folderName || !parentFolderId) {
      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        error: "folderName y parentFolderId son requeridos"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var result = getOrCreateFolder(folderName, parentFolderId);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // ============================================
  // ACCIÓN: renameFolder
  // ============================================
  if (action === "renameFolder") {
    var folderId = postData.folderId;
    var newName = postData.newName;
    
    if (!folderId || !newName) {
      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        error: "folderId y newName son requeridos"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var result = renameFolder(folderId, newName);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // ============================================
  // ACCIÓN: deleteFolder
  // ============================================
  if (action === "deleteFolder") {
    var folderId = postData.folderId;
    
    if (!folderId) {
      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        error: "folderId es requerido"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var result = deleteFolder(folderId);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // ============================================
  // ACCIÓN NO RECONOCIDA
  // ============================================
  return ContentService.createTextOutput(JSON.stringify({
    ok: false,
    error: "Acción no reconocida: " + action
  })).setMimeType(ContentService.MimeType.JSON);
}
```

---

## 🔧 Configuración

### Paso 1: Configurar el Token de Seguridad

En la línea 100 del código, cambia:
```javascript
var expectedToken = "TU_TOKEN_SECRETO";
```

Por tu token real (el mismo que tienes en `.env.local` como `APPS_SCRIPT_UPLOAD_TOKEN`).

### Paso 2: Guardar y Desplegar

1. **Guarda** el código en Apps Script (Ctrl+S o Cmd+S)
2. **Despliega** como Web App:
   - Haz clic en "Desplegar" → "Nueva implementación"
   - Selecciona "Tipo: Aplicación web"
   - Configura:
     - **Descripción**: "Drive Integration v2" (o la que prefieras)
     - **Ejecutar como**: "Yo" (tu cuenta)
     - **Quién tiene acceso**: "Cualquiera" (para que tu backend pueda llamarlo)
   - Haz clic en "Desplegar"
   - **Copia la URL** que se genera (la necesitarás para `.env.local`)

### Paso 3: Configurar Variables de Entorno

En tu archivo `.env.local`, asegúrate de tener:
```env
APPS_SCRIPT_UPLOAD_URL=https://script.google.com/macros/s/TU_SCRIPT_ID/exec
APPS_SCRIPT_UPLOAD_TOKEN=tu_token_secreto_aqui
```

---

## ✅ Funcionalidades Incluidas

Este código completo incluye todas las funciones necesarias:

1. ✅ **uploadPdf**: Sube PDFs a Google Drive
2. ✅ **createFolder**: Crea una nueva carpeta
3. ✅ **getOrCreateFolder**: Obtiene una carpeta si existe, o la crea si no existe
4. ✅ **renameFolder**: Renombra una carpeta existente
5. ✅ **deleteFolder**: Elimina una carpeta y todo su contenido (recursivo)

---

## 🧪 Probar las Funciones

### Probar uploadPdf
```javascript
// Desde tu backend (Next.js)
const result = await uploadPdfToAppsScriptDrive({
  pdfBuffer: buffer,
  fileName: "test.pdf",
  folderId: "1abc123..."
});
```

### Probar createFolder
```javascript
const result = await createFolderInAppsScriptDrive({
  folderName: "Nueva Carpeta",
  parentFolderId: "1abc123..."
});
```

### Probar getOrCreateFolder
```javascript
const result = await getOrCreateFolderInAppsScriptDrive({
  folderName: "Carpeta Existente",
  parentFolderId: "1abc123..."
});
```

### Probar renameFolder
```javascript
const result = await renameFolderInAppsScriptDrive({
  folderId: "1abc123...",
  newName: "Nuevo Nombre"
});
```

### Probar deleteFolder
```javascript
const result = await deleteFolderInAppsScriptDrive({
  folderId: "1abc123..."
});
```

---

## ⚠️ Notas Importantes

1. **Permisos**: Asegúrate de que el Apps Script tenga permisos para acceder a Google Drive
2. **Token de Seguridad**: Nunca compartas tu token públicamente
3. **Eliminación Permanente**: La función `deleteFolder` mueve archivos a la papelera. Después de 30 días se eliminan permanentemente
4. **Límites de Apps Script**: 
   - Tiempo máximo de ejecución: 6 minutos
   - Tamaño máximo de archivo: 50 MB (para uploadPdf)
   - Límite de peticiones: 20,000 por día (gratis)

---

## 🔍 Solución de Problemas

### Error: "Token inválido"
- Verifica que el token en `.env.local` coincida con el token en el código de Apps Script

### Error: "Acción no reconocida"
- Verifica que estés enviando el campo `action` correctamente en el body de la petición

### Error: "Error parseando datos"
- Asegúrate de enviar el body como JSON con `Content-Type: application/json`

### Error: "No se puede acceder a la carpeta"
- Verifica que el Apps Script tenga permisos para acceder a Google Drive
- Si usas Service Account, comparte las carpetas con el email del Service Account

---

## 📝 Resumen

Este código completo te permite:
- ✅ Subir PDFs a Drive
- ✅ Crear carpetas
- ✅ Obtener o crear carpetas (sin duplicados)
- ✅ Renombrar carpetas
- ✅ Eliminar carpetas y su contenido

Todo en un solo archivo de Apps Script, compatible con ES5 y listo para usar.

