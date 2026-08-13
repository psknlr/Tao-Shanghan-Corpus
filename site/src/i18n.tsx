import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'zh-Hans' | 'zh-Hant'

export const LANGS: { code: Lang; short: string; htmlLang: string }[] = [
  { code: 'en', short: 'EN', htmlLang: 'en' },
  { code: 'zh-Hans', short: '简', htmlLang: 'zh-Hans' },
  { code: 'zh-Hant', short: '繁', htmlLang: 'zh-Hant' },
]

const INDEX: Record<Lang, 0 | 1 | 2> = { en: 0, 'zh-Hans': 1, 'zh-Hant': 2 }

/**
 * Interface copy only, ordered [English, Simplified, Traditional].
 *
 * Everything drawn from the corpus itself — clause text, commentary, work
 * titles, commentator names — is shown in the original Traditional Chinese in
 * all three modes and is never converted. Converting a historical text would
 * change the object of study; only the interface around it is localised.
 */
const DICT = {
  // chrome ------------------------------------------------------------------
  'nav.explore': ['Explore', '探索', '探索'],
  'nav.sources': ['Sources', '文献', '文獻'],
  'nav.clauses': ['Clauses', '条文', '條文'],
  'nav.commentary': ['Commentary', '注释', '注釋'],
  'nav.variants': ['Variants', '异文', '異文'],
  'nav.graph': ['Graph', '关系', '關係'],
  'nav.provenance': ['Provenance', '溯源', '溯源'],
  'nav.quality': ['Quality', '质量', '質量'],
  'nav.access': ['Access', '获取', '獲取'],
  'nav.github': ['GitHub', 'GitHub', 'GitHub'],
  'nav.theme': ['Toggle colour scheme', '切换配色', '切換配色'],
  'nav.language': ['Interface language', '界面语言', '介面語言'],

  // hero --------------------------------------------------------------------
  'hero.first': [
    'First publicly released dataset of the historical citation and commentarial system of the Shanghan Lun',
    '首个公开发布的《伤寒论》历代引文体系数据集',
    '首個公開發布的《傷寒論》歷代引文體系數據集',
  ],
  'hero.zh': ['傷寒論歷代文獻結構化語料庫', '伤寒论历代文献结构化语料库', '傷寒論歷代文獻結構化語料庫'],
  'hero.title': ['Historical Shanghan Corpus', 'Historical Shanghan Corpus', 'Historical Shanghan Corpus'],
  'hero.lede': [
    'A structured, provenance-aware corpus connecting canonical clauses, historical commentaries, textual variants and inter-textual relations across the transmission history of the Shanghan Lun.',
    '一个结构化、可追溯的《伤寒论》语料库，贯通经典条文、历代注释、异文与文本间关系，覆盖其完整流传史。',
    '一個結構化、可追溯的《傷寒論》語料庫，貫通經典條文、歷代注釋、異文與文本間關係，覆蓋其完整流傳史。',
  ],
  'hero.sub': [
    '《傷寒論》歷代文獻結構化、可追溯數字語料庫',
    'A structured and provenance-aware corpus of the Shanghan Lun and its commentarial tradition',
    'A structured and provenance-aware corpus of the Shanghan Lun and its commentarial tradition',
  ],
  'hero.cta.explore': ['Explore Corpus', '进入语料库', '進入語料庫'],
  'hero.cta.github': ['View on GitHub', '查看 GitHub', '查看 GitHub'],
  'hero.cta.download': ['Download Dataset', '下载数据集', '下載數據集'],
  'hero.figure.caption': [
    'Ego network of canonical clause 23 — commentary, variant and differential edges',
    '第 23 条的邻接网络：注释、异文与鉴别关系',
    '第 23 條的鄰接網絡：注釋、異文與鑒別關係',
  ],
  'hero.badge.license': ['CC BY 4.0 structured data', '结构化层 CC BY 4.0', '結構化層 CC BY 4.0'],
  'hero.badge.lang': ['Literary Chinese (lzh)', '文言文 (lzh)', '文言文 (lzh)'],

  // glance ------------------------------------------------------------------
  'glance.title': ['Corpus at a Glance', '语料库概览', '語料庫概覽'],
  'glance.sub': [
    'Every figure below is read from the released validation report, not asserted by hand.',
    '以下每一项数字均直接读自发布的验证报告，非人工填写。',
    '以下每一項數字均直接讀自發布的驗證報告，非人工填寫。',
  ],
  'glance.works': ['Historical works', '历史文献', '歷史文獻'],
  'glance.files': ['Source text files', '源文本文件', '源文本文件'],
  'glance.characters': ['Characters', '字符总量', '字符總量'],
  'glance.clauses': ['Clause records', '条文记录', '條文記錄'],
  'glance.canonical': ['Canonical clauses', '经典条文', '經典條文'],
  'glance.commentaries': ['Commentaries', '历代注释', '歷代注釋'],
  'glance.variants': ['Textual variants', '异文', '異文'],
  'glance.relations': ['Relations', '语义关系', '語義關係'],
  'glance.unified': ['Unified records', '统一记录', '統一記錄'],
  'glance.validation': ['Validation & review', '验证与审核', '驗證與審核'],
  'glance.pipeline': ['Construction pipeline', '构建流程', '構建流程'],
  'glance.dist.dynasty': ['Works by dynasty', '文献朝代分布', '文獻朝代分布'],
  'glance.dist.relation': ['Relations by type', '关系类型分布', '關係類型分布'],
  'glance.dist.channel': ['Canonical clauses by six-channel division', '经典条文六经分布', '經典條文六經分布'],
  'glance.dist.formula': ['Most frequent formulae', '高频方剂', '高頻方劑'],

  // timeline ----------------------------------------------------------------
  'tl.title': ['Historical Transmission Timeline', '历史流传时间轴', '歷史流傳時間軸'],
  'tl.sub': [
    'The 57 catalogued works, placed in the period recorded in the source catalogue. Select a work to read its catalogue entry and provenance.',
    '57 部已编目文献，按目录所载朝代排列。点击任一书名可查看其编目条目与来源信息。',
    '57 部已編目文獻，按目錄所載朝代排列。點擊任一書名可查看其編目條目與來源信息。',
  ],
  'tl.works': ['works', '部', '部'],
  'tl.chars': ['characters', '字', '字'],
  'tl.select': [
    'Select a work above to read its catalogue record.',
    '请点击上方书名查看编目记录。',
    '請點擊上方書名查看編目記錄。',
  ],
  'tl.field.author': ['Author', '作者', '作者'],
  'tl.field.dynasty': ['Dynasty', '朝代', '朝代'],
  'tl.field.date': ['Approximate date', '约成书年代', '約成書年代'],
  'tl.field.worktype': ['Work type', '文献类型', '文獻類型'],
  'tl.field.chars': ['Characters', '字符数', '字符數'],
  'tl.field.files': ['Source files', '源文件数', '源文件數'],
  'tl.field.sourceid': ['Source ID', '文献编号', '文獻編號'],
  'tl.field.witness': ['Witness status', '传本状态', '傳本狀態'],
  'tl.field.layer': ['Evidence layer', '证据层级', '證據層級'],
  'tl.field.edition': ['Edition stated', '版本著录', '版本著錄'],
  'tl.field.sha': ['Work SHA-256', '全书 SHA-256', '全書 SHA-256'],
  'tl.field.contrib': ['Structured records contributed', '贡献的结构化记录', '貢獻的結構化記錄'],
  'tl.contrib.clauses': ['clauses', '条文', '條文'],
  'tl.contrib.commentaries': ['commentaries', '注释', '注釋'],
  'tl.contrib.variants': ['variants', '异文', '異文'],

  // clause explorer ---------------------------------------------------------
  'cl.title': ['Clause Explorer', '条文浏览', '條文瀏覽'],
  'cl.sub': [
    'Search 681 clause records by number, formula, symptom, pulse sign, chapter or commentator. The selected clause drives every section that follows.',
    '可按条文序号、方剂、症状、脉象、篇目或注家检索 681 条记录。所选条文将贯穿以下各节。',
    '可按條文序號、方劑、症狀、脈象、篇目或注家檢索 681 條記錄。所選條文將貫穿以下各節。',
  ],
  'cl.search.placeholder': [
    'Search clause, formula, symptom, commentator…',
    '检索条文、方剂、症状、注家……',
    '檢索條文、方劑、症狀、注家……',
  ],
  'cl.results': ['matching clauses', '条匹配', '條匹配'],
  'cl.noresults': ['No clause matches this query.', '未找到匹配条文。', '未找到匹配條文。'],
  'cl.clause': ['Canonical Clause', '经典条文', '經典條文'],
  'cl.auxiliary': ['Auxiliary Clause', '辅助条文', '輔助條文'],
  'cl.original': ['Original Text', '原文', '原文'],
  'cl.annotations': ['Structured annotations', '结构化标注', '結構化標註'],
  'cl.field.symptoms': ['Symptoms', '症状', '症狀'],
  'cl.field.negated': ['Negated findings', '否定表现', '否定表現'],
  'cl.field.pulse': ['Pulse', '脉象', '脈象'],
  'cl.field.patterns': ['Disease patterns', '病证', '病證'],
  'cl.field.formulae': ['Formulae', '方剂', '方劑'],
  'cl.field.herbs': ['Materia medica', '药物', '藥物'],
  'cl.field.therapy': ['Therapy terms', '治法', '治法'],
  'cl.field.contra': ['Contraindications', '禁忌', '禁忌'],
  'cl.field.mistreat': ['Mistreatment', '误治', '誤治'],
  'cl.field.transform': ['Transformation', '传变', '傳變'],
  'cl.field.prognosis': ['Prognosis', '预后', '預後'],
  'cl.field.time': ['Time course', '病程', '病程'],
  'cl.field.logic': ['Logical markers', '逻辑词', '邏輯詞'],
  'cl.field.collation': ['Collation notes', '校勘', '校勘'],
  'cl.formula.prep': ['Preparation', '煎法', '煎法'],
  'cl.formula.admin': ['Administration', '服法', '服法'],
  'cl.chapter': ['Chapter', '篇目', '篇目'],
  'cl.channel': ['Six-channel', '六经', '六經'],
  'cl.none': ['none recorded', '无', '無'],
  'cl.composition': ['Formula composition', '方劑組成', '方劑組成'],
  'cl.dose': ['dose and processing', '劑量與炮製', '劑量與炮製'],
  'cl.collation': ['Collation notes carried in the edition', '本書所載校語', '本書所載校語'],
  'cl.formula.unresolved': [
    'The adjacent heading and this composition do not agree, so no formula name is attached.',
    '相邻标题与本方组成不一致，故未标注方名。',
    '相鄰標題與本方組成不一致，故未標註方名。',
  ],
  'cl.formula.heading': ['Adjacent heading', '相邻标题', '相鄰標題'],
  /** Prefix for a numbered clause, e.g. 條 23. Corpus text is never converted. */
  'cl.prefix': ['Clause', '条', '條'],

  // commentary --------------------------------------------------------------
  'cm.title': ['Commentarial Tradition', '历代注释', '歷代注釋'],
  'cm.sub': [
    'Commentaries aligned to the selected clause, arranged by the period of the commentator. Select a commentator to read the aligned passage.',
    '对齐到所选条文的历代注释，按注家所处时代排列。点击注家可阅读对齐的注文。',
    '對齊到所選條文的歷代注釋，按注家所處時代排列。點擊注家可閱讀對齊的注文。',
  ],
  'cm.none': [
    'No commentary is aligned to this clause in v1.0.',
    'v1.0 中尚无注释对齐到此条。',
    'v1.0 中尚無注釋對齊到此條。',
  ],
  'cm.records': ['records', '条', '條'],
  'cm.field.commentator': ['Commentator', '注家', '注家'],
  'cm.field.work': ['Work', '出处', '出處'],
  'cm.field.dynasty': ['Dynasty', '时代', '時代'],
  'cm.field.mapped': ['Mapped clause', '对应条文', '對應條文'],
  'cm.field.location': ['Source location', '原书位置', '原書位置'],
  'cm.field.similarity': ['Alignment similarity', '对齐相似度', '對齊相似度'],
  'cm.field.alignment': ['Alignment type', '对齐层级', '對齊層級'],
  'cm.field.confidence': ['Candidate confidence', '候选置信级', '候選置信級'],
  'cm.field.provenance': ['Alignment provenance', '对齐溯源', '對齊溯源'],
  'cm.available': ['Available', '可溯', '可溯'],

  // variants ----------------------------------------------------------------
  'vr.title': ['Textual Variants', '异文对勘', '異文對勘'],
  'vr.sub': [
    'The Song-edition base text set against each surviving witness, with a character-level collation computed at build time.',
    '以宋本为底本，与各传本逐字对勘，差异在构建阶段预先计算。',
    '以宋本為底本，與各傳本逐字對勘，差異在構建階段預先計算。',
  ],
  'vr.none': [
    'No variant witness is aligned to this clause in v1.0.',
    'v1.0 中尚无传本异文对齐到此条。',
    'v1.0 中尚無傳本異文對齊到此條。',
  ],
  'vr.base': ['Song edition (base)', '宋本（底本）', '宋本（底本）'],
  'vr.witness': ['Witness', '传本', '傳本'],
  'vr.collation': ['Character-level collation', '逐字对勘', '逐字對勘'],
  'vr.legend.del': ['in base only', '底本独有', '底本獨有'],
  'vr.legend.ins': ['in witness only', '传本独有', '傳本獨有'],
  'vr.similarity': ['Similarity', '相似度', '相似度'],
  'vr.notable': ['Notable differences (automated)', '显著差异（自动抽取）', '顯著差異（自動抽取）'],
  'vr.marker': [
    'Witness section marker retained from the source file and excluded from the collation:',
    '该传本自带的节次编号（来自源文件，未计入对勘）：',
    '該傳本自帶的節次編號（來自源文件，未計入對勘）：',
  ],
  'vr.field.id': ['Variant ID', '异文编号', '異文編號'],
  'vr.field.book': ['Source witness', '传本出处', '傳本出處'],
  'vr.field.version': ['Version label', '版本标识', '版本標識'],

  // graph -------------------------------------------------------------------
  'gr.title': ['Inter-textual Relation Network', '文本间关系网络', '文本間關係網絡'],
  'gr.sub': [
    'The ego network of the selected clause. Toggle a relation type to add or remove its edges; select any node to read its record.',
    '所选条文的邻接网络。可按关系类型增减边，点击任一节点查看其记录。',
    '所選條文的鄰接網絡。可按關係類型增減邊，點擊任一節點查看其記錄。',
  ],
  'gr.hint': [
    'Drag to pan · scroll to zoom · click a node',
    '拖动平移 · 滚轮缩放 · 点击节点',
    '拖動平移 · 滾輪縮放 · 點擊節點',
  ],
  'gr.detail.empty': [
    'Select a node in the network to read its record.',
    '点击网络中的节点以查看记录。',
    '點擊網絡中的節點以查看記錄。',
  ],
  'gr.edges': ['edges', '条边', '條邊'],
  'gr.nodes': ['nodes', '节点', '節點'],
  'gr.center': ['Selected clause', '所选条文', '所選條文'],
  'gr.open': ['Open this clause', '打开此条文', '打開此條文'],
  'gr.relation': ['Relation', '关系', '關係'],
  'gr.confidence': ['Confidence', '置信度', '置信度'],
  'gr.resolution': ['Target resolution', '目标解析方式', '目標解析方式'],

  // provenance --------------------------------------------------------------
  'pv.title': ['Trace This Record', '记录溯源', '記錄溯源'],
  'pv.sub': [
    'Every structured record resolves to a catalogued work, a source file and a verified checksum. This is the chain for the selected clause.',
    '每一条结构化记录都可追溯至已编目文献、源文件与经校验的校验和。以下为所选条文的完整链路。',
    '每一條結構化記錄都可追溯至已編目文獻、源文件與經校驗的校驗和。以下為所選條文的完整鏈路。',
  ],
  'pv.step.record': ['Structured record', '结构化记录', '結構化記錄'],
  'pv.step.work': ['Source work', '来源文献', '來源文獻'],
  'pv.step.file': ['Source text file', '源文本文件', '源文本文件'],
  'pv.step.hash': ['Integrity', '完整性', '完整性'],
  'pv.step.repo': ['Upstream repository', '上游来源库', '上游來源庫'],
  'pv.more_files': ['more files in this work', '个文件（同书）', '個文件（同書）'],
  'pv.check.utf8': ['UTF-8 valid', 'UTF-8 有效', 'UTF-8 有效'],
  'pv.check.sha256': ['SHA-256 recorded', 'SHA-256 已记录', 'SHA-256 已記錄'],
  'pv.check.source_resolved': ['Source resolved', '来源已解析', '來源已解析'],
  'pv.check.no_orphan_edges': ['No orphan relation endpoints', '无孤立关系端点', '無孤立關係端點'],
  'pv.resolution': ['Source resolution method', '来源解析方式', '來源解析方式'],
  'pv.licence': ['Upstream licence status', '上游授权状态', '上游授權狀態'],

  // quality -----------------------------------------------------------------
  'dq.title': ['Data Integrity & Validation', '数据完整性与验证', '數據完整性與驗證'],
  'dq.sub': [
    'Computational validation is complete and reproducible from code/ in this repository. Every field below is printed as it appears in the released validation report.',
    '计算验证已完成，可由本仓库 code/ 目录复现。以下每个字段均按发布的验证报告原样呈现。',
    '計算驗證已完成，可由本倉庫 code/ 目錄復現。以下每個欄位均按發布的驗證報告原樣呈現。',
  ],
  'dq.pass': ['Computational validation: PASS', '计算验证：通过', '計算驗證：通過'],
  'dq.validated': ['Validated on', '验证日期', '驗證日期'],
  'dq.schema': ['Schema validation', '模式验证', '模式驗證'],
  'dq.structural': ['Structural consistency', '结构一致性', '結構一致性'],
  'dq.integrity': ['Source integrity', '源文件完整性', '源文件完整性'],
  'dq.provenance': ['Provenance resolution', '溯源解析', '溯源解析'],
  'dq.dupes': ['Duplicate analysis', '重复分析', '重複分析'],
  'dq.records': ['records', '条记录', '條記錄'],
  'dq.resolved': ['resolved to source files', '已解析至源文件', '已解析至源文件'],

  // access ------------------------------------------------------------------
  'ac.title': ['Data Access', '数据获取', '數據獲取'],
  'ac.sub': [
    'The corpus is distributed as plain UTF-8 CSV, JSON Lines and text. No database or server is required to read any layer.',
    '语料库以纯 UTF-8 的 CSV、JSON Lines 与纯文本分发，读取任一层均无需数据库或服务端。',
    '語料庫以純 UTF-8 的 CSV、JSON Lines 與純文本分發，讀取任一層均無需數據庫或服務端。',
  ],
  'ac.jsonl': [
    'Line-delimited JSON for the clause, commentary, variant, relation, node and unified-record layers.',
    '条文、注释、异文、关系、节点与统一记录层的行分隔 JSON。',
    '條文、注釋、異文、關係、節點與統一記錄層的行分隔 JSON。',
  ],
  'ac.csv': [
    'Flat tabular mirrors of the same layers, plus the source catalogue and review tables.',
    '同一批层级的表格镜像，另含文献目录与审核表。',
    '同一批層級的表格鏡像，另含文獻目錄與審核表。',
  ],
  'ac.txt': [
    'The 425 source text files, one directory per catalogued work, with a per-file manifest.',
    '425 个源文本文件，按文献分目录存放，并附逐文件清单。',
    '425 個源文本文件，按文獻分目錄存放，並附逐文件清單。',
  ],
  'ac.docs': [
    'Field-by-field data dictionary, licence, version record and validation reports.',
    '逐字段数据字典、授权说明、版本记录与验证报告。',
    '逐字段數據字典、授權說明、版本記錄與驗證報告。',
  ],
  'ac.browse': ['Browse', '浏览', '瀏覽'],
  'ac.cite.title': ['Citation', '引用', '引用'],
  'ac.cite.sub': [
    'The dataset is archived on Zenodo. Cite the DOI rather than the repository URL — it resolves to a fixed, versioned deposit. A machine-readable CITATION.cff is included in the repository.',
    '数据集已存档于 Zenodo。请引用 DOI 而非仓库地址：DOI 指向固定的、带版本的存档记录。仓库内含机器可读的 CITATION.cff。',
    '數據集已存檔於 Zenodo。請引用 DOI 而非倉庫地址：DOI 指向固定的、帶版本的存檔記錄。倉庫內含機器可讀的 CITATION.cff。',
  ],
  'ac.cite.doi': ['Archived deposit', '存档记录', '存檔記錄'],
  'ac.authors': ['Authors', '作者', '作者'],
  'ac.affiliations': ['Affiliations', '单位', '單位'],
  'ac.equal': ['contributed equally', '共同第一作者', '共同第一作者'],
  'ac.corresponding': ['corresponding authors', '共同通讯作者', '共同通訊作者'],
  'ac.downloads': ['Dataset downloads', '数据集下载量', '數據集下載量'],
  'ac.downloads.note': [
    'Counted by GitHub on the release asset. Updated when the site is rebuilt.',
    '由 GitHub 对 release 资产原生统计，站点重建时更新。',
    '由 GitHub 對 release 資產原生統計，站點重建時更新。',
  ],
  'ac.downloads.release': ['release', '版本', '版本'],
  'ac.downloads.updated': ['updated', '更新于', '更新於'],
  'ac.disclaimer.title': ['Disclaimer', '免责声明', '免責聲明'],
  'ac.disclaimer': [
    'This is a historical-literature dataset assembled for philological and digital-humanities research. It is not medical advice and must not be used as a source of clinical guidance.',
    '本数据集为供文献学与数字人文研究使用的历史文献资料，不构成医疗建议，不得作为临床指导依据。',
    '本數據集為供文獻學與數字人文研究使用的歷史文獻資料，不構成醫療建議，不得作為臨床指導依據。',
  ],
  'ac.licence.note': [
    'Structured layers are released under CC BY 4.0. The historical works themselves are pre-modern and not under copyright; the digital transcriptions in 02_source_texts/ were obtained from 中醫典籍資料庫 (jicheng.tw), whose terms of use are recorded as not_stated_in_source. Anyone intending to redistribute the transcriptions should consult the source repository directly.',
    '结构化层以 CC BY 4.0 发布。历史作品本身属前现代文献，不受版权保护；02_source_texts/ 中的数字转录取自中醫典籍資料庫（jicheng.tw），其使用条款记录为 not_stated_in_source。拟再分发转录文本者，请自行向来源库核实。',
    '結構化層以 CC BY 4.0 發布。歷史作品本身屬前現代文獻，不受版權保護；02_source_texts/ 中的數字轉錄取自中醫典籍資料庫（jicheng.tw），其使用條款記錄為 not_stated_in_source。擬再分發轉錄文本者，請自行向來源庫核實。',
  ],

  // shared ------------------------------------------------------------------
  'ui.loading': ['Loading…', '载入中……', '載入中……'],
  'ui.error': ['Could not load corpus data.', '无法载入语料库数据。', '無法載入語料庫數據。'],
  'ui.of': ['of', '/', '/'],
  'ui.featured': ['Featured record', '示例记录', '示例記錄'],
  'ui.tagline': [
    'Historical Shanghan Corpus',
    '《伤寒论》历代文献结构化语料库',
    '《傷寒論》歷代文獻結構化語料庫',
  ],
} as const

