# 📋 Archivos de Configuración - Módulo de Certificados

## ✅ Archivos JSON y Configuración COMPLETOS para Replicar

---

## 1. 📦 **package.json** - Dependencias del Proyecto

**Ubicación:** `package.json` (raíz del proyecto)

```json
{
  "name": "edutoolkit-certificados",
  "version": "0.1.0",
  "private": true,
  "engines": {
    "node": "20.x"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "deploy:indexes": "firebase deploy --only firestore:indexes"
  },
  "dependencies": {
    "@emailjs/nodejs": "^5.0.2",
    "@vercel/kv": "^3.0.0",
    "firebase": "^12.6.0",
    "firebase-admin": "^13.6.0",
    "googleapis": "^168.0.0",
    "next": "16.0.8",
    "phosphor-react": "^1.4.1",
    "react": "19.2.1",
    "react-dom": "19.2.1",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.1",
    "@types/jest": "^30.0.0",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/xlsx": "^0.0.35",
    "autoprefixer": "^10.4.22",
    "eslint": "^9",
    "eslint-config-next": "16.0.8",
    "jest": "^30.2.0",
    "jest-environment-jsdom": "^30.2.0",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.18",
    "typescript": "^5"
  }
}
```

**✅ REQUERIDO** para el módulo de certificados

---

## 2. ⚙️ **tsconfig.json** - Configuración TypeScript

**Ubicación:** `tsconfig.json` (raíz del proyecto)

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

**✅ REQUERIDO** - Configuración de rutas `@/*` es crítica para los imports

---

## 3. 🎨 **tailwind.config.js** - Configuración Tailwind CSS

**Ubicación:** `tailwind.config.js` (raíz del proyecto)

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          tertiary: "var(--bg-tertiary)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
        },
        border: {
          theme: "var(--border-color)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        error: "var(--error)",
        info: "var(--info)",
      },
      backgroundColor: {
        'theme-primary': 'var(--bg-primary)',
        'theme-secondary': 'var(--bg-secondary)',
        'theme-tertiary': 'var(--bg-tertiary)',
      },
      textColor: {
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
      },
      borderColor: {
        'theme': 'var(--border-color)',
      },
    },
  },
  plugins: [],
}
```

**✅ REQUERIDO** - Sin esto, las clases de Tailwind no funcionarán

---

## 4. 📝 **postcss.config.js** - Configuración PostCSS

**Ubicación:** `postcss.config.js` (raíz del proyecto)

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**✅ REQUERIDO** - Necesario para que Tailwind compile correctamente

---

## 5. ⚡ **next.config.ts** - Configuración Next.js

**Ubicación:** `next.config.ts` (raíz del proyecto)

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript errors will now fail the build
  // This ensures type safety in production
};

export default nextConfig;
```

**✅ REQUERIDO** - Configuración básica de Next.js

---

## 6. 🔥 **firebase.json** - Configuración Firebase

**Ubicación:** `firebase.json` (raíz del proyecto)

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

**✅ REQUERIDO** - Necesario para deploy de Firestore rules e indexes

---

## 7. 🔒 **firestore.rules** - Reglas de Seguridad Firestore

**Ubicación:** `firestore.rules` (raíz del proyecto)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Reglas básicas - ajusta según tus necesidades de seguridad
    // Por defecto, denegar todo para seguridad
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**⚠️ IMPORTANTE:** Estas reglas deniegan TODO por defecto. Necesitas ajustarlas según tu modelo de seguridad. Si usas autenticación por API routes (como en este proyecto), estas reglas funcionan porque el Admin SDK no las respeta.

---

## 8. 📊 **firestore.indexes.json** - Índices de Firestore

**Ubicación:** `firestore.indexes.json` (raíz del proyecto)

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
          "fieldPath": "year",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "deliveryStatus",
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
        },
        {
          "fieldPath": "year",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "certificates",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "deliveryStatus",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

**✅ REQUERIDO** - Estos índices son necesarios para:
- Filtrar certificados por año y estado
- Filtrar certificados por curso y año
- Ordenar certificados por estado y fecha de creación

**Sin estos índices, las consultas complejas fallarán en producción.**

---

## 9. 🧪 **jest.config.js** - Configuración Jest (Opcional para Tests)

**Ubicación:** `jest.config.js` (raíz del proyecto)

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(next)/)',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
```

**⭕ OPCIONAL** - Solo si quieres ejecutar tests

---

## 10. 🔧 **eslint.config.mjs** - Configuración ESLint

**Ubicación:** `eslint.config.mjs` (raíz del proyecto)

```javascript
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
```

**⭕ OPCIONAL** - Solo para linting, no crítico para funcionamiento

---

## 11. 🌐 **.env.local** - Variables de Entorno (PLANTILLA)

**Ubicación:** `.env.local` (raíz del proyecto) - **NO se sube a Git**

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
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXXXX\n-----END PRIVATE KEY-----"

# EmailJS Configuration (opcional - para recuperación de contraseña)
EMAILJS_SERVICE_ID=tu_service_id
EMAILJS_TEMPLATE_ID=tu_template_id
EMAILJS_PUBLIC_KEY=tu_public_key

# Roles y Permisos (opcional)
MASTER_ADMIN_EMAILS=admin1@ejemplo.com,admin2@ejemplo.com
ALLOWED_ADMIN_EMAILS=usuario1@ejemplo.com,usuario2@ejemplo.com
```

