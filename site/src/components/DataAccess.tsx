import { useI18n } from '../i18n'
import type { CorpusSummary, DownloadMetrics } from '../types'
import { SectionHead } from './ui'
import { downloadHref, LAYER_URL, RELEASES_URL, REPO_URL, UPSTREAM_URL } from '../config'

const DATASET_TITLE =
  'A structured corpus of historical Shanghan literature with clauses, commentaries and textual variants'

// `aff` indexes into AFFILIATIONS (1-based, as printed). `equal` marks the joint
// first authors and `corresponding` the joint corresponding authors.
const AUTHORS: { name: string; aff: number; equal?: boolean; corresponding?: boolean }[] = [
  { name: 'Yanlan Kang', aff: 1, equal: true },
  { name: 'Yide Fang', aff: 2, equal: true },
  { name: 'Li Xin', aff: 3, equal: true },
  { name: 'Yue Chen', aff: 4 },
  { name: 'Qingshan Ma', aff: 2 },
  { name: 'Peng Qiu', aff: 6, corresponding: true },
  { name: 'Xukun Zhang', aff: 5, corresponding: true },
  { name: 'William Cheng-Chung Chu', aff: 7, corresponding: true },
]

const AFFILIATIONS = [
  'Institute of Medical Philosophy & Future AI',
  'Longhua Hospital Affiliated to Shanghai University of Traditional Chinese Medicine',
  'Shandong Xiehe University',
  'Guanghua Hospital of Integrated Traditional Chinese and Western Medicine',
  'Shandong University of Traditional Chinese Medicine',
  'The University of Hong Kong',
  'Fujian Fuyao University of Science and Technology',
]

const CITATION_AUTHORS =
  'Kang, Y., Fang, Y., Xin, L., Chen, Y., Ma, Q., Qiu, P., Zhang, X., & Chu, W. C.-C.'

function DownloadCounter({ metrics }: { metrics: DownloadMetrics }) {
  const { t, n } = useI18n()
  const asset = metrics.latest_asset

  return (
    <div className="downloads">
      <div className="downloads__figure">
        <div className="downloads__n">{n(metrics.total_downloads)}</div>
        <div className="downloads__label">{t('ac.downloads')}</div>
      </div>
      <div className="downloads__meta">
        <p>{t('ac.downloads.note')}</p>
        <p className="mono">
          {asset?.tag && (
            <>
              {t('ac.downloads.release')} {asset.tag} ·{' '}
            </>
          )}
          {asset?.name} · {t('ac.downloads.updated')} {metrics.generated_at.slice(0, 10)} ·{' '}
          <a href={RELEASES_URL} target="_blank" rel="noreferrer">
            releases ↗
          </a>
        </p>
      </div>
    </div>
  )
}

export function DataAccess({
  summary,
  metrics,
}: {
  summary: CorpusSummary
  metrics: DownloadMetrics | null
}) {
  const { t, n } = useI18n()
  const href = downloadHref(metrics)

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

  const citation = `${CITATION_AUTHORS} (${summary.validated_on.slice(0, 4)}). ${DATASET_TITLE} (Version ${summary.version}) [Data set]. ${REPO_URL}`

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

        {metrics?.available && <DownloadCounter metrics={metrics} />}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', marginTop: '1.5rem' }}>
          <a className="btn btn--primary" href={href}>
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

          <div className="credits">
            <div>
              <div className="eyebrow">{t('ac.authors')}</div>
              <p className="credits__authors">
                {AUTHORS.map((author, i) => (
                  <span key={author.name}>
                    {i > 0 && <span className="credits__sep"> · </span>}
                    {author.name}
                    <sup className="credits__aff">{author.aff}</sup>
                    {author.equal && <sup className="credits__mark">†</sup>}
                    {author.corresponding && <sup className="credits__mark">*</sup>}
                  </span>
                ))}
              </p>
              <p className="credits__legend">
                <span>
                  <sup className="credits__mark">†</sup> {t('ac.equal')}
                </span>
                <span>
                  <sup className="credits__mark">*</sup> {t('ac.corresponding')}
                </span>
              </p>
            </div>
            <div>
              <div className="eyebrow">{t('ac.affiliations')}</div>
              <ol className="credits__affiliations">
                {AFFILIATIONS.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ol>
            </div>
          </div>

          <p className="cite">{citation}</p>
          <p className="muted" style={{ fontSize: '0.78rem', marginTop: '0.85rem' }}>
            <a href={LAYER_URL.citation} target="_blank" rel="noreferrer">
              CITATION.cff
            </a>
            {' · '}
            <a href={`${REPO_URL}/blob/main/SHA256SUMS.txt`} target="_blank" rel="noreferrer">
              SHA256SUMS.txt
            </a>
            {' · '}
            <a href={LAYER_URL.version} target="_blank" rel="noreferrer">
              VERSION.md
            </a>
          </p>
        </div>

        <div style={{ marginTop: '3rem' }}>
          <SectionHead no="12" title={t('ac.disclaimer.title')} />
          <p className="disclaimer">{t('ac.disclaimer')}</p>
          <p className="muted" style={{ fontSize: '0.78rem', marginTop: '1.25rem', maxWidth: '78ch' }}>
            {t('ac.licence.note')}{' '}
            <a href={UPSTREAM_URL} target="_blank" rel="noreferrer">
              jicheng.tw ↗
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}

export function Footer({ summary }: { summary: CorpusSummary | null }) {
  const { t, lang } = useI18n()
  return (
    <footer className="foot">
      <div className="wrap foot__row">
        <span>
          Historical Shanghan Corpus {summary ? `v${summary.version}` : ''}
          {lang !== 'en' && <> · {t('ui.tagline')}</>}
          {lang === 'en' && <> · 《傷寒論》歷代文獻結構化語料庫</>}
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
