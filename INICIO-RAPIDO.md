# 🚀 INICIO RÁPIDO - EduToolkit Certificados

**Tiempo estimado:** ~90 minutos  
**Dificultad:** Media

---

## 📋 PASO 1: PREPARAR VARIABLES DE ENTORNO (15 min)

### Variables OBLIGATORIAS

```env
# ========================================
# FIREBASE CLIENT (Públicas)
# ========================================
NEXT_PUBLIC_FIREBASE_API_KEY=tu-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=tu-app-id

# ========================================
# FIREBASE ADMIN (Privadas)
# OPCIÓN 1: Base64 (Recomendado) ✅
# ========================================
FIREBASE_ADMIN_SA_BASE64=tu-service-account-en-base64

# OPCIÓN 2: Variables Individuales (Fallback)
# FIREBASE_ADMIN_PROJECT_ID=tu-proyecto-id
# FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxx@tu-proyecto.iam.gserviceaccount.com
# FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# ========================================
# ROLES (Administradores)
# ========================================
MASTER_ADMIN_EMAILS=admin1@ejemplo.com,admin2@ejemplo.com
```

### Variables OPCIONALES

```env
# ========================================
# EMAILJS (Recuperación de contraseña)
# ========================================
EMAILJS_SERVICE_ID=tu-service-id
EMAILJS_TEMPLATE_ID=tu-template-id
EMAILJS_PUBLIC_KEY=tu-public-key

# ========================================
# VERCEL KV (Rate Limiting Distribuido)
# Se configura automáticamente en Vercel
# ========================================
KV_REST_API_URL=... (automático)
KV_REST_API_TOKEN=... (automático)

# ========================================
# GOOGLE DRIVE (Subida de PDFs)
# ========================================
GOOGLE_DRIVE_CLIENT_EMAIL=tu-service-account@...iam.gserviceaccount.com
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_FOLDER_ID=tu-folder-id

# ========================================
# GOOGLE APPS SCRIPT (Alternativa a Drive)
# ========================================
APPS_SCRIPT_UPLOAD_URL=https://script.google.com/macros/s/.../exec
APPS_SCRIPT_UPLOAD_TOKEN=tu-token-secreto
DRIVE_CERTIFICATES_FOLDER_ID=tu-folder-id
```

**📝 Nota:** Para generar `FIREBASE_ADMIN_SA_BASE64`, ve a la sección "Generar Base64" más abajo.

---

## 🌐 PASO 2: DESPLEGAR EN VERCEL (10 min)

