# Historical Shanghan Corpus

**A structured corpus of historical Shanghan literature with clauses, commentaries and textual variants**
《傷寒論》歷代文獻結構化、可追溯數字語料庫

> **The first publicly released dataset of the historical citation and commentarial system of the *Shanghan Lun*** — the first openly available corpus to align the canonical clauses with their historical commentarial tradition, competing manuscript witnesses and inter-textual relations as separate, individually addressable and provenance-tracked layers.
>
> **首個公開發布的《傷寒論》歷代引文體系數據集** —— 首次以獨立、可尋址、可溯源的分層結構，將經典條文與歷代注釋、傳本異文及文本間關係對齊發布。

[**Explore the corpus →**](https://psknlr.github.io/Tao-Shanghan-Corpus/) · [Data dictionary](DATA_DICTIONARY.md) · [Licence](LICENSE.md) · [Version](VERSION.md) · [Validation reports](09_validation/)

`v1.0` · schema `1.0` · built 2026-08-11 · Literary Chinese (`lzh`), Traditional script (`Hant`) · structured layers CC BY 4.0

---

## Overview

The *Shanghan Lun* (傷寒論) has been transmitted for eighteen centuries as a layered
tradition: a canonical clause text, successive commentarial recensions, competing
manuscript witnesses, and a dense web of cross-references that later commentators
built between clauses. Most digital editions flatten that structure into plain text,
and the citation relationships that hold the tradition together — which commentator
glossed which clause, in which recension, against which witness — have not previously
been released in a machine-readable and independently checkable form.

This is the first publicly available dataset to reconstruct that citation system as
data. The corpus keeps the layers apart and links them explicitly: canonical clauses,
historical commentaries, textual variants and inter-textual relations are separate,
individually addressable record types, each carrying a resolvable path back to the
source file it was derived from and the SHA-256 of that file.

The release is deliberately conservative about what it claims. Automated construction
and computational validation are complete; manual review of the structured records is
**in progress**, every structured record carries `review_status = pending`, and no
inter-annotator agreement statistics are reported in this version. Missing values are
written as the explicit token `not_stated_in_source` and are never imputed.

## Dataset at a glance

| | | | |
|---|---|---|---|
| **57** historical works | **425** source text files | **4,763,991** characters | **681** clause records |
| **398** canonical clauses | **2,958** commentaries | **616** textual variants | **4,286** relations |

Additional derived layers: **4,255** graph nodes and **4,255** unified text records.

Every figure above is taken from [`09_validation/validation_report.json`](09_validation/validation_report.json).

## Interactive demo

The GitHub Pages site is an explorer over the same data, not a separate export:

- **Clause Explorer** — search 681 clause records by number, formula, symptom, pulse sign, chapter or commentator
- **Commentarial tradition** — commentaries aligned to a clause, laid out by the period of the commentator
- **Textual variants** — the Song base text against each witness, with a character-level collation
- **Relation network** — the ego network of a clause, filterable by relation type (Cytoscape.js)
- **Provenance trace** — record → catalogued work → source file → checksum → upstream repository
- **Validation** — the released validation report, rendered field by field

Canonical clause 23 (桂枝麻黃各半湯) is the default record: it carries 11 commentaries
across Jin, Ming and Qing, 2 variant witnesses and 9 differential relations, so a single
record exercises the whole data model.

The site loads a per-clause JSON file on demand rather than the whole corpus. Those files
are derived by [`scripts/build_demo_data.py`](scripts/build_demo_data.py) and are a
projection of the released layers — the layers themselves remain the citable artefact.

## Corpus composition

Works are catalogued in the period recorded upstream; four works carry no dynasty
statement and are kept in a separate band rather than being assigned one.

| Dynasty | Works |
|---|---|
| Eastern Han | 4 |
| Song | 8 |
| Jin (1115–1234) | 9 |
| Yuan | 2 |
| Ming | 4 |
| Qing | 26 |
| `not_stated_in_source` | 4 |

Nine commentarial works are aligned to the canonical clauses: 錢潢《傷寒溯源集》(389
records), 方有執《傷寒論條辨》(376), 丹波元簡《傷寒論輯義》(375), 成無己《註解傷寒論》(372),
張卿子《張卿子傷寒論》(367), 柯琴《傷寒論注》(353) and《傷寒來蘇集》(350), 尤怡《傷寒貫珠集》(328),
黃元御《傷寒懸解》(48).

Two variant witnesses are collated against the Song edition: 傷寒雜病論_桂本 (379 variants)
and 傷寒論_千金翼方版 (237).

## Data structure

```
01_source_catalog/     sources.csv, editions.csv, source_provenance.csv
02_source_texts/       425 UTF-8 .txt files in 57 per-work directories + file_manifest.csv
03_clauses/            clauses.jsonl / .csv          681 records
04_commentaries/       commentaries.jsonl / .csv   2,958 records
05_textual_variants/   variants.jsonl / .csv         616 records
06_relations/          relations.jsonl / .csv      4,286 edges
                       nodes.jsonl                 4,255 nodes
                       relation_types.csv              8 types
07_unified_records/    unified_text_records.jsonl  4,255 records
08_manual_review/      review tables, sampling manifest, annotation guideline
09_validation/         schema, integrity, provenance and duplicate reports
code/                  validation and checksum scripts
scripts/               build_demo_data.py — derives the site payloads
site/                  React + Vite source of the GitHub Pages explorer
```

Every field is documented in [`DATA_DICTIONARY.md`](DATA_DICTIONARY.md), which tags each
field by origin: `curated`, `computed`, `automated`, `provenance` or `review`.

### Relation types

| Type | Edges | Endpoints |
|---|---|---|
| `commentary_support` | 2,958 | clause → commentary |
| `variant` | 616 | clause → variant |
| `sequence` | 388 | clause → clause |
| `same_formula_family` | 151 | clause → clause |
| `differential` | 117 | clause → clause |
| `mistreatment_transformation` | 52 | clause → clause |
| `transmission` | 3 | clause → clause |
| `contraindication` | 1 | clause → clause |

## Example record

A canonical clause (`03_clauses/clauses.jsonl`, abridged):

```json
{
  "clause_id": "SHL_SONGBEN_0023",
  "source_id": "SHSRC0033",
  "canonical_clause_no": 23,
  "chapter": "辨太陽病脈證並治上",
  "six_channel": "太陽病",
  "text_type": "original_clause",
  "original_text": "太陽病，得之八九日，如瘧狀，發熱惡寒，熱多寒少……宜桂枝麻黃各半湯。",
  "contains_formula": true,
  "formula_names": ["桂枝麻黃各半湯"],
  "symptoms": ["如瘧狀", "發熱", "惡寒", "面色反有熱色", "汗出"],
  "pulse": ["微", "陰陽俱虛", "緩微"],
  "sha256": "99c230a77bed0c4706b78d32446b90f2c113d35d7043bf38b656cadccf158418",
  "review_status": "pending",
  "source_resolution": "text_match_multi"
}
```

## Provenance

Each structured record resolves along a fixed chain:

```
structured record  →  source_id  →  catalogued work  →  source text file  →  SHA-256
```

- 681/681 clauses, 2,958/2,958 commentaries and 616/616 variants resolve to source files (rate 1.00)
- Source attribution is recomputed by text containment against the source files, not inherited from title strings
- All 425 source files were verified byte-for-byte against the upstream manifest (425/425; 902/902 for the whole upstream bundle)
- 0 orphan relation endpoints, 0 unresolved source or target nodes, 0 self-loops

The historical texts were obtained from 中醫典籍資料庫 (Database of Chinese Medical
Classics), <https://jicheng.tw/tcm/index.html>. Per-work upstream paths and checksums are
recorded in [`01_source_catalog/source_provenance.csv`](01_source_catalog/source_provenance.csv).

## Manual review

Manual review is an open stage, reported as such rather than implied to be complete.

| | |
|---|---|
| Status | `in_progress` |
| Structured records requiring review | 8,541 |
| Records reviewed | 0 |
| Agreement statistics | not yet available |

Independent-verification samples have been drawn with a fixed seed and are in
[`08_manual_review/`](08_manual_review/), together with the review tables, the
adjudication and correction logs, and [the annotation
guideline](08_manual_review/ANNOTATION_GUIDELINE.md). The guideline's cardinal rule is
that the source text governs: where a structured record and the source file disagree,
the record is corrected and the historical text is never silently emended.

## Validation

Computational validation status: **PASS** (2026-08-11).

| Check | Result |
|---|---|
| Malformed JSON | 0 |
| Duplicate identifiers | 0 |
| Missing required fields | 0 |
| Wrong-typed fields | 0 |
| Orphan relation endpoints | 0 |
| Unresolved source / target nodes | 0 / 0 |
| Canonical clauses contiguous 1–398 | true |
| Invalid UTF-8 / empty source files | 0 / 0 |
| SHA-256 source verification | 425/425 |

Four duplicate groups are detected and flagged for review rather than treated as errors:
two commentary pairs are the same short gloss transmitted from 註解傷寒論 into 張卿子傷寒論,
and two variant pairs are one 桂本 passage aligned to two different canonical clauses.

Reports: [`09_validation/`](09_validation/). To reproduce them:

```bash
python3 code/validate_schema.py
python3 code/validate_relations.py
python3 code/verify_checksums.py
```

## Quick start

Read a layer with nothing but the standard library:

```python
import json

clauses = [json.loads(line) for line in open("03_clauses/clauses.jsonl", encoding="utf-8")]
commentaries = [json.loads(line) for line in open("04_commentaries/commentaries.jsonl", encoding="utf-8")]

clause = next(c for c in clauses if c["canonical_clause_no"] == 23)
aligned = [c for c in commentaries if c["clause_id"] == clause["clause_id"]]

print(clause["original_text"])
for record in aligned:
    print(f'{record["commentator"]}《{record["book"]}》 {record["dynasty"]}')
```

Run the explorer locally:

```bash
python3 scripts/build_demo_data.py     # writes site/public/data/
cd site && npm install && npm run dev
```

## Authors

Yanlan Kang, Li Xin, Peng Qiu, Xukun Zhang, William Cheng-Chung Chu

**Affiliations**

1. Institute of Medical Philosophy & Future AI
2. Shandong Xiehe University
3. The University of Hong Kong
4. Shandong University of Traditional Chinese Medicine
5. Fujian Fuyao University of Science and Technology

## Citation

> Kang, Y., Xin, L., Qiu, P., Zhang, X., & Chu, W. C.-C. (2026). *A structured corpus of
> historical Shanghan literature with clauses, commentaries and textual variants*
> (Version 1.0) [Data set]. <https://github.com/psknlr/Tao-Shanghan-Corpus>

```bibtex
@dataset{kang_2026_historical_shanghan_corpus,
  author    = {Kang, Yanlan and Xin, Li and Qiu, Peng and Zhang, Xukun and
               Chu, William Cheng-Chung},
  title     = {A structured corpus of historical Shanghan literature with
               clauses, commentaries and textual variants},
  version   = {1.0},
  year      = {2026},
  publisher = {GitHub},
  url       = {https://github.com/psknlr/Tao-Shanghan-Corpus},
  note      = {Historical Shanghan Corpus}
}
```

A machine-readable [`CITATION.cff`](CITATION.cff) is included.

## Licence

The structured layers created by the dataset authors — `01_source_catalog/`,
`03_clauses/`, `04_commentaries/`, `05_textual_variants/`, `06_relations/`,
`07_unified_records/`, `08_manual_review/`, `09_validation/`, `code/` and `scripts/` — are
released under [CC BY 4.0](LICENSE.md).

The historical works in `02_source_texts/` are pre-modern and their textual content is in
the public domain by age. The digital transcriptions were obtained from 中醫典籍資料庫
(jicheng.tw), whose terms of use are recorded as `not_stated_in_source` in the materials
available to the dataset authors. **Anyone intending to redistribute the transcriptions
should consult the source repository directly.**

## Disclaimer

This is a historical-literature dataset assembled for philological and digital-humanities
research. It is **not medical advice** and must not be used as a source of clinical
guidance.
