# Módulo de Certificados EduToolkit

Módulo administrativo para gestión de certificados usando Next.js 14, TypeScript y Tailwind CSS.

## Configuración Inicial

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id

# Firebase Admin Configuration
FIREBASE_ADMIN_PROJECT_ID=tu_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=tu_client_email
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

**Nota:** Usa el mismo proyecto Firebase que PLATAFORM, pero la colección `certificates` es nueva y no afecta datos existentes.

### 3. Ejecutar servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Estructura del Proyecto

```
src/
├── app/
│   ├── api/
│   │   └── certificates/
│   │       └── route.ts          # Endpoint API para certificados
│   ├── admin/
│   │   └── certificados/
│   │       └── page.tsx          # Página principal de gestión
│   └── globals.css               # Estilos globales con Tailwind
├── components/
│   └── CertificateList.tsx       # Componente de listado
├── lib/
│   ├── firebaseClient.ts         # Configuración Firebase (cliente)
│   └── firebaseAdmin.ts          # Configuración Firebase (admin)
└── types/
    └── Certificate.ts            # Interface TypeScript
```

## Funcionalidades Actuales

- ✅ Listado de certificados desde Firestore
- ✅ Vista administrativa con tabla responsive
- ✅ Estados de carga y vacío
- ✅ Integración con Firebase (cliente y admin)

## Próximas Funcionalidades

- Detalle de certificado individual
- Integración con Google Drive para PDFs
- Formulario para agregar/actualizar datos de contacto
- Manejo de estados de entrega
- Envío de certificados por email/WhatsApp

## Tecnologías

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Firebase** (Firestore, Admin SDK)
