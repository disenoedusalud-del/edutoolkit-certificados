# 👥 Roles y Permisos - Sistema de Certificados

## 📊 Jerarquía de Roles

```
MASTER_ADMIN (Nivel 4) - Control Total
    ↓
ADMIN (Nivel 3) - Administración
    ↓
EDITOR (Nivel 2) - Edición
    ↓
VIEWER (Nivel 1) - Solo Lectura
```

---

## 🔐 Roles Disponibles

### 1. **VIEWER** (Lector) - Nivel 1
**Descripción:** Solo puede ver información, sin modificar nada.

**Puede hacer:**
- ✅ Ver listado de certificados
- ✅ Ver detalle de certificados
- ✅ Ver listado de cursos
- ✅ Ver detalle de cursos
- ✅ Exportar datos (CSV)

**NO puede hacer:**
- ❌ Crear certificados
- ❌ Editar certificados
- ❌ Eliminar certificados
- ❌ Crear cursos
- ❌ Editar cursos
- ❌ Subir PDFs
- ❌ Operaciones masivas
- ❌ Gestionar usuarios

**Uso típico:** Personal de consulta, auditores, supervisores que solo necesitan ver información.

---

### 2. **EDITOR** (Editor) - Nivel 2
**Descripción:** Puede crear y editar certificados, pero no eliminar ni gestionar cursos.

**Puede hacer:**
- ✅ Todo lo que VIEWER puede hacer
- ✅ Crear certificados nuevos
- ✅ Editar certificados existentes
- ✅ Subir PDFs a certificados
- ✅ Actualizar información de contacto

**NO puede hacer:**
- ❌ Eliminar certificados
- ❌ Crear cursos
- ❌ Editar cursos
- ❌ Eliminar cursos
- ❌ Operaciones masivas (bulk)
- ❌ Gestionar usuarios

**Uso típico:** Personal operativo que ingresa certificados y actualiza información.

---

### 3. **ADMIN** (Administrador) - Nivel 3
**Descripción:** Puede gestionar cursos y hacer operaciones masivas, pero no eliminar certificados ni gestionar usuarios.

**Puede hacer:**
- ✅ Todo lo que EDITOR puede hacer
- ✅ Crear cursos nuevos
- ✅ Editar cursos existentes
- ✅ Archivar cursos (cambiar status a "archived")
- ✅ Actualización masiva de certificados (bulk update)
- ✅ Ver estadísticas completas

**NO puede hacer:**
- ❌ Eliminar certificados (ni individual ni masivo)
- ❌ Eliminar cursos permanentemente
- ❌ Gestionar usuarios admin
- ❌ Cambiar roles de usuarios

**Uso típico:** Coordinadores de área, jefes de departamento que gestionan cursos y operaciones masivas.

---

### 4. **MASTER_ADMIN** (Super Administrador) - Nivel 4
**Descripción:** Control total del sistema. Puede hacer todo, incluyendo eliminaciones y gestión de usuarios.

**Puede hacer:**
- ✅ **TODO** lo que los otros roles pueden hacer
- ✅ Eliminar certificados (individual y masivo)
- ✅ Eliminar cursos permanentemente (junto con sus certificados)
- ✅ Gestionar usuarios admin (crear, editar, eliminar)
- ✅ Cambiar roles de usuarios
- ✅ Acceso a panel de administración de roles
- ✅ Operaciones críticas del sistema

**Uso típico:** Administradores del sistema, TI, coordinación general.

---

## 📋 Matriz de Permisos por Funcionalidad

| Funcionalidad | VIEWER | EDITOR | ADMIN | MASTER_ADMIN |
|---------------|--------|--------|-------|--------------|
| **Ver certificados** | ✅ | ✅ | ✅ | ✅ |
| **Ver cursos** | ✅ | ✅ | ✅ | ✅ |
| **Crear certificado** | ❌ | ✅ | ✅ | ✅ |
| **Editar certificado** | ❌ | ✅ | ✅ | ✅ |
| **Eliminar certificado** | ❌ | ❌ | ❌ | ✅ |
| **Subir PDF** | ❌ | ✅ | ✅ | ✅ |
| **Crear curso** | ❌ | ❌ | ✅ | ✅ |
| **Editar curso** | ❌ | ❌ | ✅ | ✅ |
| **Eliminar curso** | ❌ | ❌ | ❌ | ✅ |
| **Actualización masiva** | ❌ | ❌ | ✅ | ✅ |
| **Eliminación masiva** | ❌ | ❌ | ❌ | ✅ |
| **Gestionar usuarios** | ❌ | ❌ | ❌ | ✅ |
| **Ver panel de roles** | ❌ | ❌ | ❌ | ✅ |

---

## 🔍 Detalles por Endpoint

### Certificados

#### `GET /api/certificates` - Listar certificados
- **VIEWER**: ✅
- **EDITOR**: ✅
- **ADMIN**: ✅
- **MASTER_ADMIN**: ✅

#### `POST /api/certificates` - Crear certificado
- **VIEWER**: ❌ 403 Forbidden
- **EDITOR**: ✅
- **ADMIN**: ✅
- **MASTER_ADMIN**: ✅

#### `PUT /api/certificates/[id]` - Editar certificado
- **VIEWER**: ❌ 403 Forbidden
- **EDITOR**: ✅
- **ADMIN**: ✅
- **MASTER_ADMIN**: ✅

#### `DELETE /api/certificates/[id]` - Eliminar certificado
- **VIEWER**: ❌ 403 Forbidden
- **EDITOR**: ❌ 403 Forbidden
- **ADMIN**: ❌ 403 Forbidden
- **MASTER_ADMIN**: ✅

