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

# EmailJS Configuration (para restablecimiento de contraseña)
EMAILJS_SERVICE_ID=tu_service_id
EMAILJS_TEMPLATE_ID=tu_template_id
EMAILJS_PUBLIC_KEY=tu_public_key

# Roles y Permisos
MASTER_ADMIN_EMAILS=admin1@ejemplo.com,admin2@ejemplo.com
ALLOWED_ADMIN_EMAILS=usuario1@ejemplo.com,usuario2@ejemplo.com
```

**Nota:** Usa el mismo proyecto Firebase que PLATAFORM, pero la colección `certificates` es nueva y no afecta datos existentes.

### Configuración de EmailJS

Para que el restablecimiento de contraseña funcione, necesitas configurar EmailJS:

1. **Crear cuenta en EmailJS**: Ve a [https://www.emailjs.com/](https://www.emailjs.com/) y crea una cuenta gratuita.

2. **Crear un servicio de email**: 
   - En el dashboard de EmailJS, ve a "Email Services"
   - Conecta tu proveedor de email (Gmail, Outlook, etc.) o usa el servicio de EmailJS
   - Copia el **Service ID**

3. **Crear una plantilla de email**:
   - Ve a "Email Templates" y crea una nueva plantilla
   - **Asunto del email:**
     ```
     Restablecer contraseña - Panel de Certificados EduSalud
     ```
   - **Contenido HTML:**
     - Abre el archivo `email-template-password-reset.html` en la raíz del proyecto
     - Copia todo el contenido HTML
     - Pégalo en el editor de plantillas de EmailJS (asegúrate de estar en modo HTML)
   - **Variables que se usarán automáticamente:**
     - `{{reset_link}}` - El enlace de restablecimiento (se reemplaza automáticamente)
     - `{{to_email}}` - El correo del destinatario (se reemplaza automáticamente)
   - Guarda la plantilla y copia el **Template ID**

4. **Obtener la Public Key**:
   - Ve a "Account" > "General"
   - Copia tu **Public Key**

5. **Agregar las variables a `.env.local`**:
   ```env
   EMAILJS_SERVICE_ID=tu_service_id
   EMAILJS_TEMPLATE_ID=tu_template_id
   EMAILJS_PRIVATE_KEY=tu_private_key
   # O si prefieres usar la public key (menos seguro para backend):
   # EMAILJS_PUBLIC_KEY=tu_public_key
   ```
   
   **Nota:** Para mayor seguridad en el backend, usa `EMAILJS_PRIVATE_KEY` en lugar de `EMAILJS_PUBLIC_KEY`. La Private Key la encuentras en "Account" > "API Keys" en el dashboard de EmailJS.

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