1. **Ve a [Vercel Dashboard](https://vercel.com/dashboard)**
   - Inicia sesión o crea cuenta

2. **Importa tu repositorio**
   - Clic en "Add New Project"
   - Selecciona tu repositorio de GitHub/GitLab/Bitbucket
   - Clic en "Import"

3. **Configura el proyecto**
   - Framework: Next.js (detectado automáticamente)
   - Root Directory: `.` (por defecto)
   - Build Command: `npm run build` (por defecto)

4. **Agrega variables de entorno**
   - En "Environment Variables", pega TODAS las variables del Paso 1
   - **IMPORTANTE:** Marca todas para Production, Preview y Development
   - Verifica que cada variable tenga su valor correcto

5. **Despliega**
   - Clic en "Deploy"
   - Espera 2-3 minutos
   - ✅ Deployment exitoso

6. **Copia tu URL**
   - URL: `https://tu-proyecto.vercel.app`

---

## 🗄️ PASO 3: CONFIGURAR VERCEL KV (5 min)

**Para rate limiting distribuido (recomendado):**

1. **En Vercel Dashboard**
   - Ve a "Storage"
   - Clic en "Create Database"
   - Selecciona "KV"

2. **Configura la base de datos**
   - Nombre: `edutoolkit-ratelimit` (o el que prefieras)
   - Región: Selecciona la más cercana
   - Clic en "Create"

3. **Conecta al proyecto**
   - Clic en "Connect Project"
   - Selecciona tu proyecto
   - Clic en "Connect"

4. **Redespliega**
   - Ve a "Deployments"
   - Clic en "Redeploy" en el último deployment
   - Espera a que termine

**✅ Listo:** Las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN` se configuran automáticamente.

---

## 🔥 PASO 4: DESPLEGAR ÍNDICES DE FIRESTORE (10 min)

### Opción A: Firebase CLI (Recomendado)

```bash
# 1. Instalar Firebase CLI (si no lo tienes)
npm install -g firebase-tools

# 2. Iniciar sesión
firebase login

# 3. Desplegar índices
npm run deploy:indexes
```

### Opción B: Manualmente en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Firestore Database** → **Indexes**
4. Crea los índices según `FIRESTORE-INDEXES.md`
5. Espera a que se construyan (puede tomar varios minutos)

**📚 Ver detalles:** `FIRESTORE-INDEXES.md`

---

## ✅ PASO 5: VERIFICAR DESPLIEGUE (10 min)

### 1. Health Check

```bash
curl https://tu-proyecto.vercel.app/api/health
```

**Debe retornar:**
```json
{
  "status": "healthy",
  "services": {
    "firebaseAuth": "ok",
    "firestore": "ok",
    "vercelKv": "ok"
  }
}
```

### 2. Login

- Ve a `https://tu-proyecto.vercel.app/login`
- Registra tu cuenta (usa un email de `MASTER_ADMIN_EMAILS`)
- Inicia sesión
- Debe redirigir a `/admin/certificados`

### 3. Crear Certificado

- Clic en "Nuevo Certificado"
- Completa el formulario
- Se crea correctamente ✅

### 4. Verificar Roles

- Ve a `/admin/roles`
- Tu usuario debe aparecer como `MASTER_ADMIN`
- Puedes crear otros usuarios

---

## 🔧 GENERAR FIREBASE_ADMIN_SA_BASE64

### Windows (PowerShell)

```powershell
# En la carpeta donde está tu service-account.json
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))
$b64 | Set-Clipboard
Write-Host "✅ Copiado al portapapeles. Largo:" $b64.Length
```

### Linux/Mac

```bash
# En la carpeta donde está tu service-account.json
base64 -i service-account.json | tr -d '\n' | pbcopy  # Mac
# o
base64 -w 0 service-account.json | xclip -selection clipboard  # Linux
```

**📝 Nota:** El valor debe quedar en una sola línea, sin espacios, sin comillas.

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### ❌ Build falla

**Causa:** Variables de entorno faltantes o incorrectas

**Solución:**
1. Verifica que TODAS las variables estén en Vercel
2. Revisa los logs de build en Vercel Dashboard
3. Verifica el formato de `FIREBASE_ADMIN_PRIVATE_KEY` (debe tener `\n`)

### ❌ "Firebase Admin initialization failed"

**Causa:** Formato incorrecto de `FIREBASE_ADMIN_SA_BASE64` o `FIREBASE_ADMIN_PRIVATE_KEY`

**Solución:**
- Si usas `FIREBASE_ADMIN_SA_BASE64`: Regenera el base64 (ver arriba)
- Si usas variables individuales: Verifica que `FIREBASE_ADMIN_PRIVATE_KEY` tenga `\n` y esté entre comillas:
  ```env
  FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_KEY_AQUI\n-----END PRIVATE KEY-----\n"
  ```

### ❌ Rate limiting no funciona

**Causa:** Vercel KV no está conectado

**Solución:**
1. Ve a Vercel → Storage
2. Verifica que KV esté creado y conectado
3. Redespliega el proyecto

### ❌ "Demasiadas solicitudes"

**Causa:** Rate limiting bloqueando tus intentos

**Solución:**
1. Si eres `MASTER_ADMIN`, ve a `/admin/debug/rate-limit`
2. Resetea tu IP o todas las IPs
3. O espera 15 minutos

### ❌ No puedo hacer login

**Causa:** Email no está en `MASTER_ADMIN_EMAILS` o no está autorizado

**Solución:**
1. Verifica que tu email esté en `MASTER_ADMIN_EMAILS` en Vercel
2. O que un `MASTER_ADMIN` te agregue en `/admin/roles`
3. Redespliega después de cambiar variables

---

## 📚 DOCUMENTACIÓN ADICIONAL

- **`CHECKLIST-DEPLOY.md`** - Checklist completo paso a paso
- **`GUIA-DEPLOY-PRODUCCION.md`** - Guía detallada de despliegue
- **`API-DOCUMENTATION.md`** - Documentación completa de API
- **`ROLES-Y-PERMISOS.md`** - Sistema de roles y permisos
- **`FIRESTORE-INDEXES.md`** - Índices de Firestore
- **`REPORTE-ESTADO-PROYECTO.md`** - Estado actual del proyecto
- **`MANUAL-RATE-LIMIT-DEBUG.md`** - Debug de rate limiting

---

## 🎯 CHECKLIST FINAL

Antes de considerar que está listo:

- [ ] ✅ Build exitoso en Vercel
- [ ] ✅ Health check retorna "healthy"
- [ ] ✅ Puedes hacer login
- [ ] ✅ Tu usuario es `MASTER_ADMIN`
- [ ] ✅ Puedes crear un certificado
- [ ] ✅ Puedes crear un curso
- [ ] ✅ Importar/Exportar funciona
- [ ] ✅ No hay errores en logs de Vercel
- [ ] ✅ Vercel KV está conectado
- [ ] ✅ Índices de Firestore están desplegados

---

## 🎉 ¡LISTO!

Tu aplicación está en producción. 🚀

**URL:** `https://tu-proyecto.vercel.app`

**Próximos pasos:**
1. Crear usuarios adicionales en `/admin/roles`
2. Importar datos existentes (si los tienes)
3. Configurar dominio personalizado (opcional)
4. Configurar EmailJS para recuperación de contraseña (opcional)
5. Configurar Google Drive para subir PDFs (opcional)

---

## 📞 ¿NECESITAS AYUDA?

1. Revisa la documentación en los archivos `.md`
2. Verifica el endpoint `/api/health`
3. Usa las herramientas de debug en `/admin/debug/rate-limit`
4. Revisa los logs en Vercel Dashboard

---

**Última actualización:** 2025-12-16  
**Versión del proyecto:** 0.1.0

