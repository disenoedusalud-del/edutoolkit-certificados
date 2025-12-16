# ✅ Checklist de Variables de Entorno para Vercel

Usa este checklist para verificar que tienes todas las variables configuradas.

---

## 🔥 Firebase Admin

- [x] **FIREBASE_ADMIN_SA_BASE64** ✅ (Ya la agregaste)

---

## 🌐 Firebase Client (7 variables - REQUERIDAS)

Estas variables son públicas (NEXT_PUBLIC_*) y se exponen al navegador.

- [ ] **NEXT_PUBLIC_FIREBASE_API_KEY**
  - Dónde obtener: Firebase Console → Configuración del proyecto → Tus aplicaciones → Configuración
  - Ejemplo: `AIzaSy...`

- [ ] **NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN**
  - Ejemplo: `edusalud-platfor.firebaseapp.com`

- [ ] **NEXT_PUBLIC_FIREBASE_PROJECT_ID**
  - Ejemplo: `edusalud-platfor`

- [ ] **NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET**
  - Ejemplo: `edusalud-platfor.appspot.com`

- [ ] **NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID**
  - Ejemplo: `123456789`

- [ ] **NEXT_PUBLIC_FIREBASE_APP_ID**
  - Ejemplo: `1:123456789:web:abc123`

- [ ] **NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID** (opcional pero recomendado)
  - Ejemplo: `G-XXXXXXXXXX`

**📝 Nota:** Todas estas variables están en Firebase Console → Configuración del proyecto → Tus aplicaciones → Configuración

---

## 👥 Autenticación y Roles (2 variables - REQUERIDAS)

- [ ] **MASTER_ADMIN_EMAILS**
  - Emails separados por comas que tendrán rol `MASTER_ADMIN` automáticamente
  - Ejemplo: `diseno.edusalud@gmail.com,otro-admin@example.com`

- [ ] **ALLOWED_ADMIN_EMAILS** (opcional pero recomendado)
  - Emails separados por comas que pueden registrarse como administradores
  - Ejemplo: `editor1@example.com,editor2@example.com`

---

## 📧 EmailJS (4 variables - REQUERIDAS)

Para el envío de emails (reset password, notificaciones, etc.)

- [ ] **EMAILJS_SERVICE_ID**
  - Ejemplo: `service_xxxxx`
  - Dónde obtener: [EmailJS Dashboard](https://dashboard.emailjs.com/) → Account → API Keys

- [ ] **EMAILJS_TEMPLATE_ID**
  - Ejemplo: `template_xxxxx`
  - Dónde obtener: EmailJS Dashboard → Email Services → Templates

- [ ] **EMAILJS_PUBLIC_KEY**
  - Ejemplo: `xxxxxxxxxxxxx`
  - Dónde obtener: EmailJS Dashboard → Account → API Keys

- [ ] **EMAILJS_PRIVATE_KEY**
  - Ejemplo: `xxxxxxxxxxxxx`
  - Dónde obtener: EmailJS Dashboard → Account → API Keys
  - ⚠️ **Importante:** Marca esta variable como solo para Production

---

## 📁 Google Apps Script Drive (3 variables - REQUERIDAS)

Para subir PDFs a Google Drive y crear carpetas

- [ ] **APPS_SCRIPT_UPLOAD_URL**
  - URL del Web App de Apps Script desplegado
  - Ejemplo: `https://script.google.com/macros/s/AKfycbz.../exec`
  - ⚠️ **Importante:** Debe terminar en `/exec`

- [ ] **APPS_SCRIPT_UPLOAD_TOKEN**
  - Token configurado en Script Properties del Apps Script (propiedad `UPLOAD_TOKEN`)
  - Ejemplo: `edutk_2025_9f3c1a7b2d4e6f8a0b1c3d5e7f9a1b2c`
  - ⚠️ **Importante:** Marca esta variable como solo para Production

- [ ] **DRIVE_CERTIFICATES_FOLDER_ID**
  - ID de la carpeta principal en Google Drive donde se organizarán los certificados
  - Ejemplo: `1ABC...xyz`
  - ⚠️ **Cómo obtener:** Abre la carpeta en Google Drive, el ID está en la URL: `https://drive.google.com/drive/folders/[ESTE_ES_EL_ID]`

---

## 🌍 App URL (1 variable - OPCIONAL pero RECOMENDADA)

- [ ] **NEXT_PUBLIC_APP_URL**
  - URL base de la aplicación para generar enlaces (reset password, etc.)
  - **Usa la URL principal del proyecto (sin hash):** `https://edutoolkit-certificados.vercel.app`
  - ⚠️ **No uses URLs de deployment específicos** (como `edutoolkit-certificados-58u2gek67-edusaluds-projects.vercel.app`)
  - ⚠️ **Nota:** Si no la configuras, se usará `VERCEL_URL` automáticamente (Vercel la proporciona)

---

## 📊 Resumen

| Categoría | Variables | Estado |
|-----------|-----------|--------|
| Firebase Admin | 1 | ✅ Completado |
| Firebase Client | 7 | ⏳ Pendiente |
| Autenticación | 2 | ⏳ Pendiente |
| EmailJS | 4 | ⏳ Pendiente |
| Apps Script Drive | 3 | ⏳ Pendiente |
| App URL | 1 | ⚠️ Opcional |
| **TOTAL** | **18** | **1/18 completado** |

---

## 🚀 Próximos Pasos

1. ✅ Ya tienes `FIREBASE_ADMIN_SA_BASE64` configurada
2. ⏳ Agrega las **7 variables de Firebase Client** (NEXT_PUBLIC_FIREBASE_*)
3. ⏳ Agrega **MASTER_ADMIN_EMAILS** con tu email
4. ⏳ Agrega las **4 variables de EmailJS**
5. ⏳ Agrega las **3 variables de Apps Script Drive**
6. ⏳ (Opcional) Agrega **NEXT_PUBLIC_APP_URL** después del primer deploy

---

## 💡 Consejos

- **Marca como Production:** Las variables sensibles (`EMAILJS_PRIVATE_KEY`, `APPS_SCRIPT_UPLOAD_TOKEN`) deben estar marcadas solo para Production
- **Después de agregar todas:** Haz un redeploy sin cache para asegurar que todas las variables se carguen correctamente
- **Verifica los logs:** Después del deploy, revisa los logs para verificar que no falten variables

---

## ❓ ¿Dónde obtener las credenciales?

- **Firebase Client:** Firebase Console → Configuración del proyecto → Tus aplicaciones → Configuración
- **EmailJS:** [EmailJS Dashboard](https://dashboard.emailjs.com/)
- **Apps Script:** Ya tienes la URL y el token de conversaciones anteriores
- **Drive Folder ID:** Abre la carpeta en Google Drive y copia el ID de la URL

