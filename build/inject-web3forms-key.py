#!/usr/bin/env python3
"""
Inject WEB3FORMS_ACCESS_KEY into dist/contact.html at build time.
The source file keeps an empty key so secrets are not hardcoded in tracked HTML.
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_CONTACT = os.path.join(ROOT, "dist", "contact.html")
ENV_KEY = "WEB3FORMS_ACCESS_KEY"
ATTR_PATTERN = re.compile(r'data-web3forms-key="[^"]*"')


def main():
    if not os.path.isfile(DIST_CONTACT):
        return 0

    key = (os.environ.get(ENV_KEY) or "").strip()
    if not key:
        return 0

    with open(DIST_CONTACT, "r", encoding="utf-8") as f:
        content = f.read()

    if not ATTR_PATTERN.search(content):
        return 0

    content = ATTR_PATTERN.sub('data-web3forms-key="' + key + '"', content, count=1)

    with open(DIST_CONTACT, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
