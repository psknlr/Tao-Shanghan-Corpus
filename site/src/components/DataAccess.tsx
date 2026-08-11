import { useI18n } from '../i18n'
import type { CorpusSummary } from '../types'
import { SectionHead } from './ui'
import { DOWNLOAD_URL, LAYER_URL, REPO_URL, UPSTREAM_URL } from '../config'

// The released materials name no individual authors — LICENSE.md and VERSION.md
// refer only to "the dataset authors". The placeholder below is deliberate and
// must be replaced with the real creator list before the dataset is cited.
const CITATION_AUTHORS = '⟨dataset authors — to be completed⟩'

export function DataAccess({ summary }: { summary: CorpusSummary }) {
  const { t, n } = useI18n()

  const cards = [
    {
      title: 'JSON Lines',
      body: t('ac.jsonl'),
      href: LAYER_URL.clauses,
      note: `${n(summary.headline.clause_records)} + ${n(summary.headline.commentaries)} + ${n(summary.headline.variants)} + ${n(summary.headline.relations)}`,
    },
    { title: 'CSV', body: t('ac.csv'), href: LAYER_URL.catalog, note: `${n(summary.headline.historical_works)} works` },
    { title: 'Plain text', body: t('ac.txt'), href: LAYER_URL.texts, note: `${n(summary.headline.source_files)} files` },
    { title: 'Documentation', body: t('ac.docs'), href: LAYER_URL.dictionary, note: `schema ${summary.schema_version}` },
  ]

  const citation = `${CITATION_AUTHORS}. Historical Shanghan Corpus: a structured and provenance-aware corpus of the Shanghan Lun and its historical commentarial tradition. Version ${summary.version}, ${summary.validated_on.slice(0, 4)}. ${REPO_URL}`

  return (
    <section className="section" id="access">
      <div className="wrap">
        <SectionHead no="10" title={t('ac.title')} sub={t('ac.sub')} />

        <div className="access-grid">
          {cards.map((card) => (
            <div className="card access-card" key={card.title}>
              <h4>{card.title}</h4>
              <p>{card.body}</p>
              <span className="mono muted" style={{ fontSize: '0.68rem' }}>
                {card.note}
              </span>
              <a href={card.href} target="_blank" rel="noreferrer">
                {t('ac.browse')} ↗
              </a>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', marginTop: '1.5rem' }}>
          <a className="btn btn--primary" href={DOWNLOAD_URL}>
            {t('hero.cta.download')}
          </a>
          <a className="btn" href={LAYER_URL.dictionary} target="_blank" rel="noreferrer">
            DATA_DICTIONARY.md
          </a>
          <a className="btn" href={LAYER_URL.licence} target="_blank" rel="noreferrer">
            LICENSE.md
          </a>
          <a className="btn" href={LAYER_URL.version} target="_blank" rel="noreferrer">
            VERSION.md
          </a>
        </div>

        <div style={{ marginTop: '3rem' }}>
          <SectionHead no="11" title={t('ac.cite.title')} sub={t('ac.cite.sub')} />
          <p className="cite">{citation}</p>
          <p className="muted" style={{ fontSize: '0.78rem', marginTop: '0.85rem' }}>
            {t('tl.field.sha')} · SHA256SUMS.txt ·{' '}
            <a href={LAYER_URL.citation} target="_blank" rel="noreferrer">
              CITATION.cff
            </a>
          </p>
        </div>

        <div style={{ marginTop: '3rem' }}>
          <SectionHead no="12" title={t('ac.disclaimer.title')} />
          <p className="disclaimer">{t('ac.disclaimer')}</p>
          <p className="muted" style={{ fontSize: '0.78rem', marginTop: '1.25rem', maxWidth: '78ch' }}>
            Structured layers are released under CC BY 4.0. The historical works themselves are
            pre-modern and not under copyright; the digital transcriptions in{' '}
            <span className="mono">02_source_texts/</span> were obtained from 中醫典籍資料庫 (
            <a href={UPSTREAM_URL} target="_blank" rel="noreferrer">
              jicheng.tw
            </a>
            ), whose terms of use are recorded as{' '}
            <span className="mono">not_stated_in_source</span>. Anyone intending to redistribute the
            transcriptions should consult the source repository directly.
          </p>
        </div>
      </div>
    </section>
  )
}

export function Footer({ summary }: { summary: CorpusSummary | null }) {
  return (
    <footer className="foot">
      <div className="wrap foot__row">
        <span>
          Historical Shanghan Corpus {summary ? `v${summary.version}` : ''} · 《傷寒論》歷代文獻結構化語料庫
        </span>
        <span>
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
          {' · '}
          <a href={LAYER_URL.licence} target="_blank" rel="noreferrer">
            CC BY 4.0
          </a>
          {summary ? ` · built ${summary.validated_on}` : ''}
        </span>
      </div>
    </footer>
  )
}
