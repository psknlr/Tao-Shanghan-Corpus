import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'zh'

/**
 * Interface copy only. Everything drawn from the corpus itself — clause text,
 * commentary, work titles, author names — is shown in the original Traditional
 * Chinese in both language modes and is never translated here.
 */
const DICT = {
  // chrome ------------------------------------------------------------------
  'nav.explore': ['Explore', '探索'],
  'nav.sources': ['Sources', '文獻'],
  'nav.clauses': ['Clauses', '條文'],
  'nav.commentary': ['Commentary', '注釋'],
  'nav.variants': ['Variants', '異文'],
  'nav.graph': ['Graph', '關係'],
  'nav.provenance': ['Provenance', '溯源'],
  'nav.quality': ['Quality', '質量'],
  'nav.access': ['Access', '獲取'],
  'nav.github': ['GitHub', 'GitHub'],
  'nav.theme': ['Toggle colour scheme', '切換配色'],

  // hero --------------------------------------------------------------------
  'hero.first': [
    'First publicly released dataset of the historical citation and commentarial system of the Shanghan Lun',
    '首個公開發布的《傷寒論》歷代引文體系數據集',
  ],
  'hero.zh': ['傷寒論歷代文獻結構化語料庫', '傷寒論歷代文獻結構化語料庫'],
  'hero.title': ['Historical Shanghan Corpus', 'Historical Shanghan Corpus'],
  'hero.lede': [
    'A structured, provenance-aware corpus connecting canonical clauses, historical commentaries, textual variants and inter-textual relations across the transmission history of the Shanghan Lun.',
    '一個結構化、可追溯的《傷寒論》語料庫，貫通經典條文、歷代注釋、異文與文本間關係，覆蓋其完整流傳史。',
  ],
  'hero.sub': [
    '《傷寒論》歷代文獻結構化、可追溯數字語料庫',
    'A structured and provenance-aware corpus of the Shanghan Lun and its commentarial tradition',
  ],
  'hero.cta.explore': ['Explore Corpus', '進入語料庫'],
  'hero.cta.github': ['View on GitHub', '查看 GitHub'],
  'hero.cta.download': ['Download Dataset', '下載數據集'],
  'hero.figure.caption': [
    'Ego network of canonical clause 23 — commentary, variant and differential edges',
    '第 23 條的鄰接網絡：注釋、異文與鑒別關係',
  ],
  'hero.badge.license': ['CC BY 4.0 structured data', '結構化層 CC BY 4.0'],
  'hero.badge.lang': ['Literary Chinese (lzh)', '文言文 (lzh)'],

  // glance ------------------------------------------------------------------
  'glance.title': ['Corpus at a Glance', '語料庫概覽'],
  'glance.sub': [
    'Every figure below is read from the released validation report, not asserted by hand.',
    '以下每一項數字均直接讀自發布的驗證報告，非人工填寫。',
  ],
  'glance.works': ['Historical works', '歷史文獻'],
  'glance.files': ['Source text files', '源文本文件'],
  'glance.characters': ['Characters', '字符總量'],
  'glance.clauses': ['Clause records', '條文記錄'],
  'glance.canonical': ['Canonical clauses', '經典條文'],
  'glance.commentaries': ['Commentaries', '歷代注釋'],
  'glance.variants': ['Textual variants', '異文'],
  'glance.relations': ['Relations', '語義關係'],
  'glance.pipeline': ['Construction pipeline', '構建流程'],
  'glance.dist.dynasty': ['Works by dynasty', '文獻朝代分布'],
  'glance.dist.relation': ['Relations by type', '關係類型分布'],
  'glance.dist.channel': ['Canonical clauses by six-channel division', '經典條文六經分布'],
  'glance.dist.formula': ['Most frequent formulae', '高頻方劑'],

  // timeline ----------------------------------------------------------------
  'tl.title': ['Historical Transmission Timeline', '歷史流傳時間軸'],
  'tl.sub': [
    'The 57 catalogued works, placed in the period recorded in the source catalogue. Select a work to read its catalogue entry and provenance.',
    '57 部已編目文獻，按目錄所載朝代排列。點擊任一書名可查看其編目條目與來源信息。',
  ],
  'tl.works': ['works', '部'],
  'tl.chars': ['characters', '字'],
  'tl.select': ['Select a work above to read its catalogue record.', '請點擊上方書名查看編目記錄。'],
  'tl.field.author': ['Author', '作者'],
  'tl.field.dynasty': ['Dynasty', '朝代'],
  'tl.field.date': ['Approximate date', '約成書年代'],
  'tl.field.worktype': ['Work type', '文獻類型'],
  'tl.field.chars': ['Characters', '字符數'],
  'tl.field.files': ['Source files', '源文件數'],
  'tl.field.sourceid': ['Source ID', '文獻編號'],
  'tl.field.witness': ['Witness status', '傳本狀態'],
  'tl.field.layer': ['Evidence layer', '證據層級'],
  'tl.field.edition': ['Edition stated', '版本著錄'],
  'tl.field.sha': ['Work SHA-256', '全書 SHA-256'],
  'tl.field.contrib': ['Structured records contributed', '貢獻的結構化記錄'],
  'tl.contrib.clauses': ['clauses', '條文'],
  'tl.contrib.commentaries': ['commentaries', '注釋'],
  'tl.contrib.variants': ['variants', '異文'],

  // clause explorer ---------------------------------------------------------
  'cl.title': ['Clause Explorer', '條文瀏覽'],
  'cl.sub': [
    'Search 681 clause records by number, formula, symptom, pulse sign, chapter or commentator. The selected clause drives every section that follows.',
    '可按條文序號、方劑、症狀、脈象、篇目或注家檢索 681 條記錄。所選條文將貫穿以下各節。',
  ],
  'cl.search.placeholder': ['Search clause, formula, symptom, commentator…', '檢索條文、方劑、症狀、注家……'],
  'cl.results': ['matching clauses', '條匹配'],
  'cl.noresults': ['No clause matches this query.', '未找到匹配條文。'],
  'cl.clause': ['Canonical Clause', '經典條文'],
  'cl.auxiliary': ['Auxiliary Clause', '輔助條文'],
  'cl.original': ['Original Text', '原文'],
  'cl.annotations': ['Structured annotations', '結構化標註'],
  'cl.notice': [
    'Automated annotations. Every structured record in v1.0 carries review_status = pending; manual review is in progress and no agreement statistics are reported in this version.',
    '自動抽取標註。v1.0 中所有結構化記錄的 review_status 均為 pending，人工審核進行中，本版本不報告一致性統計。',
  ],
  'cl.notice.label': ['Review status', '審核狀態'],
  'cl.field.symptoms': ['Symptoms', '症狀'],
  'cl.field.negated': ['Negated findings', '否定表現'],
  'cl.field.pulse': ['Pulse', '脈象'],
  'cl.field.patterns': ['Disease patterns', '病證'],
  'cl.field.formulae': ['Formulae', '方劑'],
  'cl.field.herbs': ['Materia medica', '藥物'],
  'cl.field.therapy': ['Therapy terms', '治法'],
  'cl.field.contra': ['Contraindications', '禁忌'],
  'cl.field.mistreat': ['Mistreatment', '誤治'],
  'cl.field.transform': ['Transformation', '傳變'],
  'cl.field.prognosis': ['Prognosis', '預後'],
  'cl.field.time': ['Time course', '病程'],
  'cl.field.logic': ['Logical markers', '邏輯詞'],
  'cl.field.collation': ['Collation notes', '校勘'],
  'cl.formula.prep': ['Preparation', '煎法'],
  'cl.formula.admin': ['Administration', '服法'],
  'cl.chapter': ['Chapter', '篇目'],
  'cl.channel': ['Six-channel', '六經'],
  'cl.none': ['none recorded', '無'],

  // commentary --------------------------------------------------------------
  'cm.title': ['Commentarial Tradition', '歷代注釋'],
  'cm.sub': [
    'Commentaries aligned to the selected clause, arranged by the period of the commentator. Select a commentator to read the aligned passage.',
    '對齊到所選條文的歷代注釋，按注家所處時代排列。點擊注家可閱讀對齊的注文。',
  ],
  'cm.none': ['No commentary is aligned to this clause in v1.0.', 'v1.0 中尚無注釋對齊到此條。'],
  'cm.records': ['records', '條'],
  'cm.field.commentator': ['Commentator', '注家'],
  'cm.field.work': ['Work', '出處'],
  'cm.field.dynasty': ['Dynasty', '時代'],
  'cm.field.mapped': ['Mapped clause', '對應條文'],
  'cm.field.location': ['Source location', '原書位置'],
  'cm.field.similarity': ['Alignment similarity', '對齊相似度'],
  'cm.field.alignment': ['Alignment type', '對齊層級'],
  'cm.field.confidence': ['Candidate confidence', '候選置信級'],
  'cm.field.provenance': ['Alignment provenance', '對齊溯源'],
  'cm.available': ['Available', '可溯'],

  // variants ----------------------------------------------------------------
  'vr.title': ['Textual Variants', '異文對勘'],
  'vr.sub': [
    'The Song-edition base text set against each surviving witness, with a character-level collation computed at build time.',
    '以宋本為底本，與各傳本逐字對勘，差異在構建階段預先計算。',
  ],
  'vr.none': ['No variant witness is aligned to this clause in v1.0.', 'v1.0 中尚無傳本異文對齊到此條。'],
  'vr.base': ['Song edition (base)', '宋本（底本）'],
  'vr.witness': ['Witness', '傳本'],
  'vr.collation': ['Character-level collation', '逐字對勘'],
  'vr.legend.del': ['in base only', '底本獨有'],
  'vr.legend.ins': ['in witness only', '傳本獨有'],
  'vr.similarity': ['Similarity', '相似度'],
  'vr.notable': ['Notable differences (automated)', '顯著差異（自動抽取）'],
  'vr.marker': [
    'Witness section marker retained from the source file and excluded from the collation:',
    '該傳本自帶的節次編號（來自源文件，未計入對勘）：',
  ],
  'vr.field.id': ['Variant ID', '異文編號'],
  'vr.field.book': ['Source witness', '傳本出處'],
  'vr.field.version': ['Version label', '版本標識'],

  // graph -------------------------------------------------------------------
  'gr.title': ['Inter-textual Relation Network', '文本間關係網絡'],
  'gr.sub': [
    'The ego network of the selected clause. Toggle a relation type to add or remove its edges; select any node to read its record.',
    '所選條文的鄰接網絡。可按關係類型增減邊，點擊任一節點查看其記錄。',
  ],
  'gr.hint': ['Drag to pan · scroll to zoom · click a node', '拖動平移 · 滾輪縮放 · 點擊節點'],
  'gr.detail.empty': ['Select a node in the network to read its record.', '點擊網絡中的節點以查看記錄。'],
  'gr.edges': ['edges', '條邊'],
  'gr.nodes': ['nodes', '節點'],
  'gr.center': ['Selected clause', '所選條文'],
  'gr.open': ['Open this clause', '打開此條文'],
  'gr.relation': ['Relation', '關係'],
  'gr.confidence': ['Confidence', '置信度'],
  'gr.resolution': ['Target resolution', '目標解析方式'],

  // provenance --------------------------------------------------------------
  'pv.title': ['Trace This Record', '記錄溯源'],
  'pv.sub': [
    'Every structured record resolves to a catalogued work, a source file and a verified checksum. This is the chain for the selected clause.',
    '每一條結構化記錄都可追溯至已編目文獻、源文件與經校驗的校驗和。以下為所選條文的完整鏈路。',
  ],
  'pv.step.record': ['Structured record', '結構化記錄'],
  'pv.step.work': ['Source work', '來源文獻'],
  'pv.step.file': ['Source text file', '源文本文件'],
  'pv.step.hash': ['Integrity', '完整性'],
  'pv.step.repo': ['Upstream repository', '上游來源庫'],
  'pv.more_files': ['more files in this work', '個文件（同書）'],
  'pv.check.utf8': ['UTF-8 valid', 'UTF-8 有效'],
  'pv.check.sha256': ['SHA-256 recorded', 'SHA-256 已記錄'],
  'pv.check.source_resolved': ['Source resolved', '來源已解析'],
  'pv.check.no_orphan_edges': ['No orphan relation endpoints', '無孤立關係端點'],
  'pv.resolution': ['Source resolution method', '來源解析方式'],
  'pv.licence': ['Upstream licence status', '上游授權狀態'],

  // quality -----------------------------------------------------------------
  'dq.title': ['Data Integrity & Validation', '數據完整性與驗證'],
  'dq.sub': [
    'Computational validation is complete and reproducible from code/ in this repository. Manual review is a separate, still-open stage and is reported as such.',
    '計算驗證已完成，可由本倉庫 code/ 目錄復現。人工審核為獨立階段，目前仍在進行，並如實標註。',
  ],
  'dq.pass': ['Computational validation: PASS', '計算驗證：通過'],
  'dq.validated': ['Validated on', '驗證日期'],
  'dq.schema': ['Schema validation', '模式驗證'],
  'dq.structural': ['Structural consistency', '結構一致性'],
  'dq.integrity': ['Source integrity', '源文件完整性'],
  'dq.provenance': ['Provenance resolution', '溯源解析'],
  'dq.review.title': ['Manual review', '人工審核'],
  'dq.review.status': ['In progress', '進行中'],
  'dq.review.requiring': ['Structured records requiring review', '待審核結構化記錄'],
  'dq.review.done': ['Records reviewed', '已審核記錄'],
  'dq.review.agreement': ['Agreement statistics', '一致性統計'],
  'dq.dupes': ['Duplicate analysis', '重複分析'],
  'dq.records': ['records', '條記錄'],
  'dq.resolved': ['resolved to source files', '已解析至源文件'],

  // access ------------------------------------------------------------------
  'ac.title': ['Data Access', '數據獲取'],
  'ac.sub': [
    'The corpus is distributed as plain UTF-8 CSV, JSON Lines and text. No database or server is required to read any layer.',
    '語料庫以純 UTF-8 的 CSV、JSON Lines 與純文本分發，讀取任一層均無需數據庫或服務端。',
  ],
  'ac.jsonl': ['Line-delimited JSON for the clause, commentary, variant, relation, node and unified-record layers.', '條文、注釋、異文、關係、節點與統一記錄層的行分隔 JSON。'],
  'ac.csv': ['Flat tabular mirrors of the same layers, plus the source catalogue and review tables.', '同一批層級的表格鏡像，另含文獻目錄與審核表。'],
  'ac.txt': ['The 425 source text files, one directory per catalogued work, with a per-file manifest.', '425 個源文本文件，按文獻分目錄存放，並附逐文件清單。'],
  'ac.docs': ['Field-by-field data dictionary, licence, version record and validation reports.', '逐字段數據字典、授權說明、版本記錄與驗證報告。'],
  'ac.browse': ['Browse', '瀏覽'],
  'ac.cite.title': ['Citation', '引用'],
  'ac.cite.sub': ['Cite the dataset as follows. A machine-readable CITATION.cff is included in the repository.', '請按以下方式引用本數據集。倉庫內含機器可讀的 CITATION.cff。'],
  'ac.authors': ['Authors', '作者'],
  'ac.affiliations': ['Affiliations', '單位'],
  'ac.disclaimer.title': ['Disclaimer', '免責聲明'],
  'ac.disclaimer': [
    'This is a historical-literature dataset assembled for philological and digital-humanities research. It is not medical advice and must not be used as a source of clinical guidance.',
    '本數據集為供文獻學與數字人文研究使用的歷史文獻資料，不構成醫療建議，不得作為臨床指導依據。',
  ],

  // shared ------------------------------------------------------------------
  'ui.loading': ['Loading…', '載入中……'],
  'ui.error': ['Could not load corpus data.', '無法載入語料庫數據。'],
  'ui.of': ['of', '/'],
  'ui.featured': ['Featured record', '示例記錄'],
} as const

