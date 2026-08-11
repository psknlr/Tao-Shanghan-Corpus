#!/usr/bin/env python3
"""Verify that the editorial punctuation layer only ever inserts punctuation.

Punctuating classical Chinese is interpretation, not transcription, so the
editorial reading is kept in its own layer and the historical text is never
touched. This check enforces that separation mechanically rather than by
convention: for every record it strips the permitted marks back out of the
punctuated reading and requires the result to be identical, character for
character, to the `commentary_text` released in 04_commentaries/.

A record that changed, added or dropped even one character of the source fails
here, so the editorial layer cannot silently emend the corpus.

Exit status 0 if every record round-trips, 1 otherwise.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LAYER = ROOT / "10_editorial_punctuation" / "punctuation.jsonl"
COMMENTARIES = ROOT / "04_commentaries" / "commentaries.jsonl"

# The only characters the editorial layer may introduce.
INSERTABLE = set("，。；：、？！")


def main() -> int:
    if not LAYER.exists():
        print(f"error: {LAYER} not found", file=sys.stderr)
        return 1

    originals = {}
    with COMMENTARIES.open(encoding="utf-8") as fh:
        for line in fh:
            record = json.loads(line)
            originals[record["commentary_id"]] = record["commentary_text"]

    records = [json.loads(line) for line in LAYER.open(encoding="utf-8") if line.strip()]

    failures: list[str] = []
    marks_added = 0

    for record in records:
        cid = record["commentary_id"]
        punctuated = record["punctuated_text"]

        if cid not in originals:
            failures.append(f"{cid}: no such commentary record")
            continue

        original = originals[cid]

        # 1. Insertion-only: stripping the permitted marks must restore the source.
        stripped = "".join(ch for ch in punctuated if ch not in INSERTABLE)
        if stripped != original:
            where = next(
                (i for i, (a, b) in enumerate(zip(stripped, original)) if a != b),
                min(len(stripped), len(original)),
            )
            failures.append(
                f"{cid}: not insertion-only at offset {where}\n"
                f"    editorial: …{stripped[max(0, where - 20):where + 20]}…\n"
                f"    original : …{original[max(0, where - 20):where + 20]}…"
            )
            continue

        # 2. No character outside the permitted set may have been introduced.
        introduced = set(punctuated) - set(original)
        if not introduced <= INSERTABLE:
            failures.append(f"{cid}: introduced disallowed characters {sorted(introduced - INSERTABLE)}")
            continue

        # 3. The recorded base checksum must match the text actually punctuated.
        if record.get("base_sha256"):
            import hashlib

            digest = hashlib.sha256(original.encode("utf-8")).hexdigest()
            if digest != record["base_sha256"]:
                failures.append(f"{cid}: base_sha256 does not match the current commentary_text")
                continue

        marks_added += sum(1 for ch in punctuated if ch in INSERTABLE)

    report = {
        "records": len(records),
        "insertion_only": len(records) - len(failures),
        "failures": len(failures),
        "punctuation_marks_added": marks_added,
        "status": "PASS" if not failures else "FAIL",
    }
    print(json.dumps(report, ensure_ascii=False, indent=1))

    for failure in failures:
        print(f"FAIL {failure}", file=sys.stderr)

    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
