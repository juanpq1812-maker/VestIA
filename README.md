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
| Auth / DB / Storage | Supabase _(pendiente)_ |
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

### 3. Levantar el servidor de desarrollo

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

### 4. Ver la app

Deberías ver la página de inicio de VestIA con enlaces a las rutas del MVP (login, registro, armario, outfits, etc.). Por ahora cada ruta muestra una página "En construcción" — eso es lo esperado.

### 5. Detener el servidor

En la terminal donde está corriendo `npm run dev`, presiona `Ctrl + C`.

---

## Troubleshooting (errores comunes en Codespaces)

### ❌ Veo `HTTP ERROR 502 - This page isn't working`

Esto significa que el túnel de Codespaces sí encontró el puerto, pero el servidor no respondió. Posibles causas:

1. **Estás en la rama equivocada.** Verifica con:
   ```bash
   git branch --show-current
   ```
   Debería decir `claude/vestia-wardrobe-app-uNNfy` (o `main` si ya fusionaste). Si dice otra cosa, cámbiate:
   ```bash
   git checkout claude/vestia-wardrobe-app-uNNfy
   npm install
   ```

2. **El servidor no terminó de arrancar.** Espera a ver el mensaje `✓ Ready in XXXms` en la terminal **antes** de abrir el navegador. Si abriste el navegador antes, recarga la página.

3. **El servidor está atado a IPv6 y Codespaces solo rutea IPv4.** Este proyecto ya fuerza `0.0.0.0` en el script `dev` (ver `package.json`), así que no debería pasar. Si pasa, corre manualmente:
   ```bash
   npx next dev -H 0.0.0.0 -p 3000
   ```

4. **Visibilidad del puerto.** En la pestaña **Ports** de VS Code, click derecho sobre el puerto 3000 → `Port Visibility` → `Public` (o `Private` si solo lo vas a abrir tú estando logueado en GitHub).

### ❌ `npm install` falla con errores

Asegúrate de estar en la carpeta correcta (debe haber un `package.json` en la raíz). Si no lo hay, estás en la rama equivocada (ver punto 1).

### ❌ El puerto 3000 ya está en uso

Otro proceso lo tiene tomado. Mata cualquier proceso de Next residual:
```bash
pkill -f "next dev"
```

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
│   │   └── layout/         # Componentes de layout (navbar, sidebar)
│   ├── lib/                # Utilidades y clientes (Supabase, Anthropic — pendiente)
│   └── types/              # Tipos TypeScript compartidos
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

## Próximos pasos

- [ ] Configurar Supabase (auth, base de datos y storage).
- [ ] Implementar formularios de login y registro.
- [ ] Construir flujo de onboarding (estilo + ocasiones).
- [ ] Subida de prendas con foto a Supabase Storage.
- [ ] Conectar la API de Anthropic para generar outfits.
- [ ] Deploy en Vercel.
