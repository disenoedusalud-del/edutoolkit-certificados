# 🚀 GUÍA DE DESPLIEGUE A PRODUCCIÓN
## EduToolkit - Sistema de Gestión de Certificados

**Fecha:** 21 de diciembre de 2025  
**Versión:** 1.0

---

## 📋 CHECKLIST PRE-DESPLIEGUE

Antes de desplegar, verifica que tienes todo listo:

### ✅ Requisitos Previos

- [ ] Cuenta de Vercel creada
- [ ] Proyecto Firebase configurado
- [ ] Cuenta de EmailJS configurada
- [ ] Google Cloud Project con Drive API habilitado
- [ ] Repositorio Git configurado (GitHub, GitLab, etc.)

---

## 🔧 PASO 1: PREPARAR VARIABLES DE ENTORNO

### 1.1 Variables de Firebase Client

Estas son **públicas** y van con el prefijo `NEXT_PUBLIC_`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDHwP2svgvAumaNg44gie5HxgARtct-ztk
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=edusalud-platfor.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=edusalud-platfor
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=edusalud-platfor.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=490035065280
NEXT_PUBLIC_FIREBASE_APP_ID=1:490035065280:web:162fef40d04ad2b5795825
```

### 1.2 Variables de Firebase Admin

Estas son **privadas** y NO llevan el prefijo `NEXT_PUBLIC_`:

```env
FIREBASE_ADMIN_PROJECT_ID=edusalud-platfor
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@edusalud-platfor.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_PRIVATE_KEY_AQUI\n-----END PRIVATE KEY-----\n"
```

**⚠️ IMPORTANTE:** El `FIREBASE_ADMIN_PRIVATE_KEY` debe:
- Estar entre comillas dobles
- Tener `\n` para los saltos de línea (no saltos de línea reales)
- Incluir `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`

### 1.3 Variables de EmailJS

```env
EMAILJS_SERVICE_ID=tu_service_id
EMAILJS_TEMPLATE_ID=tu_template_id
EMAILJS_PUBLIC_KEY=tu_public_key
```

**Cómo obtenerlas:**
1. Ve a [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. **Service ID:** Email Services → Copia el ID del servicio
3. **Template ID:** Email Templates → Copia el ID de la plantilla
4. **Public Key:** Account → General → Copia la Public Key

### 1.4 Variables de Roles

```env
MASTER_ADMIN_EMAILS=tu-email@ejemplo.com,otro-admin@ejemplo.com
```

**Formato:**
- Emails separados por comas
- Sin espacios entre emails
- Estos usuarios tendrán acceso completo al sistema

### 1.5 Variables de Vercel KV (Automáticas)

Estas se configuran automáticamente cuando creas un Vercel KV:

```env
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
```

---

## 🌐 PASO 2: DESPLEGAR EN VERCEL

### 2.1 Conectar Repositorio

1. **Ve a [Vercel Dashboard](https://vercel.com/dashboard)**

2. **Haz clic en "Add New Project"**

3. **Importa tu repositorio Git:**
   - Conecta tu cuenta de GitHub/GitLab/Bitbucket
   - Selecciona el repositorio `edutoolkit-certificados`
   - Haz clic en "Import"

### 2.2 Configurar Proyecto

1. **Framework Preset:** Next.js (se detecta automáticamente)

2. **Root Directory:** `.` (raíz del proyecto)

3. **Build Command:** `npm run build` (por defecto)

4. **Output Directory:** `.next` (por defecto)

5. **Install Command:** `npm install` (por defecto)

6. **Node.js Version:** 20.x (especificado en `package.json`)

### 2.3 Agregar Variables de Entorno

En la sección "Environment Variables" de Vercel:

1. **Haz clic en "Add Environment Variable"**

2. **Agrega TODAS las variables una por una:**

   Para cada variable:
   - **Key:** Nombre de la variable (ej: `NEXT_PUBLIC_FIREBASE_API_KEY`)
   - **Value:** Valor de la variable
   - **Environment:** Selecciona `Production`, `Preview`, y `Development`

3. **Variables a agregar:**

   ```
   NEXT_PUBLIC_FIREBASE_API_KEY
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   NEXT_PUBLIC_FIREBASE_PROJECT_ID
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   NEXT_PUBLIC_FIREBASE_APP_ID
   FIREBASE_ADMIN_PROJECT_ID
   FIREBASE_ADMIN_CLIENT_EMAIL
   FIREBASE_ADMIN_PRIVATE_KEY
   EMAILJS_SERVICE_ID
   EMAILJS_TEMPLATE_ID
   EMAILJS_PUBLIC_KEY
   MASTER_ADMIN_EMAILS
   ```

4. **Haz clic en "Deploy"**

### 2.4 Esperar el Despliegue

- El primer despliegue toma ~2-3 minutos
- Vercel mostrará el progreso en tiempo real
- Al finalizar, verás "Deployment Ready"

---

## 🗄️ PASO 3: CONFIGURAR VERCEL KV (RATE LIMITING)

### 3.1 Crear Base de Datos KV

1. **En Vercel Dashboard, ve a "Storage"**

2. **Haz clic en "Create Database"**

3. **Selecciona "KV" (Key-Value Store)**

4. **Configura:**
   - **Database Name:** `edutoolkit-ratelimit` (o el nombre que prefieras)
   - **Region:** Selecciona la región más cercana a tus usuarios
   - **Haz clic en "Create"**

### 3.2 Conectar KV al Proyecto

1. **En la página de la base de datos KV:**
   - Haz clic en "Connect Project"
   - Selecciona tu proyecto `edutoolkit-certificados`
   - Haz clic en "Connect"

2. **Variables automáticas:**
   - Vercel agregará automáticamente `KV_REST_API_URL` y `KV_REST_API_TOKEN`
   - Estas variables se aplicarán en el próximo despliegue

### 3.3 Re-desplegar

1. **Ve a "Deployments"**
2. **Haz clic en "Redeploy"** para aplicar las variables de KV
3. **Selecciona "Use existing Build Cache"** y haz clic en "Redeploy"

---

## 🔥 PASO 4: CONFIGURAR FIRESTORE

### 4.1 Desplegar Índices de Firestore

Los índices mejoran el rendimiento de las consultas.

**Opción A: Usando Firebase CLI (Recomendado)**

1. **Instala Firebase CLI (si no lo tienes):**
   ```bash
   npm install -g firebase-tools
   ```

2. **Inicia sesión:**
   ```bash
   firebase login
   ```

3. **Inicializa el proyecto (si no lo has hecho):**
   ```bash
   firebase init firestore
   ```
   - Selecciona tu proyecto Firebase
   - Acepta los archivos por defecto

4. **Despliega los índices:**
   ```bash
   npm run deploy:indexes
   ```
   
   O directamente:
   ```bash
   firebase deploy --only firestore:indexes
   ```

**Opción B: Manualmente en Firebase Console**

1. **Ve a [Firebase Console](https://console.firebase.google.com/)**

2. **Selecciona tu proyecto**

3. **Ve a Firestore Database → Indexes**

4. **Crea estos índices:**

   **Índice 1: courses (status + name)**
   - Collection: `courses`
   - Fields:
     - `status` (Ascending)
     - `name` (Ascending)
   - Query scope: Collection

   **Índice 2: certificates (courseId)**
   - Collection: `certificates`
   - Fields:
     - `courseId` (Ascending)
   - Query scope: Collection

   **Índice 3: certificates (year + deliveryStatus)**
   - Collection: `certificates`
   - Fields:
     - `year` (Ascending)
     - `deliveryStatus` (Ascending)
   - Query scope: Collection

   **Índice 4: certificates (courseId + year)**
   - Collection: `certificates`
   - Fields:
     - `courseId` (Ascending)
     - `year` (Ascending)
   - Query scope: Collection

   **Índice 5: certificates (deliveryStatus + createdAt)**
   - Collection: `certificates`
   - Fields:
     - `deliveryStatus` (Ascending)
     - `createdAt` (Descending)
   - Query scope: Collection

5. **Espera a que se construyan** (puede tomar varios minutos)

### 4.2 Verificar Reglas de Seguridad (Opcional)

Si quieres agregar reglas de seguridad adicionales en Firestore:

1. **Ve a Firestore Database → Rules**

2. **Ejemplo de reglas básicas:**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Solo permitir acceso desde el servidor (Firebase Admin SDK)
       match /{document=**} {
         allow read, write: if false;
       }
     }
   }
   ```

   **Nota:** Como usas Firebase Admin SDK en el backend, las reglas pueden ser restrictivas.

