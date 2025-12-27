# 🔧 Guía: Agregar Funcionalidad de Eliminar Carpetas en Apps Script

Para que la eliminación de carpetas en Google Drive funcione al eliminar un curso, necesitas agregar la acción `deleteFolder` en tu Apps Script.

## 📋 Paso 1: Abrir tu Apps Script

1. Ve a tu proyecto de Google Apps Script (el que usas para subir PDFs a Drive)
2. Abre el editor de código

## 📝 Paso 2: Agregar la Función de Eliminar

Agrega esta función a tu código de Apps Script (sin `export`, solo JavaScript puro):

```javascript
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
```

**⚠️ IMPORTANTE**: 
- NO uses `export` ni `import` en Apps Script
- NO uses `console.log`, usa `Logger.log` en su lugar
- Apps Script solo soporta JavaScript ES5, no ES6+

## 🔄 Paso 3: Actualizar la Función doPost

En tu función `doPost` (la que maneja las peticiones), agrega el caso para `deleteFolder`:

```javascript
function doPost(e) {
  // ... tu código de validación de token existente ...
  
  var postData = JSON.parse(e.postData.contents);
  var action = e.parameter.action || postData.action;
  
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
  
  // ... resto de tus acciones existentes (uploadPdf, createFolder, renameFolder, etc.) ...
}
```

## 📋 Ejemplo Completo de doPost

Si tu `doPost` actual se ve así:

```javascript
function doPost(e) {
  // Validar token
  var token = e.parameter.token;
  if (token !== "TU_TOKEN_SECRETO") {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: "Token inválido"
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var postData = JSON.parse(e.postData.contents);
  var action = e.parameter.action || postData.action;
  
  if (action === "uploadPdf") {
    // ... código existente para subir PDFs ...
  }
  
  if (action === "createFolder") {
    // ... código existente para crear carpetas ...
  }
  
  if (action === "getOrCreateFolder") {
    // ... código existente para obtener/crear carpetas ...
  }
  
  if (action === "renameFolder") {
    // ... código existente para renombrar carpetas ...
  }
  
  // AGREGAR ESTE NUEVO BLOQUE:
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
  
  return ContentService.createTextOutput(JSON.stringify({
    ok: false,
    error: "Acción no reconocida"
  })).setMimeType(ContentService.MimeType.JSON);
}
```

**⚠️ RECORDATORIO IMPORTANTE**:
- NO uses `export`, `import`, `const`, `let`, `=>`, ni otras características de ES6+
- Usa `var` en lugar de `const` o `let`
- Usa `function` en lugar de arrow functions
- Usa `Logger.log()` en lugar de `console.log()`

## ✅ Paso 4: Guardar y Desplegar

1. **Guarda** el código en Apps Script (Ctrl+S o Cmd+S)
2. **Despliega** la nueva versión:
   - Haz clic en "Desplegar" → "Nueva implementación"
   - O actualiza la implementación existente
   - Copia la nueva URL si cambió

## 🧪 Paso 5: Probar

Una vez que agregues el código, cuando elimines un curso:
- ✅ Se eliminará el curso de Firestore
- ✅ Se eliminará la carpeta asociada en Google Drive (si existe)
- ✅ Se eliminarán todos los archivos y subcarpetas dentro de la carpeta

## ⚠️ Nota Importante

- Asegúrate de que el Apps Script tenga permisos para eliminar carpetas en Drive
- Si usas un Service Account, comparte la carpeta con el email del Service Account
- La función `deleteFolder` necesita el permiso `DriveApp` que ya deberías tener si usas `createFolder`
- **ADVERTENCIA**: La eliminación es permanente. Los archivos se moverán a la papelera de Drive, pero pueden eliminarse permanentemente después de 30 días

## 🔍 Verificar que Funciona

Después de agregar el código, cuando elimines un curso:
1. El sistema intentará eliminar la carpeta en Drive
2. Revisa los logs en la consola del servidor para ver si hay errores
3. Si todo está bien, verás: `[DELETE-COURSE] ✅ Carpeta de Drive eliminada: [folderId]`

