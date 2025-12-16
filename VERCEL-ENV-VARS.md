# Variables de Entorno para Vercel

Este documento lista todas las variables de entorno necesarias para el deploy en Vercel.

## 🔥 Firebase Admin (Requeridas)

Configuración del Service Account de Firebase Admin para autenticación y acceso a Firestore.

### Opción A: Base64 (RECOMENDADO) ⭐

**Usa esta opción para evitar problemas con formato de claves privadas:**

```
FIREBASE_ADMIN_SA_BASE64=[JSON completo del Service Account en base64]
```

**Cómo obtener el base64:**
1. Toma el JSON completo del Service Account de Firebase
2. Conviértelo a base64 (puedes usar herramientas online o comandos)
3. Pega el valor completo en Vercel

**Ventajas:**
- Evita problemas con saltos de línea y comillas
- Más fácil de configurar
- El código normaliza automáticamente el formato

### Opción B: Variables Individuales (Fallback)

Si prefieres usar variables individuales:

```
FIREBASE_ADMIN_PROJECT_ID=tu-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=tu-service-account@tu-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Nota:** El `FIREBASE_ADMIN_PRIVATE_KEY` debe incluir los `\n` literales (no saltos de línea reales). Copia el JSON completo del Service Account y extrae el `private_key` tal cual.

**⚠️ Importante:** El código intentará usar `FIREBASE_ADMIN_SA_BASE64` primero. Si no está configurada, usará las variables individuales como fallback.

---

## 🌐 Firebase Client (NEXT_PUBLIC_*) (Requeridas)

Configuración pública de Firebase para el cliente (navegador). Estas variables son expuestas al cliente.

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Nota:** Estas variables se pueden obtener desde Firebase Console → Configuración del proyecto → Tus aplicaciones → Configuración.

---

## 👥 Autenticación y Roles (Requeridas)

Emails de administradores maestros y administradores permitidos.

```
MASTER_ADMIN_EMAILS=admin1@example.com,admin2@example.com
ALLOWED_ADMIN_EMAILS=editor1@example.com,editor2@example.com
```

**Nota:** 
- `MASTER_ADMIN_EMAILS`: Emails separados por comas que tendrán rol `MASTER_ADMIN` automáticamente.
- `ALLOWED_ADMIN_EMAILS`: Emails separados por comas que pueden registrarse como administradores (si aplica).

---

## 📧 EmailJS (Requeridas)

Configuración de EmailJS para envío de emails (reset password, notificaciones, etc.).

```
EMAILJS_SERVICE_ID=service_xxxxx
EMAILJS_TEMPLATE_ID=template_xxxxx
EMAILJS_PUBLIC_KEY=xxxxxxxxxxxxx
EMAILJS_PRIVATE_KEY=xxxxxxxxxxxxx
```

**Nota:** Obtén estas credenciales desde [EmailJS Dashboard](https://dashboard.emailjs.com/).

---

## 📁 Google Apps Script Drive (Requeridas)

Configuración para subir PDFs a Google Drive mediante Apps Script Web App.

```
APPS_SCRIPT_UPLOAD_URL=https://script.google.com/macros/s/AKfycbz.../exec
APPS_SCRIPT_UPLOAD_TOKEN=tu_token_secreto
DRIVE_CERTIFICATES_FOLDER_ID=1ABC...xyz
```

**Nota:**
- `APPS_SCRIPT_UPLOAD_URL`: URL del Web App de Apps Script desplegado.
- `APPS_SCRIPT_UPLOAD_TOKEN`: Token configurado en Script Properties del Apps Script (propiedad `UPLOAD_TOKEN`).
- `DRIVE_CERTIFICATES_FOLDER_ID`: ID de la carpeta principal en Google Drive donde se organizarán los certificados por año y curso.

---

## 🌍 App URL (Opcional)

URL base de la aplicación para generar enlaces (reset password, etc.).

```
NEXT_PUBLIC_APP_URL=https://tu-dominio.vercel.app
```

**Nota:** 
- Si no se configura, se usará `VERCEL_URL` automáticamente (si está disponible).
- Si tampoco está `VERCEL_URL`, se usará un fallback local.
- **Recomendado:** Configurar con tu dominio personalizado si lo tienes.

---

## 📋 Checklist de Configuración en Vercel

### Paso 1: Agregar Variables de Entorno

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings** → **Environment Variables**
4. Agrega cada variable de la lista anterior

### Paso 2: Verificar Variables Sensibles

Asegúrate de que estas variables estén marcadas como **solo para Production** (o Production + Preview según necesites):
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `EMAILJS_PRIVATE_KEY`
- `APPS_SCRIPT_UPLOAD_TOKEN`

### Paso 3: Build y Deploy

1. Haz commit y push de tus cambios
2. Vercel detectará automáticamente el push y hará build
3. Revisa los logs del build para verificar que no falten variables

### Paso 4: Verificación Post-Deploy

Después del deploy, verifica:

1. **Autenticación:**
   - POST `/api/auth/session` crea session cookie OK
   - GET `/api/auth/me` lee session cookie OK

2. **Endpoints protegidos:**
   - Sin sesión: `/api/certificates/*` y `/api/courses/*` devuelven 401
   - Con rol VIEWER: puede GET pero no POST/PUT/DELETE
   - Con rol EDITOR: puede GET/POST/PUT pero no DELETE
   - Con MASTER_ADMIN: puede todo

3. **Apps Script Drive:**
   - Subida de PDFs funciona correctamente
   - Se crean carpetas por año y curso

---

## 🔒 Seguridad de Cookies en Producción

Las cookies de sesión se configuran automáticamente con:

- `secure: true` (solo HTTPS en producción)
- `httpOnly: true` (no accesible desde JavaScript)
- `sameSite: "lax"` (protección CSRF)
- `path: "/"` (disponible en toda la app)
- `maxAge: 7 días` (604800 segundos)

---

## 🐛 Troubleshooting

### Error: "FIREBASE_ADMIN_SA_BASE64 inválido" o "FIREBASE_ADMIN_PRIVATE_KEY no está configurado"

**Si usas FIREBASE_ADMIN_SA_BASE64:**
- Verifica que el base64 esté completo y bien formateado
- Asegúrate de que el JSON original sea válido
- Revisa los logs para ver qué campo específico falta

**Si usas variables individuales:**
- Verifica que el `FIREBASE_ADMIN_PRIVATE_KEY` tenga los `\n` literales (no saltos de línea reales).
- Copia el valor exacto del JSON del Service Account.
- Verifica que `FIREBASE_ADMIN_PROJECT_ID` y `FIREBASE_ADMIN_CLIENT_EMAIL` estén configurados.

### Error: "APPS_SCRIPT_UPLOAD_TOKEN no está configurado"

- Verifica que el token esté configurado en Apps Script (Script Properties → `UPLOAD_TOKEN`).
- Verifica que la URL del Web App sea correcta y esté desplegada.

### Error: "La carpeta con ID ... no existe o no está compartida"

- Verifica que `DRIVE_CERTIFICATES_FOLDER_ID` sea el ID correcto de la carpeta.
- Asegúrate de que la carpeta esté compartida con el usuario que ejecuta el Apps Script.

### Error 401 en todos los endpoints

- Verifica que `MASTER_ADMIN_EMAILS` esté configurado correctamente.
- Verifica que el usuario esté autenticado y tenga un rol asignado en Firestore (`adminUsers` collection).

---

## 📝 Notas Adicionales

- **Variables NEXT_PUBLIC_***: Estas variables son expuestas al cliente (navegador). No incluyas secretos aquí.
- **Variables sin NEXT_PUBLIC_***: Estas variables solo están disponibles en el servidor (API routes, Server Components).
- **VERCEL_URL**: Vercel proporciona automáticamente esta variable en runtime. No necesitas configurarla manualmente.

---

## ✅ Resumen de Variables por Categoría

| Categoría | Variables | Requeridas |
|-----------|-----------|------------|
| Firebase Admin | `FIREBASE_ADMIN_SA_BASE64` (recomendado) **O** `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` | ✅ Sí (una opción) |
| Firebase Client | `NEXT_PUBLIC_FIREBASE_*` (7 variables) | ✅ Sí |
| Autenticación | `MASTER_ADMIN_EMAILS`, `ALLOWED_ADMIN_EMAILS` | ✅ Sí |
| EmailJS | `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY` | ✅ Sí |
| Apps Script Drive | `APPS_SCRIPT_UPLOAD_URL`, `APPS_SCRIPT_UPLOAD_TOKEN`, `DRIVE_CERTIFICATES_FOLDER_ID` | ✅ Sí |
| App URL | `NEXT_PUBLIC_APP_URL` | ⚠️ Opcional |

**Total: ~18 variables de entorno**

