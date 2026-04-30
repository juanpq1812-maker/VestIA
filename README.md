# VestIA

**Tu armario digital con IA.** Aplicación web que te permite subir fotos de tu ropa, generar outfits combinados con inteligencia artificial y medir el impacto sostenible de tu vestuario.

Proyecto de grado — Universidad Sergio Arboleda · Bogotá.

Prototipo inicial (HTML estático): https://vestiamobileapp.netlify.app/

---

## ¿Qué incluirá el MVP?

1. **Login y registro** de usuarios.
2. **Onboarding** para definir estilo y ocasiones favoritas.
3. **Subir prendas** del armario con foto.
4. **Generar outfits con IA** usando la API de Anthropic (Claude Sonnet 4.6).
5. **Vista del armario** con la galería de prendas.

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS v4 |
| Auth / DB / Storage | Supabase (auth ✅ · DB y Storage pendientes) |
| IA | API de Anthropic — Claude Sonnet 4.6 _(pendiente)_ |
| Deploy | Vercel _(pendiente)_ |

---

## Cómo correrlo en GitHub Codespaces

> Estos pasos asumen que estás trabajando 100% en la nube con Codespaces. No necesitas instalar nada en tu computador.

### 1. Abrir el Codespace

En el repo de GitHub, click en `Code` → pestaña `Codespaces` → `Create codespace on claude/vestia-wardrobe-app-uNNfy`.

Espera a que cargue el editor (un VS Code en el navegador).

### 2. Instalar las dependencias

En la terminal de Codespaces (menú `Terminal` → `New Terminal`):

```bash
npm install
```

Esto descarga todas las librerías que necesita el proyecto en una carpeta `node_modules/` (que está ignorada por git).

### 3. Configurar Supabase (`.env.local`)

La app necesita conectarse a tu proyecto de Supabase para autenticación. Las credenciales viven en un archivo local que **no se sube a git** (está ignorado en `.gitignore`).

1. Copia el archivo de ejemplo:

   ```bash
   cp .env.local.example .env.local
   ```

2. Abre `.env.local` y reemplaza los placeholders con los datos reales de tu proyecto:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-publica
   ```

   Encuentras estos valores en: **Supabase Dashboard → tu proyecto → Settings → API**.
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` _(NO uses la `service_role`, esa es secreta)_

3. Si ya tenías el servidor de desarrollo corriendo, detenlo (`Ctrl+C`) y vuélvelo a iniciar para que Next.js cargue las variables nuevas.

### 4. Levantar el servidor de desarrollo

```bash
npm run dev
```

Cuando termine de compilar verás algo como:

```
▲ Next.js 16.x
- Local:        http://localhost:3000
```

Codespaces detecta el puerto 3000 automáticamente y muestra una ventana emergente que dice **"Open in Browser"**. Click ahí.

> Si no aparece la ventana: abre la pestaña `Ports` en la barra inferior de VS Code, busca el puerto `3000` y haz click en el ícono del globo terráqueo (🌐).

### 5. Ver la app

Deberías ver la página de inicio de VestIA con enlaces a las rutas del MVP. Las rutas de auth (`/login`, `/register`) ya son funcionales y conectan a Supabase. El resto sigue mostrando una página "En construcción" — eso es lo esperado.

### 6. Detener el servidor

En la terminal donde está corriendo `npm run dev`, presiona `Ctrl + C`.

---

## Estructura del proyecto

```
VestIA/
├── public/                 # Imágenes y archivos estáticos públicos
├── src/
│   ├── app/                # Rutas de la app (App Router de Next.js)
│   │   ├── layout.tsx      # Layout raíz (HTML, fuentes, metadatos)
│   │   ├── page.tsx        # Página de inicio
│   │   ├── globals.css     # Estilos globales (Tailwind)
│   │   ├── login/          # /login
│   │   ├── register/       # /register
│   │   ├── onboarding/     # /onboarding
│   │   ├── wardrobe/       # /wardrobe (armario)
│   │   │   └── upload/     # /wardrobe/upload (subir prenda)
│   │   └── outfits/        # /outfits (generación con IA)
│   ├── components/
│   │   ├── ui/             # Componentes reutilizables (botones, cards, etc.)
│   │   ├── auth/           # Componentes de autenticación (LogoutButton, etc.)
│   │   └── layout/         # Componentes de layout (navbar, sidebar)
│   ├── lib/
│   │   └── supabase/       # Clientes de Supabase (browser, server, proxy)
│   ├── types/              # Tipos TypeScript compartidos
│   └── proxy.ts            # Proxy de Next.js 16 (refresca sesión + protege rutas)
├── .env.local.example      # Plantilla de variables de entorno (copiar a .env.local)
├── package.json            # Dependencias y scripts del proyecto
├── tsconfig.json           # Configuración de TypeScript
├── next.config.ts          # Configuración de Next.js
├── eslint.config.mjs       # Configuración del linter
└── postcss.config.mjs      # Configuración de PostCSS (Tailwind)
```

## Scripts disponibles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo en `http://localhost:3000`. |
| `npm run build` | Compila la app para producción. |
| `npm start` | Corre la versión de producción ya compilada. |
| `npm run lint` | Revisa el código en busca de errores de estilo. |

---

## Autenticación (Supabase)

La capa 1 del MVP — autenticación con email + contraseña — ya está lista:

- `/register` y `/login` son formularios funcionales conectados a Supabase Auth.
- Las rutas privadas (`/onboarding`, `/wardrobe`, `/wardrobe/upload`, `/outfits`) están protegidas: si no hay sesión, te redirige a `/login`.
- Si ya tienes sesión y entras a `/login` o `/register`, te lleva directo a `/wardrobe`.
- En `/wardrobe` aparece el email del usuario activo y un botón **Cerrar sesión**.

La sesión se mantiene viva automáticamente: el archivo `src/proxy.ts` refresca el token en cada request usando el patrón oficial de `@supabase/ssr`.

### Cómo probarlo

1. Asegúrate de haber configurado `.env.local` (paso 3 de arriba) y de tener el servidor corriendo.
2. Ve a `http://localhost:3000/register` y crea una cuenta con un email cualquiera y una contraseña de mínimo 6 caracteres.
3. Si todo funciona, te redirige a `/onboarding`. Si vas a `/wardrobe` deberías ver tu email y el botón de cerrar sesión.
4. Click en **Cerrar sesión** → vuelves a `/login`.
5. Inicia sesión con el mismo email/contraseña → vuelves al armario.
6. Verifica el usuario creado en Supabase Dashboard → **Authentication → Users**.

## Próximos pasos

- [x] Configurar Supabase Auth con email + contraseña.
- [x] Implementar formularios de login y registro.
- [x] Proteger rutas privadas con el Proxy de Next.js 16.
- [ ] Construir flujo de onboarding (estilo + ocasiones).
- [ ] Subida de prendas con foto a Supabase Storage.
- [ ] Conectar la API de Anthropic para generar outfits.
- [ ] Deploy en Vercel.
