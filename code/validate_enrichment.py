#!/usr/bin/env python3
"""Verify that the clause enrichment layer only re-presents the clause text.

The enrichment layer parses the inline markup the transcription carries (<l>
dose notes, <j> collation notes, ** heading emphasis) into typed runs and, for
dose lists, into a herb composition. None of that may change a clause. This
check enforces it mechanically:

  1. concatenating the segments must equal the clause text with its markup
     removed, character for character;
  2. rebuilding the markup from `composition` must reproduce the original dose
     list exactly, so no herb, dose or ideographic space was lost;
  3. `collation_notes` must be exactly the <j> contents, in order;
  4. `base_sha256` must match the clause text the record was derived from;
  5. a `formula_name` must be evidenced, never inferred from a heading that the
     released layer itself could not resolve.

Exit status 0 if every record round-trips, 1 otherwise.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LAYER = ROOT / "11_clause_enrichment" / "clause_enrichment.jsonl"
CLAUSES = ROOT / "03_clauses" / "clauses.jsonl"

MARKUP = re.compile(r"<(l|j)>(.*?)</\1>|\*\*(.+?)\*\*", re.S)
ITEM_SEP = "　"


def strip_markup(text: str) -> str:
    return MARKUP.sub(lambda m: m.group(2) if m.group(2) is not None else m.group(3), text)


def main() -> int:
    if not LAYER.exists():
        print(f"error: {LAYER} not found", file=sys.stderr)
        return 1

    clauses = {}
    with CLAUSES.open(encoding="utf-8") as fh:
        for line in fh:
            record = json.loads(line)
            clauses[record["clause_id"]] = record

    records = [json.loads(line) for line in LAYER.open(encoding="utf-8") if line.strip()]
    failures: list[str] = []
    compositions = herbs = notes = 0

    for record in records:
        cid = record["clause_id"]
        clause = clauses.get(cid)
        if clause is None:
            failures.append(f"{cid}: no such clause record")
            continue

        text = clause["original_text"]

        if hashlib.sha256(text.encode("utf-8")).hexdigest() != record["base_sha256"]:
            failures.append(f"{cid}: base_sha256 does not match the current clause text")
            continue

        plain = strip_markup(text)

        if record["display_text"] != plain:
            failures.append(f"{cid}: display_text is not the clause text with markup removed")
            continue

        joined = "".join(segment["s"] for segment in record["segments"])
        if joined != plain:
            where = next((i for i, (a, b) in enumerate(zip(joined, plain)) if a != b), min(len(joined), len(plain)))
            failures.append(
                f"{cid}: segments do not reproduce the text at offset {where}\n"
                f"    segments: …{joined[max(0, where - 20):where + 20]}…\n"
                f"    clause  : …{plain[max(0, where - 20):where + 20]}…"
            )
            continue

        if "composition" in record:
            rebuilt = ITEM_SEP.join(
                item["herb"] + (f"<l>{item['dose_processing']}</l>" if item["dose_processing"] else "")
                for item in record["composition"]
            )
            if rebuilt != text.strip():
                failures.append(f"{cid}: composition does not rebuild the original dose list")
                continue
            if sorted({i["herb"] for i in record["composition"]}) != record["herbs"]:
                failures.append(f"{cid}: herbs do not match the composition")
                continue
            compositions += 1
            herbs += len(record["composition"])

        expected_notes = [m.group(2) for m in MARKUP.finditer(text) if m.group(1) == "j"]
        if expected_notes != record.get("collation_notes", []):
            failures.append(f"{cid}: collation_notes are not the <j> contents in order")
            continue
        notes += len(expected_notes)

        if record.get("formula_name") and not str(record.get("formula_name_evidence", "")).startswith("adjacent_heading:"):
            failures.append(f"{cid}: formula_name is set without heading evidence")
            continue

    report = {
        "records": len(records),
        "round_trip_ok": len(records) - len(failures),
        "failures": len(failures),
        "compositions_parsed": compositions,
        "herbs_extracted": herbs,
        "collation_notes_extracted": notes,
        "formula_names_attributed": sum(1 for r in records if r.get("formula_name")),
        "formula_names_left_unset": sum(
            1 for r in records if "composition" in r and not r.get("formula_name")
        ),
        "status": "PASS" if not failures else "FAIL",
    }
    print(json.dumps(report, ensure_ascii=False, indent=1))

    for failure in failures:
        print(f"FAIL {failure}", file=sys.stderr)

    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
