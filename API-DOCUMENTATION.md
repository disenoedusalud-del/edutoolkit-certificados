# Documentación de API - EduToolkit Certificados

Esta documentación describe todos los endpoints de la API del módulo de certificados.

## 🔐 Autenticación

Todos los endpoints requieren autenticación mediante cookies de sesión de Firebase Auth. Si no hay una sesión válida, se retorna `401 Unauthorized`.

## 📊 Roles y Permisos

Los endpoints requieren diferentes roles según su funcionalidad:

- **VIEWER**: Solo lectura
- **EDITOR**: Lectura y escritura (crear, actualizar)
- **MASTER_ADMIN**: Control total (incluye eliminación y gestión de usuarios)

Ver [ROLES-Y-PERMISOS.md](./ROLES-Y-PERMISOS.md) para más detalles.

## ⚡ Rate Limiting

Todos los endpoints tienen rate limiting configurado. Los límites por defecto son:

- **GET**: 100 requests por minuto
- **POST/PUT**: 30 requests por minuto
- **DELETE**: 10 requests por minuto

Las respuestas incluyen headers `X-RateLimit-Remaining` y `X-RateLimit-Reset`.

## 📋 Endpoints

### Certificados

#### `GET /api/certificates`

Obtiene una lista de certificados con soporte para paginación.

**Permisos:** VIEWER o superior

**Query Parameters:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Elementos por página (default: 50, max: 100)

**Ejemplo sin paginación:**
```bash
GET /api/certificates
```

**Respuesta (sin paginación):**
```json
[
  {
    "id": "cert123",
    "fullName": "Juan Pérez",
    "courseName": "Curso de Ejemplo",
    "courseId": "CE-2025-01",
    ...
  }
]
```

**Ejemplo con paginación:**
```bash
GET /api/certificates?page=1&limit=50
```

