# Matriz de Permisos por Rol - Implementada

## Roles Disponibles
- **VIEWER** (Lector): Solo lectura
- **EDITOR**: Crear y editar
- **ADMIN**: Crear, editar, operaciones masivas
- **MASTER_ADMIN**: Control total (incluye eliminación)

## Permisos por Endpoint

### Certificados

#### GET `/api/certificates`
- **VIEWER**: ✅ Permitido
- **EDITOR**: ✅ Permitido
- **ADMIN**: ✅ Permitido
- **MASTER_ADMIN**: ✅ Permitido

#### POST `/api/certificates`
- **VIEWER**: ❌ 403 Forbidden
- **EDITOR**: ✅ Permitido
- **ADMIN**: ✅ Permitido
- **MASTER_ADMIN**: ✅ Permitido

#### GET `/api/certificates/[id]`
- **VIEWER**: ✅ Permitido
- **EDITOR**: ✅ Permitido
- **ADMIN**: ✅ Permitido
- **MASTER_ADMIN**: ✅ Permitido

#### PUT `/api/certificates/[id]`
- **VIEWER**: ❌ 403 Forbidden
- **EDITOR**: ✅ Permitido
- **ADMIN**: ✅ Permitido
- **MASTER_ADMIN**: ✅ Permitido

#### DELETE `/api/certificates/[id]`
- **VIEWER**: ❌ 403 Forbidden
- **EDITOR**: ❌ 403 Forbidden
- **ADMIN**: ❌ 403 Forbidden
- **MASTER_ADMIN**: ✅ Permitido

#### PUT `/api/certificates/bulk`
- **VIEWER**: ❌ 403 Forbidden
- **EDITOR**: ❌ 403 Forbidden
- **ADMIN**: ✅ Permitido
- **MASTER_ADMIN**: ✅ Permitido

#### DELETE `/api/certificates/bulk`
- **VIEWER**: ❌ 403 Forbidden
- **EDITOR**: ❌ 403 Forbidden
- **ADMIN**: ❌ 403 Forbidden
- **MASTER_ADMIN**: ✅ Permitido

### Cursos

#### GET `/api/courses`
- **VIEWER**: ✅ Permitido
- **EDITOR**: ✅ Permitido
- **ADMIN**: ✅ Permitido
- **MASTER_ADMIN**: ✅ Permitido

#### POST `/api/courses`
- **VIEWER**: ❌ 403 Forbidden
- **EDITOR**: ❌ 403 Forbidden
- **ADMIN**: ✅ Permitido
- **MASTER_ADMIN**: ✅ Permitido

#### GET `/api/courses/[id]`
- **VIEWER**: ✅ Permitido
- **EDITOR**: ✅ Permitido
- **ADMIN**: ✅ Permitido
- **MASTER_ADMIN**: ✅ Permitido

#### PUT `/api/courses/[id]`
- **VIEWER**: ❌ 403 Forbidden
- **EDITOR**: ❌ 403 Forbidden
- **ADMIN**: ✅ Permitido
- **MASTER_ADMIN**: ✅ Permitido

#### DELETE `/api/courses/[id]`
- **VIEWER**: ❌ 403 Forbidden
- **EDITOR**: ❌ 403 Forbidden
- **ADMIN**: ✅ Permitido (archiva, no elimina)
- **MASTER_ADMIN**: ✅ Permitido (archiva, no elimina)

### Administración

#### GET `/api/admin-users`
- **VIEWER**: ❌ 403 Forbidden
- **EDITOR**: ❌ 403 Forbidden
- **ADMIN**: ❌ 403 Forbidden
- **MASTER_ADMIN**: ✅ Permitido

#### POST `/api/admin-users`
- **VIEWER**: ❌ 403 Forbidden
- **EDITOR**: ❌ 403 Forbidden
- **ADMIN**: ❌ 403 Forbidden
- **MASTER_ADMIN**: ✅ Permitido

#### DELETE `/api/admin-users`
- **VIEWER**: ❌ 403 Forbidden
- **EDITOR**: ❌ 403 Forbidden
- **ADMIN**: ❌ 403 Forbidden
- **MASTER_ADMIN**: ✅ Permitido

## Resumen por Rol

### VIEWER (Lector)
- ✅ GET certificados (listar y detalle)
- ✅ GET cursos (listar y detalle)
- ❌ No puede crear, editar, eliminar nada

### EDITOR
- ✅ GET certificados y cursos
- ✅ POST certificados (crear)
- ✅ PUT certificados (editar)
- ❌ No puede eliminar certificados
- ❌ No puede operaciones masivas
- ❌ No puede gestionar cursos

### ADMIN
- ✅ GET certificados y cursos
- ✅ POST certificados y cursos (crear)
- ✅ PUT certificados y cursos (editar)
- ✅ PUT bulk certificados (actualización masiva)
- ✅ DELETE cursos (archivar)
- ❌ No puede eliminar certificados individuales
- ❌ No puede eliminar certificados masivamente
- ❌ No puede gestionar usuarios admin

### MASTER_ADMIN
- ✅ Todo (GET, POST, PUT, DELETE)
- ✅ Operaciones masivas (bulk)
- ✅ Gestión de usuarios admin
- ✅ Eliminación de certificados

## Notas

- Los cursos no se eliminan físicamente, se archivan (status: "archived")
- Todos los endpoints requieren autenticación (401 si no hay cookie válida)
- Los errores 403 indican que el usuario está autenticado pero no tiene permisos