#### `POST /api/certificates/[id]/upload` - Subir PDF
- **VIEWER**: ❌ 403 Forbidden
- **EDITOR**: ✅
- **ADMIN**: ✅
- **MASTER_ADMIN**: ✅

#### `PUT /api/certificates/bulk` - Actualización masiva
- **VIEWER**: ❌ 403 Forbidden
- **EDITOR**: ❌ 403 Forbidden
- **ADMIN**: ✅
- **MASTER_ADMIN**: ✅

#### `DELETE /api/certificates/bulk` - Eliminación masiva
- **VIEWER**: ❌ 403 Forbidden
- **EDITOR**: ❌ 403 Forbidden
- **ADMIN**: ❌ 403 Forbidden
- **MASTER_ADMIN**: ✅

---

### Cursos

#### `GET /api/courses` - Listar cursos
- **VIEWER**: ✅
- **EDITOR**: ✅
- **ADMIN**: ✅
- **MASTER_ADMIN**: ✅

#### `POST /api/courses` - Crear curso
- **VIEWER**: ❌ 403 Forbidden
- **EDITOR**: ❌ 403 Forbidden
- **ADMIN**: ✅
- **MASTER_ADMIN**: ✅

#### `PUT /api/courses/[id]` - Editar curso
- **VIEWER**: ❌ 403 Forbidden
- **EDITOR**: ❌ 403 Forbidden
- **ADMIN**: ✅
- **MASTER_ADMIN**: ✅

#### `DELETE /api/courses/[id]` - Eliminar curso
- **VIEWER**: ❌ 403 Forbidden
- **EDITOR**: ❌ 403 Forbidden
- **ADMIN**: ❌ 403 Forbidden
- **MASTER_ADMIN**: ✅ (elimina permanentemente curso + certificados asociados)

---

### Administración de Usuarios

#### `GET /api/admin-users` - Listar usuarios admin
- **VIEWER**: ❌ 403 Forbidden
- **EDITOR**: ❌ 403 Forbidden
- **ADMIN**: ❌ 403 Forbidden
- **MASTER_ADMIN**: ✅

#### `POST /api/admin-users` - Crear/actualizar usuario
- **VIEWER**: ❌ 403 Forbidden
- **EDITOR**: ❌ 403 Forbidden
- **ADMIN**: ❌ 403 Forbidden
- **MASTER_ADMIN**: ✅

#### `DELETE /api/admin-users` - Eliminar usuario
- **VIEWER**: ❌ 403 Forbidden
- **EDITOR**: ❌ 403 Forbidden
- **ADMIN**: ❌ 403 Forbidden
- **MASTER_ADMIN**: ✅

---

## 🎯 Asignación de Roles

### Cómo se asigna un rol

1. **MASTER_ADMIN:**
   - Se asigna automáticamente si el email está en `MASTER_ADMIN_EMAILS` (variable de entorno)
   - O se puede asignar manualmente desde el panel de administración de roles (solo MASTER_ADMIN puede hacerlo)

2. **ADMIN, EDITOR, VIEWER:**
   - Se asignan desde el panel de administración de roles
   - Solo MASTER_ADMIN puede crear/editar/eliminar usuarios y asignar roles

### Dónde se guardan los roles

- **Firestore:** Colección `adminUsers`
- **Document ID:** Email normalizado (ej: `usuario_example_com` para `usuario@example.com`)
- **Campos:**
  ```typescript
  {
    email: "usuario@example.com",
    role: "EDITOR" | "ADMIN" | "VIEWER",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z"
  }
  ```

---

## ⚠️ Notas Importantes

1. **Jerarquía:** Los roles superiores heredan todos los permisos de los inferiores
   - ADMIN puede hacer todo lo que EDITOR puede hacer
   - EDITOR puede hacer todo lo que VIEWER puede hacer

2. **Eliminación de cursos:**
   - Solo MASTER_ADMIN puede eliminar cursos permanentemente
   - Al eliminar un curso, se eliminan TODOS los certificados asociados
   - Esta acción es irreversible

3. **Eliminación de certificados:**
   - Solo MASTER_ADMIN puede eliminar certificados
   - Puede ser individual o masiva (bulk)

4. **Gestión de usuarios:**
   - Solo MASTER_ADMIN puede gestionar usuarios
   - Puede crear, editar y eliminar usuarios
   - Puede cambiar roles (excepto su propio rol)

5. **Autenticación:**
   - Todos los endpoints requieren autenticación (cookie de sesión válida)
   - Si no hay sesión: 401 Unauthorized
   - Si hay sesión pero no tiene permisos: 403 Forbidden

---

## 📝 Ejemplos de Uso

### Escenario 1: Personal de consulta
- **Rol:** VIEWER
- **Puede:** Ver certificados y cursos, exportar datos
- **No puede:** Modificar nada

### Escenario 2: Personal operativo
- **Rol:** EDITOR
- **Puede:** Crear y editar certificados, subir PDFs
- **No puede:** Eliminar, gestionar cursos o usuarios

### Escenario 3: Coordinador de área
- **Rol:** ADMIN
- **Puede:** Todo lo de EDITOR + gestionar cursos, operaciones masivas
- **No puede:** Eliminar certificados, gestionar usuarios

### Escenario 4: Administrador del sistema
- **Rol:** MASTER_ADMIN
- **Puede:** TODO (control total)

---

## 🔒 Seguridad

- Los permisos se verifican en **cada request** al servidor
- No se puede bypassear desde el frontend
- Los roles se obtienen desde Firestore o variables de entorno
- Las cookies de sesión son httpOnly y secure (en producción)

---

¿Necesitas cambiar algún permiso o agregar un nuevo rol?