**Respuesta (con paginación):**
```json
{
  "data": [
    {
      "id": "cert123",
      "fullName": "Juan Pérez",
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

---

#### `GET /api/certificates/stats`

Obtiene estadísticas agregadas de certificados sin cargar todos los documentos.

**Permisos:** VIEWER o superior

**Respuesta:**
```json
{
  "total": 150,
  "porEstado": {
    "entregados": 50,
    "listosParaEntrega": 30,
    "enArchivo": 60,
    "digitalEnviado": 10
  },
  "porAño": {
    "2024": 80,
    "2025": 70
  },
  "esteAño": 70
}
```

---

#### `GET /api/certificates/[id]`

Obtiene un certificado específico por su ID.

**Permisos:** VIEWER o superior

**Respuesta:**
```json
{
  "id": "cert123",
  "fullName": "Juan Pérez",
  "courseName": "Curso de Ejemplo",
  "courseId": "CE-2025-01",
  "courseType": "Curso",
  "year": 2025,
  ...
}
```

**Errores:**
- `404`: Certificado no encontrado
- `403`: No autorizado

---

#### `POST /api/certificates`

Crea un nuevo certificado.

**Permisos:** EDITOR o superior

**Body:**
```json
{
  "fullName": "Juan Pérez",
  "courseName": "Curso de Ejemplo",
  "courseId": "CE-2025",
  "courseType": "Curso",
  "year": 2025,
  "origin": "nuevo",
  "email": "juan@example.com",
  "phone": "1234567890",
  ...
}
```

**Campos requeridos:**
- `fullName`
- `courseName`
- `courseId`
- `courseType`
- `year`

**Respuesta:**
```json
{
  "id": "cert123",
  "fullName": "Juan Pérez",
  ...
}
```

**Errores:**
- `400`: Error de validación (ver `details` en la respuesta)
- `403`: No autorizado

---

#### `PUT /api/certificates/[id]`

Actualiza un certificado existente.

**Permisos:** EDITOR o superior

**Body:** Mismo formato que POST, pero todos los campos son opcionales (solo se actualizan los enviados).

**Respuesta:**
```json
{
  "id": "cert123",
  "fullName": "Juan Pérez Actualizado",
  ...
}
```

**Errores:**
- `400`: Error de validación
- `404`: Certificado no encontrado
- `403`: No autorizado

---

#### `DELETE /api/certificates/[id]`

Elimina un certificado.

**Permisos:** MASTER_ADMIN

**Respuesta:**
```json
{
  "message": "Certificado eliminado correctamente"
}
```

**Errores:**
- `404`: Certificado no encontrado
- `403`: No autorizado (solo MASTER_ADMIN)

---

#### `POST /api/certificates/[id]/upload`

Sube un archivo PDF a Google Drive y lo asocia con un certificado.

**Permisos:** EDITOR o superior

**Body:** FormData con campo `file` (PDF, max 10MB)

**Respuesta:**
```json
{
  "driveFileId": "1a2b3c4d5e6f7g8h9i0j",
  "webViewLink": "https://drive.google.com/file/d/...",
  "message": "Archivo subido correctamente"
}
```

**Errores:**
- `400`: Archivo inválido o muy grande
- `404`: Certificado no encontrado
- `500`: Error al subir a Google Drive

---

### Cursos

#### `GET /api/courses`

Obtiene una lista de cursos con soporte para filtrado y paginación.

**Permisos:** VIEWER o superior

**Query Parameters:**
- `status` (opcional): `"active"` | `"archived"` | `null` (todos)
- `page` (opcional): Número de página
- `limit` (opcional): Elementos por página

**Respuesta:** Similar a `/api/certificates` con estructura de paginación.

---

#### `GET /api/courses/[id]`

Obtiene un curso específico.

**Permisos:** VIEWER o superior

---

#### `POST /api/courses`

Crea un nuevo curso.

**Permisos:** EDITOR o superior

**Body:**
```json
{
  "id": "CE",
  "name": "Curso de Ejemplo",
  "courseType": "Curso",
  "year": 2025,
  "edition": 1,
  "origin": "nuevo"
}
```

---

#### `PUT /api/courses/[id]`

Actualiza un curso existente.

**Permisos:** EDITOR o superior

**Body:** Similar a POST, pero puede incluir `newId` para cambiar el código del curso.

**Nota:** Si se cambia el código del curso, se actualizan automáticamente todos los certificados asociados.

---

#### `DELETE /api/courses/[id]`

Elimina un curso y todos sus certificados asociados.

**Permisos:** MASTER_ADMIN

**⚠️ Advertencia:** Esta operación elimina permanentemente el curso y todos sus certificados.

---

### Usuarios Administradores

#### `GET /api/admin-users`

Lista todos los usuarios administradores.

**Permisos:** MASTER_ADMIN

**Respuesta:**
```json
[
  {
    "email": "admin@example.com",
    "role": "MASTER_ADMIN",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

---

#### `POST /api/admin-users`

Crea o actualiza un usuario administrador.

**Permisos:** MASTER_ADMIN

**Body:**
```json
{
  "email": "admin@example.com",
  "role": "EDITOR"
}
```

---

#### `DELETE /api/admin-users/[email]`

Elimina un usuario administrador.

**Permisos:** MASTER_ADMIN

---

### Debug y Utilidades

#### `GET /api/debug/my-ip`

Obtiene la IP actual del cliente.

**Permisos:** MASTER_ADMIN

**Respuesta:**
```json
{
  "ip": "192.168.1.1"
}
```

**Nota:** Este endpoint tiene rate limiting permisivo (50 req/min) para permitir acceso incluso si otros endpoints están bloqueados.

---

#### `POST /api/debug/reset-rate-limit`

Resetea rate limits para una IP específica o todas las IPs.

**Permisos:** MASTER_ADMIN

**Body:**
```json
{
  "ip": "192.168.1.1"  // Opcional: si no se envía, resetea todos
}
```

**Respuesta:**
```json
{
  "message": "Rate limit reseteado para IP 192.168.1.1"
}
```

**Nota:** Este endpoint tiene rate limiting permisivo.

---

#### `GET /api/health`

Health check del sistema. Verifica el estado de Firebase Auth, Firestore y Vercel KV.

**Permisos:** Público (no requiere autenticación)

**Respuesta:**
```json
{
  "status": "healthy",
  "services": {
    "firebaseAuth": "ok",
    "firestore": "ok",
    "vercelKv": "ok"
  },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

---

## 🔄 Códigos de Estado HTTP

- `200`: Éxito
- `201`: Creado exitosamente
- `400`: Error de validación o solicitud inválida
- `401`: No autenticado
- `403`: No autorizado (rol insuficiente)
- `404`: Recurso no encontrado
- `429`: Rate limit excedido
- `500`: Error interno del servidor

## 📝 Formato de Errores

Todas las respuestas de error siguen este formato:

```json
{
  "error": "Mensaje de error descriptivo",
  "details": ["Detalle 1", "Detalle 2"]  // Opcional, solo en desarrollo
}
```

## 🔗 Referencias

- [ROLES-Y-PERMISOS.md](./ROLES-Y-PERMISOS.md) - Detalles de roles y permisos
- [MATRIZ-PERMISOS.md](./MATRIZ-PERMISOS.md) - Matriz completa de permisos
- [MANUAL-RATE-LIMIT-DEBUG.md](./MANUAL-RATE-LIMIT-DEBUG.md) - Guía de debug de rate limits

---

**Última actualización:** 2025-01-16

