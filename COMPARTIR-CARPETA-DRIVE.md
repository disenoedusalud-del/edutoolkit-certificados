# ⚠️ IMPORTANTE: Compartir Carpeta con Service Account

## Por qué es necesario

Los Service Accounts de Google **NO tienen cuota de almacenamiento propia**. No pueden subir archivos a su propio Drive. 

**Solución**: Debes compartir una carpeta de **TU Drive personal** con el Service Account. El Service Account puede subir archivos a carpetas compartidas contigo.

## Email del Service Account

```
edutoolkit-drive-sa@edusalud-platfor.iam.gserviceaccount.com
```

## Pasos para Compartir la Carpeta

1. **Abre Google Drive** en tu navegador
   - https://drive.google.com/

2. **Ve a la carpeta** con ID: `1DCs5yaZcfRPky_zMKdk1KjbBR7JZBKAe`
   - O busca la carpeta en tu Drive personal (no en el Drive del Service Account)

3. **Haz clic derecho** en la carpeta → **"Compartir"** (o el ícono de compartir)

4. **En el campo de búsqueda**, pega este email:
   ```
   edutoolkit-drive-sa@edusalud-platfor.iam.gserviceaccount.com
   ```

5. **Selecciona permisos**: **"Editor"** (necesario para que pueda subir archivos)

6. **Haz clic en "Enviar"** o "Compartir"

7. **IMPORTANTE**: Asegúrate de que la carpeta esté en **TU Drive personal**, no en un Shared Drive a menos que tengas Google Workspace configurado

## Verificación

Después de compartir la carpeta:

1. **Reinicia el servidor**:
   ```bash
   npm run dev
   ```

2. **Prueba subir un PDF**:
   - Ve a un certificado en el panel
   - Haz clic en "Subir PDF"
   - Selecciona un archivo PDF
   - El archivo debería subirse a la carpeta compartida

3. **Verifica en Google Drive**:
   - Ve a la carpeta `1DCs5yaZcfRPky_zMKdk1KjbBR7JZBKAe`
   - Deberías ver el PDF que subiste

## Si hay errores

### Error: "Permission denied"
- Verifica que compartiste la carpeta con el email correcto
- Asegúrate de dar permisos de "Editor" (no solo "Lector")

### Error: "GOOGLE_DRIVE_SERVICE_ACCOUNT no está configurado"
- Verifica que la variable esté en `.env.local` (sin el `#` al inicio)
- Reinicia el servidor después de agregar la variable

### El archivo se sube pero no lo veo
- Verifica que estés viendo la carpeta correcta
- Los archivos pueden tardar unos segundos en aparecer

