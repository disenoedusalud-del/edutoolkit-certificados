# 📧 Guía Completa: Configurar EmailJS para Restablecimiento de Contraseña

Esta guía te llevará paso a paso para configurar EmailJS y hacer que el restablecimiento de contraseña funcione.

---

## 📋 Paso 1: Crear cuenta en EmailJS

1. Ve a [https://www.emailjs.com/](https://www.emailjs.com/)
2. Haz clic en **"Sign Up"** (Registrarse)
3. Completa el formulario con tu email y contraseña
4. Verifica tu email si es necesario
5. Inicia sesión en tu cuenta

---

## 🔌 Paso 2: Conectar un Servicio de Email

1. En el dashboard de EmailJS, ve a **"Email Services"** (Servicios de Email) en el menú lateral
2. Haz clic en **"Add New Service"** (Agregar Nuevo Servicio)
3. Elige tu proveedor de email:
   - **Gmail** (recomendado para empezar)
   - **Outlook**
   - **Yahoo**
   - O cualquier otro que uses
4. Sigue las instrucciones para conectar tu cuenta:
   - Para Gmail: Necesitarás autorizar EmailJS a acceder a tu cuenta
   - Acepta los permisos necesarios
5. Una vez conectado, verás tu servicio listado
6. **Copia el Service ID** (aparece como `service_xxxxx`) - Lo necesitarás más tarde

---

## 📝 Paso 3: Crear la Plantilla de Email

1. En el dashboard de EmailJS, ve a **"Email Templates"** (Plantillas de Email) en el menú lateral
2. Haz clic en **"Create New Template"** (Crear Nueva Plantilla)
3. Configura lo siguiente:

   **a) Nombre de la plantilla:**
   - Ejemplo: `Password Reset - EduSalud`

   **b) Asunto del email:**
   ```
   Restablecer contraseña - Panel de Certificados EduSalud
   ```

   **c) Contenido HTML:**
   - Abre el archivo `email-template-password-reset.html` en tu proyecto
   - Copia **TODO** el contenido HTML (desde `<div style="font-family...` hasta `</div>`)
   - En EmailJS, asegúrate de estar en el modo **"HTML"** (no texto plano)
   - Pega el HTML completo en el editor

   **d) Variables de la plantilla:**
   - EmailJS detectará automáticamente las variables `{{reset_link}}` y `{{to_email}}`
   - No necesitas configurarlas manualmente, pero puedes verlas en la sección "Variables"

4. Haz clic en **"Save"** (Guardar)
5. **Copia el Template ID** (aparece como `template_xxxxx`) - Lo necesitarás más tarde

---

## 🔑 Paso 4: Obtener las API Keys

1. En el dashboard de EmailJS, ve a **"Account"** (Cuenta) en el menú superior
2. Ve a la sección **"General"** o **"API Keys"**
3. Verás dos tipos de keys:

   **a) Public Key:**
   - Se muestra directamente
   - Es menos segura para backend (pero funciona)

   **b) Private Key (recomendado):**
   - Si no la ves, ve a **"API Keys"** en el menú
   - Haz clic en **"Create Private Key"** si no tienes una
   - **Copia la Private Key** - Es más segura para usar en el backend

---

## ⚙️ Paso 5: Configurar Variables de Entorno

1. Abre el archivo `.env.local` en la raíz de tu proyecto
   - Si no existe, créalo

2. Agrega estas líneas al final del archivo:

```env
# EmailJS Configuration
EMAILJS_SERVICE_ID=service_xxxxx
EMAILJS_TEMPLATE_ID=template_xxxxx
EMAILJS_PRIVATE_KEY=tu_private_key_aqui
```

3. Reemplaza los valores con los que copiaste:
   - `service_xxxxx` → Tu Service ID del Paso 2
   - `template_xxxxx` → Tu Template ID del Paso 3
   - `tu_private_key_aqui` → Tu Private Key del Paso 4

**Ejemplo real:**
```env
EMAILJS_SERVICE_ID=service_gmail123
EMAILJS_TEMPLATE_ID=template_abc456
EMAILJS_PRIVATE_KEY=abcdefghijklmnopqrstuvwxyz123456
```

4. **Guarda el archivo** `.env.local`

---

## ✅ Paso 6: Verificar la Configuración

1. **Reinicia tu servidor de desarrollo:**
   ```bash
   # Detén el servidor (Ctrl + C)
   # Luego inicia de nuevo:
   npm run dev
   ```

2. **Prueba el restablecimiento de contraseña:**
   - Ve a `http://localhost:3000/forgot-password`
   - Ingresa un email autorizado
   - Haz clic en "Enviar enlace de restablecimiento"
   - Deberías recibir el email en unos segundos

---

## 🔍 Solución de Problemas

### ❌ Error: "EmailJS no está configurado"
- Verifica que todas las variables estén en `.env.local`
- Asegúrate de haber reiniciado el servidor después de agregar las variables
- Verifica que no haya espacios extra en los valores

### ❌ Error: "No se pudo enviar el email"
- Verifica que el Service ID y Template ID sean correctos
- Asegúrate de que el servicio de email esté conectado correctamente
- Revisa los logs en la consola del servidor para más detalles

### ❌ No recibo el email
- Revisa tu carpeta de spam
- Verifica que el email esté autorizado en tu sistema
- Asegúrate de que el servicio de email en EmailJS esté activo
- Revisa la configuración de tu proveedor de email (Gmail, Outlook, etc.)

### ❌ Las variables no se reemplazan
- Verifica que en la plantilla uses exactamente: `{{reset_link}}` y `{{to_email}}`
- Asegúrate de que el código en `src/lib/email.ts` envíe estas variables con estos nombres exactos

---

## 📝 Resumen de IDs Necesarios

Después de completar todos los pasos, deberías tener:

1. ✅ **Service ID**: `service_xxxxx` → En `.env.local` como `EMAILJS_SERVICE_ID`
2. ✅ **Template ID**: `template_xxxxx` → En `.env.local` como `EMAILJS_TEMPLATE_ID`
3. ✅ **Private Key**: `xxxxx...` → En `.env.local` como `EMAILJS_PRIVATE_KEY`

---

## 🎉 ¡Listo!

Una vez completados estos pasos, el sistema de restablecimiento de contraseña debería funcionar correctamente y enviar emails automáticamente.

Si tienes problemas, revisa los logs en la consola del servidor o en el dashboard de EmailJS para ver qué está pasando.


