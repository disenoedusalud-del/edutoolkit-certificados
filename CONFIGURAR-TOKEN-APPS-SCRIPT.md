# 🔑 Configurar Token en Apps Script

## ⚠️ IMPORTANTE

El token debe estar configurado en **DOS lugares**:

1. ✅ En tu archivo `.env.local` (ya lo tienes)
2. ❌ En el código de Apps Script (necesitas hacerlo)

## 📋 Pasos Rápidos

### Paso 1: Obtener el token de .env.local

1. Abre el archivo `.env.local` en la raíz del proyecto
2. Busca la línea que dice:
   ```
   APPS_SCRIPT_UPLOAD_TOKEN=tu_token_aqui
   ```
3. **Copia el valor** después del `=` (sin espacios)

### Paso 2: Pegar el token en Apps Script

1. Ve a tu proyecto de Google Apps Script
2. Abre el archivo `Codigo.gs`
3. Busca la línea 207 que dice:
   ```javascript
   var expectedToken = "TU_TOKEN_SECRETO";
   ```
4. **Reemplaza** `"TU_TOKEN_SECRETO"` con tu token real
5. Debe quedar así:
   ```javascript
   var expectedToken = "tu_token_aqui";
   ```
6. **Guarda** el archivo (Ctrl+S o Cmd+S)
7. **Despliega** de nuevo si es necesario

## ✅ Verificar que Funciona

Después de configurar el token:

1. Elimina un curso de prueba
2. Revisa los logs en Apps Script (Ver → Registros de ejecución)
3. Deberías ver: `✅ Token válido, continuando con la acción...`
4. La carpeta debería eliminarse en Drive

## 🔍 Si No Funciona

1. Verifica que el token en Apps Script sea **exactamente igual** al de `.env.local`
2. No debe tener espacios extra al inicio o final
3. Debe estar entre comillas dobles: `"tu_token"`
4. Reinicia el servidor de Next.js después de cambiar `.env.local`

## 📝 Ejemplo

**En .env.local:**
```env
APPS_SCRIPT_UPLOAD_TOKEN=abc123xyz789
```

**En Codigo.gs (línea 207):**
```javascript
var expectedToken = "abc123xyz789";
```

¡Listo! 🎉