**✅ REQUERIDO** - Crítico para conectar con Firebase

**⚠️ IMPORTANTE:** 
- El `FIREBASE_ADMIN_PRIVATE_KEY` debe estar entre comillas dobles y con `\n` para saltos de línea
- Este archivo NO se debe subir a Git (agregar a `.gitignore`)

---

## 12. 📄 **Template CSV para Importación**

**Ubicación:** `public/templates/plantilla_importacion_certificados.csv`

```csv
Nombre Completo (requerido);Nombre del Curso (requerido);Tipo de Curso (requerido si es nuevo);Año (requerido);Email (opcional);Teléfono (opcional);Origen (opcional);Estado (opcional)
Juan Perez;Electrocardiograma;Curso;2025;;;;
Ana Vasquez;Electrocardiograma;Curso;2025;;;;
```

**✅ REQUERIDO** - Para la funcionalidad de importación de certificados desde CSV

---

## 13. 🎨 **globals.css** - Estilos Globales (Referencia)

**Ubicación:** `src/app/globals.css`

Este archivo contiene:
- Directivas de Tailwind (`@tailwind base`, etc.)
- Variables CSS para temas (light, dark, neo-brutalism, etc.)
- Estilos personalizados para temas

**✅ REQUERIDO** - El archivo completo tiene ~760 líneas. Los primeros 4 renglones son críticos:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Variables CSS para cada tema */
:root[data-theme="tokyo-night"] {
  --bg-primary: #1a1b26;
  /* ... resto de variables ... */
}
```

---

## 📋 Resumen de Archivos por Prioridad

### ✅ CRÍTICOS (Sin estos, el módulo NO funciona):
1. `package.json` - Dependencias
2. `tsconfig.json` - Configuración TypeScript y paths
3. `tailwind.config.js` - Configuración Tailwind
4. `postcss.config.js` - PostCSS para Tailwind
5. `next.config.ts` - Configuración Next.js
6. `firestore.indexes.json` - Índices de Firestore (crítico para queries)
7. `.env.local` - Variables de entorno Firebase

### ⚠️ IMPORTANTES (Funcionará, pero con limitaciones):
8. `firebase.json` - Para deploy de Firebase
9. `firestore.rules` - Reglas de seguridad (ajustar según necesidades)
10. `src/app/globals.css` - Estilos globales y temas

### ⭕ OPCIONALES (Mejoras y desarrollo):
11. `jest.config.js` - Tests
12. `eslint.config.mjs` - Linting
13. `public/templates/plantilla_importacion_certificados.csv` - Template de importación

---

## 🚀 Checklist de Configuración

Al replicar el módulo, asegúrate de tener:

- [ ] `package.json` con todas las dependencias
- [ ] `tsconfig.json` con path `@/*` configurado
- [ ] `tailwind.config.js` con colores de tema
- [ ] `postcss.config.js` con plugins
- [ ] `next.config.ts` básico
- [ ] `firestore.indexes.json` con índices de certificados
- [ ] `.env.local` con credenciales Firebase
- [ ] `src/app/globals.css` con directivas Tailwind
- [ ] `firebase.json` (si vas a hacer deploy)
- [ ] `firestore.rules` (ajustar según seguridad)

---

## 📝 Notas Importantes

1. **Los índices de Firestore son CRÍTICOS** - Sin ellos, las consultas complejas (filtros múltiples, ordenamiento) fallarán en producción.

2. **Las variables de entorno son SENSIBLES** - Nunca las subas a Git. Asegúrate de tener `.env.local` en `.gitignore`.

3. **Tailwind CSS requiere configuración completa** - No solo `package.json`, también `tailwind.config.js`, `postcss.config.js` y las directivas en `globals.css`.

4. **TypeScript paths `@/*`** - Es crítico que `tsconfig.json` tenga `"@/*": ["./src/*"]` para que los imports funcionen.

---

## ✅ Listo para Replicar

Con estos archivos de configuración, tienes TODO lo necesario para replicar el módulo de certificados en otro proyecto.

