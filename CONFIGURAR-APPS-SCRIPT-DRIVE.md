# 📋 Configuración: Apps Script Drive Upload

## Variables de Entorno Requeridas

Agrega estas variables a tu archivo `.env.local`:

```env
# URL del Web App de Apps Script
APPS_SCRIPT_UPLOAD_URL=https://script.google.com/macros/s/AKfycbzHUlVJJpQbRe-0CfHn4p4cTp9oSKhAQqdasPfVRG_Vu0NOqvZaKZ-NaqPnT1Xtu9yKFg/exec

# Token de autenticación (Script Properties del Apps Script)
APPS_SCRIPT_UPLOAD_TOKEN=<token_del_apps_script>

# ID de la carpeta de Google Drive donde se subirán los certificados
DRIVE_CERTIFICATES_FOLDER_ID=1DCs5yaZcfRPky_zMKdk1KjbBR7JZBKAe
```

## Obtener el Token de Apps Script

El token debe configurarse en las **Script Properties** del Apps Script:

1. Abre el proyecto de Apps Script
2. Ve a **Proyecto** → **Configuración del proyecto** (Project Settings)
3. En la sección **Script Properties**, agrega:
   - **Property**: `UPLOAD_TOKEN`
   - **Value**: Un token seguro (puede ser una cadena aleatoria larga)
4. Guarda el token y agrégalo a `.env.local` como `APPS_SCRIPT_UPLOAD_TOKEN`

## Verificación

Después de configurar las variables:

1. **Reinicia el servidor**:
   ```bash
   npm run dev
   ```

2. **Prueba subir un PDF**:
   - Ve a un certificado en el panel de administración
   - Haz clic en "Subir PDF"
   - Selecciona un archivo PDF
   - El archivo debería subirse a la carpeta de Google Drive

3. **Verifica en Google Drive**:
   - Ve a la carpeta con ID `1DCs5yaZcfRPky_zMKdk1KjbBR7JZBKAe`
   - Deberías ver el PDF que subiste

## Notas Importantes

- **Seguridad**: El token se envía como query parameter (`?token=...`) para mayor confiabilidad con Apps Script
- **Logs**: Los logs no exponen el token completo, solo indican si está configurado o no
- **Errores**: Si hay un error, revisa los logs del servidor para ver el mensaje específico

## Migración desde Service Account

Esta implementación reemplaza el uso de Google Drive API con Service Account, que tenía limitaciones de cuota de almacenamiento. Ahora los archivos se suben usando Apps Script, que se ejecuta como un usuario real de la organización (`diseno.edusalud@unah.edu.hn`), permitiendo usar la cuota de almacenamiento de esa cuenta.

