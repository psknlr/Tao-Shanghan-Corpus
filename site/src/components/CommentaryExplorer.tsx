import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import type { ClausePayload, CommentaryRecord } from '../types'
import { KeyValues, SectionHead } from './ui'

const ERA_ORDER = ['Eastern Han', 'Song', 'Jin (1115-1234)', 'Yuan', 'Ming', 'Qing', 'not_stated_in_source']

function CommentaryReader({ record, clauseId }: { record: CommentaryRecord; clauseId: string }) {
  const { t, v, n } = useI18n()
  // The seal reproduces the commentator's name; two glyphs read best at this size.
  const seal = [...record.commentator].slice(0, 2).join('')

  const hasPunctuation = Boolean(record.punctuated_text)
  // Default to the editorial reading where one exists — the source is 白文 and
  // hard to read — but keep the switch to the unpunctuated original in view.
  const [showPunctuated, setShowPunctuated] = useState(true)
  useEffect(() => setShowPunctuated(true), [record.commentary_id])

  const body = hasPunctuation && showPunctuated ? record.punctuated_text! : record.text

  return (
    <div className="card comm-read">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'baseline' }}>
        <span className="tag tag--cinnabar tag--han">{record.commentator}</span>
        <span className="tag tag--han">{record.book}</span>
        <span className="tag">{v(record.dynasty)}</span>
        <span className="tag mono">{record.commentary_id}</span>
      </div>

      {hasPunctuation && (
        <div className="punct-switch" role="group" aria-label={t('cm.punctuated')}>
          <button type="button" data-on={showPunctuated} onClick={() => setShowPunctuated(true)}>
            {t('cm.punctuated')}
          </button>
          <button type="button" data-on={!showPunctuated} onClick={() => setShowPunctuated(false)}>
            {t('cm.plain')}
          </button>
          <span className="punct-switch__n mono">
            +{n(record.punctuation_marks_added ?? 0)} {t('cm.punct.marks')}
          </span>
        </div>
      )}

      <div className="comm-read__text han">
        <span className="comm-read__seal" aria-hidden>
          {seal}
        </span>
        {body}
      </div>

      <div style={{ clear: 'both' }} />

      {hasPunctuation && showPunctuated && (
        <div className="notice" style={{ marginTop: '1rem' }}>
          <span aria-hidden>◆</span>
          <span>
            <strong>{t('cm.punctuated')}: </strong>
            {t('cm.punct.note')}
          </span>
        </div>
      )}

      <KeyValues
        rows={[
          { label: t('cm.field.commentator'), value: record.commentator, han: true },
          { label: t('cm.field.work'), value: record.book, han: true },
          { label: t('cm.field.dynasty'), value: v(record.dynasty) },
          { label: t('cm.field.mapped'), value: clauseId, mono: true },
          { label: t('cm.field.location'), value: record.source_location || v(''), han: true },
          { label: t('cm.field.similarity'), value: record.alignment_similarity.toFixed(3), mono: true },
          { label: t('cm.field.alignment'), value: v(record.alignment_type) },
          { label: t('cm.field.confidence'), value: v(record.candidate_confidence) },
          {
            label: t('cm.field.provenance'),
            value: (
              <span className="ok">
                {t('cm.available')} · <span className="mono">{record.source_id}</span>
              </span>
            ),
          },
        ]}
      />
    </div>
  )
}

export function CommentaryExplorer({ payload }: { payload: ClausePayload }) {
  const { t, v, n } = useI18n()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const lanes = useMemo(() => {
    const grouped = new Map<string, CommentaryRecord[]>()
    for (const record of payload.commentaries) {
      const list = grouped.get(record.dynasty) ?? []
      list.push(record)
      grouped.set(record.dynasty, list)
    }
    return [...grouped.entries()].sort((a, b) => {
      const ai = ERA_ORDER.indexOf(a[0])
      const bi = ERA_ORDER.indexOf(b[0])
      return (ai === -1 ? ERA_ORDER.length : ai) - (bi === -1 ? ERA_ORDER.length : bi)
    })
  }, [payload])

  // Opening a new clause resets the reader to that clause's earliest commentary.
  useEffect(() => {
    setSelectedId(payload.commentaries[0]?.commentary_id ?? null)
  }, [payload])

  const selected = payload.commentaries.find((c) => c.commentary_id === selectedId) ?? null

  return (
    <section className="section section--tint" id="commentary">
      <div className="wrap">
        <SectionHead
          no="05"
          title={t('cm.title')}
          sub={t('cm.sub')}
          extra={
            <span className="tag mono">
              {n(payload.counts.commentaries)} {t('cm.records')}
            </span>
          }
        />

        {payload.commentaries.length === 0 ? (
          <p className="muted">{t('cm.none')}</p>
        ) : (
          <>
            <div className="comm-lanes">
              {lanes.map(([era, records]) => (
                <div className="comm-lane" key={era}>
                  <div className="comm-lane__head" data-era={era}>
                    <div className="comm-lane__era">{v(era)}</div>
                    <div className="comm-lane__n">
                      {records.length} {t('cm.records')}
                    </div>
                  </div>
                  {records.map((record) => (
                    <button
                      key={record.commentary_id}
                      type="button"
                      className="comm-card"
                      data-on={record.commentary_id === selectedId}
                      onClick={() => setSelectedId(record.commentary_id)}
                    >
                      <div className="comm-card__who">{record.commentator}</div>
                      <div className="comm-card__book">{record.book}</div>
                      <div className="comm-card__sim">
                        {t('cm.field.similarity')} {record.alignment_similarity.toFixed(2)}
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {selected && <CommentaryReader record={selected} clauseId={payload.clause.clause_id} />}
          </>
        )}
      </div>
    </section>
  )
}
