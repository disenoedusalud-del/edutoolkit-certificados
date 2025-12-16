# 🔧 Solución: Error de Proyecto Firebase

## ❌ Problema

El error indica que hay una inconsistencia entre los proyectos de Firebase:

- **Firebase Admin (backend)**: Usa `edusalud-platfor`
- **Firebase Client (navegador)**: Usa `edutoolkit-certificados`

Esto causa el error:
```
Firebase ID token has incorrect "aud" (audience) claim. 
Expected "edusalud-platfor" but got "edutoolkit-certificados"
```

## ✅ Solución

Necesitas usar el **Service Account del proyecto `edutoolkit-certificados`** (el mismo que usa el cliente).

### Paso 1: Obtener el Service Account correcto

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona el proyecto **`edutoolkit-certificados`** (no `edusalud-platfor`)
3. Ve a **Configuración del proyecto** (⚙️) → **Cuentas de servicio**
4. Haz clic en **Generar nueva clave privada**
5. Se descargará un archivo JSON

### Paso 2: Generar el base64

Una vez que tengas el JSON del Service Account de `edutoolkit-certificados`, necesitas convertirlo a base64.

**Opción A: Usando PowerShell (Windows)**
```powershell
# Guarda el JSON como service-account-edutoolkit.json
$json = Get-Content 'service-account-edutoolkit.json' -Raw -Encoding UTF8
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
$b64 = [Convert]::ToBase64String($bytes)
$b64 | Set-Clipboard
Write-Host "Base64 copiado al portapapeles"
```

**Opción B: Usando herramientas online**
- Ve a https://www.base64encode.org/
- Pega el contenido completo del JSON
- Copia el base64 resultante

### Paso 3: Actualizar en Vercel

1. Ve a Vercel → Settings → Environment Variables
2. Busca `FIREBASE_ADMIN_SA_BASE64`
3. Reemplaza el valor con el nuevo base64 del Service Account de `edutoolkit-certificados`
4. Guarda
5. Ve a Deployments → Último deployment → **Redeploy** (sin cache)

### Paso 4: Verificar

Después del redeploy, intenta iniciar sesión de nuevo. El error debería desaparecer.

---

## 🔍 Verificación

Después de actualizar, verifica en los logs de Vercel que ahora dice:

```
[FIREBASE-ADMIN] sa email: firebase-adminsdk-xxxxx@edutoolkit-certificados.iam.gserviceaccount.com
```

En lugar de:

```
[FIREBASE-ADMIN] sa email: firebase-adminsdk-fbsvc@edusalud-platfor.iam.gserviceaccount.com
```

---

## ⚠️ Nota

Si prefieres usar el proyecto `edusalud-platfor` en lugar de `edutoolkit-certificados`, entonces necesitarías cambiar las variables `NEXT_PUBLIC_FIREBASE_*` para que apunten a `edusalud-platfor`. Pero como ya tienes todo configurado con `edutoolkit-certificados`, es más fácil cambiar el Service Account.

