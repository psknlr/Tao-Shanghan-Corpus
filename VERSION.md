# Version

- Dataset: Historical_Shanghan_Corpus
- Version: 1.0
- Schema version: 1.0
- Build date: 2026-08-11
- Upstream bundle: ShangHan-Hermes_Corpus_Final_v1.0_20260810
- Upstream source repository of the historical texts: 中醫典籍資料庫 (Database of Chinese Medical Classics), jicheng.tw, https://jicheng.tw/tcm/index.html

## Provenance of this release
All 425 source text files were verified byte-for-byte against the upstream `SHA256SUMS.txt`
(425/425 agreement; 902/902 for the whole upstream bundle). Structured layers were re-derived
from the upstream `02_structured_evidence/` files, with source attribution recomputed by text
containment against the source files rather than inherited from title strings.

## Review status
Automated construction and computational validation are complete. Manual review of the
structured records is IN PROGRESS: every structured record carries `review_status = pending`
and empty reviewer fields. No agreement statistics are reported in this version.
