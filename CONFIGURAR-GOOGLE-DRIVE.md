# Configuración de Google Drive

## Requisitos Previos

1. **Cuenta de Google Cloud Platform**
2. **Proyecto en Google Cloud Console**
3. **Service Account creado**

## Pasos de Configuración

### 1. Habilitar Google Drive API

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto (o crea uno nuevo)
3. Ve a **"APIs & Services"** > **"Library"**
4. Busca **"Google Drive API"**
5. Haz clic en **"Enable"**

### 2. Crear Service Account

1. Ve a **"APIs & Services"** > **"Credentials"**
2. Haz clic en **"Create Credentials"** > **"Service Account"**
3. Completa el formulario:
   - **Service account name**: `edutoolkit-drive` (o el nombre que prefieras)
   - **Service account ID**: Se genera automáticamente
   - Haz clic en **"Create and Continue"**
4. En **"Grant this service account access to project"**:
   - Rol: **"Editor"** o **"Storage Admin"** (según tus necesidades)
   - Haz clic en **"Continue"** y luego **"Done"**

### 3. Crear y Descargar Clave JSON

1. En la lista de Service Accounts, haz clic en el que acabas de crear
2. Ve a la pestaña **"Keys"**
3. Haz clic en **"Add Key"** > **"Create new key"**
4. Selecciona **"JSON"** y haz clic en **"Create"**
5. Se descargará un archivo JSON (guárdalo de forma segura, no lo subas a Git)

### 4. Configurar Variables de Entorno

Abre tu archivo `.env.local` y agrega:

```env
# Google Drive Configuration
# Copia TODO el contenido del archivo JSON descargado (sin saltos de línea)
# Ejemplo:
GOOGLE_DRIVE_SERVICE_ACCOUNT={"type":"service_account","project_id":"tu-proyecto",...}

# Opcional: ID de carpeta en Drive donde se subirán los archivos
# Si no se especifica, los archivos se subirán a la raíz del Service Account
GOOGLE_DRIVE_FOLDER_ID=tu_folder_id_aqui
```

**Importante**: El valor de `GOOGLE_DRIVE_SERVICE_ACCOUNT` debe ser el JSON completo en una sola línea, o puedes usar comillas y saltos de línea escapados.

**Formato recomendado** (una sola línea):
```env
GOOGLE_DRIVE_SERVICE_ACCOUNT={"type":"service_account","project_id":"mi-proyecto","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

### 5. Compartir Carpeta (si usas GOOGLE_DRIVE_FOLDER_ID)

Si especificaste un `GOOGLE_DRIVE_FOLDER_ID`, necesitas compartir esa carpeta con el email del Service Account:

1. Abre Google Drive
2. Ve a la carpeta que quieres usar
3. Haz clic derecho > **"Compartir"**
4. En el campo de búsqueda, pega el **email del Service Account** (lo encuentras en el JSON: `client_email`)
5. Dale permisos de **"Editor"**
6. Haz clic en **"Enviar"**

### 6. Obtener Folder ID (opcional)

Si quieres usar una carpeta específica:

1. Abre Google Drive
2. Ve a la carpeta
3. La URL será algo como: `https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j`
4. El **Folder ID** es la parte después de `/folders/`: `1a2b3c4d5e6f7g8h9i0j`

## Verificación

1. Reinicia el servidor de desarrollo: `npm run dev`
2. Ve a un certificado en el panel
3. Haz clic en **"Subir PDF"**
4. Selecciona un archivo PDF
5. Si todo está configurado correctamente, el archivo se subirá a Drive y el `driveFileId` se actualizará automáticamente

## Solución de Problemas

### Error: "GOOGLE_DRIVE_SERVICE_ACCOUNT no está configurado"
- Verifica que la variable esté en `.env.local`
- Asegúrate de que el JSON esté completo y en una sola línea

### Error: "Invalid credentials"
- Verifica que el JSON del Service Account sea válido
- Asegúrate de que la API de Google Drive esté habilitada

### Error: "Permission denied" al subir
- Verifica que el Service Account tenga permisos en la carpeta (si usas `GOOGLE_DRIVE_FOLDER_ID`)
- Asegúrate de haber compartido la carpeta con el email del Service Account

### El archivo se sube pero no se puede ver
- Por defecto, los archivos son privados del Service Account
- Si necesitas que sean públicos, descomenta las líneas en `uploadCertificateToDrive()` que crean permisos públicos (no recomendado por seguridad)

## Seguridad

- **NUNCA** subas el archivo JSON del Service Account a Git
- Agrega `*.json` de Service Accounts a `.gitignore`
- Usa variables de entorno en producción (Vercel, etc.)
- Considera usar permisos limitados para el Service Account (solo la carpeta necesaria)

