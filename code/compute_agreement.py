#!/usr/bin/env python3
"""Independent-verification sampling and inter-annotator agreement.

Two modes:
  sample  - draw the independent-verification sample (reproducible, fixed seed)
  agree   - compute observed agreement, Cohen's kappa and a 95% CI from completed
            worksheets carrying two reviewers' decisions

The sampling plan follows the annotation guideline: all 398 canonical clauses are
double-reviewed; the other layers are sampled by stratified random sampling.

Usage:
  python code/compute_agreement.py sample [package_root]
  python code/compute_agreement.py agree  <first.csv> <second.csv> [--col review_status]
"""
import argparse, csv, json, math, pathlib, random, sys, collections

SEED = 20260811
PLAN = {"clauses": {"file": "08_manual_review/clause_review.csv", "id": "clause_id",
                    "stratify": "text_type", "canonical_all": True, "fraction": None},
        "commentaries": {"file": "08_manual_review/commentary_review.csv", "id": "commentary_id",
                         "stratify": "commentator", "canonical_all": False, "fraction": 0.15},
        "variants": {"file": "08_manual_review/variant_review.csv", "id": "variant_id",
                     "stratify": "variant_book", "canonical_all": False, "fraction": 0.325},
        "relations": {"file": "08_manual_review/relation_review.csv", "id": "relation_id",
                      "stratify": "relation_type", "canonical_all": False, "fraction": 0.117}}

def stratified(rows, idf, stratum, fraction, rng):
    by = collections.defaultdict(list)
    for r in rows:
        by[r.get(stratum, "")].append(r[idf])
    out = []
    for k in sorted(by):
        ids = sorted(by[k])
        rng.shuffle(ids)
        n = max(1, round(len(ids) * fraction))
        out += [(k, i) for i in ids[:n]]
    return out

def do_sample(root):
    root = pathlib.Path(root)
    rng = random.Random(SEED)
    manifest = {"seed": SEED, "layers": {}}
    for layer, cfg in PLAN.items():
        rows = list(csv.DictReader(open(root / cfg["file"], encoding="utf-8")))
        if cfg["canonical_all"]:
            picked = [("original_clause", r[cfg["id"]]) for r in rows
                      if r.get("text_type") == "original_clause"]
            aux = [r for r in rows if r.get("text_type") != "original_clause"]
            picked += stratified(aux, cfg["id"], cfg["stratify"], 0.15, rng)
        else:
            picked = stratified(rows, cfg["id"], cfg["stratify"], cfg["fraction"], rng)
        outp = root / "08_manual_review" / f"verification_sample_{layer}.csv"
        with open(outp, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["stratum", cfg["id"], "reviewer_b_status", "reviewer_b_id",
                        "reviewer_b_date", "reviewer_b_reason"])
            for s, i in picked:
                w.writerow([s, i, "", "", "", ""])
        manifest["layers"][layer] = {"population": len(rows), "sampled": len(picked),
                                     "fraction": round(len(picked) / len(rows), 4),
                                     "stratified_by": cfg["stratify"], "file": str(outp.name)}
    (root / "08_manual_review" / "verification_sampling_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=1))

def kappa(a, b):
    """Cohen's kappa with the standard large-sample SE (Fleiss 1969)."""
    assert len(a) == len(b) and a, "need equal, non-empty decision vectors"
    n = len(a)
    cats = sorted(set(a) | set(b))
    po = sum(1 for x, y in zip(a, b) if x == y) / n
    ca, cb = collections.Counter(a), collections.Counter(b)
    pe = sum((ca[c] / n) * (cb[c] / n) for c in cats)
    if pe == 1:
        return {"n": n, "observed_agreement": po, "expected_agreement": pe,
                "kappa": None, "note": "kappa undefined: expected agreement is 1"}
    k = (po - pe) / (1 - pe)
    se = math.sqrt(po * (1 - po) / (n * (1 - pe) ** 2))
    return {"n": n, "categories": cats, "observed_agreement": round(po, 4),
            "expected_agreement": round(pe, 4), "kappa": round(k, 4),
            "se": round(se, 4), "ci95": [round(k - 1.96 * se, 4), round(k + 1.96 * se, 4)]}

def do_agree(f1, f2, col):
    r1 = {r[list(r)[0]] if "record_id" not in r else r["record_id"]: r for r in
          csv.DictReader(open(f1, encoding="utf-8"))}
    rows2 = list(csv.DictReader(open(f2, encoding="utf-8")))
    a, b, ids = [], [], []
    for r in rows2:
        key = next((r[k] for k in r if k.endswith("_id") and not k.startswith("reviewer")), None)
        if key in r1 and r1[key].get(col) and r.get(col):
            a.append(r1[key][col]); b.append(r[col]); ids.append(key)
    if not a:
        print(json.dumps({"error": "no overlapping completed decisions found",
                          "column": col}, indent=1))
        return 1
    res = kappa(a, b)
    res["disagreements"] = [i for i, x, y in zip(ids, a, b) if x != y]
    res["n_disagreements"] = len(res["disagreements"])
    res["disagreements"] = res["disagreements"][:50]
    print(json.dumps(res, ensure_ascii=False, indent=1))
    return 0

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("sample"); s.add_argument("root", nargs="?", default=".")
    g = sub.add_parser("agree"); g.add_argument("first"); g.add_argument("second")
    g.add_argument("--col", default="review_status")
    ns = ap.parse_args()
    sys.exit(do_sample(ns.root) if ns.cmd == "sample" else do_agree(ns.first, ns.second, ns.col))
