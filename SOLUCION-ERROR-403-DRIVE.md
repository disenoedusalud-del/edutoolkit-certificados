# Solución: Error 403 "Service Accounts do not have storage quota"

## El Problema

Google no permite que los Service Accounts suban archivos directamente a su propio Drive porque no tienen cuota de almacenamiento.

**Error que verás**:
```
Service Accounts do not have storage quota. Leverage shared drives or use OAuth delegation instead.
```

## Solución: Compartir Carpeta de tu Drive Personal

Los Service Accounts **SÍ pueden** subir archivos a carpetas que estén compartidas con ellos en tu Drive personal.

### Pasos

1. **La carpeta debe estar en TU Drive personal** (no en el Drive del Service Account)

2. **Comparte la carpeta** `1DCs5yaZcfRPky_zMKdk1KjbBR7JZBKAe` con:
   ```
   edutoolkit-drive-sa@edusalud-platfor.iam.gserviceaccount.com
   ```

3. **Permisos**: "Editor" (necesario para subir archivos)

4. **Verifica**:
   - La carpeta está en tu Drive personal
   - Está compartida con el Service Account
   - El Service Account tiene permisos de "Editor"

## Alternativas (si no funciona)

### Opción 1: Usar Shared Drive (Google Workspace)
Si tienes Google Workspace, puedes crear un Shared Drive y agregar el Service Account como miembro.

### Opción 2: OAuth Delegation
Más complejo, requiere configuración adicional en Google Workspace Admin.

## Verificación

Después de compartir la carpeta correctamente:

1. Reinicia el servidor: `npm run dev`
2. Intenta subir un PDF
3. Deberías ver en los logs:
   ```
   [GOOGLE-DRIVE] ✅ Archivo subido exitosamente: ...
   ```
4. El archivo aparecerá en la carpeta compartida en tu Drive

