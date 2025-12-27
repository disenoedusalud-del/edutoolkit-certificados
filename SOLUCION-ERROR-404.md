# Solución al Error 404 en /api/courses/[id]

## Problema
El endpoint `/api/courses/[id]` devuelve 404 tanto para GET como para DELETE.

## Verificaciones Realizadas
✅ El archivo `src/app/api/courses/[id]/route.ts` existe
✅ El archivo tiene las funciones GET, PUT y DELETE exportadas correctamente
✅ La estructura de carpetas es correcta
✅ El código no tiene errores de sintaxis

## Solución

### Paso 1: Detener el servidor completamente
- Presiona `Ctrl+C` en la terminal donde está corriendo `npm run dev`
- Asegúrate de que el proceso se haya detenido completamente

### Paso 2: Eliminar el caché (YA HECHO)
El caché de Next.js ya fue eliminado.

### Paso 3: Reiniciar el servidor
Ejecuta:
```bash
npm run dev
```

### Paso 4: Verificar los logs
Después de reiniciar, cuando intentes eliminar un curso, deberías ver en la consola del servidor:
- `[GET-COURSE] 🚀 Función GET llamada`
- `[DELETE-COURSE] 🚀 Función DELETE llamada`

Si NO ves estos logs, significa que Next.js no está reconociendo la ruta.

## Si el problema persiste

### Verificación adicional 1: Comprobar que el servidor se reinició
Abre otra terminal y ejecuta:
```bash
netstat -ano | findstr :3000
```
Si hay un proceso usando el puerto 3000, mátalo y reinicia.

### Verificación adicional 2: Verificar errores de compilación
Revisa la terminal donde corre `npm run dev` para ver si hay errores de TypeScript o compilación.

### Verificación adicional 3: Probar con otro ID
Intenta acceder a `/api/courses/NAEF` directamente en el navegador (GET) para ver si el problema es específico del ID o general.

## Notas
- El archivo está correctamente estructurado
- La ruta dinámica `[id]` es la forma correcta en Next.js App Router
- El código es idéntico al de `/api/certificates/[id]` que funciona

