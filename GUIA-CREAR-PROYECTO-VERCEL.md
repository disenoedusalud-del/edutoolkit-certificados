# 🚀 Guía: Crear Nuevo Proyecto en Vercel

Esta guía te ayudará a crear un nuevo proyecto en Vercel y configurarlo correctamente desde cero.

---

## 📋 Paso 1: Preparar el Repositorio

### 1.1 Verificar que el código esté en Git

```bash
# Verificar estado
git status

# Si hay cambios sin commitear, haz commit
git add .
git commit -m "Preparar para deploy en Vercel"
git push
```

### 1.2 Verificar que el proyecto compile localmente

```bash
npm run build
```

Si hay errores, corrígelos antes de continuar.

---

## 🌐 Paso 2: Crear Proyecto en Vercel

### 2.1 Acceder a Vercel

1. Ve a [https://vercel.com](https://vercel.com)
2. Inicia sesión con tu cuenta (GitHub, GitLab, o Bitbucket)

### 2.2 Crear Nuevo Proyecto

1. Haz clic en **"Add New..."** → **"Project"**
2. Selecciona tu repositorio `edutoolkit-certificados`
3. Si no aparece, haz clic en **"Import Git Repository"** y conecta tu repositorio

### 2.3 Configurar el Proyecto

En la pantalla de configuración:

- **Framework Preset**: Debería detectar automáticamente "Next.js"
- **Root Directory**: Dejar vacío (o `./` si está en la raíz)
- **Build Command**: `npm run build` (debería estar prellenado)
- **Output Directory**: `.next` (debería estar prellenado)
- **Install Command**: `npm install` (debería estar prellenado)

### 2.4 NO hacer deploy todavía

**⚠️ IMPORTANTE**: NO hagas clic en "Deploy" todavía. Primero configuraremos las variables de entorno.

---

## 🔐 Paso 3: Configurar Variables de Entorno

### 3.1 Acceder a Environment Variables

1. En la pantalla de configuración del proyecto, haz clic en **"Environment Variables"**
2. O después de crear el proyecto, ve a **Settings** → **Environment Variables**

### 3.2 Agregar Variables (en este orden)

#### 🔥 Firebase Admin (PRIORITARIO - Usar Base64)

**Opción A: Base64 (RECOMENDADO)**

```
Nombre: FIREBASE_ADMIN_SA_BASE64
Valor: [Pega el base64 del Service Account JSON completo]
Entornos: Production, Preview, Development
```

**Cómo obtener el base64:**
1. Toma el JSON completo del Service Account de Firebase
2. Convierte a base64 (ya lo tienes en el portapapeles de la conversación anterior)
3. Pega el valor completo

**Opción B: Variables Individuales (Fallback)**

Si prefieres usar variables individuales:

```
Nombre: FIREBASE_ADMIN_PROJECT_ID
Valor: edusalud-platfor
Entornos: Production, Preview, Development

Nombre: FIREBASE_ADMIN_CLIENT_EMAIL
Valor: firebase-adminsdk-fbsvc@edusalud-platfor.iam.gserviceaccount.com
Entornos: Production, Preview, Development

Nombre: FIREBASE_ADMIN_PRIVATE_KEY
Valor: -----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCdPNf2jjq9y+FJ\n...\n-----END PRIVATE KEY-----\n
Entornos: Production, Preview, Development
```

**⚠️ Nota**: El `FIREBASE_ADMIN_PRIVATE_KEY` debe tener los `\n` literales (no saltos de línea reales).

---

#### 🌐 Firebase Client (NEXT_PUBLIC_*)

```
Nombre: NEXT_PUBLIC_FIREBASE_API_KEY
Valor: [Tu API Key de Firebase]
Entornos: Production, Preview, Development

Nombre: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
Valor: edusalud-platfor.firebaseapp.com
Entornos: Production, Preview, Development

Nombre: NEXT_PUBLIC_FIREBASE_PROJECT_ID
Valor: edusalud-platfor
Entornos: Production, Preview, Development

Nombre: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
Valor: edusalud-platfor.appspot.com
Entornos: Production, Preview, Development

Nombre: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
Valor: [Tu Sender ID]
Entornos: Production, Preview, Development

Nombre: NEXT_PUBLIC_FIREBASE_APP_ID
Valor: [Tu App ID]
Entornos: Production, Preview, Development

Nombre: NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
Valor: [Tu Measurement ID] (opcional)
Entornos: Production, Preview, Development
```

**Dónde obtener estos valores:**
- Firebase Console → Configuración del proyecto → Tus aplicaciones → Configuración

---

#### 👥 Autenticación y Roles

```
Nombre: MASTER_ADMIN_EMAILS
Valor: diseno.edusalud@gmail.com,otro-admin@example.com
Entornos: Production, Preview, Development
```

**Nota**: Emails separados por comas. Estos usuarios tendrán rol `MASTER_ADMIN` automáticamente.

```
Nombre: ALLOWED_ADMIN_EMAILS
Valor: editor1@example.com,editor2@example.com
Entornos: Production, Preview, Development
```

**Nota**: Emails separados por comas. Emails permitidos para registrarse como administradores.

---

#### 📧 EmailJS

```
Nombre: EMAILJS_SERVICE_ID
Valor: service_xxxxx
Entornos: Production, Preview, Development

Nombre: EMAILJS_TEMPLATE_ID
Valor: template_xxxxx
Entornos: Production, Preview, Development

Nombre: EMAILJS_PUBLIC_KEY
Valor: xxxxxxxxxxxxx
Entornos: Production, Preview, Development

Nombre: EMAILJS_PRIVATE_KEY
Valor: xxxxxxxxxxxxx
Entornos: Production, Preview, Development
```

**Dónde obtener estos valores:**
- [EmailJS Dashboard](https://dashboard.emailjs.com/) → Account → API Keys

---

#### 📁 Google Apps Script Drive

```
Nombre: APPS_SCRIPT_UPLOAD_URL
Valor: https://script.google.com/macros/s/AKfycbz7qnkZ07_2ywI2aq3aIuTbTDJnzLc7vaTE6a2Ke2SN89pdyiXdOdfLOmHOYEMnEk2JPw/exec
Entornos: Production, Preview, Development

Nombre: APPS_SCRIPT_UPLOAD_TOKEN
Valor: edutk_2025_9f3c1a7b2d4e6f8a0b1c3d5e7f9a1b2c
Entornos: Production, Preview, Development

Nombre: DRIVE_CERTIFICATES_FOLDER_ID
Valor: [ID de la carpeta principal en Google Drive]
Entornos: Production, Preview, Development
```

**Notas:**
- `APPS_SCRIPT_UPLOAD_URL`: URL del Web App de Apps Script desplegado
- `APPS_SCRIPT_UPLOAD_TOKEN`: Token configurado en Script Properties del Apps Script
- `DRIVE_CERTIFICATES_FOLDER_ID`: ID de la carpeta principal donde se organizarán los certificados

---

#### 🌍 App URL (Opcional pero Recomendado)

```
Nombre: NEXT_PUBLIC_APP_URL
Valor: https://tu-dominio.vercel.app
Entornos: Production, Preview, Development
```

**Nota**: Reemplaza `tu-dominio.vercel.app` con el dominio real que Vercel te asigne después del primer deploy.

---

## 🚀 Paso 4: Hacer el Primer Deploy

### 4.1 Deploy Inicial

1. Si estás en la pantalla de configuración, haz clic en **"Deploy"**
2. Si ya creaste el proyecto, ve a **Deployments** y haz clic en **"Redeploy"** (o haz un push a tu repositorio)

### 4.2 Monitorear el Build

1. Ve a la pestaña **"Build Logs"** para ver el progreso
2. Verifica que no haya errores relacionados con variables de entorno faltantes

### 4.3 Verificar Logs de Firebase Admin

En los logs del build, busca:

```
[FIREBASE-ADMIN] hasBase64: true
[FIREBASE-ADMIN] projectId ok: true
[FIREBASE-ADMIN] email ok: true
[FIREBASE-ADMIN] pk header ok: true len: XXXX
[FIREBASE-ADMIN] ✅ usando base64
```

Si ves `[FIREBASE-ADMIN] ⚠️ usando vars individuales`, significa que no está usando el base64 (verifica que `FIREBASE_ADMIN_SA_BASE64` esté configurada).

---

## ✅ Paso 5: Verificación Post-Deploy

### 5.1 Verificar que el Deploy fue Exitoso

1. Ve a **Deployments**
2. Verifica que el último deployment tenga estado **"Ready"** (verde)

### 5.2 Probar Endpoints Críticos

#### Probar Autenticación

```bash
# Reemplaza con tu URL de Vercel
curl -X POST https://tu-proyecto.vercel.app/api/auth/session \
  -H "Content-Type: application/json" \
  -d '{"idToken":"[token-de-firebase]"}'
```

#### Verificar que Firebase Admin se Inicializó Correctamente

Revisa los logs de runtime (no build) en Vercel:
- Ve a **Deployments** → Último deployment → **Functions** → Busca logs de `/api/*`
- Deberías ver logs de `[FIREBASE-ADMIN]` sin errores

### 5.3 Probar la Aplicación

1. Abre la URL de tu proyecto en el navegador
2. Intenta iniciar sesión
3. Verifica que puedas acceder al panel de administración

---

## 🐛 Troubleshooting

### Error: "FIREBASE_ADMIN_SA_BASE64 inválido"

**Causa**: El base64 está mal formateado o el JSON está corrupto.

**Solución**:
1. Verifica que el base64 no tenga espacios ni saltos de línea
2. Asegúrate de que el JSON completo esté codificado correctamente
3. Prueba regenerando el base64 desde el JSON original

### Error: "Private key inválida (formato PEM incorrecto o truncado)"

**Causa**: La clave privada no tiene el formato PEM correcto.

**Solución**:
1. Verifica que la clave privada tenga `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`
2. Asegúrate de que tenga al menos 1000 caracteres
3. Si usas variables individuales, verifica que los `\n` estén presentes

### Error: Build falla con errores de TypeScript

**Causa**: Errores de TypeScript en el código.

**Solución**:
1. Ejecuta `npm run build` localmente para ver los errores
2. Corrígelos antes de hacer push
3. El proyecto tiene `ignoreBuildErrors: true` en `next.config.ts`, pero es mejor corregir los errores

### Error: 401 en todos los endpoints

**Causa**: Problemas con autenticación o roles.

**Solución**:
1. Verifica que `MASTER_ADMIN_EMAILS` esté configurado
2. Verifica que el usuario esté autenticado correctamente
3. Revisa los logs de runtime en Vercel

### Error: "APPS_SCRIPT_UPLOAD_TOKEN no está configurado"

**Causa**: La variable de entorno no está configurada o tiene un valor incorrecto.

**Solución**:
1. Verifica que `APPS_SCRIPT_UPLOAD_TOKEN` esté en Environment Variables
2. Verifica que el token coincida con el configurado en Apps Script
3. Asegúrate de que esté marcada para Production

---

## 📝 Checklist Final

Antes de considerar el proyecto listo, verifica:

- [ ] Todas las variables de entorno están configuradas
- [ ] El build se completa sin errores
- [ ] Los logs muestran `[FIREBASE-ADMIN] ✅ usando base64`
- [ ] Puedes iniciar sesión en la aplicación
- [ ] Puedes acceder al panel de administración
- [ ] Los endpoints protegidos funcionan correctamente
- [ ] La subida de PDFs a Google Drive funciona

---

## 🔄 Actualizar Variables Después del Deploy

Si necesitas actualizar variables de entorno después del deploy:

1. Ve a **Settings** → **Environment Variables**
2. Edita o agrega la variable
3. Ve a **Deployments** → Último deployment → **Redeploy**
4. **Importante**: Desactiva "Use existing Build Cache" si cambiaste variables críticas (como Firebase Admin)

---

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs de build y runtime en Vercel
2. Verifica que todas las variables estén configuradas correctamente
3. Compara con la documentación en `VERCEL-ENV-VARS.md`
4. Revisa los logs de `[FIREBASE-ADMIN]` para diagnóstico

---

## 🎉 ¡Listo!

Una vez completados todos los pasos, tu proyecto debería estar funcionando correctamente en Vercel.

**Próximos pasos sugeridos:**
- Configurar un dominio personalizado (opcional)
- Configurar webhooks para CI/CD automático
- Revisar y optimizar el rendimiento

