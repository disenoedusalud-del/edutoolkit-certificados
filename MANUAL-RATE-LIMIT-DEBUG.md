# Manual Completo: Página de Debug de Rate Limit

## 📋 Índice

1. [¿Qué es Rate Limiting?](#qué-es-rate-limiting)
2. [¿Qué es esta página?](#qué-es-esta-página)
3. [¿Cuándo usar esta página?](#cuándo-usar-esta-página)
4. [Cómo acceder](#cómo-acceder)
5. [Funcionalidades de la página](#funcionalidades-de-la-página)
6. [Cómo funciona técnicamente](#cómo-funciona-técnicamente)
7. [Cómo probar que funciona](#cómo-probar-que-funciona)
8. [Casos de uso reales](#casos-de-uso-reales)
9. [Limitaciones y consideraciones](#limitaciones-y-consideraciones)
10. [Solución de problemas](#solución-de-problemas)

---

## ¿Qué es Rate Limiting?

**Rate Limiting** es un mecanismo de seguridad que limita la cantidad de solicitudes (requests) que un usuario puede hacer en un período de tiempo determinado.

### Ejemplo práctico:
- **Sin rate limiting**: Un atacante podría intentar hacer login 10,000 veces por segundo
- **Con rate limiting**: Solo permite 20 intentos de login cada 15 minutos

### ¿Por qué es importante?
- **Previene ataques**: Evita fuerza bruta, DDoS, scraping masivo
- **Protege recursos**: Evita sobrecarga del servidor
- **Ahorra costos**: Reduce el uso innecesario de recursos

---

## ¿Qué es esta página?

La página de **Debug de Rate Limit** (`/admin/debug/rate-limit`) es una herramienta administrativa que permite a los **MASTER_ADMIN** resetear manualmente los bloqueos de rate limiting cuando un usuario (incluido tú mismo) se queda bloqueado por error o por exceder los límites.

### Características principales:
- ✅ Solo accesible para **MASTER_ADMIN**
- ✅ Muestra tu IP actual automáticamente
- ✅ Permite resetear tu propia IP
- ✅ Permite resetear cualquier IP específica
- ✅ Permite resetear todos los rate limits (emergencias)

---

## ¿Cuándo usar esta página?

### ✅ Casos en los que SÍ debes usarla:

1. **Te quedaste bloqueado tú mismo**
   - Intentaste hacer login muchas veces
   - Hiciste demasiadas solicitudes a la API
   - Necesitas desbloquearte rápidamente

2. **Un usuario legítimo se quedó bloqueado**
   - Un usuario reporta que no puede acceder
   - Sabes su IP y necesitas desbloquearlo

3. **Emergencia general**
   - Muchos usuarios bloqueados por error
   - Problema masivo con rate limiting

### ❌ Casos en los que NO debes usarla:

1. **Bloqueos legítimos por seguridad**
   - Si alguien está intentando hacer fuerza bruta, NO lo desbloquees
   - Si hay un ataque activo, NO resetees todos los rate limits

2. **Problemas de red o servidor**
   - Si el problema no es rate limiting, esta página no ayudará

---

## Cómo acceder

### Paso 1: Asegúrate de ser MASTER_ADMIN
- Debes tener el rol `MASTER_ADMIN` en el sistema
- Si no lo tienes, contacta al administrador

### Paso 2: Inicia sesión
- Ve a `/login` e inicia sesión con tu cuenta de MASTER_ADMIN

### Paso 3: Accede a la página
Tienes **dos formas** de acceder:

**Opción A: Desde el botón en la página principal**
1. Ve a `/admin/certificados`
2. Busca el botón naranja **"Debug Rate Limit"** en la parte superior
3. Haz clic en él

**Opción B: Directamente por URL**
- Ve a: `https://tu-dominio.com/admin/debug/rate-limit`

### Paso 4: Verificación automática
- La página verificará automáticamente que seas MASTER_ADMIN
- Si no lo eres, te redirigirá a la página de certificados

---

## Funcionalidades de la página

### 1. **Visualización de tu IP actual**

**Ubicación**: Parte superior de la página, en un recuadro azul

**Qué muestra**:
- Tu IP actual detectada por el servidor
- Ejemplo: `192.168.1.100` o `2001:db8::1`

**Funciones disponibles**:
- **Botón "Copiar"**: Copia tu IP al portapapeles con un clic
- Útil para compartir tu IP o usarla en otras herramientas

**Cómo funciona**:
- Al cargar la página, se hace una petición a `/api/debug/my-ip`
- El servidor detecta tu IP desde los headers HTTP (`x-forwarded-for`, `x-real-ip`, etc.)
- Se muestra en la interfaz

---

### 2. **Resetear mi IP actual**

**Ubicación**: Primera sección, botón azul con icono de flecha circular

**Qué hace**:
- Resetea el rate limit **solo para tu IP actual**
- Te desbloquea inmediatamente si te quedaste bloqueado

**Cuándo usarlo**:
- Te quedaste bloqueado haciendo muchas solicitudes
- Necesitas continuar trabajando sin esperar

**Cómo funciona**:
1. Haces clic en "Resetear mi IP"
2. Se envía un POST a `/api/debug/reset-rate-limit` sin especificar IP
3. El servidor detecta tu IP automáticamente
4. Elimina tu entrada del mapa de rate limits
5. Puedes continuar haciendo solicitudes normalmente

**Ejemplo de uso**:
```
1. Intentas hacer login 25 veces (límite es 20)
2. Te bloquean por 15 minutos
3. Vas a /admin/debug/rate-limit
4. Haces clic en "Resetear mi IP"
5. Puedes intentar login de nuevo inmediatamente
```

---

### 3. **Resetear IP específica**

**Ubicación**: Segunda sección, con campo de texto y botón

**Qué hace**:
- Resetea el rate limit para una IP que tú especifiques
- Útil para desbloquear a otros usuarios

**Cuándo usarlo**:
- Un usuario te reporta que está bloqueado
- Conoces la IP del usuario bloqueado
- Necesitas desbloquear a alguien específico

**Cómo funciona**:
1. Ingresas la IP en el campo de texto (ej: `192.168.1.50`)
2. Haces clic en "Resetear"
3. Se envía un POST con `{ ip: "192.168.1.50" }`
4. El servidor elimina esa IP del mapa de rate limits

**Atajos útiles**:
- **"Usar mi IP actual"**: Un enlace debajo del campo que llena automáticamente tu IP
- Útil si quieres resetear tu IP pero prefieres usar esta opción

**Ejemplo de uso**:
```
1. Usuario reporta: "No puedo hacer login, me dice que hay demasiadas solicitudes"
2. Le preguntas su IP o la obtienes de los logs
3. Vas a /admin/debug/rate-limit
4. Ingresas su IP: 192.168.1.50
5. Haces clic en "Resetear"
6. El usuario puede intentar login de nuevo
```

---

### 4. **Resetear TODOS los rate limits**

**Ubicación**: Tercera sección, recuadro rojo con advertencia

**Qué hace**:
- **BORRA TODOS** los rate limits de **TODAS** las IPs
- Resetea completamente el sistema de rate limiting

**Cuándo usarlo**:
- ⚠️ **SOLO EN EMERGENCIAS**
- Muchos usuarios bloqueados por error
- Problema masivo con el sistema de rate limiting
- Después de un incidente de seguridad resuelto

**Cómo funciona**:
1. Haces clic en "Resetear todos"
2. Aparece una confirmación: "¿Estás seguro de resetear TODOS los rate limits?"
3. Si confirmas, se envía un POST con `{ all: true }`
4. El servidor limpia completamente el mapa de rate limits
5. **TODOS** los usuarios pueden hacer solicitudes de nuevo

**⚠️ ADVERTENCIA**:
- Esto afecta a **TODOS** los usuarios, incluidos posibles atacantes
- Solo úsalo si estás seguro de que es necesario
- Después de resetear todos, los atacantes también pueden intentar de nuevo

**Ejemplo de uso**:
```
1. Hay un bug que bloquea a todos los usuarios legítimos
2. Ya se corrigió el bug
3. Vas a /admin/debug/rate-limit
4. Haces clic en "Resetear todos"
5. Confirmas la acción
6. Todos los usuarios pueden acceder de nuevo
```

---

## Cómo funciona técnicamente

### Arquitectura del sistema

```
┌─────────────┐
│   Cliente   │ (Tu navegador)
└──────┬──────┘
       │
       │ HTTP Request
       ▼
┌─────────────────────────────────┐
│   Next.js API Route            │
│   /api/debug/reset-rate-limit  │
└──────┬──────────────────────────┘
       │
       │ Verifica MASTER_ADMIN
       ▼
┌─────────────────────────────────┐
│   rateLimit.ts                  │
│   resetRateLimitForIP()        │
│   resetAllRateLimits()          │
└──────┬──────────────────────────┘
       │
       │ Modifica Map en memoria
       ▼
┌─────────────────────────────────┐
│   requestCounts Map             │
│   { "rate_limit:IP": {...} }    │
└─────────────────────────────────┘
```

### Almacenamiento de rate limits

Los rate limits se almacenan en **memoria** usando un `Map` de JavaScript:

```typescript
const requestCounts = new Map<string, { count: number; resetTime: number }>();
```

**Estructura de datos**:
- **Clave**: `"rate_limit:192.168.1.100"` (prefijo + IP)
- **Valor**: `{ count: 15, resetTime: 1234567890 }`
  - `count`: Número de solicitudes hechas
  - `resetTime`: Timestamp cuando expira el bloqueo

**Ejemplo real**:
```javascript
requestCounts = {
  "rate_limit:192.168.1.100": { count: 25, resetTime: 1704123456789 },
  "rate_limit:192.168.1.101": { count: 5, resetTime: 1704123456789 },
  "rate_limit:10.0.0.50": { count: 100, resetTime: 1704123456789 }
}
```

### Detección de IP

El sistema detecta tu IP desde varios headers HTTP (en orden de prioridad):

1. **`x-forwarded-for`**: Usado por proxies, load balancers, Vercel
2. **`x-real-ip`**: Usado por algunos proxies
3. **`cf-connecting-ip`**: Usado por Cloudflare
4. **Fallback**: `"unknown"` si no se puede detectar

**Ejemplo de headers**:
```
x-forwarded-for: 192.168.1.100, 10.0.0.1
x-real-ip: 192.168.1.100
```

El sistema toma la primera IP de `x-forwarded-for` (la IP original del cliente).

### Límites configurados

El sistema tiene tres tipos de límites:

| Tipo | Solicitudes | Ventana de tiempo | Uso |
|------|-------------|-------------------|-----|
| **AUTH** | 20 | 15 minutos | Login, reset password |
| **API** | 100 | 1 minuto | Endpoints normales |
| **HEAVY** | 10 | 1 minuto | Operaciones pesadas |

**Ejemplo práctico**:
- Puedes hacer **100 requests** a `/api/certificates` en **1 minuto**
- Si haces el request #101, te bloquean por 1 minuto
- Después de 1 minuto, el bloqueo expira automáticamente

### Flujo de reset

Cuando haces clic en "Resetear mi IP":

```
1. Frontend: onClick → handleResetMyIP()
2. Frontend: POST /api/debug/reset-rate-limit (sin IP)
3. Backend: Detecta IP desde headers
4. Backend: Llama resetRateLimitForIP(ip)
5. Backend: requestCounts.delete(`rate_limit:${ip}`)
6. Backend: Responde { success: true, message: "..." }
7. Frontend: Muestra toast de éxito
```

---

## Cómo probar que funciona

### Prueba 1: Ver tu IP

1. Ve a `/admin/debug/rate-limit`
2. Deberías ver tu IP en el recuadro azul superior
3. Haz clic en "Copiar" y verifica que se copió al portapapeles

**Resultado esperado**: Tu IP se muestra correctamente

---

### Prueba 2: Bloquearte intencionalmente

1. Ve a `/admin/debug/rate-limit` y anota tu IP
2. Abre la consola del navegador (F12)
3. Ejecuta este código para hacer 101 requests rápidamente:

```javascript
for (let i = 0; i < 101; i++) {
  fetch('/api/certificates')
    .then(r => console.log(`Request ${i+1}:`, r.status))
    .catch(e => console.error('Error:', e));
}
```

4. Espera unos segundos
5. Intenta hacer una request normal: `fetch('/api/certificates')`
6. Deberías recibir un error 429 (Too Many Requests)

**Resultado esperado**: Te bloquean después de 100 requests

---

### Prueba 3: Desbloquearte usando la página

1. Después de la Prueba 2, ve a `/admin/debug/rate-limit`
2. Haz clic en "Resetear mi IP"
3. Espera el mensaje de éxito
4. Intenta hacer una request normal de nuevo: `fetch('/api/certificates')`
5. Debería funcionar normalmente (status 200)

**Resultado esperado**: Te desbloqueas inmediatamente

---

### Prueba 4: Resetear IP específica

1. Ve a `/admin/debug/rate-limit`
2. Anota tu IP del recuadro azul
3. En "Resetear IP específica", ingresa tu IP
4. Haz clic en "Resetear"
5. Deberías ver un mensaje de éxito

**Resultado esperado**: La IP se resetea correctamente

---

### Prueba 5: Resetear todos

1. Ve a `/admin/debug/rate-limit`
2. Haz clic en "Resetear todos"
3. Confirma la acción
4. Deberías ver un mensaje como "Se resetearon X rate limits"

**Resultado esperado**: Todos los rate limits se resetean

---

## Casos de uso reales

### Caso 1: Usuario bloqueado por error

**Situación**:
- Un usuario legítimo intenta hacer login 21 veces (límite es 20)
- Se bloquea por 15 minutos
- Necesita acceder urgentemente

**Solución**:
1. El usuario te contacta
2. Le pides su IP (o la obtienes de los logs del servidor)
3. Vas a `/admin/debug/rate-limit`
4. Ingresas su IP en "Resetear IP específica"
5. Haces clic en "Resetear"
6. El usuario puede intentar login de nuevo

---

### Caso 2: Te bloqueaste tú mismo

**Situación**:
- Estás probando la API y haces demasiadas solicitudes
- Te bloquean
- Necesitas continuar trabajando

**Solución**:
1. Vas a `/admin/debug/rate-limit`
2. Ves tu IP en el recuadro azul
3. Haces clic en "Resetear mi IP"
4. Puedes continuar trabajando inmediatamente

---

### Caso 3: Bug masivo que bloquea a todos

**Situación**:
- Hay un bug en el código que hace que todos los usuarios legítimos se bloqueen
- Ya corregiste el bug
- Necesitas desbloquear a todos

**Solución**:
1. Verificas que el bug está corregido
2. Vas a `/admin/debug/rate-limit`
3. Haces clic en "Resetear todos"
4. Confirmas la acción
5. Todos los usuarios pueden acceder de nuevo

**⚠️ Importante**: Solo haz esto si estás seguro de que el problema está resuelto. Si hay un atacante activo, NO resetees todos los rate limits.

---

## Limitaciones y consideraciones

### ⚠️ Limitaciones importantes

1. **Almacenamiento en memoria**
   - Los rate limits se guardan en memoria (no en base de datos)
   - Si reinicias el servidor, se pierden todos los rate limits
   - En producción con múltiples servidores, cada uno tiene su propio mapa

2. **IP compartida**
   - Si varios usuarios comparten la misma IP (oficina, proxy, VPN), resetear afecta a todos
   - Ejemplo: Si resetas la IP de una oficina, todos los usuarios de esa oficina se desbloquean

3. **Detección de IP**
   - La IP detectada puede no ser la IP real del usuario
   - Detrás de proxies, CDNs, o load balancers, la IP puede variar
   - En Vercel, la IP puede cambiar entre requests

4. **Sin persistencia**
   - Los rate limits no se guardan entre reinicios
   - Si reinicias el servidor, todos los bloqueos se pierden automáticamente

### 💡 Mejoras futuras recomendadas

1. **Usar Redis para almacenamiento**
   - Persistencia entre reinicios
   - Compartido entre múltiples servidores
   - Mejor para producción a gran escala

2. **Logs de reseteos**
   - Guardar quién reseteó qué IP y cuándo
   - Útil para auditoría y debugging

3. **Dashboard de rate limits**
   - Ver todas las IPs bloqueadas
   - Ver cuántas solicitudes ha hecho cada IP
   - Ver cuándo expiran los bloqueos

---

## Solución de problemas

### Problema: "No se pudo obtener la IP"

**Causa**: El servidor no puede detectar tu IP desde los headers HTTP.

**Soluciones**:
1. Verifica que estás accediendo desde un navegador normal (no desde un script)
2. Si estás detrás de un proxy complejo, la IP puede no detectarse
3. En desarrollo local, la IP puede ser `unknown` o `127.0.0.1`

---

### Problema: "Solo MASTER_ADMIN puede acceder"

**Causa**: Tu usuario no tiene el rol `MASTER_ADMIN`.

**Soluciones**:
1. Verifica tu rol en `/admin/roles`
2. Contacta a otro MASTER_ADMIN para que te asigne el rol
3. Verifica que estás logueado correctamente

---

### Problema: "Rate limit reseteado pero sigo bloqueado"

**Causas posibles**:
1. **Cache del navegador**: El navegador puede tener cache de la respuesta 429
2. **Múltiples servidores**: Si hay varios servidores, cada uno tiene su propio mapa
3. **IP diferente**: La IP que reseteaste no es la misma que está bloqueada

**Soluciones**:
1. Refresca la página (Ctrl+F5 para limpiar cache)
2. Espera unos segundos y vuelve a intentar
3. Verifica que la IP que reseteaste es la correcta
4. Si estás en producción con múltiples servidores, puede que necesites resetear en todos

---

### Problema: "El botón no aparece en la página principal"

**Causa**: No eres MASTER_ADMIN o hay un error en el código.

**Soluciones**:
1. Verifica que eres MASTER_ADMIN
2. Refresca la página
3. Verifica la consola del navegador por errores
4. Accede directamente a `/admin/debug/rate-limit`

---

## Preguntas frecuentes

### ¿Puedo resetear rate limits de otros usuarios?

Sí, si eres MASTER_ADMIN y conoces la IP del usuario. Usa la opción "Resetear IP específica".

---

### ¿Se guardan los reseteos en algún log?

No actualmente. Los reseteos no se registran. Esto es una mejora futura recomendada.

---

### ¿Qué pasa si reseteo todos los rate limits durante un ataque?

Los atacantes también se desbloquearán. Solo resetea todos si estás seguro de que el problema está resuelto.

---

### ¿Funciona en producción con múltiples servidores?

Cada servidor tiene su propio mapa de rate limits. Si reseteas en un servidor, solo afecta a ese servidor. Para producción a gran escala, se recomienda usar Redis.

---

### ¿Puedo ver qué IPs están bloqueadas actualmente?

No hay una interfaz para esto actualmente. Los rate limits están en memoria y no se exponen. Esto es una mejora futura recomendada.

---

## Conclusión

La página de Debug de Rate Limit es una herramienta poderosa para administradores que necesitan gestionar bloqueos de rate limiting manualmente. Úsala con cuidado y solo cuando sea necesario.

**Recuerda**:
- ✅ Solo para MASTER_ADMIN
- ✅ Úsala cuando usuarios legítimos se bloqueen
- ⚠️ No la uses durante ataques activos
- 💡 Considera mejoras futuras como Redis y logs

---

**Última actualización**: Diciembre 2024
**Versión del sistema**: 1.0

