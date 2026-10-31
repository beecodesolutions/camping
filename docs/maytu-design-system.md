# Maytu visual identity

Central theme: `ui/src/app/theme.ts`. Both themes share typography, spacing (8 px), restrained radii, component defaults, keyboard focus and table styles. Existing automatic/manual theme switching remains intact.

Light surfaces use warm sand `#F6F1E8` and off-white `#FFFDFA`. Dark surfaces use toasted sand/charcoal `#211E1A` and `#2C2823`, with cream text rather than green backgrounds. Forest green remains the action/selection color. Both modes use a fixed forest appbar (`navigation` tokens), with cream inverse wordmark/pages and gold upper-right page. Mobile bottom navigation uses the same treatment. Mobile has a compact 48 px appbar with logo, Configuration shortcut and account menu in normal document flow; it scrolls out of view with the page. Mobile bottom navigation contains only Today, Stays and Reservations; desktop retains Configuration in its navigation. Gold is secondary; wine remains `accent` (`#963D5A` light, `#E86684` dark) for existing occupancy, chart and calendar accents. Error uses a separate red semantic color.

Georgia/system serif is intentionally local and dependency-free: h1–h4 and the lowercase wordmark. h5/h6, labels, amounts, forms, navigation and tables remain system sans-serif. Financial rows use tabular numerals. Buttons and inputs retain 44 px touch targets.

Shared navigation, login and stays adopt the foundation. Existing list behavior, filtering, menus, routes and API calls are preserved. Other screens inherit theme defaults; their local spacing/typography overrides still need a separate visual review. Do not migrate every operational heading to serif.

## Provisional logo

No approved vector asset was supplied. The isolated page-shaped placeholder is in `ui/src/components/MaytuBrand.tsx`; replace its SVG paths with the approved “Páginas que abrazan” vector. Keep upper-right page solid gold, remaining pages solid forest/currentColor, no outlines, gradients or shadows. `currentColor` supports monochrome contexts. Update `ui/public/maytu-mark.svg` (favicon) and `ui/public/maytu-app-icon.svg` together. The app icon is supplied as SVG; installable PWA/Apple raster icons are outside this increment.

## Verification

`ui/src/app/theme.test.ts` checks normal text, wine accents, semantic statuses and action-label contrast (at least 4.5:1) in both themes and protects editorial typography boundaries. Browser review uses isolated local mock data; no production data changes.
