# Configuración Rápida de Google Drive Service Account

## Paso 1: Crear Service Account en Google Cloud Console

1. **Ve a Google Cloud Console**: https://console.cloud.google.com/
2. **Selecciona tu proyecto** (o crea uno nuevo)
3. **Habilita Google Drive API**:
   - Ve a "APIs & Services" > "Library"
   - Busca "Google Drive API"
   - Haz clic en "Enable"

4. **Crea el Service Account**:
   - Ve a "APIs & Services" > "Credentials"
   - Haz clic en "Create Credentials" > "Service Account"
   - **Nombre**: `edutoolkit-drive` (o el que prefieras)
   - Haz clic en "Create and Continue"
   - **Rol**: Selecciona "Editor" o "Storage Admin"
   - Haz clic en "Continue" y luego "Done"

5. **Descarga la clave JSON**:
   - En la lista de Service Accounts, haz clic en el que acabas de crear
   - Ve a la pestaña "Keys"
   - Haz clic en "Add Key" > "Create new key"
   - Selecciona "JSON" y haz clic en "Create"
   - **Se descargará un archivo JSON** - ábrelo con un editor de texto

## Paso 2: Agregar JSON a .env.local

1. **Abre el archivo JSON descargado** (ej: `edutoolkit-certificados-xxxxx.json`)
2. **Copia TODO el contenido** del JSON
3. **Abre tu `.env.local`**
4. **Busca la línea**:
   ```
   # GOOGLE_DRIVE_SERVICE_ACCOUNT=...
   ```
5. **Reemplaza esa línea** con:
   ```
   GOOGLE_DRIVE_SERVICE_ACCOUNT=<pega aquí el JSON completo>
   ```

   **Importante**: El JSON debe estar en UNA SOLA LÍNEA, sin saltos de línea.

   **Ejemplo**:
   ```env
   GOOGLE_DRIVE_SERVICE_ACCOUNT={"type":"service_account","project_id":"mi-proyecto","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n","client_email":"edutoolkit-drive@mi-proyecto.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/edutoolkit-drive%40mi-proyecto.iam.gserviceaccount.com"}
   ```

## Paso 3: Obtener el Email del Service Account

Del JSON que copiaste, busca el campo `"client_email"`. Será algo como:
```
"client_email": "edutoolkit-drive@tu-proyecto.iam.gserviceaccount.com"
```

**Copia ese email** - lo necesitarás en el siguiente paso.

## Paso 4: Compartir la Carpeta con el Service Account

1. **Abre Google Drive** en tu navegador
2. **Ve a la carpeta** con ID: `1Agq6bFqlEqMFBb_NcqcC9-cfME2YMstD`
   - O busca la carpeta en tu Drive
3. **Haz clic derecho** en la carpeta → **"Compartir"**
4. **En el campo de búsqueda**, pega el email del Service Account (el `client_email` del JSON)
5. **Selecciona permisos**: **"Editor"** (necesario para subir archivos)
6. **Haz clic en "Enviar"**

## Paso 5: Verificar Configuración

1. **Reinicia el servidor**:
   ```bash
   npm run dev
   ```

2. **Verifica que las variables estén cargadas**:
   - El servidor debería iniciar sin errores
   - Si hay error sobre `GOOGLE_DRIVE_SERVICE_ACCOUNT`, verifica que el JSON esté correcto

3. **Prueba subir un PDF**:
   - Ve a un certificado en el panel
   - Haz clic en "Subir PDF"
   - Selecciona un archivo PDF
   - Si todo está bien, el archivo se subirá a la carpeta configurada

## Solución de Problemas

### Error: "GOOGLE_DRIVE_SERVICE_ACCOUNT no está configurado"
- Verifica que la variable esté en `.env.local` (sin el `#` al inicio)
- Asegúrate de que el JSON esté completo y en una sola línea

### Error: "Invalid credentials"
- Verifica que el JSON sea válido (puedes validarlo en https://jsonlint.com/)
- Asegúrate de que la API de Google Drive esté habilitada

### Error: "Permission denied" al subir
- Verifica que compartiste la carpeta con el email del Service Account
- Asegúrate de dar permisos de "Editor" (no solo "Lector")

### El archivo se sube pero no lo veo en Drive
- Los archivos se guardan en la carpeta compartida
- Verifica que estés viendo la carpeta correcta (`1Agq6bFqlEqMFBb_NcqcC9-cfME2YMstD`)
- Los archivos son propiedad del Service Account, pero deberías poder verlos si compartiste la carpeta

## Nota de Seguridad

⚠️ **NUNCA** subas el archivo JSON del Service Account a Git
- Ya está en `.gitignore`
- Usa variables de entorno en producción (Vercel, etc.)

