# Data dictionary

Historical_Shanghan_Corpus v1.0 (schema 1.0, built 2026-08-11).

Every field is tagged by origin: **curated** (from the historical source or editorial decision), **computed** (derived deterministically in this release), **automated** (produced by automatic extraction and not yet manually reviewed), **provenance** (a record of the upstream construction stage, retained for traceability and not a statement of quality), or **review** (reserved for the manual review, empty or `pending` in v1.0).

Missing values are written as the explicit token `not_stated_in_source`. Values are never imputed.


## `sources.csv`

| Field | Type | Description | Origin |
|---|---|---|---|
| `source_id` | string | Stable work identifier SHSRC0001-SHSRC0057 | curated |
| `title_zh` | string | Title as given in the source repository | curated |
| `title_translit` | string | Romanised title | curated |
| `alternative_title` | string | Alternative title; `not_stated_in_source` throughout this version | curated |
| `author` | string | Attributed author; may be `not_stated_in_source` | curated |
| `dynasty` | string | Normalised dynasty (Eastern Han, Song, Jin (1115-1234), Yuan, Ming, Qing, or not_stated_in_source) | curated |
| `dynasty_raw` | string | Dynasty string as stated upstream | provenance |
| `approximate_date` | string | Approximate date range as stated upstream | curated |
| `edition` | string | Edition statement; `not_stated_in_source` for 54 of 57 works | curated |
| `n_files` | integer | Number of plain-text files for this work | computed |
| `characters` | integer | Total characters (Python len of decoded text, whitespace included) | computed |
| `language` | string | ISO 639-3 `lzh` (Literary Chinese) | curated |
| `script` | string | ISO 15924 `Hant`; verified by simplified-form scan | computed |
| `work_type` | string | commentary, variant_edition, canonical_text, formula_family, collation, medical_case, or not_stated_in_source | curated |
| `collection` | string | Upstream collection: shanghan, jingui, shanghan_jingui_combined, yian_cases | provenance |
| `evidence_layer` | string | Upstream evidence layer A/B/C/D/P | provenance |
| `witness_status` | string | single_copy or multiple_copies (title present as two digitised witnesses) | computed |
| `notes` | string | Free-text note | curated |

## `file_manifest.csv`

| Field | Type | Description | Origin |
|---|---|---|---|
| `file_id` | string | Stable file identifier | computed |
| `source_id` | string | Owning work | computed |
| `relative_path` | string | Path within this release | computed |
| `original_path` | string | Path in the upstream bundle | provenance |
| `sha256` | string | SHA-256 of the file bytes | computed |
| `bytes` | integer | File size | computed |
| `characters` | integer | Characters including whitespace | computed |
| `characters_no_ws` | integer | Characters excluding whitespace | computed |
| `utf8_valid` | boolean | File decodes as UTF-8 | computed |
| `is_empty` | boolean | File has no non-whitespace content | computed |

## `clauses.jsonl / clauses.csv`

| Field | Type | Description | Origin |
|---|---|---|---|
| `clause_id` | string | Stable clause identifier | curated |
| `source_id` | string | Source work, resolved by text containment | computed |
| `book_title` | string | Work title as recorded in the structured layer | provenance |
| `version` | string | Textual version label (e.g. songben) | curated |
| `canonical_clause_no` | integer|null | Canonical number 1-398 for original_clause; null for auxiliary_clause | curated |
| `chapter` | string | Chapter heading | curated |
| `six_channel` | string | Six-channel division | curated |
| `text_type` | string | original_clause (398) or auxiliary_clause (283) | curated |
| `clause_layer` | string | Evidence layer (A) | provenance |
| `original_text` | string | Verbatim text as transmitted; never modernised | curated |
| `normalized_text` | string | Structurally normalised text; whitespace and markup only | curated |
| `contains_formula` | boolean | Whether a formula is named | computed |
| `symptoms / pulse / herbs / formula_names / ... ` | array | Extracted term annotations; automated, pending review | automated |
| `sha256` | string | Hash of the clause text | computed |
| `review_status` | string | `pending` in v1.0 | review |
| `reviewer_id` | string | Empty in v1.0 | review |

## `commentaries.jsonl / .csv`

| Field | Type | Description | Origin |
|---|---|---|---|
| `commentary_id` | string | Stable identifier | curated |
| `source_id` | string | Source work, resolved by text containment | computed |
| `book` | string | Commentary work title | curated |
| `commentator` | string | Attributed commentator | curated |
| `dynasty` | string | Dynasty of the commentary work | curated |
| `clause_id` | string | Aligned canonical clause | curated |
| `chapter` | string | Chapter in the commentary work | curated |
| `source_location` | string | Location of the passage | provenance |
| `commentary_text` | string | Verbatim commentary passage | curated |
| `alignment_similarity` | float | Automated alignment score | automated |
| `alignment_type` | string | clause_level | curated |
| `candidate_confidence` | string | Pre-review construction-stage label; NOT a quality grade | provenance |
| `review_status` | string | `pending` in v1.0 | review |
| `reviewer_id` | string | Empty in v1.0 | review |

