# gorfed.net — structure reference

Use this and the `ref/` fragments when adding or editing pages. Keeps markup, security, and accessibility consistent.

## Shared structure (ref/)

- **ref/header-nav.html** — Skip link, background, page wrapper, header, brand, nav toggle, nav list, and opening `<main id="main-content">`. Build injects this into every page in `dist/`; edit here once and run `make build`.
- **ref/footer.html** — Closes `</main>`, wrapper, script, `</body>`, `</html>`. Same build-time injection.

Per-page `<head>` (title, description, meta, CSP) stays in each HTML file in the project root. When adding a new page: add the file to the project root with your content, add it to `build/sync-ref.py` in the `PAGES` tuple, then run `make build`. Update the nav `<ul>` in ref/header-nav.html only; build propagates it to all pages.

The Makefile rsync excludes `ref/`, `build/`, `dist/`, and `dist 2/` (stale or duplicate trees must never ship to `dist/`).

## Head (every page)

- **ref/head.html** is the canonical reference for the shared head (security, preconnect, fonts, stylesheet). When you change security or fonts, update ref/head.html and apply the same block to each root page so they stay in sync.
- Charset, viewport, then security: `X-Content-Type-Options`, `referrer`, CSP (see below).
- Preconnect for fonts; then the Google Fonts stylesheet link; then per-page title/description and `css/global.css`.
- Unique `<title>` and `<meta name="description">` (and og/twitter) per page. No inline styles or scripts.

## Body shell

1. Skip link → `#main-content` (WCAG 2.4.1).
2. Decorative background: `#bg` with `alt=""`, `fetchpriority="high"` on homepage only if you want LCP hint.
3. Wrapper: `.page` with `id="page-wrap"`.
4. Header: brand (h1 + link), nav toggle (aria-expanded, aria-controls, aria-label), nav (aria-label="Main").
5. Main: `<main class="main" id="main-content">` — content here.
6. Script: `<script src="js/main.js" defer></script>` before `</body>`.

## Section headings

- Page-level: `<h2 id="…-heading" class="h2-icon"><svg class="h2-icon-svg" …><use href="img/icons.svg#icon-…"/></svg>Title</h2>`.
- Use `aria-labelledby` on `<section>` or wrapper pointing to that heading when it labels the region.
- Card/item title: plain `<h3>Title</h3>` (section **h2** rows use `.h2-icon` + sprite; card titles are text-only).

## Links

- External: `target="_blank" rel="noopener noreferrer"`.
- Same-site: no target; use `aria-current="page"` on nav link for current page (JS sets this from URL).

## Security

**In HTML (meta):**

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin` (meta name="referrer" content="strict-origin-when-cross-origin")
- CSP: no inline script/style; script and style only from self (and fonts from Google). `frame-ancestors 'none'`; `base-uri 'self'`.

**On the server (recommended HTTP headers):**

Set these on the host (e.g. Apache, nginx) for defence in depth:

- `X-Frame-Options: DENY` (or SAMEORIGIN if you need to embed)
- `X-Content-Type-Options: nosniff` (duplicate of meta is fine)
- `Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()` (restrict unneeded features)
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HTTPS only; use once TLS is solid)

Do not put secrets in HTML or JS. Email is assembled from data-user/data-domain in JS to reduce harvesting.

## Accessibility (AA)

- One logical `<h1>` per page (site title in header).
- Heading order: no skipped levels (h2 → h3, not h2 → h4).
- Skip link visible on focus; focus styles on all interactive elements (CSS uses `:focus-visible`).
- Sufficient contrast: body text and UI use `--text-muted`, `--text-primary`, `--accent` on `--bg-dark` (meets 4.5:1 for normal text).
- Motion: `prefers-reduced-motion: reduce` respected for transitions and animations.
- Nav: aria-expanded, aria-controls on toggle; aria-label on nav; focus trapped/moved appropriately when menu opens (JS).
- Decorative images: `alt=""`. Icons in headings: `aria-hidden="true" focusable="false"`.

## CSS variables (global.css)

Edit in `:root` to change the look site-wide:

- **Colour:** `--bg-dark` (page), `--text-primary` (headings/links), `--text-muted` (body), `--panel-bg` / `--panel-hover` (panels), `--card-bg` / `--card-hover`, `--border-subtle`, `--accent` (hover/highlight).
- **Layout:** `--transition`, `--radius`, `--header-height`, `--max-width`, `--gap`.
- **Type:** `--font-heading`, `--font-body`; sizes `--text-display` down to `--text-overline`; heading sizes `--heading-h1` … `--heading-h5`; `--heading-icon-size`, `--heading-icon-gap`.

Naming is by purpose (e.g. text-primary for main text colour), not by value.

## W3C

- Valid HTML5: one root, correct nesting, no duplicate IDs. Run Nu validator when changing structure.
- Inline SVG: use `stroke-width` (lowercase with hyphen) and `aria-hidden="true"` on decorative icons.
