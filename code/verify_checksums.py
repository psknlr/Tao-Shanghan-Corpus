#!/usr/bin/env python3
"""File integrity and duplicate detection.

Verifies every source text against 02_source_texts/file_manifest.csv, checks UTF-8
validity and empty files, and detects exact duplicate files and duplicate record texts.
Writes 09_validation/integrity_report.json and 09_validation/duplicate_report.csv.
Usage: python code/verify_checksums.py [package_root]
"""
import csv, hashlib, json, sys, pathlib, collections

def sha256(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()

def main(rootdir="."):
    root = pathlib.Path(rootdir)
    man = list(csv.DictReader(open(root / "02_source_texts" / "file_manifest.csv",
                                   encoding="utf-8")))
    res = {"files_in_manifest": len(man), "hash_match": 0, "hash_mismatch": [],
           "missing_files": [], "utf8_invalid": [], "empty_files": [],
           "characters_total": 0, "bytes_total": 0}
    by_hash = collections.defaultdict(list)
    for row in man:
        p = root / row["relative_path"]
        if not p.exists():
            res["missing_files"].append(row["relative_path"])
            continue
        h = sha256(p)
        if h == row["sha256"]:
            res["hash_match"] += 1
        else:
            res["hash_mismatch"].append(row["relative_path"])
        by_hash[h].append(row["relative_path"])
        raw = p.read_bytes()
        try:
            txt = raw.decode("utf-8")
        except UnicodeDecodeError:
            res["utf8_invalid"].append(row["relative_path"])
            continue
        if not txt.strip():
            res["empty_files"].append(row["relative_path"])
        res["characters_total"] += len(txt)
        res["bytes_total"] += len(raw)

    dup_rows = [{"kind": "source_file", "key": h, "count": len(v), "members": " | ".join(v)}
                for h, v in by_hash.items() if len(v) > 1]

    for rel, idf, textf in [("03_clauses/clauses.jsonl", "clause_id", "original_text"),
                            ("04_commentaries/commentaries.jsonl", "commentary_id", "commentary_text"),
                            ("05_textual_variants/variants.jsonl", "variant_id", "variant_text")]:
        seen = collections.defaultdict(list)
        for line in (root / rel).read_text(encoding="utf-8").splitlines():
            if line.strip():
                r = json.loads(line)
                seen["".join((r.get(textf) or "").split())].append(r[idf])
        for k, ids in seen.items():
            if len(ids) > 1 and k:
                dup_rows.append({"kind": rel.split("/")[0], "key": k[:40],
                                 "count": len(ids), "members": " | ".join(ids)})

    res["duplicate_groups"] = len(dup_rows)
    res["status"] = "PASS" if not (res["hash_mismatch"] or res["missing_files"]
                                   or res["utf8_invalid"] or res["empty_files"]) else "FAIL"
    outd = root / "09_validation"
    outd.mkdir(parents=True, exist_ok=True)
    (outd / "integrity_report.json").write_text(
        json.dumps(res, ensure_ascii=False, indent=2), encoding="utf-8")
    with open(outd / "duplicate_report.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["kind", "key", "count", "members"])
        w.writeheader()
        w.writerows(dup_rows)
    print(json.dumps({k: v for k, v in res.items()
                      if not isinstance(v, list) or len(v) < 5}, indent=1))
    return 0 if res["status"] == "PASS" else 1

if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "."))
