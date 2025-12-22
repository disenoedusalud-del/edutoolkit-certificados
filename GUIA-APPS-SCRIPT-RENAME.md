# 🔧 Guía: Agregar Funcionalidad de Renombrar Carpetas en Apps Script

Para que el renombrado de carpetas en Google Drive funcione, necesitas agregar la acción `renameFolder` en tu Apps Script.

## 📋 Paso 1: Abrir tu Apps Script

1. Ve a tu proyecto de Google Apps Script (el que usas para subir PDFs a Drive)
2. Abre el editor de código

## 📝 Paso 2: Agregar la Función de Renombrar

Agrega esta función a tu código de Apps Script:

```javascript
/**
 * Renombra una carpeta en Google Drive
 */
function renameFolder(folderId, newName) {
  try {
    const folder = DriveApp.getFolderById(folderId);
    folder.setName(newName);
    
    return {
      ok: true,
      folderId: folderId,
      newName: newName
    };
  } catch (error) {
    console.error("Error renombrando carpeta:", error);
    return {
      ok: false,
      error: error.toString()
    };
  }
}
```

## 🔄 Paso 3: Actualizar la Función doPost

En tu función `doPost` (la que maneja las peticiones), agrega el caso para `renameFolder`:

```javascript
function doPost(e) {
  // ... tu código de validación de token existente ...
  
  const action = e.parameter.action || JSON.parse(e.postData.contents).action;
  
  if (action === "renameFolder") {
    const data = JSON.parse(e.postData.contents);
    const folderId = data.folderId;
    const newName = data.newName;
    
    if (!folderId || !newName) {
      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        error: "folderId y newName son requeridos"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const result = renameFolder(folderId, newName);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // ... resto de tus acciones existentes (uploadPdf, createFolder, etc.) ...
}
```

## 📋 Ejemplo Completo de doPost

Si tu `doPost` actual se ve así:

```javascript
function doPost(e) {
  // Validar token
  const token = e.parameter.token;
  if (token !== "TU_TOKEN_SECRETO") {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: "Token inválido"
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const action = e.parameter.action || JSON.parse(e.postData.contents).action;
  
  if (action === "uploadPdf") {
    // ... código existente para subir PDFs ...
  }
  
  if (action === "createFolder") {
    // ... código existente para crear carpetas ...
  }
  
  if (action === "getOrCreateFolder") {
    // ... código existente para obtener/crear carpetas ...
  }
  
  // AGREGAR ESTE NUEVO BLOQUE:
  if (action === "renameFolder") {
    const data = JSON.parse(e.postData.contents);
    const folderId = data.folderId;
    const newName = data.newName;
    
    if (!folderId || !newName) {
      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        error: "folderId y newName son requeridos"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const result = renameFolder(folderId, newName);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    ok: false,
    error: "Acción no reconocida"
  })).setMimeType(ContentService.MimeType.JSON);
}
```

## ✅ Paso 4: Guardar y Desplegar

1. **Guarda** el código en Apps Script (Ctrl+S o Cmd+S)
2. **Despliega** la nueva versión:
   - Haz clic en "Desplegar" → "Nueva implementación"
   - O actualiza la implementación existente
   - Copia la nueva URL si cambió

## 🧪 Paso 5: Probar

Una vez que agregues el código, cuando edites un curso y cambies su nombre:
- ✅ Se actualizará el nombre en todos los certificados relacionados
- ✅ Se renombrará la carpeta en Google Drive automáticamente
- ✅ No se creará una nueva carpeta

## ⚠️ Nota Importante

- Asegúrate de que el Apps Script tenga permisos para modificar carpetas en Drive
- Si usas un Service Account, comparte la carpeta con el email del Service Account
- La función `renameFolder` necesita el permiso `DriveApp` que ya deberías tener si usas `createFolder`

## 🔍 Verificar que Funciona

Después de agregar el código, cuando edites un curso:
1. El sistema intentará renombrar la carpeta en Drive
2. Revisa los logs en la consola del servidor para ver si hay errores
3. Si todo está bien, verás: `[UPDATE-COURSE] ✅ Carpeta renombrada correctamente`