---

## 📧 PASO 5: CONFIGURAR EMAILJS

### 5.1 Crear Cuenta y Servicio

1. **Ve a [EmailJS](https://www.emailjs.com/)**

2. **Crea una cuenta gratuita**

3. **Crea un servicio de email:**
   - Ve a "Email Services"
   - Haz clic en "Add New Service"
   - Selecciona tu proveedor (Gmail, Outlook, etc.)
   - Conecta tu cuenta
   - Copia el **Service ID**

### 5.2 Crear Plantilla de Email

1. **Ve a "Email Templates"**

2. **Haz clic en "Create New Template"**

3. **Configura la plantilla:**

   **Subject:**
   ```
   Restablecer contraseña - Panel de Certificados EduSalud
   ```

   **Content (HTML):**
   - Abre el archivo `email-template-password-reset.html` en tu proyecto
   - Copia TODO el contenido HTML
   - Pégalo en el editor de EmailJS (modo HTML)

4. **Variables que se usan:**
   - `{{reset_link}}` - El enlace de restablecimiento
   - `{{to_email}}` - El correo del destinatario

5. **Guarda y copia el Template ID**

### 5.3 Obtener Public Key

1. **Ve a "Account" → "General"**

2. **Copia tu Public Key**

### 5.4 Agregar Variables a Vercel

1. **Ve a tu proyecto en Vercel**

2. **Settings → Environment Variables**

3. **Agrega:**
   - `EMAILJS_SERVICE_ID`: El Service ID que copiaste
   - `EMAILJS_TEMPLATE_ID`: El Template ID que copiaste
   - `EMAILJS_PUBLIC_KEY`: La Public Key que copiaste

4. **Redespliega el proyecto**

---

## 🔗 PASO 6: CONFIGURAR GOOGLE DRIVE API

### 6.1 Crear Proyecto en Google Cloud

1. **Ve a [Google Cloud Console](https://console.cloud.google.com/)**

2. **Crea un nuevo proyecto:**
   - Haz clic en el selector de proyectos
   - "New Project"
   - Nombre: `edutoolkit-certificados`
   - Haz clic en "Create"

### 6.2 Habilitar Google Drive API

1. **Ve a "APIs & Services" → "Library"**

2. **Busca "Google Drive API"**

3. **Haz clic en "Enable"**

### 6.3 Crear Service Account

1. **Ve a "APIs & Services" → "Credentials"**

2. **Haz clic en "Create Credentials" → "Service Account"**

3. **Configura:**
   - **Service account name:** `edutoolkit-drive`
   - **Service account ID:** Se genera automáticamente
   - Haz clic en "Create and Continue"

4. **Rol:** Selecciona "Editor" (o "Owner" si necesitas más permisos)

5. **Haz clic en "Done"**

### 6.4 Crear Key para Service Account

1. **En la lista de Service Accounts:**
   - Haz clic en el service account que creaste
   - Ve a la pestaña "Keys"
   - "Add Key" → "Create new key"
   - Selecciona "JSON"
   - Haz clic en "Create"

2. **Se descargará un archivo JSON** con las credenciales

3. **Abre el archivo JSON** y copia:
   - `client_email` → Variable `GOOGLE_DRIVE_CLIENT_EMAIL`
   - `private_key` → Variable `GOOGLE_DRIVE_PRIVATE_KEY`

### 6.5 Crear Carpeta en Google Drive

1. **Ve a [Google Drive](https://drive.google.com/)**

2. **Crea una carpeta** para los certificados (ej: "Certificados EduSalud")

3. **Comparte la carpeta con el Service Account:**
   - Haz clic derecho en la carpeta → "Share"
   - Pega el email del service account (ej: `edutoolkit-drive@...iam.gserviceaccount.com`)
   - Rol: "Editor"
   - Haz clic en "Share"

4. **Copia el ID de la carpeta:**
   - Abre la carpeta
   - El ID está en la URL: `https://drive.google.com/drive/folders/[FOLDER_ID]`
   - Copia el `FOLDER_ID`

### 6.6 Agregar Variables a Vercel

1. **Ve a Vercel → Settings → Environment Variables**

2. **Agrega:**
   ```
   GOOGLE_DRIVE_CLIENT_EMAIL=edutoolkit-drive@...iam.gserviceaccount.com
   GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_DRIVE_FOLDER_ID=el_folder_id_que_copiaste
   ```

3. **Redespliega**

---

## ✅ PASO 7: VERIFICAR DESPLIEGUE

### 7.1 Health Check

1. **Abre tu navegador**

2. **Ve a:**
   ```
   https://tu-dominio.vercel.app/api/health
   ```

3. **Deberías ver:**
   ```json
   {
     "status": "healthy",
     "services": {
       "firebaseAuth": "ok",
       "firestore": "ok",
       "vercelKv": "ok"
     },
     "timestamp": "2025-12-21T..."
   }
   ```

### 7.2 Probar Login

1. **Ve a:**
   ```
   https://tu-dominio.vercel.app/login
   ```

2. **Intenta hacer login** con un usuario MASTER_ADMIN

3. **Verifica que puedas acceder** a `/admin/certificados`

### 7.3 Probar Funcionalidades Críticas

**Checklist de pruebas:**

- [ ] Login/Logout funciona
- [ ] Crear certificado funciona
- [ ] Editar certificado funciona
- [ ] Subir PDF funciona (si configuraste Google Drive)
- [ ] Importar Excel funciona
- [ ] Exportar Excel funciona
- [ ] Crear curso funciona
- [ ] Editar curso funciona
- [ ] Recuperar contraseña funciona (si configuraste EmailJS)
- [ ] Sistema de temas funciona
- [ ] Búsqueda y filtros funcionan
- [ ] Paginación funciona
- [ ] Rate limiting funciona (intenta hacer muchas requests)

### 7.4 Verificar Logs

1. **Ve a Vercel Dashboard → Tu Proyecto → Logs**

2. **Verifica que no haya errores críticos**

3. **Busca mensajes como:**
   - `✅ Usando Vercel KV para rate limiting distribuido`
   - `✅ Firebase Admin inicializado correctamente`

---

## 🔒 PASO 8: CONFIGURAR DOMINIO PERSONALIZADO (Opcional)

### 8.1 Agregar Dominio

1. **Ve a Vercel → Settings → Domains**

2. **Haz clic en "Add"**

3. **Ingresa tu dominio** (ej: `certificados.edusalud.com`)

4. **Sigue las instrucciones** para configurar DNS

### 8.2 Configurar DNS

Dependiendo de tu proveedor de dominio:

**Opción A: Usar Vercel Nameservers (Recomendado)**
- Cambia los nameservers de tu dominio a los de Vercel

**Opción B: Usar CNAME**
- Agrega un registro CNAME apuntando a `cname.vercel-dns.com`

### 8.3 Esperar Propagación

- La propagación DNS puede tomar 24-48 horas
- Vercel emitirá automáticamente un certificado SSL

---

## 📊 PASO 9: MONITOREO Y MANTENIMIENTO

### 9.1 Configurar Alertas en Vercel

1. **Ve a Settings → Notifications**

2. **Configura alertas para:**
   - Deployment failures
   - Build errors
   - High error rates

### 9.2 Revisar Analytics (Opcional)

1. **Ve a Analytics en Vercel Dashboard**

2. **Revisa:**
   - Número de requests
   - Tiempo de respuesta
   - Errores

### 9.3 Configurar Sentry (Opcional)

Para tracking de errores en producción:

1. **Crea cuenta en [Sentry](https://sentry.io/)**

2. **Crea un proyecto Next.js**

3. **Instala Sentry:**
   ```bash
   npm install @sentry/nextjs
   ```

4. **Configura Sentry:**
   ```bash
   npx @sentry/wizard@latest -i nextjs
   ```

5. **Agrega DSN a variables de entorno en Vercel**

---

## 🎯 PASO 10: CREAR PRIMER USUARIO MASTER_ADMIN

### 10.1 Verificar Variable de Entorno

1. **Asegúrate de que `MASTER_ADMIN_EMAILS` esté configurada en Vercel**

2. **Formato:**
   ```
   MASTER_ADMIN_EMAILS=tu-email@ejemplo.com
   ```

### 10.2 Registrar Usuario

1. **Ve a:**
   ```
   https://tu-dominio.vercel.app/register
   ```

2. **Registra un usuario con el email que pusiste en `MASTER_ADMIN_EMAILS`**

3. **Completa el registro**

### 10.3 Verificar Rol

1. **Haz login**

2. **Ve a `/admin/roles`**

3. **Deberías ver tu usuario con rol MASTER_ADMIN**

4. **Ahora puedes crear otros usuarios** con diferentes roles

---

## 📝 CHECKLIST FINAL

Antes de considerar el despliegue completo:

- [ ] Build exitoso en Vercel
- [ ] Variables de entorno configuradas
- [ ] Vercel KV conectado
- [ ] Índices de Firestore desplegados
- [ ] EmailJS configurado (opcional)
- [ ] Google Drive API configurada (opcional)
- [ ] Health check retorna "healthy"
- [ ] Login funciona
- [ ] MASTER_ADMIN puede acceder a todo
- [ ] Crear/editar certificados funciona
- [ ] Importar/exportar funciona
- [ ] Rate limiting funciona
- [ ] No hay errores en logs de Vercel
- [ ] SSL configurado (automático en Vercel)
- [ ] Dominio personalizado configurado (opcional)

---

## 🆘 TROUBLESHOOTING

### Problema: Build falla en Vercel

**Solución:**
1. Verifica que todas las variables de entorno estén configuradas
2. Revisa los logs de build en Vercel
3. Asegúrate de que `package.json` tenga todas las dependencias

### Problema: "Firebase Admin initialization failed"

**Solución:**
1. Verifica que `FIREBASE_ADMIN_PRIVATE_KEY` esté correctamente formateado
2. Debe tener `\n` para saltos de línea
3. Debe estar entre comillas dobles
4. Verifica que `FIREBASE_ADMIN_CLIENT_EMAIL` sea correcto

### Problema: Rate limiting no funciona

**Solución:**
1. Verifica que Vercel KV esté conectado
2. Revisa que `KV_REST_API_URL` y `KV_REST_API_TOKEN` estén configuradas
3. Redespliega el proyecto

### Problema: EmailJS no envía emails

**Solución:**
1. Verifica las credenciales de EmailJS
2. Asegúrate de que la plantilla esté configurada correctamente
3. Verifica que el servicio de email esté activo en EmailJS

### Problema: No puedo subir PDFs

**Solución:**
1. Verifica que Google Drive API esté habilitada
2. Verifica que el service account tenga acceso a la carpeta
3. Verifica que `GOOGLE_DRIVE_FOLDER_ID` sea correcto

---

## 📞 SOPORTE

Si tienes problemas:

1. **Revisa los logs en Vercel Dashboard**
2. **Usa el endpoint `/api/health` para verificar servicios**
3. **Revisa la documentación en los archivos `.md`**
4. **Usa las herramientas de debug en `/admin/debug/rate-limit`**

---

## 🎉 ¡FELICIDADES!

Si completaste todos los pasos, tu aplicación está **lista para producción**.

**Próximos pasos recomendados:**

1. Crear usuarios con diferentes roles
2. Importar certificados existentes (si los tienes)
3. Configurar backups de Firestore
4. Implementar CI/CD con GitHub Actions (opcional)
5. Configurar monitoreo con Sentry (opcional)

---

**Última actualización:** 21 de diciembre de 2025  
**Versión:** 1.0
