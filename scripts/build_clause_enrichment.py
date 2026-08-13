#!/usr/bin/env python3
"""Derive 11_clause_enrichment/ from the inline markup left in the clause text.

The Song-edition transcription carries three kinds of inline markup that the
structured layer passes through untouched, so they reach a reader as raw source:

    <l>…</l>   dose and processing note attached to the preceding herb
               (桂枝<l>一兩十七銖，去皮</l>)                    60 occurrences
    <j>…</j>   collation note carried in the edition's small type
               (陽脈浮<j>一作微</j>陰脈弱者)                    14 occurrences
    **…**      emphasis on a formula heading (**桂枝二麻黃一湯方**)  25 records

Nine of the ten records that are pure formula dose lists also carry no extracted
herbs at all, because the extractor did not read through the markup.

This script parses that markup — a mechanical operation, not an interpretive one
— and writes, per affected clause:

  * `segments`, the text split into typed runs so a client can render dose notes
    and collation notes as such instead of printing angle brackets;
  * `composition` and `herbs` for dose lists;
  * `collation_notes` for records carrying <j>;
  * `formula_name`, but only where the immediately preceding heading record
    already carries an extracted formula name. Where it does not, the name is
    left unset and the disagreement is recorded rather than guessed.

The released 03_clauses/clauses.jsonl is not modified. code/validate_enrichment.py
re-derives the plain text from the segments and requires it to equal the source
with its markup removed, so this layer cannot alter a clause.

Usage:  python3 scripts/build_clause_enrichment.py
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "11_clause_enrichment"
OUT = OUT_DIR / "clause_enrichment.jsonl"

MARKUP = re.compile(r"<(l|j)>(.*?)</\1>|\*\*(.+?)\*\*", re.S)
HEADING = re.compile(r"^\*\*(.+?)\*\*$")
# Dose lists separate their items with the ideographic space used by the edition.
ITEM_SEP = "　"
ITEM = re.compile(r"^([^<>]+?)(?:<l>(.*?)</l>)?$", re.S)

METHOD = "deterministic_markup_parse"


def strip_markup(text: str) -> str:
    """The reading a person should see: markup removed, every other character kept."""
    return MARKUP.sub(lambda m: m.group(2) if m.group(2) is not None else m.group(3), text)


def to_segments(text: str) -> list[dict]:
    """Split into typed runs. Concatenating every `s` reproduces strip_markup(text)."""
    segments: list[dict] = []
    cursor = 0
    for match in MARKUP.finditer(text):
        if match.start() > cursor:
            segments.append({"t": "text", "s": text[cursor:match.start()]})
        if match.group(1) == "l":
            segments.append({"t": "dose", "s": match.group(2)})
        elif match.group(1) == "j":
            segments.append({"t": "note", "s": match.group(2)})
        else:
            segments.append({"t": "strong", "s": match.group(3)})
        cursor = match.end()
    if cursor < len(text):
        segments.append({"t": "text", "s": text[cursor:]})
    return [s for s in segments if s["s"]]


def parse_composition(text: str) -> list[dict] | None:
    """Parse a dose list, or return None if it does not round-trip exactly."""
    items = []
    for raw in text.split(ITEM_SEP):
        raw = raw.strip()
        if not raw:
            continue
        match = ITEM.match(raw)
        if not match:
            return None
        items.append({"herb": match.group(1).strip(), "dose_processing": (match.group(2) or "").strip()})

    # Refuse anything we cannot rebuild character for character.
    rebuilt = ITEM_SEP.join(
        item["herb"] + (f"<l>{item['dose_processing']}</l>" if item["dose_processing"] else "")
        for item in items
    )
    return items if rebuilt == text.strip() else None


def main() -> int:
    clauses = [json.loads(line) for line in (ROOT / "03_clauses" / "clauses.jsonl").open(encoding="utf-8")]
    order = {c["clause_id"]: i for i, c in enumerate(clauses)}

    rows = []
    notes: list[str] = []

    for clause in clauses:
        text = clause["original_text"]
        if not MARKUP.search(text):
            continue

        segments = to_segments(text)
        plain = strip_markup(text)
        if "".join(s["s"] for s in segments) != plain:
            print(f"error: {clause['clause_id']} segments do not reproduce the plain text", file=sys.stderr)
            return 1

        row = {
            "enrichment_id": f"ENR_{clause['clause_id']}",
            "clause_id": clause["clause_id"],
            "source_id": clause["source_id"],
            "chapter": clause["chapter"],
            "base_sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
            "display_text": plain,
            "segments": segments,
            "method": METHOD,
        }

        heading = HEADING.match(text.strip())
        if heading:
            row["record_kind"] = "formula_heading"
            row["heading"] = heading.group(1)

        collation = [s["s"] for s in segments if s["t"] == "note"]
        if collation:
            row["record_kind"] = row.get("record_kind", "clause_with_collation_notes")
            row["collation_notes"] = collation

        if "<l>" in text:
            composition = parse_composition(text)
            if composition is None:
                print(f"error: {clause['clause_id']} dose list does not round-trip", file=sys.stderr)
                return 1
            row["record_kind"] = "formula_composition"
            row["composition"] = composition
            row["herbs"] = sorted({item["herb"] for item in composition})

            # The formula name is taken only from a preceding heading that the
            # released layer itself already resolved to a name. Inferring one
            # from the heading text alone would have mislabelled AUX_0276,
            # where the heading and the composition disagree.
            index = order[clause["clause_id"]]
            previous = clauses[index - 1] if index else None
            prev_heading = HEADING.match(previous["original_text"].strip()) if previous else None
            if previous and prev_heading and previous["formula_names"]:
                row["formula_name"] = previous["formula_names"][0]
                row["formula_name_evidence"] = f"adjacent_heading:{previous['clause_id']}"
            elif previous and prev_heading:
                row["formula_name"] = None
                row["formula_name_evidence"] = "unresolved"
                row["adjacent_heading_text"] = prev_heading.group(1)
                row["adjacent_heading_id"] = previous["clause_id"]
                notes.append(
                    f"{clause['clause_id']}: heading {previous['clause_id']} reads "
                    f"{prev_heading.group(1)} but the released layer extracts no formula name from it; "
                    f"composition begins {composition[0]['herb']}. Name left unset."
                )
            else:
                row["formula_name"] = None
                row["formula_name_evidence"] = "no_adjacent_heading"

        rows.append(row)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8") as fh:
        for row in sorted(rows, key=lambda r: r["clause_id"]):
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")

    kinds: dict[str, int] = {}
    for row in rows:
        kinds[row.get("record_kind", "clause_with_markup")] = kinds.get(row.get("record_kind", "clause_with_markup"), 0) + 1

    print(f"{OUT.relative_to(ROOT)}: {len(rows)} records  {kinds}")
    print()
    print("formula compositions and the names attributed to them:")
    for row in sorted(rows, key=lambda r: r["clause_id"]):
        if row.get("record_kind") == "formula_composition":
            name = row.get("formula_name") or "— unset —"
            print(f"  {row['clause_id']}  {name:<18} {'、'.join(i['herb'] for i in row['composition'])}")
    for note in notes:
        print(f"\nnote: {note}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
