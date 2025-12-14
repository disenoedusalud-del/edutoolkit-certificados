# 🔧 Solución: Carpeta No Compartida con Service Account

## Error Actual

```
La carpeta con ID "1DCs5yaZcfRPky_zMKdk1KjbBR7JZBKAe" no existe o no está compartida con el Service Account.
```

## Causa

El Service Account (`edutoolkit-drive-sa@edusalud-platfor.iam.gserviceaccount.com`) no puede acceder a la carpeta porque:

1. **La carpeta NO está compartida** con el Service Account, O
2. **El folder ID es incorrecto**, O
3. **Los permisos son insuficientes** (solo "Lector" en lugar de "Editor")

## Solución Paso a Paso

### Paso 1: Verificar que la Carpeta Existe

1. Abre Google Drive con la cuenta `diseno.edusalud@gmail.com`:
   - https://drive.google.com/

2. Intenta acceder directamente a la carpeta:
   - `https://drive.google.com/drive/folders/1DCs5yaZcfRPky_zMKdk1KjbBR7JZBKAe`
   - Si no puedes acceder, el ID es incorrecto o la carpeta no existe

### Paso 2: Compartir la Carpeta Correctamente

1. **Abre la carpeta** en Google Drive (debe estar en TU Drive personal, no en Shared Drive)

2. **Haz clic derecho** en la carpeta → **"Compartir"** (o el ícono de compartir en la parte superior)

3. **En el campo de búsqueda**, pega EXACTAMENTE este email:
   ```
   edutoolkit-drive-sa@edusalud-platfor.iam.gserviceaccount.com
   ```
   ⚠️ **IMPORTANTE**: Copia y pega el email completo, sin espacios ni caracteres extra

4. **Selecciona permisos**: **"Editor"** (necesario para subir archivos)
   - ❌ NO uses "Lector" (solo lectura)
   - ✅ SÍ usa "Editor" (puede editar y subir)

5. **Haz clic en "Enviar"** o "Compartir"

6. **Verifica** que el email aparezca en la lista de personas con acceso

### Paso 3: Verificar que la Carpeta está en el Drive Personal

⚠️ **CRÍTICO**: La carpeta debe estar en **TU Drive personal** (no en un Shared Drive a menos que tengas Google Workspace configurado).

- Si la carpeta está en un **Shared Drive**, el Service Account necesita ser agregado al Shared Drive directamente, no solo a la carpeta.

### Paso 4: Esperar y Reiniciar

1. **Espera 10-15 segundos** después de compartir (los cambios pueden tardar en propagarse)

2. **Reinicia el servidor**:
   ```bash
   # Detén el servidor (Ctrl + C)
   npm run dev
   ```

3. **Prueba de nuevo** subir un PDF

## Verificación Rápida

Para verificar que la carpeta está compartida correctamente:

1. Abre la carpeta en Google Drive
2. Haz clic en "Compartir" o el ícono de compartir
3. Verifica que aparezca en la lista:
   ```
   edutoolkit-drive-sa@edusalud-platfor.iam.gserviceaccount.com
   ```
4. Verifica que tenga permisos de **"Editor"**

## Si Sigue Fallando

### Opción 1: Verificar el Folder ID

1. Abre la carpeta en Google Drive
2. Mira la URL en el navegador
3. El ID está después de `/folders/`:
   ```
   https://drive.google.com/drive/folders/1DCs5yaZcfRPky_zMKdk1KjbBR7JZBKAe
                                                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                                      Este es el ID
   ```
4. Verifica que coincida con el ID en `.env.local`:
   ```
   GOOGLE_DRIVE_FOLDER_ID=1DCs5yaZcfRPky_zMKdk1KjbBR7JZBKAe
   ```

### Opción 2: Crear una Nueva Carpeta

Si la carpeta actual no funciona:

1. Crea una nueva carpeta en tu Drive personal
2. Compártela con el Service Account (permisos "Editor")
3. Copia el ID de la nueva carpeta
4. Actualiza `.env.local`:
   ```
   GOOGLE_DRIVE_FOLDER_ID=TU_NUEVO_ID_AQUI
   ```
5. Reinicia el servidor

### Opción 3: Verificar el Service Account Email

Asegúrate de usar el email correcto del Service Account:
```
edutoolkit-drive-sa@edusalud-platfor.iam.gserviceaccount.com
```

Puedes verificar este email en:
- Google Cloud Console → IAM & Admin → Service Accounts
- O en el archivo JSON del Service Account (campo `client_email`)

## Errores Comunes

### ❌ "La carpeta no existe"
- **Causa**: El folder ID es incorrecto
- **Solución**: Verifica el ID en la URL de Google Drive

### ❌ "No tienes permisos"
- **Causa**: La carpeta está compartida pero con permisos de "Lector"
- **Solución**: Cambia los permisos a "Editor"

### ❌ "Service Accounts do not have storage quota"
- **Causa**: La carpeta NO está compartida (el Service Account intenta subir a su propio Drive)
- **Solución**: Comparte la carpeta siguiendo el Paso 2

### ❌ El archivo se sube pero no lo veo
- **Causa**: Estás viendo la carpeta incorrecta
- **Solución**: Verifica que estés viendo la carpeta con el ID correcto

