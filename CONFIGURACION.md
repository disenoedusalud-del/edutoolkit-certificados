# Configuración Paso a Paso

## Paso 1: Crear archivo .env.local

Crea un archivo llamado `.env.local` en la raíz del proyecto (`edutoolkit-certificados`) con el siguiente contenido:

```env
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDHwP2svgvAumaNg44gie5HxgARtct-ztk
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=edusalud-platfor.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=edusalud-platfor
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=edusalud-platfor.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=490035065280
NEXT_PUBLIC_FIREBASE_APP_ID=1:490035065280:web:162fef40d04ad2b5795825

# Firebase Admin Configuration
FIREBASE_ADMIN_PROJECT_ID=edusalud-platfor
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@edusalud-platfor.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCYTeXNuImQbSUv\n4bVnmMv3QFLX17nwpxMvNjXqRVA4jZVOw9aZswC6aFB/kchxNe0bQX5HDyd2ETd5\nMmyGjxbRy7jPneya6v7Eic7mWIfHo1EkkAcHB9l/liUuAPV0UBSUma8yUWKHrGz+\nZtbUP2zpfDwdew0rNbukj1w6iWpv/6s6ct5qRwJG1BKBCjeY0lqS+oTlvE6dzckb\nLa12B92eAZh75H/UnYi+xpBnkvVIXU3841XpXoYwenWdHfREW2na4f8fZ5nz9Obq\n7I8Uo7+9WNpJmwLkVyJHNNqLvMnlMsBEZxiYt8Hx1dQ7xuE+sewMRxUb5Q5OU1IC\n+gu8zy3HAgMBAAECggEARgvFfei6M9dOvAfFg4DNhchqkWRg2uIsO5FmGHmKXIgZ\nPCFriELAOfsR0qn8kryncNqdNhctIernJXFgYj5a02Arfij2kYU0aLWsl1nuEI33\nGqa25K/igwBN1yuPt8/At1s7LRwrAZT2h8ZKVVFaSMPfbfuS4eWTiCp6010xu5IX\nmQOaIY4ga0k0UDNOEm+M9GBIlGFMit2/WwP+NoOn792getQHV10xJwDZLnP+ZK1s\nrzlLLkM15MsOWCaz/dIim1pwmFe51dtwOOFkbv4DUb+Q0DOXl38IGD5BKHSMs9Kz\nOfmtZDFV69z/rcvl6NefAPSXiIkA/linwOiQcI+ksQKBgQDPUBlOgt5+F6qBk1zn\njmkN5wrO/cF1xgsJLWkDg2Nn0kfjNafD37qk5n+ODQ1sqZskAQdnoAx9fpkfT88D\n3ryQiK9+f45XLk4ViJGRf+OnPrQC6ScLPHGOrz0Xu4ALOqUFiBzWRvJvtRH4ltsw\nBecb8OJ7gN9JpnQNKuHy/ogbTwKBgQC8Ep2M+O2Q3rDCW04DpQUoqQEN86aeVrnw\nrtiWZES38lK9UFK2tnsLjvH65NGCMYSIX8ab4OqD0LqOFcClzae/EoE4R4OyWFj5\nn4/vknhom0sNe1b20p8x8UgWmnn49A+K2Anzylh6J5vQv7iSqizAdQ2J0t7jq7Sl\n60cuYihICQKBgQCSNe6zNY9PpMdHPbQ/R2wGNxWjaMphkrxDy7gNl0OrfF3g+/2H\nIqpTFJGPkNsP8QqOuP8M8Y79jyTVNYdONnANC6mh8Lpl+C1v+HKaCHV5hbqVdvRn\nc0ivlh3jOAUVZlXucdHMuhrP+AdlqJeL5g3Z4ekJq5lPK0sb4kubAjLh9wKBgFXp\nJwELgPHJV/MgZC20BvxA31NxNm5j7YItTJC+csmYLwV9mJsQFnr8LDtQpQeU+RaW\nsZHpFxdplJ5s/1h97h+RI2gC+vzP8Kzun4BvZwNZ1NnuupX7Nm9I6YYxwH/hdOwW\nrc0oZGxAhaPAwF520ASGM83+foR/ngCgzh45Bm+JAoGAEXH6uKwkwnJZf611Ufkl\n6avzvUKf/n05sixY47780HU27PtWkiojbI++ID6x66IB+4F0VNB35Rug+zgwkLKw\neHUy7B2dmTPjVwmr2FqtStpd90CvyHZ3422RItKEZVTQKHQ+Bxy5rovmt1rU7Gic\nw7itSSwB5NwE6cvAXk+LpyI=\n-----END PRIVATE KEY-----\n"
```

**Importante:** 
- El `FIREBASE_ADMIN_PRIVATE_KEY` debe estar entre comillas dobles y con los `\n` para los saltos de línea
- No compartas este archivo en Git (ya está en .gitignore)

## Paso 2: Verificar que el archivo se creó correctamente

El archivo `.env.local` debe estar en:
```
C:\Users\Daniel\Desktop\edutoolkit-certificados\.env.local
```

## Paso 3: Instalar dependencias (si no se hizo)

```bash
cd C:\Users\Daniel\Desktop\edutoolkit-certificados
npm install
```

## Paso 4: Ejecutar el servidor de desarrollo

```bash
npm run dev
```

## Paso 5: Abrir en el navegador

Abre: http://localhost:3000/admin/certificados

## Verificación

Si todo está bien configurado, deberías ver:
- La página carga sin errores
- La tabla muestra "No hay certificados registrados aún" (porque la colección está vacía)
- No hay errores en la consola del navegador

## Próximos pasos

Una vez que funcione, podrás:
1. Agregar certificados a la colección `certificates` en Firestore
2. Verlos aparecer en la tabla
3. Continuar desarrollando las funcionalidades adicionales

