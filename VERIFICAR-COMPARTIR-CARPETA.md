# 🔍 Verificar que la Carpeta está Compartida Correctamente

## Pasos para Verificar

### 1. Verificar en Google Drive

1. **Abre Google Drive** con la cuenta `diseno.edusalud@gmail.com`:
   - https://drive.google.com/

2. **Busca la carpeta** con ID: `1DCs5yaZcfRPky_zMKdk1KjbBR7JZBKAe`
   - Puedes buscarla por nombre o ir directamente a:
   - `https://drive.google.com/drive/folders/1DCs5yaZcfRPky_zMKdk1KjbBR7JZBKAe`

3. **Haz clic derecho** en la carpeta → **"Compartir"**

4. **Verifica que aparezca este email en la lista de personas con acceso**:
   ```
   edutoolkit-drive-sa@edusalud-platfor.iam.gserviceaccount.com
   ```

5. **Verifica que tenga permisos de "Editor"** (no solo "Lector")

### 2. Si NO aparece el Service Account

1. **Agrega el email**:
   - En el campo de búsqueda, pega: `edutoolkit-drive-sa@edusalud-platfor.iam.gserviceaccount.com`
   - Selecciona permisos: **"Editor"**
   - Haz clic en **"Enviar"** o **"Compartir"**

2. **Espera unos segundos** para que los cambios se propaguen

3. **Reinicia el servidor**:
   ```bash
   npm run dev
   ```

### 3. Verificar que la Carpeta está en el Drive Personal

⚠️ **IMPORTANTE**: La carpeta debe estar en **TU Drive personal** (no en un Shared Drive a menos que tengas Google Workspace configurado).

- Si la carpeta está en un Shared Drive, el Service Account necesita ser agregado al Shared Drive directamente, no solo a la carpeta.

### 4. Probar de Nuevo

Después de compartir correctamente:

1. **Reinicia el servidor**:
   ```bash
   npm run dev
   ```

2. **Intenta subir un PDF** desde el panel de administración

3. **Si sigue fallando**, revisa los logs del servidor para ver el error específico

## Errores Comunes

### Error: "La carpeta con ID ... no existe o no está compartida"
- **Solución**: Comparte la carpeta con el Service Account (paso 2)

### Error: "No tienes permisos para acceder a la carpeta"
- **Solución**: Asegúrate de dar permisos de **"Editor"** (no solo "Lector")

### Error: "Service Accounts do not have storage quota"
- **Solución**: Esto significa que la carpeta NO está compartida. Sigue los pasos 1-2 arriba.

### El archivo se sube pero no lo veo en la carpeta
- **Verifica**: Que estés viendo la carpeta correcta (`1DCs5yaZcfRPky_zMKdk1KjbBR7JZBKAe`)
- **Espera**: Los archivos pueden tardar unos segundos en aparecer
- **Busca**: El archivo puede tener un nombre diferente al esperado

