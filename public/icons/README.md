# PWA icons

Add real PNG icons here for production (referenced by `vite.config.ts` manifest):

- `icon-192.png` — 192×192
- `icon-512.png` — 512×512 (also used as `maskable`)

Generate from `public/favicon.svg` (e.g. via `pwa-assets-generator` or an export from
the brand mark). These are intentionally omitted from the repo as binary placeholders;
the dev server runs without them, but a production PWA install needs them (see DEVELOPMENT.md §12).
