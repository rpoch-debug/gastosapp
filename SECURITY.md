# Seguridad

## ¿Dónde quedan mis credenciales del banco?

Tus credenciales (RUT y clave) **nunca salen de tu computador**.

El flujo completo es:

```
Tu browser → localhost:3000 → Next.js (en tu Mac) → gastos.db (en tu Mac)
                                      ↓
                              Banco de Chile (internet)
```

1. Ingresas RUT y clave en la interfaz web (`localhost`)
2. Se guardan en `gastos.db`, un archivo SQLite en tu propio disco
3. Cuando sincronizas, Next.js lee las credenciales desde `gastos.db` y abre un navegador headless (Puppeteer) en **tu Mac**
4. Ese navegador se conecta al banco igual que si lo hicieras tú manualmente
5. Las transacciones descargadas se guardan de vuelta en `gastos.db`

**Ningún servidor externo recibe tus credenciales.**

---

## ¿Qué archivos contienen datos sensibles?

| Archivo | Contenido | ¿En GitHub? |
|---|---|---|
| `gastos.db` | Credenciales, transacciones, gastos fijos | ❌ nunca (`.gitignore`) |
| `gastos.db-shm` | Archivo temporal de SQLite | ❌ nunca |
| `gastos.db-wal` | Archivo temporal de SQLite | ❌ nunca |
| `.env.local` | Variables de entorno opcionales | ❌ nunca |
| `src/` | Código fuente sin datos | ✅ sí |

---

## ¿Por qué no usar variables de entorno (.env)?

Esta app está diseñada para correr **completamente local**. Las credenciales se guardan en la base de datos SQLite para que puedas configurarlas desde la interfaz web sin tocar archivos de texto. No hay ningún servidor en la nube involucrado.

---

## ¿Puedo compartir el código con alguien más?

Sí. El repositorio de GitHub contiene **solo el código fuente** — sin transacciones, sin credenciales, sin datos personales. Cada usuario que clone el repo parte con una base de datos vacía y configura sus propias credenciales.

---

## Exposición a internet (opcional)

Si usas el túnel de Cloudflare (`npm run tunnel`) para acceder desde otro dispositivo:

- El tráfico viaja cifrado (HTTPS) entre tu dispositivo y tu Mac
- Cloudflare actúa como proxy pero **no tiene acceso a tu base de datos**
- Las credenciales del banco siguen viviendo solo en `gastos.db` en tu Mac
- El túnel funciona solo mientras tu Mac esté encendida con la app corriendo

Para máxima seguridad, usa la app solo en `localhost` sin el túnel.
