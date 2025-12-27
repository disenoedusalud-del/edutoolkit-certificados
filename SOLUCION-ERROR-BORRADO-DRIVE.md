
# 🛠️ Solución a Problemas de Borrado de Carpetas en Google Drive

Hemos mejorado el sistema para que te informe exactamente por qué no se borra la carpeta de Google Drive al eliminar un curso.

## 🔍 Cambios Realizados

1. **Mejora en Logs del Servidor**: Ahora el servidor (Next.js) registra detalladamente el intento de borrado.
2. **Feedback en la Interfaz**: Si el curso se borra pero la carpeta de Drive falla, verás una **alerta amarilla** explicando el error exacto.
3. **Manejo de Errores**: Se captura y muestra el error específico que devuelve Google Apps Script.

## 🚀 Pasos para Solucionar el Problema (Si persiste)

Si al borrar un curso ves la alerta amarilla con un error, sigue estos pasos según el mensaje:

### 1. Error: "Acción no reconocida: deleteFolder"
**Causa**: El Google Apps Script no tiene la última versión desplegada.
**Solución**:
1. Ve a tu proyecto de Apps Script (`Codigo.gs`).
2. Asegúrate de que la función `deleteFolder` y el bloque `if (action === "deleteFolder")` en `doPost` estén presentes.
3. Haz clic en **Implementar** > **Gestionar implementaciones**.
4. Edita la implementación activa y asegúrate de elegir **Versión: Nueva** (o crea una nueva implementación).
5. **IMPORTANTE**: Cada vez que cambias código en Apps Script, DEBES crear una nueva versión de la implementación.

### 2. Error: "Exception: File not found" o "Access denied"
**Causa**: El ID de la carpeta en la base de datos no existe en Drive o no tienes permisos.
- **Si el curso es antiguo**: Es posible que se creara antes de que funcionara la integración con Drive, o la carpeta se borró manualmente.
- **Permisos**: Asegúrate de que el Apps Script se ejecuta como **"Yo" (Tu usuario)** y que tu usuario tiene permiso de EDITAR sobre la carpeta raíz de certificados.

### 3. Error: "Exception: Service invoked too many times"
**Causa**: Google limita las operaciones si borras muchos cursos muy rápido.
**Solución**: Espera unos minutos e inténtalo de nuevo.

### 4. No sale alerta amarilla pero la carpeta sigue ahí
**Causa**: El curso no tenía ningún ID de carpeta asociado en la base de datos (`driveFolderId` era null).
**Verificación**: Revisa los logs de la consola del navegador (F12). Verás un mensaje: `No se intentó borrar carpeta de Drive (no había ID asociado)`.

## 📝 Ver Logs en Tiempo Real

Para ver qué está pasando exactamente:
1. Abre los logs de Vercel (o tu terminal si estás en local).
2. Busca logs que empiecen con `[DELETE-FOLDER-AS]` o `[DELETE-COURSE]`.
3. Ahí verás el `folderId` exacto que se está intentando borrar y la respuesta del script.
