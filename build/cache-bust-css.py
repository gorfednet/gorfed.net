#!/usr/bin/env python3
"""
Append ?v=<mtime> to css/global.css in dist/*.html so browsers fetch the latest file after deploy.
Run from project root after rsync (so dist/css/global.css exists).
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")
PAGES = ("index.html", "about.html", "contact.html", "design.html", "music.html", "press.html")

def main():
    css_path = os.path.join(DIST, "css", "global.css")
    v = str(int(os.path.getmtime(css_path))) if os.path.isfile(css_path) else ""
    pattern = re.compile(r'href="css/global\.css"')
    replacement = 'href="css/global.css?v=' + v + '"'
    for name in PAGES:
        path = os.path.join(DIST, name)
        if not os.path.isfile(path):
            continue
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        if pattern.search(content):
            content = pattern.sub(replacement, content)
            with open(path, "w", encoding="utf-8", newline="\n") as f:
                f.write(content)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
