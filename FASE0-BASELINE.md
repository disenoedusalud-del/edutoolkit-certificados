# Fase 0 - Baseline y Verificación - Resumen Técnico

## Endpoints API (src/app/api/)

### Autenticación
- `/api/login` - POST: Crea sesión con `createSessionCookie` ✅
- `/api/logout` - POST: Borra cookie de sesión ✅
- `/api/register` - POST: Registra nuevo usuario
- `/api/auth/session` - POST/DELETE: ⚠️ **PROBLEMA**: Guarda `idToken` directamente en lugar de session cookie
- `/api/auth/me` - GET: Obtiene usuario actual
- `/api/auth/check-user` - POST: Verifica si usuario existe
- `/api/auth/reset-password` - POST: Envía email de reset

### Certificados
- `/api/certificates` - GET, POST
- `/api/certificates/[id]` - GET, PUT, DELETE
- `/api/certificates/bulk` - PUT, DELETE

### Cursos
- `/api/courses` - GET, POST
- `/api/courses/[id]` - GET, PUT, DELETE

### Administración
- `/api/admin-users` - GET, POST, DELETE

## Páginas (src/app/)

### Públicas
- `/` - page.tsx (home)
- `/login` - page.tsx
- `/forgot-password` - page.tsx
- `/reset-password` - page.tsx ⚠️ **PROBLEMA**: `useSearchParams()` sin Suspense

### Protegidas (requieren autenticación)
- `/admin/certificados` - page.tsx
- `/admin/certificados/[id]` - page.tsx
- `/admin/cursos` - page.tsx
- `/admin/roles` - page.tsx

## Manejo de Cookie `edutoolkit_session`

### Nombre de Cookie
- Constante: `COOKIE_NAME = "edutoolkit_session"`

### Dónde se SETEA (crea/actualiza):
1. **`/api/login`** (src/app/api/login/route.ts:107)
   - ✅ Usa `createSessionCookie` correctamente
   - Crea cookie httpOnly, secure en producción, sameSite: "lax"
   - Expiración: 5 días (SESSION_EXPIRES_IN_SECONDS)

2. **`/api/auth/session`** (src/app/api/auth/session/route.ts:30)
   - ⚠️ **PROBLEMA**: Guarda `idToken` directamente (no session cookie)
   - Necesita migración a `createSessionCookie`

### Dónde se VALIDA (lee/verifica):
1. **`src/lib/auth.ts`** - `getCurrentUser()`
   - ✅ Usa `verifySessionCookie()` correctamente
   - Lee cookie con `cookies().get(COOKIE_NAME)`
   - Obtiene rol desde Firestore `adminUsers` collection

2. **`src/app/admin/layout.tsx`** (línea 21)
   - Lee cookie para verificar existencia
   - Si no existe, redirige a `/login`
   - ⚠️ **NOTA**: No valida el token, solo verifica existencia

3. **Endpoints protegidos** (vía `requireAuth()` / `requireRole()`)
   - Usan `getCurrentUser()` que valida con `verifySessionCookie()`

### Dónde se BORRA:
1. **`/api/logout`** (src/app/api/logout/route.ts:11)
   - ✅ Borra cookie correctamente (maxAge: 0)

2. **`/api/auth/session` DELETE** (src/app/api/auth/session/route.ts:51)
   - ✅ Borra cookie correctamente

## Estado del Build

### Problema Detectado y Corregido
```
⨯ useSearchParams() should be wrapped in a suspense boundary at page "/reset-password"
```

**Archivo**: `src/app/reset-password/page.tsx`
**Solución**: ✅ **CORREGIDO** - Envuelto `useSearchParams()` en `<Suspense>`

### Build Status
- ✅ **EXITOSO**: Build compila correctamente
- ✅ Compilación TypeScript: OK
- ✅ Todas las páginas generadas correctamente

## Verificación de Funcionalidades

### Login
- ✅ Frontend: `src/app/login/page.tsx` llama `/api/login`
- ✅ Backend: `/api/login` usa `createSessionCookie` correctamente
- ✅ Cookie se setea con httpOnly, secure, sameSite

### Reset Password
- ✅ Frontend: `src/app/forgot-password/page.tsx` existe
- ✅ Backend: `/api/auth/reset-password` existe
- ✅ EmailJS configurado y funcionando
- ⚠️ Build falla por `useSearchParams()` sin Suspense

## Archivos Clave de Autenticación

1. **`src/lib/auth.ts`**
   - `getCurrentUser()` - Lee y valida session cookie
   - `requireAuth()` - Lanza error si no autenticado
   - `requireRole()` - Verifica rol específico
   - `hasRole()`, `hasAnyRole()` - Helpers de permisos

2. **`src/app/api/login/route.ts`**
   - ✅ Implementación correcta con session cookie

3. **`src/app/api/auth/session/route.ts`**
   - ⚠️ Necesita migración a session cookie

4. **`src/app/admin/layout.tsx`**
   - Protección básica (solo verifica existencia de cookie)

## Resumen de Problemas Encontrados

1. **CRÍTICO - Build**: `/reset-password` necesita Suspense boundary
2. **IMPORTANTE - Seguridad**: `/api/auth/session` guarda idToken en lugar de session cookie
3. **MEJORA**: `admin/layout.tsx` solo verifica existencia, no valida token (pero está OK porque los endpoints sí validan)

## Próximos Pasos (Fase 1)

1. Corregir build error en `/reset-password` (agregar Suspense)
2. Verificar que TODOS los endpoints usan `requireAuth()` o `requireRole()`
3. Asegurar manejo consistente de errores 401/403

