/** Shapes of the JSON emitted by scripts/build_demo_data.py. */

export interface KeyCount { key: string; count: number }

export interface Commentator {
  commentator: string
  book: string
  dynasty: string
  source_id: string
  records: number
  clauses: number
}

export interface VariantWitness {
  variant_book: string
  variant_version: string
  source_id: string
  records: number
  mean_similarity: number
}

export interface CorpusSummary {
  dataset: string
  version: string
  schema_version: string
  validated_on: string
  featured_clause_id: string
  headline: {
    historical_works: number
    source_files: number
    characters: number
    clause_records: number
    canonical_clauses: number
    auxiliary_clauses: number
    commentaries: number
    variants: number
    relations: number
    nodes: number
    unified_records: number
  }
  distributions: {
    dynasty: KeyCount[]
    work_type: KeyCount[]
    six_channel: KeyCount[]
    relation_type: KeyCount[]
    top_formulae: KeyCount[]
  }
  commentators: Commentator[]
  variant_witnesses: VariantWitness[]
  validation: {
    overall_status: string
    schema: Record<string, number | string>
    structural: Record<string, number | string | boolean>
    integrity: Record<string, number | string>
    provenance: Record<string, { records: number; resolved_to_source_files: number; rate: number }>
    duplicates: Record<string, number | string>
    manual_review: {
      status: string
      records_requiring_review: number
      records_reviewed: number
      agreement_statistics: string
      note: string
    }
  }
}

export interface SourceFile {
  relative_path: string
  sha256: string
  bytes: number
  characters: number
  utf8_valid: boolean
}

export interface SourceWork {
  source_id: string
  title_zh: string
  title_translit: string
  author: string
  dynasty: string
  dynasty_raw: string
  approximate_date: string
  work_type: string
  collection: string
  evidence_layer: string
  witness_status: string
  language: string
  script: string
  n_files: number
  characters: number
  edition_stated: string
  reference_copy: string
  upstream_format: string
  upstream_encoding: string
  source_repository: string
  source_url: string
  upstream_path: string
  work_sha256: string
  licence_status: string
  files: SourceFile[]
}

export interface TimelineWork {
  source_id: string
  title_zh: string
  title_translit: string
  author: string
  approximate_date: string
  work_type: string
  witness_status: string
  characters: number
  n_files: number
  evidence_layer: string
  clauses: number
  commentaries: number
  variants: number
}

export interface TimelineBand {
  dynasty: string
  works: TimelineWork[]
  works_count: number
  characters: number
}

export interface SearchEntry {
  id: string
  no: number | null
  type: string
  chapter: string
  six_channel: string
  text: string
  formulae: string[]
  symptoms: string[]
  pulse: string[]
  patterns: string[]
  herbs: string[]
  commentators: string[]
  n_commentaries: number
  n_variants: number
  n_relations: number
}

export interface FormulaBlock {
  formula_name: string
  composition: { herb: string; dose_processing: string }[]
  preparation: string
  administration: string
  post_notes: string[]
  raw_text: string
}

export interface Clause {
  clause_id: string
  source_id: string
  book_title: string
  version: string
  canonical_clause_no: number | null
  chapter: string
  six_channel: string
  text_type: string
  clause_layer: string
  original_text: string
  normalized_text: string
  contains_formula: boolean
  formula_names: string[]
  formula_blocks: FormulaBlock[]
  symptoms: string[]
  negated_findings: string[]
  pulse: string[]
  disease_patterns: string[]
  therapy_terms: string[]
  contraindication_terms: string[]
  mistreatment_terms: string[]
  transformation_terms: string[]
  prognosis_terms: string[]
  herbs: string[]
  time_course: string[]
  collation_notes: string[]
  logic_words: string[]
  sha256: string
  review_status: string
  source_resolution: string
}

export interface CommentaryRecord {
  commentary_id: string
  commentator: string
  book: string
  dynasty: string
  source_id: string
  chapter: string
  source_location: string
  text: string
  alignment_similarity: number
  alignment_type: string
  candidate_confidence: string
  source_resolution: string
  review_status: string
  /** Editorial 句讀 of an unpunctuated (白文) transmission; absent where the source
   *  is already punctuated. Insertions only — see 10_editorial_punctuation/. */
  punctuated_text?: string
  punctuation_method?: string
  punctuation_review_status?: string
  punctuation_marks_added?: number
}

/** One run of the build-time collation: shared text, base-only text, or witness-only text. */
export type DiffSegment = { t: '='; a: string } | { t: '-'; a: string } | { t: '+'; b: string }

export interface VariantRecord {
  variant_id: string
  variant_book: string
  variant_version: string
  base_version: string
  source_id: string
  base_text: string
  variant_text: string
  variant_body: string
  witness_section_marker: string
  similarity: number
  notable_differences: string[]
  candidate_confidence: string
  source_resolution: string
  review_status: string
  diff: DiffSegment[]
}

export interface GraphNeighbour {
  id: string
  type: 'clause' | 'commentary' | 'variant'
  label: string
  no?: number | null
  formulae?: string[]
  book?: string
  dynasty?: string
  similarity?: number
  source_id: string
}

export interface GraphEdge {
  relation_id: string
  type: string
  direction: 'in' | 'out'
  other: string
  description: string
  confidence: number | string
  target_resolution: string
  source_reference: Record<string, string>
  review_status: string
}

export interface ProvenanceChain {
  record: { id: string; sha256: string; source_resolution: string; review_status: string }
  work: {
    source_id: string
    title_zh: string
    title_translit: string
    author: string
    dynasty: string
    n_files: number
    characters: number
    witness_status: string
    evidence_layer: string
  }
  files: SourceFile[]
  files_total: number
  repository: { name: string; url: string; upstream_path: string; licence_status: string }
  checks: { key: string; ok: boolean }[]
}

export interface ClausePayload {
  clause: Clause
  work: { source_id: string; title_zh: string; title_translit: string; author: string; dynasty: string }
  commentaries: CommentaryRecord[]
  variants: VariantRecord[]
  graph: { neighbours: GraphNeighbour[]; edges: GraphEdge[] }
  provenance: ProvenanceChain
  counts: { commentaries: number; variants: number; relations: number }
}

export interface ReleaseAsset {
  name: string
  download_count: number
  size: number
  url: string
  updated_at: string
  tag?: string
}

export interface DownloadMetrics {
  generated_at: string
  repository: string
  /** False when no release has been published, or the API could not be read. */
  available: boolean
  source: string
  total_downloads: number
  releases: {
    tag: string
    name: string
    published_at: string
    html_url: string
    prerelease: boolean
    assets: ReleaseAsset[]
  }[]
  latest_asset: ReleaseAsset | null
  traffic: {
    available: boolean
    window_days?: number
    clones?: number
    unique_clones?: number
    views?: number
    unique_views?: number
  }
}

export interface RelationType {
  relation_type: string
  edges: number
  source_types: string
  target_types: string
  example_description: string
}