export type Key = keyof typeof DICT

// Controlled vocabularies from the corpus get a display form per language.
// Unknown values fall through unchanged.
const VOCAB: Record<string, [string, string, string]> = {
  'Eastern Han': ['Eastern Han', '东汉', '東漢'],
  Song: ['Song', '宋', '宋'],
  'Jin (1115-1234)': ['Jin', '金', '金'],
  Yuan: ['Yuan', '元', '元'],
  Ming: ['Ming', '明', '明'],
  Qing: ['Qing', '清', '清'],
  not_stated_in_source: ['not stated in source', '原始资料未载', '原始資料未載'],
  commentary: ['commentary', '注本', '注本'],
  canonical_text: ['canonical text', '经文', '經文'],
  variant_edition: ['variant edition', '异本', '異本'],
  formula_family: ['formula family', '方族', '方族'],
  collation: ['collation', '校勘', '校勘'],
  medical_case: ['medical case', '医案', '醫案'],
  single_copy: ['single copy', '单一传本', '單一傳本'],
  multiple_copies: ['multiple copies', '多传本', '多傳本'],
  original_clause: ['canonical clause', '经典条文', '經典條文'],
  auxiliary_clause: ['auxiliary clause', '辅助条文', '輔助條文'],
  commentary_support: ['commentary', '注释', '注釋'],
  variant: ['variant', '异文', '異文'],
  sequence: ['sequence', '前后相承', '前後相承'],
  same_formula_family: ['same formula family', '同方族', '同方族'],
  differential: ['differential', '鉴别', '鑒別'],
  mistreatment_transformation: ['mistreatment / transformation', '误治传变', '誤治傳變'],
  transmission: ['transmission', '传变', '傳變'],
  contraindication: ['contraindication', '禁忌', '禁忌'],
  text_match: ['text containment match', '文本包含匹配', '文本包含匹配'],
  text_match_multi: [
    'text containment (multiple files)',
    '文本包含匹配（多文件）',
    '文本包含匹配（多文件）',
  ],
  direct_clause_id: ['direct clause id', '直接条文编号', '直接條文編號'],
  citation_to_node_unique: ['citation resolved to a unique node', '引用唯一解析', '引用唯一解析'],
  citation_to_node_first_of_multiple: [
    'citation resolved to first of several',
    '引用取首个匹配',
    '引用取首個匹配',
  ],
  clause_level: ['clause level', '条文级', '條文級'],
  silver: ['silver', 'silver', 'silver'],
  pending: ['pending', '待审', '待審'],
  in_progress: ['in progress', '进行中', '進行中'],
  '': ['—', '—', '—'],
}

