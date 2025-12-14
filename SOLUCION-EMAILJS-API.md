# 🔧 Solución: "API calls are disabled for non-browser applications"

## ✅ Código Actualizado

El código ya está configurado para usar la **Private Key** (`f_CsgmjiK9TaIvBdTUbkZ`). 

## 🔑 Habilitar API Calls en EmailJS Dashboard

El error indica que necesitas habilitar las llamadas API desde aplicaciones backend en tu cuenta de EmailJS.

### Paso 1: Ve a EmailJS Dashboard

1. Abre https://www.emailjs.com/
2. Inicia sesión en tu cuenta

### Paso 2: Ve a Configuración de Seguridad

1. Haz clic en tu **perfil/avatar** en la esquina superior derecha
2. Selecciona **"Account"** o **"Settings"**
3. Busca la sección **"Security"** o **"API Settings"**

### Paso 3: Habilita API Calls para Backend

Busca una de estas opciones (puede variar según la versión del dashboard):

- ✅ **"Allow API calls from non-browser applications"**
- ✅ **"Enable server-side API"**
- ✅ **"Allow backend API calls"**
- ✅ **"Enable Node.js API"**

**Activa/Habilita** esta opción y **guarda los cambios**.

### Paso 4: Verifica Private Key

1. En la misma página, ve a **"API Keys"**
2. Verifica que tu **Private Key** sea: `f_CsgmjiK9TaIvBdTUbkZ`
3. Si no coincide, cópiala y actualiza `.env.local`

### Paso 5: Reinicia el Servidor

```bash
# Detén el servidor (Ctrl + C)
npm run dev
```

### Paso 6: Prueba de Nuevo

Intenta restablecer la contraseña de nuevo. Deberías ver en los logs:

```
[EMAIL] ✅ Email enviado exitosamente: { status: 200, ... }
```

## 📋 Verificación Rápida

Tu `.env.local` debe tener:

```env
EMAILJS_SERVICE_ID=service_ectemf7
EMAILJS_TEMPLATE_ID=template_wlqe0ws
EMAILJS_PRIVATE_KEY=f_CsgmjiK9TaIvBdTUbkZ
EMAILJS_PUBLIC_KEY=ZWBMGv7t-uBiUF2KB
```

## ❓ Si Aún No Funciona

1. **Verifica en EmailJS Dashboard → "Logs"**: ¿Ves intentos de envío?
2. **Verifica el límite**: ¿Has alcanzado el límite de 200 emails/mes (plan gratuito)?
3. **Verifica el servicio de email**: ¿Está conectado y activo (Gmail/Outlook)?

## 🔍 Logs Esperados (Éxito)

```
[RESET-PASSWORD] ⚡ Endpoint llamado
[RESET-PASSWORD] ✅ Rate limit OK
[RESET-PASSWORD] Generando link y enviando email a: dannyleitru@gmail.com
[EMAIL] Intentando enviar email: {
  serviceId: 'service_ectemf7',
  templateId: 'template_wlqe0ws',
  to: 'dannyleitru@gmail.com',
  hasPrivateKey: true,
  keyPreview: 'Private: f_CsgmjiK9...'
}
[EMAIL] ✅ Email enviado exitosamente: { status: 200, text: 'OK' }
```