export type Key = keyof typeof DICT

// Values from the corpus that are controlled vocabularies rather than free text
// get a display form in each language. Unknown values fall through unchanged.
const VOCAB: Record<string, [string, string]> = {
  'Eastern Han': ['Eastern Han', '東漢'],
  Song: ['Song', '宋'],
  'Jin (1115-1234)': ['Jin', '金'],
  Yuan: ['Yuan', '元'],
  Ming: ['Ming', '明'],
  Qing: ['Qing', '清'],
  not_stated_in_source: ['not stated in source', '原始資料未載'],
  commentary: ['commentary', '注本'],
  canonical_text: ['canonical text', '經文'],
  variant_edition: ['variant edition', '異本'],
  formula_family: ['formula family', '方族'],
  collation: ['collation', '校勘'],
  medical_case: ['medical case', '醫案'],
  single_copy: ['single copy', '單一傳本'],
  multiple_copies: ['multiple copies', '多傳本'],
  original_clause: ['canonical clause', '經典條文'],
  auxiliary_clause: ['auxiliary clause', '輔助條文'],
  commentary_support: ['commentary', '注釋'],
  variant: ['variant', '異文'],
  sequence: ['sequence', '前後相承'],
  same_formula_family: ['same formula family', '同方族'],
  differential: ['differential', '鑒別'],
  mistreatment_transformation: ['mistreatment / transformation', '誤治傳變'],
  transmission: ['transmission', '傳變'],
  contraindication: ['contraindication', '禁忌'],
  text_match: ['text containment match', '文本包含匹配'],
  text_match_multi: ['text containment (multiple files)', '文本包含匹配（多文件）'],
  direct_clause_id: ['direct clause id', '直接條文編號'],
  citation_to_node_unique: ['citation resolved to a unique node', '引用唯一解析'],
  citation_to_node_first_of_multiple: ['citation resolved to first of several', '引用取首個匹配'],
  clause_level: ['clause level', '條文級'],
  silver: ['silver', 'silver'],
  pending: ['pending', '待審'],
  in_progress: ['in progress', '進行中'],
  '': ['—', '—'],
}

interface Ctx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: Key) => string
  v: (value: string) => string
  n: (value: number) => string
}

const I18nContext = createContext<Ctx | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('shc-lang') : null
    if (stored === 'en' || stored === 'zh') return stored
    return typeof navigator !== 'undefined' && navigator.language.startsWith('zh') ? 'zh' : 'en'
  })

  useEffect(() => {
    localStorage.setItem('shc-lang', lang)
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en'
  }, [lang])

  const value = useMemo<Ctx>(() => {
    const i = lang === 'en' ? 0 : 1
    return {
      lang,
      setLang,
      t: (key) => DICT[key][i],
      v: (raw) => (raw in VOCAB ? VOCAB[raw][i] : raw),
      n: (num) => num.toLocaleString('en-US'),
    }
  }, [lang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}

/** Compact display for large character counts, e.g. 4763991 → 4.76M */
export function compact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (value >= 10_000) return `${(value / 1000).toFixed(0)}K`
  return value.toLocaleString('en-US')
}
