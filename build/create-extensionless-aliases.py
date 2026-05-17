#!/usr/bin/env python3
"""
Create extensionless directory aliases in dist/ for each top-level page.
Example: dist/about/index.html mirrors dist/about.html.

This allows extensionless paths to resolve on static hosts that do not support
rewrites, while preserving legacy .html files for backward compatibility.
"""
import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")

PAGES = (
    "about.html",
    "contact.html",
    "design.html",
    "apps.html",
    "music.html",
    "press.html",
)


def main():
    for page in PAGES:
        src = os.path.join(DIST, page)
        if not os.path.isfile(src):
            continue
        slug = page[:-5]  # trim .html
        alias_dir = os.path.join(DIST, slug)
        alias_index = os.path.join(alias_dir, "index.html")
        os.makedirs(alias_dir, exist_ok=True)
        shutil.copyfile(src, alias_index)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
