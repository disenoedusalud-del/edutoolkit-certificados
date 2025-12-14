# 🔧 Solución: "API calls are disabled for non-browser applications"

## Problema

El error `API calls are disabled for non-browser applications` significa que EmailJS tiene deshabilitadas las llamadas desde aplicaciones backend (Node.js).

## Solución: Habilitar API calls en EmailJS

### Paso 1: Ve a EmailJS Dashboard

1. Ve a https://www.emailjs.com/
2. Inicia sesión en tu cuenta

### Paso 2: Habilitar API calls

1. Ve a **"Account"** (Cuenta) en el menú superior
2. Busca la sección **"Security"** o **"API Settings"**
3. Busca la opción **"Allow API calls from non-browser applications"** o **"Enable server-side API"**
4. **Activa/Habilita** esta opción
5. Guarda los cambios

### Paso 3: Verificar Private Key

Si después de habilitar aún no funciona, verifica:

1. Ve a **"Account"** → **"API Keys"**
2. Asegúrate de tener una **Private Key** creada
3. Si no tienes una, haz clic en **"Create Private Key"**
4. Copia la Private Key completa

### Paso 4: Actualizar .env.local

Si creaste una nueva Private Key, actualiza tu `.env.local`:

```env
EMAILJS_PUBLIC_KEY=ZWBMGv7t-uBiUF2KB
EMAILJS_PRIVATE_KEY=tu_nueva_private_key_aqui
```

### Paso 5: Reiniciar servidor

```bash
# Detén el servidor (Ctrl + C)
npm run dev
```

## Alternativa: Usar Private Key en lugar de Public Key

Si habilitar las API calls no funciona, podemos usar la Private Key directamente. El código ya está preparado para esto.

## Verificación

Después de habilitar, intenta restablecer la contraseña de nuevo. Deberías ver en los logs:

```
[EMAIL] ✅ Email enviado exitosamente: { status: 200, ... }
```

En lugar de:

```
[EMAIL] ❌ Error: API calls are disabled...
```


