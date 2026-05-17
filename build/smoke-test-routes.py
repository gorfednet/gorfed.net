#!/usr/bin/env python3
"""
Smoke test extensionless routing and canonical metadata.

Usage:
  python3 build/smoke-test-routes.py --dist dist
  python3 build/smoke-test-routes.py --dist dist --base-url https://gorfed.net
"""
import argparse
import os
import re
import sys
import urllib.error
import urllib.request

from site_pages import PRIMARY_ROUTE_SLUGS


def fail(message):
    print(f"FAIL: {message}")
    return 1


def check_local_dist(dist_dir):
    failures = 0
    for slug in PRIMARY_ROUTE_SLUGS:
        html_file = os.path.join(dist_dir, f"{slug}.html")
        alias_file = os.path.join(dist_dir, slug, "index.html")
        if not os.path.isfile(html_file):
            failures += fail(f"Missing page file: {html_file}")
            continue
        if not os.path.isfile(alias_file):
            failures += fail(f"Missing alias file: {alias_file}")
            continue

        with open(html_file, "r", encoding="utf-8") as f:
            content = f.read()

        if "://www.gorfed.net" in content:
            failures += fail(f"Found deprecated www URL in {html_file}")
        if f'<meta property="og:url" content="https://gorfed.net/{slug}/">' not in content:
            failures += fail(f"Incorrect og:url in {html_file}")
        if f'<link rel="canonical" href="https://gorfed.net/{slug}/">' not in content:
            failures += fail(f"Incorrect canonical in {html_file}")
        if re.search(r'href="(?:index|about|contact|design|apps|music|press)\.html"', content):
            failures += fail(f"Legacy internal .html nav link found in {html_file}")

    index_file = os.path.join(dist_dir, "index.html")
    if not os.path.isfile(index_file):
        failures += fail(f"Missing homepage file: {index_file}")
    else:
        with open(index_file, "r", encoding="utf-8") as f:
            index_content = f.read()
        if "://www.gorfed.net" in index_content:
            failures += fail(f"Found deprecated www URL in {index_file}")
        if '<meta property="og:url" content="https://gorfed.net/">' not in index_content:
            failures += fail("Incorrect homepage og:url")
        if '<link rel="canonical" href="https://gorfed.net/">' not in index_content:
            failures += fail("Incorrect homepage canonical")

    return failures


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def fetch_status(url):
    req = urllib.request.Request(url, method="GET")
    opener = urllib.request.build_opener(NoRedirect)
    try:
        with opener.open(req, timeout=10) as resp:
            return resp.getcode(), resp.headers.get("Location", ""), ""
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Location", ""), ""
    except Exception as exc:  # noqa: BLE001
        return None, "", str(exc)


def check_live_routes(base_url):
    failures = 0
    base_url = base_url.rstrip("/")

    status, _, err = fetch_status(f"{base_url}/")
    if err:
        return fail(f"Could not reach {base_url}/ ({err})")
    if status not in (200, 301, 302):
        failures += fail(f"Unexpected status for {base_url}/: {status}")

    for slug in PRIMARY_ROUTE_SLUGS:
        extless = f"{base_url}/{slug}/"
        status, _, err = fetch_status(extless)
        if err:
            failures += fail(f"Could not reach {extless} ({err})")
            continue
        if status not in (200, 301, 302):
            failures += fail(f"Unexpected status for {extless}: {status}")

        legacy = f"{base_url}/{slug}.html"
        status, location, err = fetch_status(legacy)
        if err:
            failures += fail(f"Could not reach {legacy} ({err})")
            continue
        if status not in (301, 302, 200):
            failures += fail(f"Unexpected status for {legacy}: {status}")
        if status in (301, 302):
            expected = f"/{slug}/"
            if not location.endswith(expected):
                failures += fail(f"Unexpected redirect for {legacy}: {location}")

    return failures


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dist", default="dist", help="Path to dist directory")
    parser.add_argument("--base-url", default="", help="Optional live base URL for HTTP checks")
    args = parser.parse_args()

    failures = check_local_dist(args.dist)
    if args.base_url:
        failures += check_live_routes(args.base_url)

    if failures:
        print(f"\nSmoke test failed with {failures} issue(s).")
        return 1
    print("Smoke test passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
