import { useDeferredValue, useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import { searchClauses } from '../data'
import type { ClausePayload, FormulaBlock, SearchEntry } from '../types'
import { ErrorBox, Loading, SectionHead, TagField } from './ui'

const HINTS = ['23', '桂枝湯', '惡寒', '發熱', '成無己', '太陽病', '大青龍湯', '脈浮']

function Formula({ block }: { block: FormulaBlock }) {
  const { t } = useI18n()
  return (
    <div className="formula">
      <div className="formula__head">{block.formula_name}</div>
      <div className="formula__herbs">
        {block.composition.map((item, i) => (
          <span className="herb" key={`${item.herb}-${i}`}>
            <b>{item.herb}</b>
            {item.dose_processing && <i>{item.dose_processing}</i>}
          </span>
        ))}
      </div>
      {(block.preparation || block.administration) && (
        <div className="formula__prep">
          {block.preparation && (
            <div>
              <span className="eyebrow">{t('cl.formula.prep')}</span> {block.preparation}
            </div>
          )}
          {block.administration && (
            <div style={{ marginTop: '0.4rem' }}>
              <span className="eyebrow">{t('cl.formula.admin')}</span> {block.administration}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ClausePanel({ payload }: { payload: ClausePayload }) {
  const { t, v, n } = useI18n()
  const clause = payload.clause
  const canonical = clause.canonical_clause_no !== null

  return (
    <div className="clause-panel">
      <div className="clause-panel__head">
        <div>
          <div className="eyebrow">{canonical ? t('cl.clause') : t('cl.auxiliary')}</div>
          <div className="clause-panel__no">
            {canonical ? (
              <>
                <span>{clause.canonical_clause_no}</span>
                <span className="muted" style={{ fontSize: '0.55em', marginLeft: '0.5rem' }}>
                  {t('ui.of')} {n(398)}
                </span>
              </>
            ) : (
              <span className="mono" style={{ fontSize: '0.6em' }}>
                {clause.clause_id}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {clause.six_channel && <span className="tag tag--cinnabar tag--han">{clause.six_channel}</span>}
          {clause.formula_names.map((name) => (
            <span className="tag tag--jade tag--han" key={name}>
              {name}
            </span>
          ))}
          <span className="tag mono">{clause.clause_id}</span>
        </div>
      </div>

      <p className="clause-text">{clause.original_text}</p>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.78rem' }}>
        <span className="muted">
          <span className="eyebrow">{t('cl.chapter')}</span> <span className="han">{clause.chapter}</span>
        </span>
        <span className="muted">
          <span className="eyebrow">{t('cl.channel')}</span>{' '}
          <span className="han">{clause.six_channel || v('')}</span>
        </span>
        <span className="muted mono">
          {payload.counts.commentaries} cm · {payload.counts.variants} vr · {payload.counts.relations} rel
        </span>
      </div>

      {clause.formula_blocks.map((block, i) => (
        <Formula block={block} key={`${block.formula_name}-${i}`} />
      ))}

      <h4 style={{ marginTop: '2rem', fontSize: '0.9rem' }}>{t('cl.annotations')}</h4>
      <div className="ann-grid">
        <TagField label={t('cl.field.symptoms')} values={clause.symptoms} tone="cinnabar" />
        <TagField label={t('cl.field.pulse')} values={clause.pulse} tone="jade" />
        <TagField label={t('cl.field.negated')} values={clause.negated_findings} />
        <TagField label={t('cl.field.patterns')} values={clause.disease_patterns} />
        <TagField label={t('cl.field.formulae')} values={clause.formula_names} tone="gold" />
        <TagField label={t('cl.field.herbs')} values={clause.herbs} />
        <TagField label={t('cl.field.therapy')} values={clause.therapy_terms} />
        <TagField label={t('cl.field.contra')} values={clause.contraindication_terms} />
        <TagField label={t('cl.field.mistreat')} values={clause.mistreatment_terms} />
        <TagField label={t('cl.field.transform')} values={clause.transformation_terms} />
        <TagField label={t('cl.field.prognosis')} values={clause.prognosis_terms} />
        <TagField label={t('cl.field.time')} values={clause.time_course} />
        <TagField label={t('cl.field.logic')} values={clause.logic_words} />
        <TagField label={t('cl.field.collation')} values={clause.collation_notes} />
      </div>

      <div className="notice">
        <span aria-hidden>◆</span>
        <span>
          <strong>{t('cl.notice.label')}: </strong>
          {t('cl.notice')}
        </span>
      </div>
    </div>
  )
}

export function ClauseExplorer({
  index,
  selected,
  onSelect,
  payload,
  error,
}: {
  index: SearchEntry[]
  selected: string
  onSelect: (clauseId: string) => void
  payload: ClausePayload | null
  error: string | null
}) {
  const { t, n } = useI18n()
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)

  const results = useMemo(() => searchClauses(index, deferred), [index, deferred])

  return (
    <section className="section" id="clauses">
      <div className="wrap">
        <SectionHead no="04" title={t('cl.title')} sub={t('cl.sub')} />

        <div className="explorer">
          <div className="explorer__side">
            <div className="search">
              <span className="search__icon" aria-hidden>
                ⌕
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('cl.search.placeholder')}
                aria-label={t('cl.search.placeholder')}
              />
            </div>

            <div className="search__hints">
              {HINTS.map((hint) => (
                <button key={hint} type="button" className="search__hint" onClick={() => setQuery(hint)}>
                  {hint}
                </button>
              ))}
            </div>

            <div className="search__count">
              {n(results.length)} {t('cl.results')}
            </div>

            <div className="results">
              {results.length === 0 && (
                <p className="muted" style={{ padding: '1rem', fontSize: '0.82rem' }}>
                  {t('cl.noresults')}
                </p>
              )}
              {results.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="result"
                  data-on={entry.id === selected}
                  onClick={() => onSelect(entry.id)}
                >
                  <div className="result__no">
                    {entry.no !== null ? `條 ${entry.no}` : entry.id.replace('SHL_SONGBEN_', '')}
                  </div>
                  <div className="result__text">{entry.text}</div>
                  <div className="result__meta">
                    <span>{entry.n_commentaries} cm</span>
                    <span>{entry.n_variants} vr</span>
                    <span>{entry.n_relations} rel</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error ? <ErrorBox message={error} /> : payload ? <ClausePanel payload={payload} /> : <Loading />}
        </div>
      </div>
    </section>
  )
}
