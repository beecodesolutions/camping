# Camping

Base del frontend del SaaS para campings. Todavía no implementa estadías, tarifas, cobros, autenticación, API ni base de datos.

## Desarrollo

Requisitos: Node **24.14.1** (ver `.nvmrc`) y pnpm **10.30.1** (fijado en `packageManager`).

```sh
nvm use
pnpm install
pnpm dev
```

Abrir la URL local que imprime Vite. No necesita credenciales ni copiar archivos de entorno: `ui/.env.development` activa mocks por defecto. MSW necesita localhost o HTTPS.

## Estructura

```text
ui/
  src/
    app/           # Store RTK, tema MUI e inicialización i18n
    locales/       # Catálogo de textos por idioma
    services/      # Contratos y endpoints RTK Query
    mocks/         # Respuestas MSW para desarrollo y pruebas
    App.tsx        # Pantalla mínima
    main.tsx       # Inicialización y providers
  public/          # Worker generado de MSW
```

Un workspace y un lockfile. Agregar `api/` al workspace cuando comience backend; no se crea un servidor ni paquetes compartidos anticipadamente.

## Stack

React + Vite + TypeScript estricto, MUI con Emotion, RTK Query y MSW. Oxlint viene de la plantilla oficial de Vite; Prettier mantiene formato. Vitest comprueba integración HTTP simulada.

## Formularios y traducciones

React Hook Form, Zod y `@hookform/resolvers` están instalados para los próximos formularios. Todavía no hay formularios ni esquemas de validación implementados.

i18next + react-i18next centralizan textos de interfaz en `ui/src/locales/es.ts`, con claves tipadas. Español es idioma base/fallback y `es-CL` conserva el formato regional actual. `main.tsx` espera inicialización antes de montar React; componentes usan `useTranslation()`. Fechas e importes usan el idioma activo; la moneda sigue viniendo del camping. Nombres propios y datos de API no se traducen.

Para agregar un idioma, crear su catálogo y registrarlo en `ui/src/app/i18n.ts`. No hay selector, detector automático ni carga remota de traducciones.

## Requests simuladas

La pantalla consulta `GET /api/camping` con RTK Query. MSW responde un camping ficticio tras 300 ms. El worker se inicia **antes** de montar React. Errores HTTP se muestran con opción de reintentar. Las requests `/api/` sin handler fallan en desarrollo para descubrir endpoints faltantes.

Los handlers son compartidos por navegador y pruebas Node. Los mocks no representan un backend, no tienen autenticación y no guardan datos persistentes.

Para conectar una API futura, crear `ui/.env.local`:

```dotenv
VITE_ENABLE_MOCKS=false
VITE_API_URL=http://localhost:3000/api
```

Reiniciar Vite después de cambiar variables. La API deberá permitir el origen del frontend o configurarse un proxy. Solo existe el contrato mínimo de camping; los endpoints de negocio se agregarán con cada feature. No colocar secretos en variables `VITE_*`: llegan al navegador.

MSW se inicia únicamente con `VITE_ENABLE_MOCKS=true`. Desarrollo lo habilita por defecto; los despliegues demo pueden habilitarlo explícitamente como variable de build. Sin esa variable, la aplicación consulta la API real. Los mocks y el archivo público `mockServiceWorker.js` solo contienen datos ficticios.

## Despliegue demo en Vercel

Proyecto con raíz `ui/`, preset Vite, Node 24.x, instalación `pnpm install --frozen-lockfile`, build `pnpm build` y salida `dist`. La rama de producción es `main`.

Configurar `VITE_ENABLE_MOCKS=true` en Production y Preview mientras no exista API. La UI identifica los datos como ejemplos. Al conectar backend, quitar esa variable o ponerla en `false`, configurar `VITE_API_URL` y desplegar de nuevo.

## Comandos

```sh
pnpm lint          # Oxlint
pnpm typecheck     # TypeScript
pnpm test          # Vitest, una ejecución
pnpm format:check  # Revisar formato
pnpm format        # Aplicar formato
pnpm build         # Compilar para despliegue
pnpm preview       # Servir build existente
```

Al actualizar MSW, regenerar su worker con `pnpm --filter @camping/ui exec msw init public --save`.

## Proyecto

- [Repositorio](https://github.com/beecodesolutions/camping)
- [Backlog](https://github.com/orgs/beecodesolutions/projects/1/views/1)
- Contexto y decisiones de producto: vault Obsidian, `Projects/Camping/Overview.md`.
