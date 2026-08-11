#!/usr/bin/env python3
"""Schema validation for Historical_Shanghan_Corpus v1.0.

Checks required fields, types, identifier uniqueness and JSON well-formedness
across all released structured layers. Writes 09_validation/schema_report.json.
Usage: python code/validate_schema.py [package_root]
"""
import json, sys, pathlib, collections

REQUIRED = {
 "03_clauses/clauses.jsonl": (["clause_id","source_id","text_type","original_text",
    "normalized_text","review_status"], "clause_id"),
 "04_commentaries/commentaries.jsonl": (["commentary_id","source_id","clause_id","commentator",
    "commentary_text","review_status"], "commentary_id"),
 "05_textual_variants/variants.jsonl": (["variant_id","source_id","clause_id","base_text",
    "variant_text","review_status"], "variant_id"),
 "06_relations/relations.jsonl": (["relation_id","source_node_id","source_node_type",
    "target_node_id","target_node_type","relation_type","review_status"], "relation_id"),
 "06_relations/nodes.jsonl": (["node_id","node_type","source_id"], "node_id"),
 "07_unified_records/unified_text_records.jsonl": (["record_id","record_type","clause_id",
    "source_id","text"], "record_id"),
}
STR_FIELDS = {"clause_id","commentary_id","variant_id","relation_id","node_id","record_id",
              "source_id","review_status","relation_type","node_type","record_type","text_type"}

def load(p):
    rows, bad = [], []
    for i, line in enumerate(p.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError as e:
            bad.append({"line": i, "error": str(e)})
    return rows, bad

def main(rootdir="."):
    root = pathlib.Path(rootdir)
    report = {"schema_version": "1.0", "files": {}, "totals": {}}
    ok = True
    for rel, (req, idf) in REQUIRED.items():
        p = root / rel
        if not p.exists():
            report["files"][rel] = {"status": "MISSING"}
            ok = False
            continue
        rows, malformed = load(p)
        missing = collections.Counter()
        wrongtype = collections.Counter()
        for r in rows:
            for f in req:
                if f not in r or r[f] is None or r[f] == "":
                    missing[f] += 1
            for f, v in r.items():
                if f in STR_FIELDS and v is not None and not isinstance(v, str):
                    wrongtype[f] += 1
        ids = [r.get(idf) for r in rows]
        dupes = [k for k, v in collections.Counter(ids).items() if v > 1]
        entry = {"records": len(rows), "malformed_json": len(malformed),
                 "id_field": idf, "duplicate_ids": len(dupes),
                 "missing_required": dict(missing), "wrong_type": dict(wrongtype),
                 "status": "PASS"}
        if malformed or dupes or missing or wrongtype:
            entry["status"] = "FAIL"
            entry["examples"] = {"malformed": malformed[:3], "duplicate_ids": dupes[:5]}
            ok = False
        report["files"][rel] = entry
        report["totals"][rel] = len(rows)
    report["status"] = "PASS" if ok else "FAIL"
    out = root / "09_validation" / "schema_report.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"status": report["status"], "totals": report["totals"]}, indent=1))
    return 0 if ok else 1

if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "."))