interface Ctx {
  lang: Lang
  setLang: (l: Lang) => void
  /** True for either Chinese script, for layout decisions. */
  isZh: boolean
  t: (key: Key) => string
  v: (value: string) => string
  n: (value: number) => string
  /** "Clause 23" / "条 23" / "條 23" */
  clause: (no: number | null | undefined) => string
}

const I18nContext = createContext<Ctx | null>(null)

const STORAGE_KEY = 'shc-lang'

function readStoredLang(): Lang | null {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
  if (stored === 'en' || stored === 'zh-Hans' || stored === 'zh-Hant') return stored
  // Before Simplified was offered, Traditional was stored as plain 'zh'.
  if (stored === 'zh') return 'zh-Hant'
  return null
}

function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'en'
  const tags = [navigator.language, ...(navigator.languages ?? [])].filter(Boolean)
  for (const raw of tags) {
    const tag = raw.toLowerCase()
    if (!tag.startsWith('zh')) continue
    // zh-TW, zh-HK, zh-MO and any explicit Hant subtag read Traditional.
    if (/hant|-tw|-hk|-mo/.test(tag)) return 'zh-Hant'
    return 'zh-Hans'
  }
  return 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => readStoredLang() ?? detectLang())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // Private-mode storage failures are not worth surfacing.
    }
    document.documentElement.lang = LANGS.find((l) => l.code === lang)?.htmlLang ?? 'en'
  }, [lang])

  const value = useMemo<Ctx>(() => {
    const i = INDEX[lang]
    return {
      lang,
      setLang,
      isZh: lang !== 'en',
      t: (key) => DICT[key][i],
      v: (raw) => (raw in VOCAB ? VOCAB[raw][i] : raw),
      n: (num) => num.toLocaleString('en-US'),
      clause: (no) => (no == null ? DICT['cl.prefix'][i] : `${DICT['cl.prefix'][i]} ${no}`),
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
