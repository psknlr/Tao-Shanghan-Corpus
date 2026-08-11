# Annotation and review guideline
Historical_Shanghan_Corpus v1.0 — schema 1.0

## 1. Purpose and scope
Every structured record released in this corpus is to be checked against the source text from
which it was derived. Review operates on the structured records (681 clauses,
2958 commentaries, 616 variants, 4286 relations;
8541 records in total).

Review of the source layer is conducted at the **document and file level** — bibliographic
identity, file integrity, encoding, completeness, and gross textual anomaly — and is **not** a
character-by-character critical collation of the 4,763,991 characters of source
text. Reviewers must not silently emend the historical text.

## 2. Decision set
Every record receives exactly one `review_status`:

| Value | Meaning |
|---|---|
| `accepted` | The record is correct as constructed. No change. |
| `corrected` | A field was wrong and has been fixed. A correction-log entry is required. |
| `excluded` | The record should not be released (misalignment, spurious extraction, not in scope). |
| `uncertain` | The reviewer cannot decide from the source. Escalates to adjudication. |

`corrected` and `excluded` both require a `reason`. `uncertain` requires a note stating what
evidence would settle the question.

## 3. Cardinal rules
1. **The source text governs.** Where a structured record and the source file disagree, the
   source file is correct and the record is corrected.
2. **Never modernise.** `original_text` preserves the transmitted reading, including variant
   and archaic character forms. Normalisation belongs only in `normalized_text`.
3. **Never impute.** If a field is not recoverable from the source, write `not_stated_in_source`.
4. **Record the trail.** Every change writes a `correction_log.csv` row keyed to the stable
   record identifier, with the original and corrected values preserved.
5. **Automated labels are not evidence.** `candidate_confidence` (silver/bronze),
   `alignment_similarity`, and `similarity` describe the automated construction stage. They must
   not be used as grounds for accepting a record.

## 4. Per-layer protocols

### 4.1 Clause review (`clause_review.csv`)
Check each of: source attribution; clause number; textual boundary; original text; chapter;
formula reference; source position.
- The canonical clause number applies only to `text_type = original_clause` (1-398). Auxiliary
  clauses carry no canonical number; do not invent one.
- Textual boundary: confirm the clause begins and ends where the source passage does, and that
  no adjacent clause has been absorbed or truncated.
- Formula reference: confirm every name in `formula_names` occurs in the clause, and that no
  named formula in the clause is missing.

### 4.2 Commentary review (`commentary_review.csv`)
Check each of: commentary text; commentator; source; mapped clause; passage boundary; source
location.
- Mapped clause is the substantive test: the passage must actually comment on the clause it is
  aligned to. A high `alignment_similarity` is not sufficient.
- Where a commentary work transmits an earlier commentary (for example 張卿子傷寒論 reproducing
  glosses from 註解傷寒論), attribute to the work in which the passage is found and note the
  transmission in `notes`.

### 4.3 Variant review (`variant_review.csv`)
Check each of: source reading; comparison reading; clause alignment; variant span; source
attribution.
- Confirm the base and variant readings are transcribed exactly from their respective witnesses.
- Confirm the variant is aligned to the correct canonical clause; one passage in a variant
  witness may legitimately align to more than one clause, which is not an error but must be
  noted.
- `notable_differences` is automatically detected; confirm it captures the substantive
  divergences and contains no spurious spans.

### 4.4 Relation review (`relation_review.csv`)
Check each of: source node; target node; relation type; evidence source.
- Confirm both endpoints exist and are of the stated type.
- Confirm the relation type is warranted by the texts, not merely by proximity. `sequence`
  requires adjacency in the same chapter; `differential` requires a genuine contrast in
  presentation or treatment; `transmission` requires an explicit statement of disease movement.
- Where `target_resolution = citation_to_node_first_of_multiple`, confirm the edge points at the
  intended passage and correct it if not.

## 5. Independent verification
A second reviewer, blind to the first reviewer's decisions, independently re-reviews:
- **all 398 canonical clauses** (100%), because they anchor every other layer;
- a stratified random sample of the remaining layers (see `code/compute_agreement.py` for the
  sampling procedure and its random seed).

Agreement is reported as observed agreement and Cohen's kappa with a 95% confidence interval,
computed over the `accepted` / `corrected` / `excluded` / `uncertain` decision and, separately,
over alignment and relation-type categories.

## 6. Adjudication
Disagreements between the two reviewers, and any record marked `uncertain`, are resolved by a
senior domain expert. The adjudicated decision is recorded in `adjudication_log.csv` together
with both reviewers' original decisions and the rationale. The adjudicated value becomes the
released value.

## 7. Reviewer qualifications
Reviewers should be trained in classical Chinese medical literature and able to read
pre-modern literary Chinese in traditional script. Reviewer identifiers are pseudonymous
(`R01`, `R02`, ...) and recorded in `reviewer_id`.
