#!/usr/bin/env python3
"""
Verify baseline page quality standards for primary routes.

This keeps repeated static page markup aligned across metadata, accessibility,
and outbound-link safety conventions without requiring a full framework.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from site_pages import PRIMARY_HTML_PAGES


ROOT = Path(__file__).resolve().parents[1]

REQUIRED_META_SNIPPETS = (
    'name="description"',
    'name="theme-color"',
    'property="og:title"',
    'property="og:description"',
    'property="og:url"',
    'property="og:site_name"',
    'property="og:locale"',
    'property="og:image"',
    'property="og:image:alt"',
    'name="twitter:card"',
    'name="twitter:title"',
    'name="twitter:description"',
    'name="twitter:image"',
    'name="twitter:image:alt"',
    'rel="canonical"',
)


def fail(message: str) -> None:
    print(f"page-standards: {message}")
    raise SystemExit(1)


def has_secure_blank_target(anchor_markup: str) -> bool:
    if 'target="_blank"' not in anchor_markup:
        return True
    rel_match = re.search(r'rel="([^"]+)"', anchor_markup)
    if not rel_match:
        return False
    rel_tokens = set(rel_match.group(1).split())
    return "noopener" in rel_tokens and "noreferrer" in rel_tokens


def verify_page(name: str, html: str) -> None:
    if not re.search(r"<html\b[^>]*\blang=\"en\"", html):
        fail(f"{name}: expected <html lang=\"en\"> (document language for SR and hyphenation)")

    h1_count = len(re.findall(r"<h1\b", html))
    if h1_count != 1:
        fail(f"{name}: expected exactly 1 <h1>, found {h1_count}")

    if 'id="main-content"' not in html:
        fail(f'{name}: missing main landmark id="main-content"')
    if 'class="skip-link"' not in html:
        fail(f"{name}: missing skip link")
    if 'class="nav-toggle"' not in html:
        fail(f"{name}: missing nav toggle")
    if 'aria-label="Open menu"' not in html:
        fail(f'{name}: nav toggle default aria-label must be "Open menu"')

    if 'class="site-footer"' not in html or 'role="contentinfo"' not in html:
        fail(f"{name}: missing site footer landmark")
    if "© 2002-2026 Michael Duncan McArthur. All rights reserved." not in html:
        fail(f"{name}: missing expected copyright line in footer")

    for snippet in REQUIRED_META_SNIPPETS:
        if snippet not in html:
            fail(f"{name}: missing metadata snippet {snippet}")

    for match in re.finditer(r"<a\b[^>]*>", html):
        anchor = match.group(0)
        if not has_secure_blank_target(anchor):
            fail(f"{name}: target=_blank anchor missing rel=noopener noreferrer")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify static page standards.")
    parser.add_argument(
        "--dist",
        default=".",
        help="Directory containing primary HTML pages (default: project root).",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    base = (ROOT / args.dist).resolve()
    for page in PRIMARY_HTML_PAGES:
        path = base / page
        verify_page(page, path.read_text(encoding="utf-8"))
    print(
        "page-standards: primary page metadata, a11y, link safety, and footer are consistent."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
