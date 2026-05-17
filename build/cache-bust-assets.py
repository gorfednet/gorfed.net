#!/usr/bin/env python3
"""
Append ?v=<mtime> to css/global.css and js/*.js in dist/*.html so browsers fetch latest assets after deploy.
Run from project root after rsync (so dist/ files exist).
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")
PAGES = (
    "index.html",
    "about.html",
    "contact.html",
    "design.html",
    "apps.html",
    "music.html",
    "press.html",
)

ASSETS = (
    ("css/global.css", re.compile(r'href="/?css/global\.css(?:\?v=[^"]*)?"'), 'href="/css/global.css?v={}"'),
    ("js/pretext.bundle.js", re.compile(r'src="/?js/pretext\.bundle\.js(?:\?v=[^"]*)?"'), 'src="/js/pretext.bundle.js?v={}"'),
    ("js/main.js", re.compile(r'src="/?js/main\.js(?:\?v=[^"]*)?"'), 'src="/js/main.js?v={}"'),
)


def main():
    for name in PAGES:
        path = os.path.join(DIST, name)
        if not os.path.isfile(path):
            continue
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        for rel, pattern, template in ASSETS:
            asset_path = os.path.join(DIST, *rel.split("/"))
            v = str(int(os.path.getmtime(asset_path))) if os.path.isfile(asset_path) else ""
            if not v:
                continue
            if pattern.search(content):
                content = pattern.sub(template.format(v), content, count=1)
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(content)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
