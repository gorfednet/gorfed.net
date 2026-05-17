#!/usr/bin/env python3
"""
Verify shared top-nav structure stays consistent across source pages.

Why this exists:
- Header/nav markup is duplicated across page files by design (static site).
- This guard catches accidental drift early (labels, links, icon presence, toggle affordance).
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

from site_pages import PRIMARY_HTML_PAGES


ROOT = Path(__file__).resolve().parents[1]

EXPECTED_LINKS = [
    ("/", "Hello"),
    ("/design/", "Design"),
    ("/apps/", "Apps"),
    ("/music/", "Music"),
    ("/press/", "Press"),
    ("/about/", "About"),
    ("/contact/", "Contact"),
]


def fail(msg: str) -> None:
    print(f"nav-check: {msg}")
    raise SystemExit(1)


def main() -> int:
    for rel in PRIMARY_HTML_PAGES:
        path = ROOT / rel
        html = path.read_text(encoding="utf-8")

        if 'class="nav-toggle-icon nav-toggle-icon--open"' not in html:
            fail(f"{rel}: missing open-state hamburger icon")
        if 'class="nav-toggle-icon nav-toggle-icon--close"' not in html:
            fail(f"{rel}: missing close-state X icon")
        if 'class="nav" id="nav"' not in html:
            fail(f"{rel}: missing main nav container")

        links = re.findall(r'<li><a href="([^"]+)"(?: aria-current="page")?>([^<]+)<svg class="nav-icon"', html)
        if links != EXPECTED_LINKS:
            fail(f"{rel}: nav links/order mismatch")

        if html.count('class="nav-icon"') != len(EXPECTED_LINKS):
            fail(f"{rel}: expected {len(EXPECTED_LINKS)} nav icons")

    print("nav-check: shared nav structure is consistent.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
