#!/usr/bin/env python3
"""Relation resolution and provenance traceability validation.

Resolves every relation endpoint against the node registry, counts orphans, and
traces every structured record back through source_id to a historical work and a
physical source file. Writes 09_validation/provenance_report.json.
Usage: python code/validate_relations.py [package_root]
"""
import csv, json, sys, pathlib, collections

def jl(p):
    return [json.loads(l) for l in p.read_text(encoding="utf-8").splitlines() if l.strip()]

def main(rootdir="."):
    root = pathlib.Path(rootdir)
    nodes = jl(root / "06_relations" / "nodes.jsonl")
    rels = jl(root / "06_relations" / "relations.jsonl")
    clauses = jl(root / "03_clauses" / "clauses.jsonl")
    comms = jl(root / "04_commentaries" / "commentaries.jsonl")
    varis = jl(root / "05_textual_variants" / "variants.jsonl")

    sources = {r["source_id"] for r in
               csv.DictReader(open(root / "01_source_catalog" / "sources.csv", encoding="utf-8"))}
    files_by_source = collections.Counter(
        r["source_id"] for r in
        csv.DictReader(open(root / "02_source_texts" / "file_manifest.csv", encoding="utf-8")))

    node_ids = {n["node_id"] for n in nodes}
    clause_ids = {c["clause_id"] for c in clauses}

    rep = {"nodes": len(nodes), "relations": len(rels)}
    unres_src = [r["relation_id"] for r in rels if r["source_node_id"] not in node_ids]
    unres_tgt = [r["relation_id"] for r in rels if r["target_node_id"] not in node_ids]
    rep["unresolved_source_nodes"] = len(unres_src)
    rep["unresolved_target_nodes"] = len(unres_tgt)
    rep["orphan_endpoints"] = len(set(unres_src) | set(unres_tgt))
    referenced = {r["source_node_id"] for r in rels} | {r["target_node_id"] for r in rels}
    rep["nodes_referenced_by_edges"] = len(referenced)
    rep["nodes_without_edges"] = len(node_ids - referenced)
    rep["node_type_counts"] = dict(collections.Counter(n["node_type"] for n in nodes))
    rep["target_type_counts"] = dict(collections.Counter(r["target_node_type"] for r in rels))
    rep["self_loops"] = sum(1 for r in rels if r["source_node_id"] == r["target_node_id"])

    # provenance chain: record -> source_id -> catalogued work -> physical file(s)
    chain = {}
    for name, rows, idf in [("clauses", clauses, "clause_id"),
                            ("commentaries", comms, "commentary_id"),
                            ("variants", varis, "variant_id")]:
        total = len(rows)
        to_source = sum(1 for r in rows if r.get("source_id") in sources)
        to_files = sum(1 for r in rows if files_by_source.get(r.get("source_id"), 0) > 0)
        chain[name] = {"records": total, "resolve_to_catalogued_work": to_source,
                       "resolve_to_source_files": to_files,
                       "resolution_rate": round(to_files / total, 6) if total else None,
                       "unresolved": [r[idf] for r in rows if r.get("source_id") not in sources][:5]}
    # clause foreign keys
    chain["commentaries"]["clause_fk_resolve"] = sum(1 for r in comms if r["clause_id"] in clause_ids)
    chain["variants"]["clause_fk_resolve"] = sum(1 for r in varis if r["clause_id"] in clause_ids)
    rep["provenance_chain"] = chain

    # canonical clause numbering
    nums = sorted(c["canonical_clause_no"] for c in clauses
                  if c["text_type"] == "original_clause" and c["canonical_clause_no"] is not None)
    rep["canonical_clauses"] = {"count": len(nums),
                                "contiguous_1_to_398": nums == list(range(1, 399)),
                                "duplicates": len(nums) - len(set(nums)),
                                "missing": sorted(set(range(1, 399)) - set(nums))[:10]}
    rep["auxiliary_clauses"] = sum(1 for c in clauses if c["text_type"] == "auxiliary_clause")

    rep["status"] = "PASS" if (rep["orphan_endpoints"] == 0
                               and rep["canonical_clauses"]["contiguous_1_to_398"]
                               and all(v["resolve_to_source_files"] == v["records"]
                                       for v in chain.values())) else "FAIL"
    out = root / "09_validation" / "provenance_report.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(rep, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"status": rep["status"], "orphans": rep["orphan_endpoints"],
                      "chain": {k: v["resolution_rate"] for k, v in chain.items()}}, indent=1))
    return 0 if rep["status"] == "PASS" else 1

if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "."))
