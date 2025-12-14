# 📝 Modificaciones Necesarias en Apps Script

## Cambios Requeridos

El script de Apps Script necesita soportar dos acciones:

1. **Crear carpeta** (`action: "createFolder"`)
2. **Subir archivo** (acción actual, sin cambios)

## Estructura de Request

### Para crear carpeta:
```json
{
  "action": "createFolder",
  "folderName": "LM - Liderazgo y Manejo",
  "parentFolderId": "1DCs5yaZcfRPky_zMKdk1KjbBR7JZBKAe"
}
```

### Para subir archivo (actual):
```json
{
  "folderId": "1ABC...",
  "fileName": "certificado.pdf",
  "base64": "JVBERi0xLjQK..."
}
```

## Estructura de Response

### Para crear carpeta:
```json
{
  "ok": true,
  "folderId": "1XYZ...",
  "webViewLink": "https://drive.google.com/drive/folders/1XYZ...",
  "name": "LM - Liderazgo y Manejo"
}
```

### Para subir archivo (actual):
```json
{
  "ok": true,
  "fileId": "1ABC...",
  "webViewLink": "https://drive.google.com/file/d/1ABC.../view",
  "downloadLink": "https://drive.google.com/uc?export=download&id=1ABC...",
  "name": "certificado.pdf"
}
```

## Código de Ejemplo para Apps Script (ES5 Compatible)

```javascript
function doPost(e) {
  try {
    // Verificar token
    var token = e.parameter.token;
    var expectedToken = PropertiesService.getScriptProperties().getProperty('UPLOAD_TOKEN');
    
    if (!token || token !== expectedToken) {
      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        error: 'Token inválido'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Parsear body
    var data = JSON.parse(e.postData.contents);
    
    // Si es acción de crear carpeta
    if (data.action === 'createFolder') {
      return createFolder(data);
    }
    
    // Si no tiene action, es subida de archivo (comportamiento actual)
    return uploadFile(data);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function createFolder(data) {
  try {
    var folderName = data.folderName;
    var parentFolderId = data.parentFolderId;
    
    if (!folderName || !parentFolderId) {
      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        error: 'Faltan folderName o parentFolderId'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Obtener la carpeta padre
    var parentFolder = DriveApp.getFolderById(parentFolderId);
    
    // Crear la carpeta
    var newFolder = parentFolder.createFolder(folderName);
    
    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      folderId: newFolder.getId(),
      webViewLink: newFolder.getUrl(),
      name: folderName
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function uploadFile(data) {
  try {
    var folderId = data.folderId;
    var fileName = data.fileName;
    var base64 = data.base64;
    
    if (!folderId || !fileName || !base64) {
      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        error: 'Faltan folderId, fileName o base64'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Convertir base64 a blob
    var bytes = Utilities.base64Decode(base64);
    var blob = Utilities.newBlob(bytes, 'application/pdf', fileName);
    
    // Obtener la carpeta
    var folder = DriveApp.getFolderById(folderId);
    
    // Subir el archivo
    var file = folder.createFile(blob);
    
    var downloadLink = 'https://drive.google.com/uc?export=download&id=' + file.getId();
    
    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      fileId: file.getId(),
      webViewLink: file.getUrl(),
      downloadLink: downloadLink,
      name: fileName
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

## Pasos para Actualizar

1. Abre el proyecto de Apps Script
2. Reemplaza el código actual con el código de ejemplo arriba
3. Guarda y despliega como Web App (si es necesario, actualiza la versión)
4. Prueba que funcione tanto la creación de carpetas como la subida de archivos

## Notas

- El token se verifica en `doPost` antes de procesar cualquier acción
- Si `action === "createFolder"`, se llama a `createFolder()`
- Si no hay `action`, se asume que es subida de archivo (comportamiento actual)
- Ambos métodos retornan JSON con `ok: true/false`

