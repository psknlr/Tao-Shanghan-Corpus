#!/usr/bin/env python3
"""Emit 10_editorial_punctuation/punctuation.jsonl from the editorial readings.

The readings themselves live in scripts/punctuation_source.py; this script joins
them to the released commentary records, stamps the provenance every record
needs to be interpretable, and refuses to write anything that is not a pure
insertion of punctuation into the source text.

Usage:  python3 scripts/build_punctuation_layer.py
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from punctuation_source import INSERTABLE, PUNCTUATED  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "10_editorial_punctuation"
OUT = OUT_DIR / "punctuation.jsonl"

METHOD = "editorial_llm_assisted"
NOTE = (
    "Editorial punctuation of an unpunctuated (白文) transmission. Inserted marks "
    "are limited to ，。；：、？！ and are verified to be insertions only: removing "
    "them restores the released commentary_text character for character. The "
    "reading is interpretive and has not been reviewed by a human editor."
)


def main() -> int:
    commentaries = {}
    with (ROOT / "04_commentaries" / "commentaries.jsonl").open(encoding="utf-8") as fh:
        for line in fh:
            record = json.loads(line)
            commentaries[record["commentary_id"]] = record

    rows = []
    for cid in sorted(PUNCTUATED):
        source = commentaries.get(cid)
        if source is None:
            print(f"error: {cid} is not a released commentary record", file=sys.stderr)
            return 1

        original = source["commentary_text"]
        punctuated = PUNCTUATED[cid]

        stripped = "".join(ch for ch in punctuated if ch not in INSERTABLE)
        if stripped != original:
            print(f"error: {cid} is not an insertion-only reading; refusing to write", file=sys.stderr)
            return 1

        rows.append({
            "punctuation_id": f"PUNCT_{cid}",
            "commentary_id": cid,
            "source_id": source["source_id"],
            "book": source["book"],
            "commentator": source["commentator"],
            "clause_id": source["clause_id"],
            "base_sha256": hashlib.sha256(original.encode("utf-8")).hexdigest(),
            "punctuated_text": punctuated,
            "marks_added": sum(1 for ch in punctuated if ch in INSERTABLE),
            "insertable_marks": INSERTABLE,
            "method": METHOD,
            "editor_id": "",
            "review_status": "pending",
            "note": NOTE,
        })

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8") as fh:
        for row in rows:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")

    total_marks = sum(r["marks_added"] for r in rows)
    print(f"{OUT.relative_to(ROOT)}: {len(rows)} records, {total_marks} marks inserted")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
