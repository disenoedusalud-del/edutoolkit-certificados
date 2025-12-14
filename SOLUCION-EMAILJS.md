# 🔧 Solución: EmailJS funciona en test pero no en la app

Si el test de EmailJS funciona pero tu aplicación no envía emails, sigue estos pasos:

## ✅ Verificaciones rápidas

### 1. Reinicia el servidor
```bash
# Detén el servidor (Ctrl + C)
npm run dev
```

### 2. Verifica las variables de entorno
Asegúrate de que en `.env.local` tengas:
```env
EMAILJS_SERVICE_ID=service_ectemf7
EMAILJS_TEMPLATE_ID=template_wlqe0ws
EMAILJS_PRIVATE_KEY=f_CsgmjiK9TaIvBdTUbkZ
```

### 3. Verifica los logs del servidor
Cuando intentes restablecer contraseña, busca en la consola:
- `[EMAIL] Intentando enviar email:` - Confirma que se intenta enviar
- `[EMAIL] ✅ Email enviado exitosamente:` - Confirma éxito
- `[EMAIL] ❌ Error detallado enviando email:` - Muestra el error

## 🔍 Problemas comunes y soluciones

### Problema 1: Variables no se cargan
**Síntoma**: Error "EmailJS no está configurado"

**Solución**:
1. Verifica que `.env.local` esté en la raíz del proyecto
2. Reinicia el servidor después de cambiar `.env.local`
3. Verifica que no haya espacios extra en los valores

### Problema 2: Variables de plantilla no coinciden
**Síntoma**: Email se envía pero las variables están vacías

**Solución**:
1. En EmailJS Dashboard → "Email Templates"
2. Verifica que las variables sean exactamente:
   - `{{to_email}}` (no `{{to_email }}` con espacios)
   - `{{reset_link}}` (no `{{reset_link }}` con espacios)
3. En el código (`src/lib/email.ts`), las variables deben ser:
   ```javascript
   {
     to_email: to,
     reset_link: resetLink,
   }
   ```

### Problema 3: Private Key incorrecta
**Síntoma**: Error "Invalid API key" o "Unauthorized"

**Solución**:
1. Ve a EmailJS Dashboard → "Account" → "API Keys"
2. Copia la **Private Key** completa (no la Public Key)
3. Asegúrate de que no tenga espacios al inicio o final
4. Actualiza `.env.local` y reinicia el servidor

### Problema 4: Service ID o Template ID incorrectos
**Síntoma**: Error "Invalid service ID" o "Invalid template ID"

**Solución**:
1. Ve a EmailJS Dashboard → "Email Services"
2. Copia el Service ID exacto (ej: `service_ectemf7`)
3. Ve a "Email Templates"
4. Copia el Template ID exacto (ej: `template_wlqe0ws`)
5. Verifica que coincidan exactamente en `.env.local`

### Problema 5: Servicio de email no conectado
**Síntoma**: Email se envía pero no llega

**Solución**:
1. Ve a EmailJS Dashboard → "Email Services"
2. Verifica que tu servicio (Gmail/Outlook) esté **conectado y activo**
3. Si está desconectado, reconéctalo
4. Prueba enviar un test desde EmailJS Dashboard

## 🧪 Probar con script de prueba

He creado un script de prueba (`test-emailjs.js`) que puedes ejecutar:

1. **Edita el script** y cambia el email de prueba:
   ```javascript
   to_email: 'tu-email-real@ejemplo.com', // Cambia esto
   ```

2. **Ejecuta el script**:
   ```bash
   node test-emailjs.js
   ```

3. **Revisa el resultado**:
   - Si funciona: El problema está en la aplicación
   - Si no funciona: El problema está en la configuración de EmailJS

## 📋 Checklist completo

- [ ] Variables de entorno configuradas correctamente
- [ ] Servidor reiniciado después de configurar variables
- [ ] Service ID correcto (sin espacios)
- [ ] Template ID correcto (sin espacios)
- [ ] Private Key correcta (completa, sin espacios)
- [ ] Variables de plantilla coinciden (`{{to_email}}`, `{{reset_link}}`)
- [ ] Servicio de email conectado en EmailJS
- [ ] Test desde EmailJS Dashboard funciona
- [ ] Logs del servidor muestran intentos de envío
- [ ] No hay errores en los logs del servidor

## 🆘 Si aún no funciona

1. **Comparte los logs del servidor** cuando intentas restablecer contraseña
2. **Verifica en EmailJS Dashboard** → "Logs" si hay intentos de envío
3. **Ejecuta el script de prueba** y comparte el resultado
4. **Verifica que el email esté autorizado** en tu sistema

## 💡 Tips adicionales

- **Límite de emails**: El plan gratuito tiene 200 emails/mes. Verifica en "Account" → "Usage"
- **Spam**: Aunque el email se envíe, puede ir a spam. Revisa la carpeta de spam
- **Dominio**: Si usas un dominio personalizado, verifica los registros SPF/DKIM
- **Gmail**: Si usas Gmail, asegúrate de que la cuenta esté activa y no tenga restricciones


