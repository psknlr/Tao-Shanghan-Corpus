import { useMemo, useState } from 'react'
import { compact, useI18n } from '../i18n'
import type { SourceWork, TimelineBand, TimelineWork } from '../types'
import { KeyValues, SectionHead } from './ui'

// The band already prints the dynasty through the shared vocabulary, so this is
// the pairing in the other script: Han characters alongside English, and the
// English name alongside Chinese.
const DYNASTY_ALT: Record<string, [en: string, zhHant: string]> = {
  'Eastern Han': ['Eastern Han', '東漢'],
  Song: ['Song', '宋'],
  'Jin (1115-1234)': ['Jin', '金'],
  Yuan: ['Yuan', '元'],
  Ming: ['Ming', '明'],
  Qing: ['Qing', '清'],
  not_stated_in_source: ['not stated', '未載'],
}

function WorkDetail({ work, entry }: { work: SourceWork; entry: TimelineWork }) {
  const { t, v, n } = useI18n()

  const contributions = [
    entry.clauses ? `${n(entry.clauses)} ${t('tl.contrib.clauses')}` : null,
    entry.commentaries ? `${n(entry.commentaries)} ${t('tl.contrib.commentaries')}` : null,
    entry.variants ? `${n(entry.variants)} ${t('tl.contrib.variants')}` : null,
  ].filter(Boolean)

  return (
    <div className="card work-detail">
      <div className="work-detail__head">
        <div>
          <div className="work-detail__title">{work.title_zh}</div>
          <div className="work-detail__translit">{work.title_translit}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          <span className="tag mono">{work.source_id}</span>
          <span className="tag tag--gold">{v(work.evidence_layer)}</span>
          <span className="tag">{v(work.witness_status)}</span>
        </div>
      </div>

      <KeyValues
        rows={[
          { label: t('tl.field.author'), value: work.author, han: true },
          { label: t('tl.field.dynasty'), value: v(work.dynasty) },
          { label: t('tl.field.date'), value: v(work.approximate_date) },
          { label: t('tl.field.worktype'), value: v(work.work_type) },
          { label: t('tl.field.chars'), value: n(work.characters), mono: true },
          { label: t('tl.field.files'), value: n(work.n_files), mono: true },
          { label: t('tl.field.edition'), value: v(work.edition_stated) },
          {
            label: t('tl.field.contrib'),
            value: contributions.length ? contributions.join(' · ') : v('not_stated_in_source'),
          },
          { label: t('tl.field.sha'), value: work.work_sha256 || '—', mono: true },
        ]}
      />
    </div>
  )
}

export function Timeline({ bands, sources }: { bands: TimelineBand[]; sources: SourceWork[] }) {
  const { t, v, n, lang } = useI18n()
  const [selected, setSelected] = useState<string | null>(null)

  const byId = useMemo(() => new Map(sources.map((s) => [s.source_id, s])), [sources])
  const entryById = useMemo(
    () => new Map(bands.flatMap((band) => band.works.map((w) => [w.source_id, w] as const))),
    [bands],
  )

  const work = selected ? byId.get(selected) : null
  const entry = selected ? entryById.get(selected) : null

  return (
    <section className="section section--tint" id="timeline">
      <div className="wrap">
        <SectionHead no="03" title={t('tl.title')} sub={t('tl.sub')} />

        <div className="tl">
          {bands.map((band) => (
            <div className="tl__band" key={band.dynasty}>
              <div className="tl__label">
                <div className="tl__dynasty">{v(band.dynasty)}</div>
                <div className="tl__dynasty-zh han">
                  {(DYNASTY_ALT[band.dynasty] ?? ['—', '—'])[lang === 'en' ? 1 : 0]}
                </div>
                <div className="tl__count">
                  {n(band.works_count)} {t('tl.works')} · {compact(band.characters)} {t('tl.chars')}
                </div>
              </div>
              <div className="tl__works">
                {band.works.map((entryWork) => (
                  <button
                    key={entryWork.source_id}
                    type="button"
                    className="tl__work"
                    data-on={selected === entryWork.source_id}
                    onClick={() =>
                      setSelected(selected === entryWork.source_id ? null : entryWork.source_id)
                    }
                  >
                    <div className="tl__work-title">{entryWork.title_zh}</div>
                    <div className="tl__work-meta">
                      {lang === 'en' ? entryWork.title_translit : entryWork.author} ·{' '}
                      {compact(entryWork.characters)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {work && entry ? (
          <WorkDetail work={work} entry={entry} />
        ) : (
          <p className="muted" style={{ marginTop: '1.5rem', fontSize: '0.85rem' }}>
            {t('tl.select')}
          </p>
        )}
      </div>
    </section>
  )
}
