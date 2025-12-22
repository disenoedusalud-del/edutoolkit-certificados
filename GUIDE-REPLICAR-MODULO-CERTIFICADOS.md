# 📋 Guía: Replicar Módulo de Certificados a Otro Proyecto

## ✅ Confirmación: Los Módulos Están SEPARADOS

- **Módulo de Certificados**: Completamente funcional e independiente
- **Módulo de Cursos**: Separado, solo se usa como referencia en certificados

---

## 📦 Archivos del Módulo de Certificados (Para Copiar)

### 1. **Tipos/Interfaces**
```
src/types/Certificate.ts          ← REQUERIDO
src/types/Course.ts               ← OPCIONAL (solo si quieres mantener referencia a cursos)
```

### 2. **Componentes de Certificados**
```
src/components/CertificateList.tsx        ← REQUERIDO
src/components/CertificateForm.tsx        ← REQUERIDO (usa Course opcionalmente)
src/components/CertificateDetail.tsx      ← REQUERIDO
src/components/CertificateStats.tsx       ← REQUERIDO
src/components/CertificateImport.tsx      ← REQUERIDO
src/components/CourseExportModal.tsx      ← REQUERIDO (para exportar por curso)
src/components/ImportExportMenu.tsx       ← REQUERIDO (menú de importar/exportar)
```

### 3. **Páginas de Certificados**
```
src/app/admin/certificados/page.tsx       ← REQUERIDO (página principal)
src/app/admin/certificados/[id]/page.tsx  ← REQUERIDO (página de detalle)
```

### 4. **API Routes de Certificados**
```
src/app/api/certificates/route.ts              ← REQUERIDO (GET, POST)
src/app/api/certificates/[id]/route.ts         ← REQUERIDO (GET, PUT, DELETE)
src/app/api/certificates/bulk/route.ts         ← REQUERIDO (acciones masivas)
src/app/api/certificates/import/route.ts       ← REQUERIDO (importar CSV)
src/app/api/certificates/stats/route.ts        ← REQUERIDO (estadísticas)
src/app/api/certificates/[id]/upload/route.ts  ← OPCIONAL (upload a Drive)
```

### 5. **Utilidades/Librerías**
```
src/lib/exportUtils.ts            ← REQUERIDO (exportar a CSV)
src/lib/driveUtils.ts             ← REQUERIDO (utilidades Google Drive)
src/lib/googleDrive.ts            ← OPCIONAL (integración completa Drive)
```

### 6. **Componentes Compartidos (Si no los tienes)**
```
src/components/LoadingSpinner.tsx    ← REQUERIDO
src/components/Toast.tsx             ← REQUERIDO
src/components/ToastProvider.tsx     ← REQUERIDO
src/components/ConfirmDialog.tsx     ← REQUERIDO
src/lib/toast.ts                     ← REQUERIDO
src/contexts/ConfirmContext.tsx      ← REQUERIDO
```

---

## 🔗 Dependencias Opcionales

### Si quieres mantener la funcionalidad de Cursos:
```
src/types/Course.ts                    ← Tipo de datos de cursos
src/components/CourseModal.tsx         ← Modal para crear/editar cursos
src/app/admin/cursos/page.tsx          ← Página de administración de cursos
src/app/api/courses/route.ts           ← API de cursos
src/app/api/courses/[id]/route.ts      ← API de cursos individuales
```

**Nota**: Si NO quieres cursos, puedes:
1. Eliminar las referencias a `Course` en `CertificateForm.tsx`
2. Simplificar el formulario para que `courseId` y `courseName` sean texto libre
3. Eliminar el botón "Crear nuevo curso" del formulario

---

## 📋 Dependencias Externas (Package.json)

```json
{
  "dependencies": {
    "next": "16.0.8",
    "react": "19.2.1",
    "react-dom": "19.2.1",
    "firebase": "^12.6.0",
    "firebase-admin": "^13.6.0",
    "phosphor-react": "^1.4.1",
    "xlsx": "^0.18.5",
    "googleapis": "^168.0.0"  // OPCIONAL (solo para Drive)
  },
  "devDependencies": {
    "tailwindcss": "^3.4.18",
    "typescript": "^5",
    "@types/react": "^19",
    "@types/node": "^20"
  }
}
```

---

## 🎨 Configuración Necesaria

### 1. Firebase (REQUERIDO)
```
- Variables de entorno para Firebase Client
- Variables de entorno para Firebase Admin
- Firestore configurado con colección "certificates"
```

### 2. Tailwind CSS (REQUERIDO)
```
- tailwind.config.js
- postcss.config.js
- src/app/globals.css con @tailwind directives
```

### 3. Temas (OPCIONAL - si quieres mantener los temas)
```
- src/contexts/ThemeContext.tsx
- Variables CSS en globals.css
```

---

## ⚙️ Pasos para Replicar

### Paso 1: Copiar Archivos
```bash
# En tu nuevo proyecto, copia TODOS los archivos listados arriba
```

### Paso 2: Instalar Dependencias
```bash
npm install firebase firebase-admin phosphor-react xlsx
npm install -D tailwindcss postcss autoprefixer
```

### Paso 3: Configurar Firebase
```bash
# Crea .env.local con tus credenciales de Firebase
```

### Paso 4: Configurar Tailwind
```bash
# Asegúrate de tener tailwind.config.js y postcss.config.js
```

### Paso 5: Verificar Imports
```bash
# Verifica que todos los imports usen las rutas correctas de tu proyecto
# Ejemplo: @/components/CertificateList
```

### Paso 6: Adaptar (Opcional)
- Si NO quieres cursos: Simplifica `CertificateForm.tsx` y elimina referencias a `Course`
- Si quieres cursos: Copia también los archivos de cursos listados arriba

---

## 🚀 Funcionalidades del Módulo de Certificados

✅ Listado de certificados con búsqueda y filtros
✅ Crear, editar, eliminar certificados
✅ Vista de detalle
✅ Estadísticas (totales, por estado, por año)
✅ Importación desde CSV/Excel
✅ Exportación a CSV (todos, seleccionados, por curso)
✅ Acciones masivas (cambiar estado, eliminar)
✅ Integración con Google Drive (ID de archivo)
✅ Paginación y ordenamiento
✅ Estados de entrega múltiples

---

## 📝 Notas Importantes

1. **Los certificados almacenan `courseId` y `courseName` como strings**, así que puedes usarlos sin el módulo de cursos si solo quieres texto libre.

2. **El módulo de cursos es INDEPENDIENTE** - puedes copiarlo o no según necesites.

3. **Firebase es REQUERIDO** - el módulo usa Firestore como base de datos.

4. **Tailwind CSS es REQUERIDO** - todos los componentes usan clases de Tailwind.

5. **Phosphor Icons** se usa para los iconos (reemplazable por otra librería si prefieres).

---

## ✅ Checklist de Replicación

- [ ] Copiar todos los archivos listados
- [ ] Instalar dependencias
- [ ] Configurar Firebase (.env.local)
- [ ] Configurar Tailwind CSS
- [ ] Verificar imports y rutas
- [ ] Probar creación de certificado
- [ ] Probar edición de certificado
- [ ] Probar listado y filtros
- [ ] Probar importación CSV
- [ ] Probar exportación CSV
- [ ] (Opcional) Integrar módulo de cursos

---

## 🎯 Resultado

Tendrás un módulo completo de gestión de certificados que puedes usar en cualquier proyecto Next.js 14+ con Firebase y Tailwind CSS.

