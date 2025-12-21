# ✅ CHECKLIST DE DESPLIEGUE A PRODUCCIÓN
## Guía Rápida - EduToolkit Certificados

---

## 🎯 FASE 1: PREPARACIÓN (15 minutos)

### Cuentas Necesarias

- [ ] **Cuenta de Vercel** - [Crear aquí](https://vercel.com/signup)
- [ ] **Proyecto Firebase** - Ya lo tienes ✅ (`edusalud-platfor`)
- [ ] **Cuenta EmailJS** - [Crear aquí](https://www.emailjs.com/) (para recuperación de contraseña)
- [ ] **Google Cloud Project** - [Crear aquí](https://console.cloud.google.com/) (para Google Drive)

### Repositorio Git

- [ ] **Código subido a GitHub/GitLab/Bitbucket**
  ```bash
  git add .
  git commit -m "Ready for production"
  git push origin main
  ```

---

## 🔧 FASE 2: CONFIGURAR VARIABLES DE ENTORNO (10 minutos)

### Crea un archivo temporal con tus variables

Copia esto y completa los valores que faltan:

```env
# ========================================
# FIREBASE CLIENT (Públicas)
# ========================================
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDHwP2svgvAumaNg44gie5HxgARtct-ztk
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=edusalud-platfor.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=edusalud-platfor
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=edusalud-platfor.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=490035065280
NEXT_PUBLIC_FIREBASE_APP_ID=1:490035065280:web:162fef40d04ad2b5795825

# ========================================
# FIREBASE ADMIN (Privadas)
# ========================================
FIREBASE_ADMIN_PROJECT_ID=edusalud-platfor
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@edusalud-platfor.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCYTeXNuImQbSUv\n4bVnmMv3QFLX17nwpxMvNjXqRVA4jZVOw9aZswC6aFB/kchxNe0bQX5HDyd2ETd5\nMmyGjxbRy7jPneya6v7Eic7mWIfHo1EkkAcHB9l/liUuAPV0UBSUma8yUWKHrGz+\nZtbUP2zpfDwdew0rNbukj1w6iWpv/6s6ct5qRwJG1BKBCjeY0lqS+oTlvE6dzckb\nLa12B92eAZh75H/UnYi+xpBnkvVIXU3841XpXoYwenWdHfREW2na4f8fZ5nz9Obq\n7I8Uo7+9WNpJmwLkVyJHNNqLvMnlMsBEZxiYt8Hx1dQ7xuE+sewMRxUb5Q5OU1IC\n+gu8zy3HAgMBAAECggEARgvFfei6M9dOvAfFg4DNhchqkWRg2uIsO5FmGHmKXIgZ\nPCFriELAOfsR0qn8kryncNqdNhctIernJXFgYj5a02Arfij2kYU0aLWsl1nuEI33\nGqa25K/igwBN1yuPt8/At1s7LRwrAZT2h8ZKVVFaSMPfbfuS4eWTiCp6010xu5IX\nmQOaIY4ga0k0UDNOEm+M9GBIlGFMit2/WwP+NoOn792getQHV10xJwDZLnP+ZK1s\nrzlLLkM15MsOWCaz/dIim1pwmFe51dtwOOFkbv4DUb+Q0DOXl38IGD5BKHSMs9Kz\nOfmtZDFV69z/rcvl6NefAPSXiIkA/linwOiQcI+ksQKBgQDPUBlOgt5+F6qBk1zn\njmkN5wrO/cF1xgsJLWkDg2Nn0kfjNafD37qk5n+ODQ1sqZskAQdnoAx9fpkfT88D\n3ryQiK9+f45XLk4ViJGRf+OnPrQC6ScLPHGOrz0Xu4ALOqUFiBzWRvJvtRH4ltsw\nBecb8OJ7gN9JpnQNKuHy/ogbTwKBgQC8Ep2M+O2Q3rDCW04DpQUoqQEN86aeVrnw\nrtiWZES38lK9UFK2tnsLjvH65NGCMYSIX8ab4OqD0LqOFcClzae/EoE4R4OyWFj5\nn4/vknhom0sNe1b20p8x8UgWmnn49A+K2Anzylh6J5vQv7iSqizAdQ2J0t7jq7Sl\n60cuYihICQKBgQCSNe6zNY9PpMdHPbQ/R2wGNxWjaMphkrxDy7gNl0OrfF3g+/2H\nIqpTFJGPkNsP8QqOuP8M8Y79jyTVNYdONnANC6mh8Lpl+C1v+HKaCHV5hbqVdvRn\nc0ivlh3jOAUVZlXucdHMuhrP+AdlqJeL5g3Z4ekJq5lPK0sb4kubAjLh9wKBgFXp\nJwELgPHJV/MgZC20BvxA31NxNm5j7YItTJC+csmYLwV9mJsQFnr8LDtQpQeU+RaW\nsZHpFxdplJ5s/1h97h+RI2gC+vzP8Kzun4BvZwNZ1NnuupX7Nm9I6YYxwH/hdOwW\nrc0oZGxAhaPAwF520ASGM83+foR/ngCgzh45Bm+JAoGAEXH6uKwkwnJZf611Ufkl\n6avzvUKf/n05sixY47780HU27PtWkiojbI++ID6x66IB+4F0VNB35Rug+zgwkLKw\neHUy7B2dmTPjVwmr2FqtStpd90CvyHZ3422RItKEZVTQKHQ+Bxy5rovmt1rU7Gic\nw7itSSwB5NwE6cvAXk+LpyI=\n-----END PRIVATE KEY-----\n"

# ========================================
# EMAILJS (Recuperación de contraseña)
# ========================================
EMAILJS_SERVICE_ID=TU_SERVICE_ID_AQUI
EMAILJS_TEMPLATE_ID=TU_TEMPLATE_ID_AQUI
EMAILJS_PUBLIC_KEY=TU_PUBLIC_KEY_AQUI

# ========================================
# ROLES (Administradores)
# ========================================
MASTER_ADMIN_EMAILS=diseno.edusalud@gmail.com,diseno.edusalud@unah.edu.hn,

# ========================================
# GOOGLE DRIVE (Opcional - para PDFs)
# ========================================
# GOOGLE_DRIVE_CLIENT_EMAIL=tu-service-account@...iam.gserviceaccount.com
# GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# GOOGLE_DRIVE_FOLDER_ID=tu_folder_id
```

**Checklist:**
- [ ] Variables de Firebase completadas
- [ ] Email de MASTER_ADMIN configurado
- [ ] Variables de EmailJS completadas (o comentadas si no usarás)
- [ ] Variables de Google Drive completadas (o comentadas si no usarás)

---

## 🌐 FASE 3: DESPLEGAR EN VERCEL (5 minutos)

### Paso a Paso

1. **Ve a [Vercel Dashboard](https://vercel.com/dashboard)**
   - [ ] Iniciaste sesión

2. **Importa el proyecto**
   - [ ] Clic en "Add New Project"
   - [ ] Selecciona tu repositorio
   - [ ] Clic en "Import"

3. **Configura el proyecto**
   - [ ] Framework: Next.js (detectado automáticamente)
   - [ ] Root Directory: `.` (por defecto)
   - [ ] Build Command: `npm run build` (por defecto)

4. **Agrega variables de entorno**
   - [ ] Copia y pega TODAS las variables del archivo temporal
   - [ ] Verifica que cada variable tenga su valor correcto
   - [ ] Selecciona: Production, Preview, Development

5. **Despliega**
   - [ ] Clic en "Deploy"
   - [ ] Espera 2-3 minutos
   - [ ] ✅ Deployment exitoso

6. **Copia la URL de tu proyecto**
   - URL: `https://_____________________.vercel.app`

---

## 🗄️ FASE 4: CONFIGURAR VERCEL KV (5 minutos)

### Rate Limiting Distribuido

1. **En Vercel Dashboard**
   - [ ] Ve a "Storage"
   - [ ] Clic en "Create Database"
   - [ ] Selecciona "KV"

2. **Configura la base de datos**
   - [ ] Nombre: `edutoolkit-ratelimit`
   - [ ] Región: Selecciona la más cercana
   - [ ] Clic en "Create"

3. **Conecta al proyecto**
   - [ ] Clic en "Connect Project"
   - [ ] Selecciona tu proyecto
   - [ ] Clic en "Connect"

4. **Redespliega**
   - [ ] Ve a "Deployments"
   - [ ] Clic en "Redeploy" en el último deployment
   - [ ] Selecciona "Use existing Build Cache"
   - [ ] Clic en "Redeploy"

---

## 🔥 FASE 5: CONFIGURAR FIRESTORE (10 minutos)

### Desplegar Índices

**Opción A: Usando Firebase CLI (Recomendado)**

```bash
# 1. Instalar Firebase CLI (si no lo tienes)
npm install -g firebase-tools

# 2. Iniciar sesión
firebase login

# 3. Desplegar índices
npm run deploy:indexes
```

- [ ] Firebase CLI instalado
- [ ] Sesión iniciada
- [ ] Índices desplegados

**Opción B: Manualmente en Firebase Console**

- [ ] Ve a [Firebase Console](https://console.firebase.google.com/)
- [ ] Selecciona tu proyecto
- [ ] Ve a Firestore Database → Indexes
- [ ] Crea los 5 índices (ver `FIRESTORE-INDEXES.md`)
- [ ] Espera a que se construyan (puede tomar varios minutos)

---

## 📧 FASE 6: CONFIGURAR EMAILJS (10 minutos) - OPCIONAL

### Solo si quieres recuperación de contraseña

1. **Crear cuenta**
   - [ ] Ve a [EmailJS](https://www.emailjs.com/)
   - [ ] Crea cuenta gratuita

2. **Crear servicio**
   - [ ] Ve a "Email Services"
   - [ ] Conecta Gmail/Outlook
   - [ ] Copia el Service ID

3. **Crear plantilla**
   - [ ] Ve a "Email Templates"
   - [ ] Crea nueva plantilla
   - [ ] Subject: `Restablecer contraseña - Panel de Certificados EduSalud`
   - [ ] Copia el HTML de `email-template-password-reset.html`
   - [ ] Pégalo en el editor (modo HTML)
   - [ ] Copia el Template ID

4. **Obtener Public Key**
   - [ ] Ve a "Account" → "General"
   - [ ] Copia la Public Key

5. **Actualizar variables en Vercel**
   - [ ] Ve a Settings → Environment Variables
   - [ ] Agrega/actualiza:
     - `EMAILJS_SERVICE_ID`
     - `EMAILJS_TEMPLATE_ID`
     - `EMAILJS_PUBLIC_KEY`
   - [ ] Redespliega

---

## 🔗 FASE 7: CONFIGURAR GOOGLE DRIVE (15 minutos) - OPCIONAL

### Solo si quieres subir PDFs

1. **Crear proyecto en Google Cloud**
   - [ ] Ve a [Google Cloud Console](https://console.cloud.google.com/)
   - [ ] Crea nuevo proyecto: `edutoolkit-certificados`

2. **Habilitar API**
   - [ ] Ve a "APIs & Services" → "Library"
   - [ ] Busca "Google Drive API"
   - [ ] Haz clic en "Enable"

3. **Crear Service Account**
   - [ ] Ve a "APIs & Services" → "Credentials"
   - [ ] "Create Credentials" → "Service Account"
   - [ ] Nombre: `edutoolkit-drive`
   - [ ] Rol: "Editor"
   - [ ] Clic en "Done"

4. **Crear Key**
   - [ ] Clic en el service account
   - [ ] "Keys" → "Add Key" → "Create new key"
   - [ ] Formato: JSON
   - [ ] Descarga el archivo

5. **Crear carpeta en Drive**
   - [ ] Ve a [Google Drive](https://drive.google.com/)
   - [ ] Crea carpeta: "Certificados EduSalud"
   - [ ] Comparte con el email del service account (Editor)
   - [ ] Copia el ID de la carpeta (está en la URL)

6. **Actualizar variables en Vercel**
   - [ ] Agrega:
     - `GOOGLE_DRIVE_CLIENT_EMAIL` (del JSON)
     - `GOOGLE_DRIVE_PRIVATE_KEY` (del JSON, con `\n`)
     - `GOOGLE_DRIVE_FOLDER_ID` (de la URL)
   - [ ] Redespliega

---

## ✅ FASE 8: VERIFICAR DESPLIEGUE (10 minutos)

### Tests Críticos

1. **Health Check**
   ```
   https://tu-dominio.vercel.app/api/health
   ```
   - [ ] Retorna `"status": "healthy"`
   - [ ] Todos los servicios en "ok"

2. **Login**
   ```
   https://tu-dominio.vercel.app/login
   ```
   - [ ] Página carga correctamente
   - [ ] Puedes hacer login
   - [ ] Redirecciona a `/admin/certificados`

3. **Crear Certificado**
   - [ ] Clic en "Nuevo Certificado"
   - [ ] Completa el formulario
   - [ ] Se crea correctamente

4. **Importar Excel**
   - [ ] Clic en menú de importación
   - [ ] Sube un archivo Excel
   - [ ] Se importan los datos

5. **Exportar Excel**
   - [ ] Selecciona algunos certificados
   - [ ] Clic en "Exportar Seleccionados"
   - [ ] Se descarga el archivo

6. **Subir PDF** (si configuraste Google Drive)
   - [ ] Abre un certificado
   - [ ] Sube un PDF
   - [ ] Se sube correctamente

7. **Recuperar Contraseña** (si configuraste EmailJS)
   - [ ] Ve a "Olvidé mi contraseña"
   - [ ] Ingresa tu email
   - [ ] Recibes el email

8. **Rate Limiting**
   - [ ] Haz muchas requests rápidas
   - [ ] Eventualmente recibes error 429
   - [ ] Ve a `/admin/debug/rate-limit` y resetea

9. **Sistema de Temas**
   - [ ] Cambia entre tema claro/oscuro
   - [ ] Se guarda la preferencia

10. **Responsive**
    - [ ] Abre en móvil
    - [ ] Todo se ve bien

---

## 🎯 FASE 9: CREAR PRIMER USUARIO (5 minutos)

1. **Registrar MASTER_ADMIN**
   ```
   https://tu-dominio.vercel.app/register
   ```
   - [ ] Usa el email que pusiste en `MASTER_ADMIN_EMAILS`
   - [ ] Completa el registro
   - [ ] Haz login

2. **Verificar rol**
   ```
   https://tu-dominio.vercel.app/admin/roles
   ```
   - [ ] Ves tu usuario con rol MASTER_ADMIN
   - [ ] Puedes crear otros usuarios

3. **Crear usuarios adicionales**
   - [ ] Crea un ADMIN
   - [ ] Crea un EDITOR
   - [ ] Crea un VIEWER
   - [ ] Verifica que cada uno tenga los permisos correctos

---

## 📊 FASE 10: CONFIGURACIÓN FINAL (5 minutos)

### Dominio Personalizado (Opcional)

- [ ] Ve a Settings → Domains en Vercel
- [ ] Agrega tu dominio
- [ ] Configura DNS
- [ ] Espera propagación (24-48 horas)
- [ ] SSL se configura automáticamente

### Monitoreo

- [ ] Configura alertas en Vercel (Settings → Notifications)
- [ ] Revisa Analytics en Vercel Dashboard
- [ ] (Opcional) Configura Sentry para tracking de errores

### Backups

- [ ] Configura backups automáticos de Firestore
- [ ] Exporta datos regularmente

---

## 🎉 ¡LISTO PARA PRODUCCIÓN!

### Checklist Final

- [ ] ✅ Build exitoso en Vercel
- [ ] ✅ Variables de entorno configuradas
- [ ] ✅ Vercel KV conectado
- [ ] ✅ Índices de Firestore desplegados
- [ ] ✅ Health check retorna "healthy"
- [ ] ✅ Login funciona
- [ ] ✅ MASTER_ADMIN puede acceder a todo
- [ ] ✅ Crear/editar certificados funciona
- [ ] ✅ Importar/exportar funciona
- [ ] ✅ Rate limiting funciona
- [ ] ✅ No hay errores en logs
- [ ] ✅ SSL configurado (automático)

---

## 📞 ¿PROBLEMAS?

### Recursos de Ayuda

1. **Documentación del proyecto:**
   - `GUIA-DEPLOY-PRODUCCION.md` - Guía detallada
   - `API-DOCUMENTATION.md` - Documentación de API
   - `ROLES-Y-PERMISOS.md` - Sistema de roles
   - `FIRESTORE-INDEXES.md` - Índices de Firestore

2. **Endpoints de debug:**
   - `/api/health` - Estado de servicios
   - `/api/debug/my-ip` - Ver tu IP
   - `/admin/debug/rate-limit` - Debug de rate limiting

3. **Logs:**
   - Vercel Dashboard → Logs
   - Firebase Console → Logs

### Problemas Comunes

**Build falla:**
- Verifica variables de entorno
- Revisa logs de build en Vercel

**"Firebase Admin initialization failed":**
- Verifica formato de `FIREBASE_ADMIN_PRIVATE_KEY`
- Debe tener `\n` y estar entre comillas

**Rate limiting no funciona:**
- Verifica que Vercel KV esté conectado
- Redespliega el proyecto

**EmailJS no envía emails:**
- Verifica credenciales
- Verifica que el servicio esté activo

---

## 🚀 PRÓXIMOS PASOS

Después del lanzamiento:

1. **Importar datos existentes** (si los tienes)
2. **Capacitar usuarios** en el uso del sistema
3. **Configurar backups** regulares
4. **Monitorear uso** y rendimiento
5. **Implementar mejoras** según feedback

---

**¡Felicidades! Tu aplicación está en producción** 🎉

**URL de tu aplicación:** https://_____________________.vercel.app

**Fecha de despliegue:** ___/___/2025

**Tiempo total estimado:** ~90 minutos
