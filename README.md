# App de Gastos

Aplicación personal para gestionar gastos, sincronizar transacciones desde bancos chilenos y visualizar el estado financiero mensual. Corre completamente local en tu computador.

---

## ¿Es seguro poner mis credenciales del banco?

**Sí.** Esta app no tiene servidores propios. Todo corre en tu Mac.

```
Tu browser → localhost:3000 → tu Mac → Banco de Chile
```

Tus credenciales se guardan en `gastos.db`, un archivo SQLite en tu propio disco. Cuando sincronizas, la app abre un navegador automatizado (Puppeteer) en **tu computador** y se conecta al banco igual que si lo hicieras tú manualmente. Ningún servidor externo recibe tu RUT ni tu clave.

Ver [SECURITY.md](./SECURITY.md) para el detalle técnico completo.

---

## Requisitos

- macOS con [Homebrew](https://brew.sh)
- Node.js 20+ (`brew install node`)
- Git

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/rpoch-debug/gastosapp.git
cd gastosapp

# 2. Correr el setup (instala dependencias y compila todo)
bash setup.sh

# 3. Correr la app
npm run dev
```

Abrir en el browser: [http://localhost:3000](http://localhost:3000)

> **Nota:** Si el puerto 3000 está ocupado, Next.js usará el 3001 automáticamente. Revisa la terminal — dice exactamente en qué URL quedó corriendo.

---

## Problemas frecuentes

**"Username for github.com"** al clonar → el repo es privado, pídele al dueño que te agregue como colaborador en GitHub (Settings → Collaborators).

**La app no carga en el browser** → asegúrate de haber corrido `npm run dev` después del setup. El setup solo instala, no inicia la app. Revisa la terminal para ver en qué puerto quedó (`localhost:3000` o `localhost:3001`).

**"Cannot find module tsc"** o error en setup → asegúrate de estar dentro de la carpeta `gastosapp` antes de correr cualquier comando:
```bash
cd gastosapp
bash setup.sh
```

**Node.js versión antigua** → instala la versión actual:
```bash
brew install node
```
Luego cierra y abre la terminal antes de continuar.

---

## Configurar banco

1. Click en el ícono 🏦 en el header
2. Expandir "Banco de Chile"
3. Ingresar RUT (con puntos y guión) y contraseña
4. Click **Guardar**
5. Click **Sincronizar ahora**

Las transacciones de tarjeta de crédito se importan automáticamente. Los ciclos de facturación se detectan desde la API del banco.

---

## Acceso desde otros dispositivos (opcional)

Para ver la app desde tu celular u otro computador en la misma red, usa el túnel de Cloudflare:

```bash
npm run tunnel
```

Esto genera una URL pública temporal (ej: `https://algo.trycloudflare.com`). Funciona mientras tu Mac esté encendida. Tus credenciales siguen almacenadas solo en tu computador.

---

## Funcionalidades

- Sincronización automática de tarjetas de crédito (Banco de Chile)
- Detección automática de ciclos de facturación
- Transacciones en USD separadas de CLP con tipo de cambio configurable
- Gastos fijos y cuotas mensuales
- Balance mensual: ingresos, gastos fijos y deuda total en TC
- Categorización automática de comercios

---

## Datos que NO se suben a GitHub

| Archivo | Contenido |
|---|---|
| `gastos.db` | Credenciales, transacciones, configuración |
| `.env.local` | Variables de entorno |

El repositorio contiene únicamente el código fuente. Al clonar partes con una base de datos vacía.

---

## Stack

- [Next.js 16](https://nextjs.org) — framework fullstack
- [SQLite](https://www.sqlite.org) via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — base de datos local
- [open-banking-chile](https://github.com/kaihv/open-banking-chile) — scraper bancario con Puppeteer
- [Tailwind CSS](https://tailwindcss.com) — estilos
