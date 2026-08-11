#!/usr/bin/env python3
"""Derive the static JSON payloads consumed by the GitHub Pages corpus explorer.

The browser never loads the full corpus. This script reads the released layers
(01_source_catalog, 03_clauses, 04_commentaries, 05_textual_variants,
06_relations, 09_validation) and writes:

    site/public/data/corpus_summary.json    headline counts, validation, distributions
    site/public/data/sources.json           the 57 catalogued works, with provenance
    site/public/data/timeline.json          works grouped by dynasty
    site/public/data/search_index.json      one lightweight entry per clause
    site/public/data/relation_types.json    the eight relation types
    site/public/data/clauses/<clause_id>.json
                                            per-clause payload: the clause, its
                                            commentaries, variants, ego network and
                                            provenance chain, fetched on demand

Every number written here is read from the released files. Nothing is hard-coded
and nothing is imputed; the `not_stated_in_source` token is passed through
unchanged.

Usage:  python3 scripts/build_demo_data.py [--root .] [--out site/public/data]
"""

from __future__ import annotations

import argparse
import csv
import difflib
import json
import re
import shutil
import sys
from collections import Counter, defaultdict
from pathlib import Path

# Chronological order used by the historical timeline. Works whose dynasty is
# not stated upstream are kept in a separate, explicitly labelled band rather
# than being guessed into a period.
DYNASTY_ORDER = [
    "Eastern Han",
    "Song",
    "Jin (1115-1234)",
    "Yuan",
    "Ming",
    "Qing",
    "not_stated_in_source",
]

MISSING = "not_stated_in_source"

# Leading vendor section markers in the 桂本 witness, e.g. "6.24\n". Recorded so
# the diff view compares the clause bodies rather than the edition's numbering.
SECTION_MARKER = re.compile(r"^\s*\d+\.\d+\s*")

FEATURED_CLAUSE_ID = "SHL_SONGBEN_0023"


# --------------------------------------------------------------------------- io


def read_jsonl(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as fh:
        return [json.loads(line) for line in fh if line.strip()]


def read_csv(path: Path) -> list[dict]:
    with path.open(encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh))


def write_json(path: Path, payload) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    path.write_text(text, encoding="utf-8")
    return len(text.encode("utf-8"))