## `variants.jsonl / .csv`

| Field | Type | Description | Origin |
|---|---|---|---|
| `variant_id` | string | Stable identifier | curated |
| `source_id` | string | Variant witness, resolved by text containment | computed |
| `clause_id` | string | Aligned canonical clause | curated |
| `base_version` | string | Base witness label | curated |
| `variant_version` | string | Variant witness label | curated |
| `variant_book` | string | Variant work title | curated |
| `base_text` | string | Base reading | curated |
| `variant_text` | string | Variant reading | curated |
| `similarity` | float | Automated similarity | automated |
| `notable_differences` | array | Automatically detected differing spans | automated |
| `candidate_confidence` | string | silver/bronze from the automated stage; NOT a released quality grade | provenance |
| `manual_status` | string | Empty in v1.0; to hold verified / corrected / excluded | review |
| `review_status` | string | `pending` in v1.0 | review |
| `reviewer_id` | string | Empty in v1.0 | review |

## `relations.jsonl / .csv`

| Field | Type | Description | Origin |
|---|---|---|---|
| `relation_id` | string | Stable edge identifier | curated |
| `source_node_id` | string | Origin node | curated |
| `source_node_type` | string | clause | computed |
| `source_source_id` | string | Work owning the origin node | computed |
| `target_node_id` | string | Destination node (clause, commentary, or variant) | computed |
| `target_node_type` | string | clause | commentary | variant | computed |
| `target_source_id` | string | Work owning the destination node | computed |
| `relation_type` | string | See relation_types.csv | curated |
| `description` | string | Human-readable justification | curated |
| `target_citation` | string | Original book:location citation, retained verbatim | provenance |
| `target_resolution` | string | How the target was resolved to a node | computed |
| `source_reference` | object | Evidence payload as supplied upstream | provenance |
| `candidate_confidence` | float | Automated confidence | automated |
| `review_status` | string | `pending` in v1.0 | review |
| `reviewer_id` | string | Empty in v1.0 | review |

## `nodes.jsonl`

| Field | Type | Description | Origin |
|---|---|---|---|
| `node_id` | string | Node identifier | computed |
| `node_type` | string | clause | commentary | variant | computed |
| `source_id` | string | Owning work | computed |
| `clause_id` | string | Anchoring clause | computed |
| `label` | string | Short human-readable label | computed |
| `resolvable` | boolean | Node exists in a data layer | computed |

## `unified_text_records.jsonl`

| Field | Type | Description | Origin |
|---|---|---|---|
| `record_id` | string | Equals the clause/commentary/variant identifier | computed |
| `record_type` | string | clause | commentary | variant | computed |
| `clause_id` | string | Anchoring clause | computed |
| `source_id` | string | Owning work | computed |
| `text` | string | Passage text | computed |
| `book` | string | Work title | computed |
| `chapter` | string | Chapter | computed |
| `six_channel` | string | Six-channel division | computed |
| `text_provenance` | string | Layer the text came from | provenance |
| `candidate_confidence` | string|null | Pre-review label where applicable | provenance |
| `metadata` | object | Layer-specific annotation payload | automated |

## `10_editorial_punctuation/punctuation.jsonl`

Editorial punctuation (句讀) for commentary passages whose transmission carries none.
Added in v1.0 for 黃元御《傷寒懸解》(`SHSRC0013`), the one catalogued work transmitted as
白文. The historical text in `04_commentaries/` is not modified by this layer; the reading
is parallel to it and marks may only be inserted, never substituted or removed.

| Field | Type | Description | Origin |
|---|---|---|---|
| `punctuation_id` | string | `PUNCT_` + the commentary identifier | computed |
| `commentary_id` | string | Commentary record this reading punctuates | computed |
| `source_id` | string | Owning work, copied from the commentary record | computed |
| `book` | string | Work title, copied from the commentary record | provenance |
| `commentator` | string | Commentator, copied from the commentary record | provenance |
| `clause_id` | string | Clause the commentary is aligned to | computed |
| `base_sha256` | string | SHA-256 of the `commentary_text` this reading was made from | computed |
| `punctuated_text` | string | The commentary text with sentence punctuation inserted | automated |
| `marks_added` | integer | Number of punctuation characters inserted | computed |
| `insertable_marks` | string | The only characters this layer may introduce: `，。；：、？！` | curated |
| `method` | string | `editorial_llm_assisted` | provenance |
| `editor_id` | string | Reserved for the human editor; empty in v1.0 | review |
| `review_status` | string | `pending` throughout v1.0 | review |
| `note` | string | Statement of what the reading is and is not | curated |

**Invariant.** Removing every character of `insertable_marks` from `punctuated_text` must
reproduce the record's `commentary_text` exactly. `code/validate_punctuation.py` enforces
this and runs in CI, so the layer cannot silently emend the corpus. Punctuating classical
Chinese is interpretive; this reading is unreviewed and is not authoritative.
