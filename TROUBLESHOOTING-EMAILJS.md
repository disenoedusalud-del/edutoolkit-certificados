# 🔍 Troubleshooting: EmailJS no envía correos

## Pasos para diagnosticar el problema

### 1️⃣ Verificar los logs del servidor

Cuando intentes restablecer la contraseña, revisa la **consola del servidor** (donde corre `npm run dev`). Deberías ver logs como:

```
[RESET-PASSWORD] Generando link y enviando email a: tu@email.com
[EMAIL] Intentando enviar email: { serviceId: '...', templateId: '...', ... }
```

**Si ves errores**, cópialos y compártelos.

### 2️⃣ Verificar configuración en EmailJS Dashboard

1. **Ve a tu dashboard de EmailJS**: https://www.emailjs.com/
2. **Verifica el servicio de email**:
   - Ve a "Email Services"
   - Asegúrate de que tu servicio (Gmail, Outlook, etc.) esté **conectado y activo**
   - Verifica que el Service ID coincida con el de tu `.env.local`

3. **Verifica la plantilla**:
   - Ve a "Email Templates"
   - Abre tu plantilla `template_wlqe0ws`
   - Verifica que las variables sean exactamente:
     - `{{to_email}}` (no `{{to_email}}` con espacios)
     - `{{reset_link}}` (no `{{reset_link}}` con espacios)
   - Asegúrate de que el **modo sea HTML** (no texto plano)

4. **Verifica las API Keys**:
   - Ve a "Account" → "API Keys"
   - Verifica que la Private Key coincida con la de tu `.env.local`

### 3️⃣ Verificar variables de entorno

Asegúrate de que en tu `.env.local` tengas:

```env
EMAILJS_SERVICE_ID=service_ectemf7
EMAILJS_TEMPLATE_ID=template_wlqe0ws
EMAILJS_PRIVATE_KEY=f_CsgmjiK9TaIvBdTUbkZ
```

**Importante**: Después de cambiar `.env.local`, **debes reiniciar el servidor**:
```bash
# Detén el servidor (Ctrl + C)
npm run dev
```

### 4️⃣ Probar el envío manualmente

Puedes probar enviar un email directamente desde EmailJS:

1. Ve a "Email Templates"
2. Abre tu plantilla
3. Haz clic en "Test" o "Send Test Email"
4. Ingresa un email de prueba
5. Verifica que llegue el email

Si el test funciona pero tu aplicación no, el problema está en la configuración del código.

### 5️⃣ Verificar límites de EmailJS

- **Plan gratuito**: 200 emails/mes
- Verifica en "Account" → "Usage" si has alcanzado el límite

### 6️⃣ Verificar el servicio de email conectado

Si usas **Gmail**:
- Asegúrate de que la cuenta de Gmail esté activa
- Verifica que no haya restricciones de seguridad
- Revisa la carpeta de spam de la cuenta de Gmail conectada

Si usas **Outlook** u otro:
- Verifica que la cuenta esté activa
- Revisa la configuración del servicio en EmailJS

### 7️⃣ Verificar logs detallados

Con los cambios que hice, ahora verás logs más detallados en la consola del servidor. Busca:

- `[EMAIL] Intentando enviar email:` - Confirma que se intenta enviar
- `[EMAIL] Email enviado exitosamente:` - Confirma que EmailJS aceptó el envío
- `[EMAIL] Error detallado enviando email:` - Muestra el error específico si falla

### 8️⃣ Problemas comunes

**Error: "EmailJS no está configurado"**
- Verifica que las 3 variables estén en `.env.local`
- Reinicia el servidor después de agregar las variables

**Error: "Invalid template ID" o "Invalid service ID"**
- Verifica que los IDs coincidan exactamente con los de EmailJS
- No debe haber espacios extra

**Error: "Invalid API key"**
- Verifica que la Private Key sea correcta
- Asegúrate de copiar la Private Key completa (no la Public Key)

**El email se envía pero no llega**:
- Revisa spam
- Verifica que el servicio de email esté conectado correctamente
- Prueba con otro email
- Verifica los logs de EmailJS en el dashboard

## 📋 Checklist de verificación

- [ ] Variables de entorno configuradas en `.env.local`
- [ ] Servidor reiniciado después de configurar variables
- [ ] Service ID correcto en EmailJS
- [ ] Template ID correcto en EmailJS
- [ ] Private Key correcta en EmailJS
- [ ] Servicio de email conectado y activo en EmailJS
- [ ] Plantilla tiene las variables `{{to_email}}` y `{{reset_link}}`
- [ ] Plantilla está en modo HTML
- [ ] No se ha alcanzado el límite de emails en EmailJS
- [ ] Logs del servidor muestran intentos de envío
- [ ] Email de prueba desde EmailJS funciona

## 🆘 Si nada funciona

1. **Comparte los logs del servidor** cuando intentas restablecer contraseña
2. **Verifica en EmailJS Dashboard** → "Logs" para ver si hay intentos de envío
3. **Prueba con otro servicio de email** (si usas Gmail, prueba con Outlook)
4. **Verifica que el email de destino esté autorizado** en tu sistema


