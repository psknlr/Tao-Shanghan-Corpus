#!/usr/bin/env python3
"""Collect dataset download counts and write them for the explorer to display.

GitHub Pages is a static host: there is no server to increment a counter when
someone downloads the dataset. The only figure that is both real and independently
verifiable is the one GitHub itself keeps — the `download_count` it records for
every release asset — so downloads are routed through a release asset and the
count is read back from the API here.

Two sources are collected, both best-effort:

  releases  GET /repos/{owner}/{repo}/releases
            Per-asset download_count. Public endpoint; no token required.
  traffic   GET /repos/{owner}/{repo}/traffic/{clones,views}
            Requires a token with push access, and is only ever a 14-day window.
            Omitted rather than guessed when unavailable.

The script never fails the build. If the network, the API or the token is
unavailable it writes a payload with `available: false`, and the site falls back
to linking the repository archive and shows no counter rather than a wrong one.

Usage:  python3 scripts/fetch_download_metrics.py [--out site/public/data/metrics.json]
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_REPO = "psknlr/Tao-Shanghan-Corpus"
API = "https://api.github.com"
TIMEOUT = 20


def api_get(path: str, token: str | None) -> object | None:
    """Return the decoded JSON body, or None if the call did not succeed."""
    request = urllib.request.Request(f"{API}{path}")
    request.add_header("Accept", "application/vnd.github+json")
    request.add_header("X-GitHub-Api-Version", "2022-11-28")
    request.add_header("User-Agent", "historical-shanghan-corpus-metrics")
    if token:
        request.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        # 404 on traffic simply means the token cannot see it; not an error here.
        print(f"note: {path} -> HTTP {error.code}", file=sys.stderr)
    except Exception as error:  # network down, DNS, TLS, malformed body
        print(f"note: {path} -> {type(error).__name__}: {error}", file=sys.stderr)
    return None


def collect_releases(repo: str, token: str | None) -> tuple[list[dict], int]:
    payload = api_get(f"/repos/{repo}/releases?per_page=100", token)
    if not isinstance(payload, list):
        return [], 0

    releases: list[dict] = []
    total = 0
    for release in payload:
        if release.get("draft"):
            continue
        assets = []
        for asset in release.get("assets", []):
            count = int(asset.get("download_count", 0))
            total += count
            assets.append({
                "name": asset.get("name", ""),
                "download_count": count,
                "size": int(asset.get("size", 0)),
                "url": asset.get("browser_download_url", ""),
                "updated_at": asset.get("updated_at", ""),
            })
        if not assets:
            continue
        releases.append({
            "tag": release.get("tag_name", ""),
            "name": release.get("name", ""),
            "published_at": release.get("published_at", ""),
            "html_url": release.get("html_url", ""),
            "prerelease": bool(release.get("prerelease")),
            "assets": sorted(assets, key=lambda a: -a["download_count"]),
        })
    releases.sort(key=lambda r: r["published_at"], reverse=True)
    return releases, total


def collect_traffic(repo: str, token: str | None) -> dict:
    """14-day clone and view counts. Requires push access; omitted otherwise."""
    if not token:
        return {"available": False}

    clones = api_get(f"/repos/{repo}/traffic/clones", token)
    views = api_get(f"/repos/{repo}/traffic/views", token)
    if not isinstance(clones, dict) and not isinstance(views, dict):
        return {"available": False}

    traffic: dict = {"available": True, "window_days": 14}
    if isinstance(clones, dict):
        traffic["clones"] = int(clones.get("count", 0))
        traffic["unique_clones"] = int(clones.get("uniques", 0))
    if isinstance(views, dict):
        traffic["views"] = int(views.get("count", 0))
        traffic["unique_views"] = int(views.get("uniques", 0))
    return traffic


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="site/public/data/metrics.json")
    parser.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY") or DEFAULT_REPO)
    args = parser.parse_args()

    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    releases, total = collect_releases(args.repo, token)

    payload = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "repository": args.repo,
        # `available` gates the whole feature in the UI: with no published
        # release there is nothing GitHub can have counted, and the site links
        # the repository archive instead of showing a figure of zero.
        "available": bool(releases),
        "source": "GitHub release asset download_count",
        "total_downloads": total,
        "releases": releases,
        "latest_asset": (
            releases[0]["assets"][0] | {"tag": releases[0]["tag"]} if releases and releases[0]["assets"] else None
        ),
        "traffic": collect_traffic(args.repo, token),
    }

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    if payload["available"]:
        print(f"metrics.json: {total} downloads across {len(releases)} release(s)")
    else:
        print("metrics.json: no published release with assets; counter disabled in the UI")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