def as_int(value: str, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


# ----------------------------------------------------------------- variant diff


def diff_segments(base: str, variant: str) -> list[dict]:
    """Character-level diff computed at build time so the client ships no differ."""
    matcher = difflib.SequenceMatcher(a=base, b=variant, autojunk=False)
    segments: list[dict] = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            segments.append({"t": "=", "a": base[i1:i2]})
        elif tag == "delete":
            segments.append({"t": "-", "a": base[i1:i2]})
        elif tag == "insert":
            segments.append({"t": "+", "b": variant[j1:j2]})
        else:  # replace
            segments.append({"t": "-", "a": base[i1:i2]})
            segments.append({"t": "+", "b": variant[j1:j2]})
    return segments


def strip_section_marker(text: str) -> tuple[str, str]:
    """Return (body, marker). The marker is the witness's own section number."""
    match = SECTION_MARKER.match(text)
    if not match:
        return text, ""
    return text[match.end():], match.group(0).strip()


# ------------------------------------------------------------------------ build


def build(root: Path, out: Path) -> None:
    catalog = root / "01_source_catalog"
    sources = read_csv(catalog / "sources.csv")
    editions = {r["source_id"]: r for r in read_csv(catalog / "editions.csv")}
    provenance = {r["source_id"]: r for r in read_csv(catalog / "source_provenance.csv")}
    manifest = read_csv(root / "02_source_texts" / "file_manifest.csv")

    clauses = read_jsonl(root / "03_clauses" / "clauses.jsonl")
    commentaries = read_jsonl(root / "04_commentaries" / "commentaries.jsonl")
    variants = read_jsonl(root / "05_textual_variants" / "variants.jsonl")
    relations = read_jsonl(root / "06_relations" / "relations.jsonl")
    nodes = read_jsonl(root / "06_relations" / "nodes.jsonl")
    relation_types = read_csv(root / "06_relations" / "relation_types.csv")

    validation = json.loads((root / "09_validation" / "validation_report.json").read_text(encoding="utf-8"))

    source_by_id = {s["source_id"]: s for s in sources}
    files_by_source: dict[str, list[dict]] = defaultdict(list)
    for row in manifest:
        files_by_source[row["source_id"]].append(row)

    clause_by_id = {c["clause_id"]: c for c in clauses}
    node_by_id = {n["node_id"]: n for n in nodes}
    commentary_by_id = {c["commentary_id"]: c for c in commentaries}
    variant_by_id = {v["variant_id"]: v for v in variants}

    commentaries_by_clause: dict[str, list[dict]] = defaultdict(list)
    for record in commentaries:
        commentaries_by_clause[record["clause_id"]].append(record)
    variants_by_clause: dict[str, list[dict]] = defaultdict(list)
    for record in variants:
        variants_by_clause[record["clause_id"]].append(record)

    # Relations are indexed from both endpoints: a clause's ego network includes
    # edges that point at it as well as edges it originates.
    relations_by_node: dict[str, list[dict]] = defaultdict(list)
    for record in relations:
        relations_by_node[record["source_node_id"]].append(record)
        if record["target_node_id"] != record["source_node_id"]:
            relations_by_node[record["target_node_id"]].append(record)

    out_dir = out
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------ sources
    source_payload = []
    for record in sources:
        sid = record["source_id"]
        prov = provenance.get(sid, {})
        edition = editions.get(sid, {})
        files = files_by_source.get(sid, [])
        source_payload.append({
            "source_id": sid,
            "title_zh": record["title_zh"],
            "title_translit": record["title_translit"],
            "author": record["author"],
            "dynasty": record["dynasty"],
            "dynasty_raw": record["dynasty_raw"],
            "approximate_date": record["approximate_date"],
            "work_type": record["work_type"],
            "collection": record["collection"],
            "evidence_layer": record["evidence_layer"],
            "witness_status": record["witness_status"],
            "language": record["language"],
            "script": record["script"],
            "n_files": as_int(record["n_files"]),
            "characters": as_int(record["characters"]),
            "edition_stated": edition.get("edition_stated", MISSING),
            "reference_copy": edition.get("reference_copy", MISSING),
            "upstream_format": edition.get("upstream_format", MISSING),
            "upstream_encoding": edition.get("upstream_encoding", MISSING),
            "source_repository": prov.get("source_repository", MISSING),
            "source_url": prov.get("source_url", MISSING),
            "upstream_path": prov.get("upstream_path", MISSING),
            "work_sha256": prov.get("work_sha256", ""),
            "licence_status": prov.get("licence_status", MISSING),
            "files": [
                {
                    "relative_path": f["relative_path"],
                    "sha256": f["sha256"],
                    "bytes": as_int(f["bytes"]),
                    "characters": as_int(f["characters"]),
                    "utf8_valid": f["utf8_valid"] == "True",
                }
                for f in sorted(files, key=lambda f: f["relative_path"])
            ],
        })
    source_payload.sort(key=lambda s: s["source_id"])
    write_json(out_dir / "sources.json", source_payload)

    # ----------------------------------------------------------------- timeline
    # How many structured records each work actually contributes — this is what
    # distinguishes a catalogued work from a work the corpus draws evidence from.
    clause_counts = Counter(c["source_id"] for c in clauses)
    commentary_counts = Counter(c["source_id"] for c in commentaries)
    variant_counts = Counter(v["source_id"] for v in variants)

    bands = []
    for dynasty in DYNASTY_ORDER:
        works = [s for s in source_payload if s["dynasty"] == dynasty]
        if not works:
            continue
        bands.append({
            "dynasty": dynasty,
            "works": [
                {
                    "source_id": w["source_id"],
                    "title_zh": w["title_zh"],
                    "title_translit": w["title_translit"],
                    "author": w["author"],
                    "approximate_date": w["approximate_date"],
                    "work_type": w["work_type"],
                    "witness_status": w["witness_status"],
                    "characters": w["characters"],
                    "n_files": w["n_files"],
                    "evidence_layer": w["evidence_layer"],
                    "clauses": clause_counts.get(w["source_id"], 0),
                    "commentaries": commentary_counts.get(w["source_id"], 0),
                    "variants": variant_counts.get(w["source_id"], 0),
                }
                for w in sorted(works, key=lambda w: -w["characters"])
            ],
            "works_count": len(works),
            "characters": sum(w["characters"] for w in works),
        })
    write_json(out_dir / "timeline.json", {"bands": bands})

    # ---------------------------------------------------------------- summary
    commentator_index: dict[tuple[str, str], dict] = {}
    for record in commentaries:
        key = (record["commentator"], record["book"])
        entry = commentator_index.setdefault(key, {
            "commentator": record["commentator"],
            "book": record["book"],
            "dynasty": record["dynasty"],
            "source_id": record["source_id"],
            "records": 0,
            "clauses": set(),
        })
        entry["records"] += 1
        entry["clauses"].add(record["clause_id"])
    commentator_payload = sorted(
        (
            {**entry, "clauses": len(entry["clauses"])}
            for entry in commentator_index.values()
        ),
        key=lambda e: -e["records"],
    )

    variant_witnesses = []
    witness_index: dict[str, dict] = {}
    for record in variants:
        entry = witness_index.setdefault(record["variant_book"], {
            "variant_book": record["variant_book"],
            "variant_version": record["variant_version"],
            "source_id": record["source_id"],
            "records": 0,
            "similarity_sum": 0.0,
        })
        entry["records"] += 1
        entry["similarity_sum"] += float(record["similarity"])
    for entry in witness_index.values():
        variant_witnesses.append({
            "variant_book": entry["variant_book"],
            "variant_version": entry["variant_version"],
            "source_id": entry["source_id"],
            "records": entry["records"],
            "mean_similarity": round(entry["similarity_sum"] / entry["records"], 3),
        })
    variant_witnesses.sort(key=lambda e: -e["records"])

    canonical = [c for c in clauses if c["text_type"] == "original_clause"]
    six_channel_counts = Counter(
        c["six_channel"] for c in canonical if c["six_channel"]
    )
    formula_counter: Counter[str] = Counter()
    for clause in clauses:
        for name in clause.get("formula_names", []):
            formula_counter[name] += 1

    summary = {
        "dataset": validation["dataset"],
        "version": validation["version"],
        "schema_version": validation["schema_version"],
        "validated_on": validation["validated_on"],
        "featured_clause_id": FEATURED_CLAUSE_ID,
        "headline": {
            "historical_works": validation["source_layer"]["historical_works"],
            "source_files": validation["source_layer"]["text_files"],
            "characters": validation["source_layer"]["characters_including_whitespace"],
            "clause_records": validation["structured_layers"]["clauses.jsonl"],
            "canonical_clauses": len(canonical),
            "auxiliary_clauses": validation["structural_consistency"]["auxiliary_clauses"],
            "commentaries": validation["structured_layers"]["commentaries.jsonl"],
            "variants": validation["structured_layers"]["variants.jsonl"],
            "relations": validation["structured_layers"]["relations.jsonl"],
            "nodes": validation["structured_layers"]["nodes.jsonl"],
            "unified_records": validation["structured_layers"]["unified_text_records.jsonl"],
        },
        "distributions": {
            "dynasty": [
                {"key": key, "count": count}
                for key, count in sorted(
                    Counter(s["dynasty"] for s in source_payload).items(),
                    key=lambda kv: DYNASTY_ORDER.index(kv[0])
                    if kv[0] in DYNASTY_ORDER else len(DYNASTY_ORDER),
                )
            ],
            "work_type": [
                {"key": key, "count": count}
                for key, count in Counter(s["work_type"] for s in source_payload).most_common()
            ],
            "six_channel": [
                {"key": key, "count": count} for key, count in six_channel_counts.most_common()
            ],
            "relation_type": [
                {"key": r["relation_type"], "count": as_int(r["edges"])}
                for r in sorted(relation_types, key=lambda r: -as_int(r["edges"]))
            ],
            "top_formulae": [
                {"key": key, "count": count} for key, count in formula_counter.most_common(8)
            ],
        },
        "commentators": commentator_payload,
        "variant_witnesses": variant_witnesses,
        "validation": {
            "overall_status": validation["overall_status"],
            "schema": validation["schema_validation"],
            "structural": validation["structural_consistency"],
            "integrity": {
                "sha256_within_release": validation["source_layer"]["sha256_match_within_release"],
                "sha256_against_upstream": validation["source_layer"]["sha256_match_against_upstream_manifest"],
                "utf8_invalid": validation["source_layer"]["utf8_invalid"],
                "empty_files": validation["source_layer"]["empty_files"],
                "exact_duplicate_source_files": validation["source_layer"]["exact_duplicate_source_files"],
            },
            "provenance": validation["provenance_resolution"],
            "duplicates": validation["duplicate_analysis"],
            "manual_review": validation["manual_review"],
        },
    }
    write_json(out_dir / "corpus_summary.json", summary)

    write_json(out_dir / "relation_types.json", [
        {
            "relation_type": r["relation_type"],
            "edges": as_int(r["edges"]),
            "source_types": r["source_types"],
            "target_types": r["target_types"],
            "example_description": r["example_description"],
        }
        for r in sorted(relation_types, key=lambda r: -as_int(r["edges"]))
    ])

    # ------------------------------------------------------------ search index
    index = []
    for clause in clauses:
        cid = clause["clause_id"]
        clause_commentaries = commentaries_by_clause.get(cid, [])
        commentators = sorted({c["commentator"] for c in clause_commentaries})
        index.append({
            "id": cid,
            "no": clause["canonical_clause_no"],
            "type": clause["text_type"],
            "chapter": clause["chapter"],
            "six_channel": clause["six_channel"],
            "text": clause["original_text"],
            "formulae": clause.get("formula_names", []),
            "symptoms": clause.get("symptoms", []),
            "pulse": clause.get("pulse", []),
            "patterns": clause.get("disease_patterns", []),
            "herbs": clause.get("herbs", []),
            "commentators": commentators,
            "n_commentaries": len(clause_commentaries),
            "n_variants": len(variants_by_clause.get(cid, [])),
            "n_relations": len(relations_by_node.get(cid, [])),
        })
    index.sort(key=lambda e: (e["no"] is None, e["no"] if e["no"] is not None else 0, e["id"]))
    write_json(out_dir / "search_index.json", index)

    # -------------------------------------------------------------- per clause
    clause_dir = out_dir / "clauses"
    clause_dir.mkdir(parents=True, exist_ok=True)

    def source_brief(source_id: str) -> dict:
        record = source_by_id.get(source_id)
        if not record:
            return {"source_id": source_id, "title_zh": MISSING, "author": MISSING, "dynasty": MISSING}
        return {
            "source_id": source_id,
            "title_zh": record["title_zh"],
            "title_translit": record["title_translit"],
            "author": record["author"],
            "dynasty": record["dynasty"],
        }

    def clause_label(clause_id: str) -> dict:
        target = clause_by_id.get(clause_id)
        if target:
            return {
                "id": clause_id,
                "no": target["canonical_clause_no"],
                "text": target["original_text"],
                "formulae": target.get("formula_names", []),
                "six_channel": target["six_channel"],
            }
        node = node_by_id.get(clause_id, {})
        return {"id": clause_id, "no": None, "text": node.get("label", ""), "formulae": [], "six_channel": ""}

    total_bytes = 0
    for clause in clauses:
        cid = clause["clause_id"]

        clause_commentaries = sorted(
            commentaries_by_clause.get(cid, []),
            key=lambda c: (
                DYNASTY_ORDER.index(c["dynasty"]) if c["dynasty"] in DYNASTY_ORDER else len(DYNASTY_ORDER),
                c["book"],
                c["commentary_id"],
            ),
        )
        commentary_payload = [
            {
                "commentary_id": c["commentary_id"],
                "commentator": c["commentator"],
                "book": c["book"],
                "dynasty": c["dynasty"],
                "source_id": c["source_id"],
                "chapter": c["chapter"],
                "source_location": c["source_location"],
                "text": c["commentary_text"],
                "alignment_similarity": c["alignment_similarity"],
                "alignment_type": c["alignment_type"],
                "candidate_confidence": c["candidate_confidence"],
                "source_resolution": c["source_resolution"],
                "review_status": c["review_status"],
            }
            for c in clause_commentaries
        ]

        variant_payload = []
        for v in sorted(variants_by_clause.get(cid, []), key=lambda v: -float(v["similarity"])):
            body, marker = strip_section_marker(v["variant_text"])
            variant_payload.append({
                "variant_id": v["variant_id"],
                "variant_book": v["variant_book"],
                "variant_version": v["variant_version"],
                "base_version": v["base_version"],
                "source_id": v["source_id"],
                "base_text": v["base_text"],
                "variant_text": v["variant_text"],
                "variant_body": body,
                "witness_section_marker": marker,
                "similarity": v["similarity"],
                "notable_differences": v.get("notable_differences", []),
                "candidate_confidence": v["candidate_confidence"],
                "source_resolution": v["source_resolution"],
                "review_status": v["review_status"],
                "diff": diff_segments(v["base_text"], body),
            })

        edges = []
        neighbours: dict[str, dict] = {}
        for rel in relations_by_node.get(cid, []):
            other_id = rel["target_node_id"] if rel["source_node_id"] == cid else rel["source_node_id"]
            direction = "out" if rel["source_node_id"] == cid else "in"
            node = node_by_id.get(other_id, {})
            node_type = node.get("node_type") or (
                rel["target_node_type"] if direction == "out" else rel["source_node_type"]
            )
            if other_id not in neighbours:
                if node_type == "clause":
                    label = clause_label(other_id)
                    neighbours[other_id] = {
                        "id": other_id,
                        "type": "clause",
                        "no": label["no"],
                        "label": label["text"][:60],
                        "formulae": label["formulae"],
                        "source_id": node.get("source_id", ""),
                    }
                elif node_type == "commentary":
                    record = commentary_by_id.get(other_id, {})
                    neighbours[other_id] = {
                        "id": other_id,
                        "type": "commentary",
                        "label": record.get("commentator", other_id),
                        "book": record.get("book", ""),
                        "dynasty": record.get("dynasty", ""),
                        "source_id": record.get("source_id", ""),
                    }
                else:
                    record = variant_by_id.get(other_id, {})
                    neighbours[other_id] = {
                        "id": other_id,
                        "type": "variant",
                        "label": record.get("variant_book", other_id),
                        "similarity": record.get("similarity"),
                        "source_id": record.get("source_id", ""),
                    }
            edges.append({
                "relation_id": rel["relation_id"],
                "type": rel["relation_type"],
                "direction": direction,
                "other": other_id,
                "description": rel["description"],
                "confidence": rel["candidate_confidence"],
                "target_resolution": rel["target_resolution"],
                "source_reference": rel.get("source_reference") or {},
                "review_status": rel["review_status"],
            })
        edges.sort(key=lambda e: e["relation_id"])

        work = source_by_id.get(clause["source_id"], {})
        files = files_by_source.get(clause["source_id"], [])
        prov = provenance.get(clause["source_id"], {})
        provenance_chain = {
            "record": {
                "id": cid,
                "sha256": clause.get("sha256", ""),
                "source_resolution": clause.get("source_resolution", MISSING),
                "review_status": clause.get("review_status", "pending"),
            },
            "work": {
                **source_brief(clause["source_id"]),
                "n_files": as_int(work.get("n_files", "0")),
                "characters": as_int(work.get("characters", "0")),
                "witness_status": work.get("witness_status", MISSING),
                "evidence_layer": work.get("evidence_layer", MISSING),
            },
            "files": [
                {
                    "relative_path": f["relative_path"],
                    "sha256": f["sha256"],
                    "bytes": as_int(f["bytes"]),
                    "characters": as_int(f["characters"]),
                    "utf8_valid": f["utf8_valid"] == "True",
                }
                for f in sorted(files, key=lambda f: f["relative_path"])[:6]
            ],
            "files_total": len(files),
            "repository": {
                "name": prov.get("source_repository", MISSING),
                "url": prov.get("source_url", MISSING),
                "upstream_path": prov.get("upstream_path", MISSING),
                "licence_status": prov.get("licence_status", MISSING),
            },
            "checks": [
                {"key": "utf8", "ok": all(f["utf8_valid"] == "True" for f in files)},
                {"key": "sha256", "ok": bool(clause.get("sha256"))},
                {"key": "source_resolved", "ok": clause["source_id"] in source_by_id},
                {"key": "no_orphan_edges", "ok": all(
                    e["other"] in node_by_id or e["other"] in clause_by_id for e in edges
                )},
            ],
        }

        payload = {
            "clause": clause,
            "work": source_brief(clause["source_id"]),
            "commentaries": commentary_payload,
            "variants": variant_payload,
            "graph": {"neighbours": list(neighbours.values()), "edges": edges},
            "provenance": provenance_chain,
            "counts": {
                "commentaries": len(commentary_payload),
                "variants": len(variant_payload),
                "relations": len(edges),
            },
        }
        total_bytes += write_json(clause_dir / f"{cid}.json", payload)

    manifest_payload = {
        "generated_from": {
            "dataset": validation["dataset"],
            "version": validation["version"],
            "schema_version": validation["schema_version"],
        },
        "clause_files": len(clauses),
        "clause_bytes": total_bytes,
        "featured_clause_id": FEATURED_CLAUSE_ID,
    }
    write_json(out_dir / "build_manifest.json", manifest_payload)

    print(f"sources.json          {len(source_payload)} works")
    print(f"timeline.json         {len(bands)} dynasty bands")
    print(f"search_index.json     {len(index)} clauses")
    print(f"clauses/*.json        {len(clauses)} files, {total_bytes / 1024:.0f} KiB total")
    print(f"corpus_summary.json   validation status {summary['validation']['overall_status']}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".", help="dataset root (default: repository root)")
    parser.add_argument("--out", default="site/public/data", help="output directory")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    required = ["01_source_catalog", "03_clauses", "04_commentaries", "05_textual_variants",
                "06_relations", "09_validation"]
    for name in required:
        if not (root / name).exists():
            print(f"error: {root / name} not found; run from the repository root", file=sys.stderr)
            return 1

    build(root, Path(args.out).resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
