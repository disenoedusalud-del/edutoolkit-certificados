# 🔧 Solución: Carpeta en Shared Drive (Unidad Compartida)

## Problema

Si la carpeta está en un **Shared Drive** (Unidad Compartida), compartir solo la carpeta **NO es suficiente**. El Service Account debe ser agregado al **Shared Drive completo**, no solo a la carpeta individual.

## Error que verás

```
File not found: 1DCs5yaZcfRPky_zMKdk1KjbBR7JZBKAe (404)
```

Aunque la carpeta esté compartida con el Service Account, el error 404 persiste.

## Solución: Agregar Service Account al Shared Drive

### Paso 1: Identificar el Shared Drive

1. Abre Google Drive: https://drive.google.com/
2. En el menú izquierdo, busca **"Unidades compartidas"** o **"Shared Drives"**
3. Encuentra el Shared Drive que contiene la carpeta `EduToolkit-Certificados`

### Paso 2: Agregar el Service Account al Shared Drive

1. **Haz clic derecho** en el Shared Drive → **"Gestionar miembros"** o **"Manage members"**
   - O haz clic en el Shared Drive y luego en el ícono de configuración (⚙️) → "Gestionar miembros"

2. **Haz clic en "Agregar miembros"** o **"Add members"**

3. **En el campo de búsqueda**, pega este email:
   ```
   edutoolkit-drive-sa@edusalud-platfor.iam.gserviceaccount.com
   ```

4. **Selecciona el rol**:
   - **"Colaborador"** (Contributor) - Puede editar y subir archivos
   - **"Administrador de contenido"** (Content Manager) - Puede gestionar archivos y carpetas
   - ❌ NO uses "Lector" (Viewer) - No puede subir archivos

5. **Haz clic en "Enviar"** o **"Send"**

### Paso 3: Verificar

1. En la lista de miembros del Shared Drive, verifica que aparezca:
   ```
   edutoolkit-drive-sa@edusalud-platfor.iam.gserviceaccount.com
   ```
   Con el rol correcto (Colaborador o Administrador de contenido)

2. **Espera 10-15 segundos** para que los cambios se propaguen

3. **Reinicia el servidor**:
   ```bash
   npm run dev
   ```

4. **Prueba subir un PDF** de nuevo

## Alternativa: Mover la Carpeta al Drive Personal

Si prefieres no agregar el Service Account al Shared Drive completo:

1. **Crea una nueva carpeta** en tu **Drive personal** (no en Shared Drive)
2. **Comparte esa carpeta** con el Service Account (permisos "Editor")
3. **Copia el ID de la nueva carpeta** desde la URL
4. **Actualiza `.env.local`**:
   ```
   GOOGLE_DRIVE_FOLDER_ID=TU_NUEVO_ID_AQUI
   ```
5. **Reinicia el servidor**

## Verificar si la Carpeta está en Shared Drive

Para verificar si tu carpeta está en un Shared Drive:

1. Abre la carpeta en Google Drive
2. Mira la ruta de navegación (breadcrumbs) en la parte superior
3. Si ves algo como "Unidades compartidas" o "Shared Drives" antes del nombre de la carpeta, está en un Shared Drive
4. Si solo ves "Mi unidad" o "My Drive", está en tu Drive personal

## Diferencias

### Drive Personal
- ✅ Compartir la carpeta directamente funciona
- ✅ El Service Account puede acceder inmediatamente después de compartir

### Shared Drive
- ❌ Compartir solo la carpeta NO funciona
- ✅ El Service Account debe ser agregado al Shared Drive completo
- ✅ Una vez agregado, puede acceder a todas las carpetas del Shared Drive

## Notas Importantes

- **Permisos del Shared Drive**: Asegúrate de tener permisos de "Administrador" o "Administrador de contenido" en el Shared Drive para poder agregar miembros
- **Propagación**: Los cambios pueden tardar 10-15 segundos en propagarse
- **Scope de la API**: El código ya está configurado para acceder a Shared Drives (incluye `drive` scope además de `drive.file`)

