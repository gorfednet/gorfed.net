"""
Primary static HTML filenames at the repo root.

Single source of truth for build/verify-*.py so the page list cannot drift.
"""

PRIMARY_HTML_PAGES = (
    "index.html",
    "about.html",
    "apps.html",
    "contact.html",
    "design.html",
    "music.html",
    "press.html",
)

# Extensionless URL path segments (smoke tests, redirects); derived from filenames, index excluded.
PRIMARY_ROUTE_SLUGS = tuple(
    name[:-5] for name in PRIMARY_HTML_PAGES if name != "index.html"
)
