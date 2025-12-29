# Guía de Desarrollo - Panel de Certificados EduSalud

Esta guía técnica está diseñada para desarrolladores que necesiten mantener, extender o comprender la arquitectura de la plataforma de gestión de certificados de EduSalud.

---

## 1. Visión General del Proyecto

**Objetivo:** El sistema permite gestionar (subir, editar, buscar y visualizar) certificados académicos en formato PDF, organizándolos automáticamente en Google Drive y almacenando sus metadatos en Firebase Firestore.

**Tecnologías Principales:**
- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS.
- **Backend:** Next.js API Routes (Serverless Functions).
- **Base de Datos:** Firebase Firestore.
- **Autenticación:** Firebase Authentication.
- **Almacenamiento de Archivos:** Google Drive (via Google Apps Script).
- **Servidor de Correo:** EmailJS (para recuperación de contraseñas).

---

## 2. Arquitectura del Sistema

El sistema utiliza una arquitectura híbrida donde Next.js actúa como el orquestador principal, pero delega el manejo de archivos pesados (PDFs) a un script intermediario en Google Apps Script para evitar las limitaciones de servicio y costos.

```mermaid
graph TD
    User[Usuario (Admin)] -->|Interactúa| NextJS[Frontend Next.js]
    NextJS -->|Lee/Escribe Datos| Firebase[Firestore DB]
    NextJS -->|Autenticación| FirebaseAuth[Firebase Auth]
    
    subgraph "Sistema de Archivos (Drive)"
        NextJS -->|Sube/Reemplaza PDF| API[API Route /api/upload]
        API -->|POST Request| GAS[Apps Script Web App]
        GAS -->|Gestiona Carpetas y Archivos| GDrive[Google Drive]
    end
```

### Componente Crítico: Google Apps Script
El archivo `src/lib/appsScriptDrive.ts` es el puente. No subimos archivos directamente a la API de Drive desde el cliente para mayor seguridad y control. Usamos un **Web App de Apps Script** (`CODIGO.gs` en la documentación) que recibe el archivo en Base64 y lo coloca en la carpeta correcta (Año -> Curso).

---

## 3. Estructura de Directorios Clave

```
src/
├── app/
│   ├── admin/              # Rutas protegidas del panel (layout, dashboard)
│   ├── api/                # Backend Serverless
│   │   ├── auth/           # Login, Session, Check-user
│   │   ├── certificates/   # CRUD de certificados + Upload/Delete
│   │   ├── courses/        # Gestión de cursos y carpetas
│   │   └── upload/         # Subida general de archivos
│   ├── login/              # Página pública de acceso
│   └── globals.css         # Definición de variables de TEMA (CSS Variables)
├── components/
│   ├── AdminLogo.tsx       # Logo inteligente del header (ver sección Branding)
│   ├── CertificateForm.tsx # Formulario principal (lógica compleja de subida)
│   └── ...                 # Componentes UI reutilizables
├── contexts/
│   ├── ThemeContext.tsx    # Manejo del estado de temas (Dark/Light/Tokyo)
│   └── ...
├── lib/
│   ├── appsScriptDrive.ts  # ¡IMPORTANTE! Lógica de conexión con Drive
│   ├── auth.ts             # Verificación de sesiones y roles en servidor
│   └── firebase*.ts        # Inicialización de Firebase
└── types/                  # Definiciones TypeScript (Course, Certificate)
```

---

## 4. Funcionalidades Críticas (Deep Dive)

### A. Subida de Certificados y Gestión de Carpetas
1.  **Selección:** El usuario elige un "Curso" en el formulario.
2.  **Verificación de Carpeta:** Antes de subir, `CertificateForm` llama a `/api/courses/[id]/ensure-folder`.
    *   Si el curso no tiene carpeta en Drive, el sistema llama a Apps Script para crear la estructura `Certificados -> [Año] -> [Nombre Curso]`.
    *   Se guarda el ID de la nueva carpeta en Firestore.
3.  **Subida:** El PDF se envía a `/api/upload` junto con el ID de la carpeta destino.
4.  **Apps Script:** Recibe el archivo, lo guarda y devuelve el `fileId` y `webViewLink` de Drive.
5.  **Persistencia:** Next.js guarda estos IDs en Firestore junto con los datos del estudiante.

### B. Sistema de Branding y Temas
El sistema soporta múltiples temas (Light, Dark, Tokyo Night, Neo-Brutalism).
*   **Definición:** Los colores se definen en `src/app/globals.css` usando variables CSS (`--bg-primary`, `--text-primary`).
*   **Logos Inteligentes:**
    *   En **Modo Claro**: Se usa una imagen SVG a color (`logo_edusalud-color.svg`).
    *   En **Modo Oscuro**: Se usa una técnica de **CSS Masking** sobre un `div`. Esto permite que el logo tome el color exacto del texto (`var(--text-primary)`), logrando que en temas como "Tokyo Night" el logo sea azulado y no blanco puro.
    *   **Código Relevante:** `src/app/login/page.tsx` y `src/components/AdminLogo.tsx`.

### C. Autenticación y Roles
*   **Roles:** `MASTER_ADMIN` (acceso total) y `ADMIN` (acceso limitado, si se implementa en el futuro).
*   **Seguridad:** Las rutas de API verifican el token de sesión de Firebase en las cookies (`__session`).
*   **Rate Limiting:** Implementado en el login para prevenir fuerza bruta.

---

## 5. Configuración del Entorno (`.env.local`)

Para que el proyecto funcione localmente o en otro despliegue, necesitas estas variables:

```env
# Firebase (Cliente y Admin)
NEXT_PUBLIC_FIREBASE_API_KEY=...
FIREBASE_ADMIN_PRIVATE_KEY=...
# ... (otras credenciales de Firebase)

# Integración Drive
GOOGLE_APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/.../exec
DRIVE_CERTIFICATES_FOLDER_ID=... (ID de la carpeta raíz en Drive)

# Seguridad
MASTER_ADMIN_EMAILS=admin@edusalud.hn
ALLOWED_ADMIN_EMAILS=...
```

---

## 6. Comandos Útiles

*   `npm run dev`: Inicia servidor local.
*   `npm run build`: Compila para producción.
*   `git push`: Si está conectado a Vercel, dispara un despliegue automático.

---

## 7. Solución de Problemas Comunes

*   **Error 500 en Login:** Generalmente por claves mal configuradas en Vercel o problemas con `ThemeContext` (ya parcheado).
*   **No sube archivos:** Verificar que el `GOOGLE_APPS_SCRIPT_WEB_APP_URL` sea correcto y que el script tenga permisos de "Ejecutar como: Yo" y "Acceso: Cualquiera".
*   **Logo en blanco en modo claro:** Verificar versión del archivo SVG o caché del navegador (el código usa `?v=3` para forzar recarga).

---

> **Nota para el desarrollador:** Si modificas el archivo `logo_edusalud-blanco.svg`, asegúrate de mantener el `viewBox` cuadrado o ajustar las dimensiones en `LoginPage` para evitar distorsiones.
