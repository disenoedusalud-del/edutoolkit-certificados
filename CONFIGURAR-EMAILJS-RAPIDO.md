# ⚡ Configuración Rápida de EmailJS

## 🎯 Pasos Esenciales

### 1️⃣ Crear cuenta y conectar email
- Ve a https://www.emailjs.com/ y crea cuenta
- Dashboard → **Email Services** → **Add New Service**
- Conecta Gmail (o tu proveedor)
- **Copia el Service ID** (ej: `service_abc123`)

### 2️⃣ Crear plantilla
- Dashboard → **Email Templates** → **Create New Template**
- **Asunto:** `Restablecer contraseña - Panel de Certificados EduSalud`
- **Contenido:** Copia TODO el HTML de `email-template-password-reset.html`
- **Modo:** Asegúrate de estar en modo **HTML** (no texto)
- Guarda y **copia el Template ID** (ej: `template_xyz789`)

### 3️⃣ Obtener API Key
- Dashboard → **Account** → **API Keys**
- **Copia la Private Key** (o Public Key si no tienes Private)

### 4️⃣ Agregar al .env.local

Abre tu archivo `.env.local` y agrega estas 3 líneas al final:

```env
EMAILJS_SERVICE_ID=service_abc123
EMAILJS_TEMPLATE_ID=template_xyz789
EMAILJS_PRIVATE_KEY=tu_private_key_aqui
```

**Reemplaza:**
- `service_abc123` → Tu Service ID real
- `template_xyz789` → Tu Template ID real  
- `tu_private_key_aqui` → Tu Private Key real

### 5️⃣ Reiniciar servidor

```bash
# Detén el servidor (Ctrl + C)
npm run dev
```

### 6️⃣ Probar

- Ve a: http://localhost:3000/forgot-password
- Ingresa un email autorizado
- Deberías recibir el email en segundos

---

## 📋 Checklist

- [ ] Cuenta creada en EmailJS
- [ ] Servicio de email conectado (Gmail/Outlook/etc)
- [ ] Service ID copiado
- [ ] Plantilla creada con el HTML
- [ ] Template ID copiado
- [ ] Private Key copiada
- [ ] Variables agregadas a `.env.local`
- [ ] Servidor reiniciado
- [ ] Prueba realizada

---

## ❓ ¿Dónde encuentro cada cosa?

| Lo que necesitas | Dónde encontrarlo |
|-----------------|-------------------|
| Service ID | EmailJS → Email Services → Tu servicio → Service ID |
| Template ID | EmailJS → Email Templates → Tu plantilla → Template ID |
| Private Key | EmailJS → Account → API Keys → Private Key |

---

## 🔍 Si algo no funciona

1. **Verifica que las 3 variables estén en `.env.local`**
2. **Reinicia el servidor** (muy importante)
3. **Revisa la consola** del servidor para ver errores
4. **Revisa spam** en tu email
5. **Verifica que el email esté autorizado** en tu sistema

---

**¿Necesitas más detalles?** Lee `GUIA-EMAILJS.md` para la guía completa paso a paso.


