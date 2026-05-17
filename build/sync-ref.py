#!/usr/bin/env python3
"""
Inject ref/header-nav.html and ref/footer.html into each page in dist/.
Run from project root after rsync. Shared layout lives in ref/; build overwrites
the header and footer blocks in dist so one edit updates all pages.
"""
import os
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPT_DIR)
DIST = os.path.join(ROOT, "dist")
REF = os.path.join(ROOT, "ref")

PAGES = (
    "index.html",
    "about.html",
    "contact.html",
    "design.html",
    "apps.html",
    "music.html",
    "press.html",
)

CANONICAL_HREF_BY_PAGE = {
    "index.html": "/",
    "about.html": "/about/",
    "contact.html": "/contact/",
    "design.html": "/design/",
    "apps.html": "/apps/",
    "music.html": "/music/",
    "press.html": "/press/",
}


def main():
    with open(os.path.join(REF, "header-nav.html"), "r", encoding="utf-8") as f:
        header_nav = f.read()
    with open(os.path.join(REF, "footer.html"), "r", encoding="utf-8") as f:
        footer = f.read()

    # From first line of skip-link through line containing <main id="main-content">
    header_start = re.compile(r"^\s*<a href=\"#main-content\" class=\"skip-link\">", re.MULTILINE)
    main_open = re.compile(r"^\s*<main\s+[^>]*id=\"main-content\"[^>]*>\s*$", re.MULTILINE)
    main_close = re.compile(r"^\s*</main>\s*$", re.MULTILINE)

    for name in PAGES:
        path = os.path.join(DIST, name)
        if not os.path.isfile(path):
            continue
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        lines = content.split("\n")
        i_skip = None
        i_main_open = None
        i_main_close = None
        for i, line in enumerate(lines):
            if header_start.match(line):
                i_skip = i
            if i_skip is not None and main_open.match(line):
                i_main_open = i
                break
        for i, line in enumerate(lines):
            if main_close.match(line):
                i_main_close = i
                break

        if i_skip is None or i_main_open is None or i_main_close is None:
            continue

        before = "\n".join(lines[:i_skip])
        main_inner = "\n".join(lines[i_main_open + 1 : i_main_close])
        injected_header = header_nav.rstrip()

        # LCP: only homepage gets fetchpriority on the hero background image
        if name == "index.html":
            injected_header = re.sub(
                r'(<img src="/?img/bg_body\.jpg"[^>]*)(\s*/?>)',
                r'\1 fetchpriority="high"\2',
                injected_header,
                count=1,
            )

        # Mark current page in nav (ref has no aria-current; add it for this page).
        # For index, target the "Hello" nav link only, not the brand link.
        current_href = CANONICAL_HREF_BY_PAGE.get(name)
        if current_href == "/":
            injected_header = re.sub(
                r'<a href="/">Hello</a>',
                '<a href="/" aria-current="page">Hello</a>',
                injected_header,
                count=1,
            )
        elif current_href:
            injected_header = re.sub(
                r'<a href="' + re.escape(current_href) + r'">',
                '<a href="' + current_href + '" aria-current="page">',
                injected_header,
                count=1,
            )

        new_content = before + "\n" + injected_header + "\n" + main_inner + "\n" + footer

        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(new_content)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
