# Ref: shared layout fragments

Edits here apply to every page after you run `make build`.

- **head.html** — Canonical `<head>` template (security meta, fonts, placeholders for title/description/og). Not injected by build; keep each root page’s head in sync with this so all pages share the same security and structure. Per-page: title, description, og:url, og:title, og:description, twitter:*.
- **header-nav.html** — Skip link, background image, page wrapper, site header, brand, nav menu, and opening `<main id="main-content">`. Build injects this into all pages in `dist/` and sets `aria-current="page"` on the current nav item.
- **footer.html** — Closing `</main>`, page wrapper, script tag, `</body>`, `</html>`. Build injects this into all pages in `dist/`.

Build: `make build` runs rsync (excludes `ref/`, `build/`, `dist/`, and `dist 2/`) then `build/sync-ref.py` (header/footer injection) and `build/cache-bust-css.py` (CSS cache query string).
