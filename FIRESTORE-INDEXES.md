# Índices de Firestore - EduToolkit Certificados

Este documento lista todos los índices necesarios para las queries de Firestore en el proyecto.

## 📋 Índices Requeridos

### Colección: `courses`

#### 1. Índice Compuesto: `status` + `name` (ASC)

**Query que lo requiere:**
```typescript
query.where("status", "==", "active").orderBy("name", "asc")
```

**Cuándo se usa:**
- GET `/api/courses?status=active` (sin paginación)
- GET `/api/courses?status=archived` (sin paginación)
- GET `/api/courses?status=active&page=1&limit=50` (con paginación)

**Configuración en Firebase Console:**
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Firestore Database** → **Indexes**
4. Haz clic en **Create Index**
5. Configura:
   - **Collection ID:** `courses`
   - **Fields to index:**
     - Campo 1: `status` (Ascending)
     - Campo 2: `name` (Ascending)
   - **Query scope:** Collection
6. Haz clic en **Create**

**Nota:** Si este índice no existe, el código tiene un fallback que obtiene los datos sin ordenar y los ordena en memoria. Sin embargo, es recomendable crear el índice para mejor rendimiento.

---

### Colección: `certificates`

#### 1. Índice Simple: `courseId` (ASC)

**Query que lo requiere:**
```typescript
query
  .where("courseId", ">=", prefix)
  .where("courseId", "<", prefix + "\uf8ff")
```

**Cuándo se usa:**
- POST `/api/certificates` - Al generar el siguiente número de certificado para un curso
- Busca todos los certificados que empiezan con un prefijo (ej: `LM-2025-`)

**Configuración en Firebase Console:**
1. Ve a **Firestore Database** → **Indexes**
2. Haz clic en **Create Index**
3. Configura:
   - **Collection ID:** `certificates`
   - **Fields to index:**
     - Campo 1: `courseId` (Ascending)
   - **Query scope:** Collection
4. Haz clic en **Create**

**Nota:** Este índice es necesario para las range queries (>= y <) que se usan para encontrar el siguiente número de certificado.

---

## 🔍 Índices Futuros (Recomendados)

Estos índices no son críticos ahora, pero mejorarán el rendimiento si se implementan filtros avanzados:

### Colección: `certificates`

#### 1. Índice Compuesto: `year` + `deliveryStatus` (ASC)

**Uso potencial:**
- Filtros por año y estado de entrega
- Búsquedas avanzadas en el frontend

**Configuración:**
- Campo 1: `year` (Ascending)
- Campo 2: `deliveryStatus` (Ascending)

#### 2. Índice Compuesto: `courseId` + `year` (ASC)

**Uso potencial:**
- Filtrar certificados por curso y año
- Estadísticas por curso y año

**Configuración:**
- Campo 1: `courseId` (Ascending)
- Campo 2: `year` (Ascending)

#### 3. Índice Compuesto: `deliveryStatus` + `createdAt` (DESC)

**Uso potencial:**
- Ordenar certificados por estado y fecha de creación
- Dashboard de certificados pendientes

**Configuración:**
- Campo 1: `deliveryStatus` (Ascending)
- Campo 2: `createdAt` (Descending)

---

## 📝 Cómo Crear Índices

### Método 1: Firebase Console (Recomendado)

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: `edutoolkit-certificados` o `edusalud-platfor`
3. Ve a **Firestore Database** → **Indexes**
4. Haz clic en **Create Index**
5. Completa los campos según la configuración del índice
6. Haz clic en **Create**
7. Espera a que el índice se construya (puede tomar unos minutos)

### Método 2: Firebase CLI (Alternativo)

Si prefieres usar la línea de comandos:

1. Instala Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Inicia sesión:
   ```bash
   firebase login
   ```

3. Crea un archivo `firestore.indexes.json` en la raíz del proyecto:
   ```json
   {
     "indexes": [
       {
         "collectionGroup": "courses",
         "queryScope": "COLLECTION",
         "fields": [
           {
             "fieldPath": "status",
             "order": "ASCENDING"
           },
           {
             "fieldPath": "name",
             "order": "ASCENDING"
           }
         ]
       },
       {
         "collectionGroup": "certificates",
         "queryScope": "COLLECTION",
         "fields": [
           {
             "fieldPath": "courseId",
             "order": "ASCENDING"
           }
         ]
       }
     ],
     "fieldOverrides": []
   }
   ```

4. Despliega los índices:
   ```bash
   firebase deploy --only firestore:indexes
   ```

---

## ⚠️ Notas Importantes

1. **Tiempo de construcción:** Los índices pueden tardar varios minutos en construirse, especialmente si hay muchos documentos.

2. **Errores en consola:** Si ves errores como "The query requires an index", Firebase Console te mostrará un enlace directo para crear el índice necesario.

3. **Límites:** Firestore tiene límites en el número de índices compuestos por proyecto. Consulta la [documentación oficial](https://firebase.google.com/docs/firestore/query-data/index-overview) para más detalles.

4. **Monitoreo:** Revisa regularmente los índices en Firebase Console para asegurarte de que todos estén en estado "Enabled".

---

## 🔗 Referencias

- [Documentación de índices de Firestore](https://firebase.google.com/docs/firestore/query-data/index-overview)
- [Mejores prácticas de índices](https://firebase.google.com/docs/firestore/best-practices#indexes)
- [Límites de Firestore](https://firebase.google.com/docs/firestore/quotas)

---

## ✅ Checklist de Índices

- [ ] Índice `courses`: `status` + `name` (ASC)
- [ ] Índice `certificates`: `courseId` (ASC)
- [ ] (Opcional) Índice `certificates`: `year` + `deliveryStatus` (ASC)
- [ ] (Opcional) Índice `certificates`: `courseId` + `year` (ASC)
- [ ] (Opcional) Índice `certificates`: `deliveryStatus` + `createdAt` (DESC)

---

**Última actualización:** 2025-12-16

