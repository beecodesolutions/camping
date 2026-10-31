# Maytu visual identity

Central theme: `ui/src/app/theme.ts`. Both themes share typography, spacing (8 px), restrained radii, component defaults, keyboard focus and table styles. Existing automatic/manual theme switching remains intact.

Light surfaces use warm sand `#F6F1E8` and off-white `#FFFDFA`. Dark surfaces use toasted sand/charcoal `#211E1A` and `#2C2823`, with cream text rather than green backgrounds. Forest green remains the action/selection color. Both modes use a forest appbar (`navigation` tokens), with cream inverse wordmark/pages and gold upper-right page. Mobile bottom navigation uses the same treatment. Mobile has a compact 48 px appbar with logo, Configuration shortcut and account menu in normal document flow; it scrolls out of view with the page. Mobile bottom navigation contains only Today, Stays and Reservations; desktop retains Configuration in its navigation. Gold is secondary; wine remains `accent` (`#963D5A` light, `#E86684` dark) for existing occupancy, chart and calendar accents. Error uses a separate red semantic color.

Georgia/system serif is intentionally local and dependency-free: h1–h4 and the lowercase wordmark. h5/h6, labels, amounts, forms, navigation and tables remain system sans-serif. Financial rows use tabular numerals. Named `metric`, `metricLarge` and `metricSmall` variants keep dashboard numbers sans-serif; `pageTitle`, `brand` and `brandCompact` carry the editorial identity. Every standard and custom variant explicitly defines its family and size. Buttons and inputs retain 44 px touch targets.

Shared navigation, login and stays adopt the foundation. Existing list behavior, filtering, menus, routes and API calls are preserved. All screens now reference shared theme styles and layout presets; components contain no inline visual definitions. Do not migrate every operational heading to serif.

## Provisional logo

No approved vector asset was supplied. The isolated page-shaped placeholder is in `ui/src/components/MaytuBrand.tsx`; replace its SVG paths with the approved “Páginas que abrazan” vector. Keep upper-right page solid gold, remaining pages solid forest/currentColor, no outlines, gradients or shadows. `currentColor` supports monochrome contexts. Update `ui/public/maytu-mark.svg` (favicon) and `ui/public/maytu-app-icon.svg` together. The app icon is supplied as SVG; installable PWA/Apple raster icons are outside this increment.

## Verification

`ui/src/app/theme.test.ts` checks normal text, wine accents, semantic statuses and action-label contrast (at least 4.5:1) in both themes and protects editorial typography boundaries. Browser review uses isolated local mock data; no production data changes.

## Theme boundary

- `ui/src/app/theme.ts`: MUI theme assembly, mode palettes and component defaults/overrides.
- `ui/src/app/theme/typography.ts`: complete standard/custom variant definitions.
- `ui/src/app/theme/styles.ts`: shared layouts, responsive styles, parameterized states, calendar tones and checkout action styling.
- `ui/src/app/theme/layout.ts`: reusable declarative MUI layout presets.
- `ui/src/app/theme/visuals.ts`: illustration palette and themed chart presentation.

The same style/layout registries are exposed as `theme.ui` / `theme.layout`; React components import `uiStyles` / `uiProps` from the theme entry point. Palette-dependent callbacks resolve against the active MUI theme. SVG paths and business data remain in components; visual values stay in the theme. `themeArchitecture.test.ts` guards against reintroducing local styles, raw colors or typography definitions. See repository `AGENTS.md` for the required workflow.
