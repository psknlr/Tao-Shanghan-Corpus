import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import type { ClausePayload, DiffSegment, VariantRecord } from '../types'
import { KeyValues, SectionHead } from './ui'

/** Renders the build-time collation: base-only runs struck through, witness-only runs marked. */
function Collation({ diff }: { diff: DiffSegment[] }) {
  return (
    <p className="diff-inline__text">
      {diff.map((segment, i) => {
        if (segment.t === '=') return <span key={i}>{segment.a}</span>
        if (segment.t === '-')
          return (
            <span key={i} className="d-del">
              {segment.a}
            </span>
          )
        return (
          <span key={i} className="d-ins">
            {segment.b}
          </span>
        )
      })}
    </p>
  )
}

function VariantMeta({ variant }: { variant: VariantRecord }) {
  const { t, v } = useI18n()
  return (
    <KeyValues
      rows={[
        { label: t('vr.field.id'), value: variant.variant_id, mono: true },
        { label: t('vr.field.book'), value: variant.variant_book, han: true },
        { label: t('vr.field.version'), value: variant.variant_version, mono: true },
        { label: t('vr.similarity'), value: variant.similarity.toFixed(3), mono: true },
        { label: t('cm.field.confidence'), value: v(variant.candidate_confidence) },
        { label: t('pv.resolution'), value: v(variant.source_resolution) },
        { label: t('tl.field.sourceid'), value: variant.source_id, mono: true },
      ]}
    />
  )
}

export function VariantViewer({ payload }: { payload: ClausePayload }) {
  const { t, n } = useI18n()
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    setActiveId(payload.variants[0]?.variant_id ?? null)
  }, [payload])

  const active = payload.variants.find((variant) => variant.variant_id === activeId) ?? null

  return (
    <section className="section" id="variants">
      <div className="wrap">
        <SectionHead
          no="06"
          title={t('vr.title')}
          sub={t('vr.sub')}
          extra={
            <span className="tag mono">
              {n(payload.counts.variants)} {t('nav.variants')}
            </span>
          }
        />

        {payload.variants.length === 0 ? (
          <p className="muted">{t('vr.none')}</p>
        ) : (
          <>
            {/* every witness for this clause, base text first */}
            <div className="diff-cols">
              <div className="diff-col">
                <div className="diff-col__head">
                  <span className="diff-col__name">
                    {t('vr.base')}
                    <em>{payload.variants[0].base_version}</em>
                  </span>
                  <span className="tag tag--cinnabar mono">base</span>
                </div>
                <p className="diff-col__text">{payload.variants[0].base_text}</p>
              </div>

              {payload.variants.map((variant) => (
                <div className="diff-col" key={variant.variant_id}>
                  <div className="diff-col__head">
                    <span className="diff-col__name">
                      {variant.variant_book}
                      <em>{variant.variant_version}</em>
                    </span>
                    <span className="tag mono">{variant.similarity.toFixed(2)}</span>
                  </div>
                  <p className="diff-col__text">{variant.variant_body}</p>
                </div>
              ))}
            </div>

            {payload.variants.length > 1 && (
              <div className="witness-tabs" style={{ marginTop: '1.5rem', marginBottom: 0 }}>
                {payload.variants.map((variant) => (
                  <button
                    key={variant.variant_id}
                    type="button"
                    className="witness-tab"
                    data-on={variant.variant_id === activeId}
                    onClick={() => setActiveId(variant.variant_id)}
                  >
                    {variant.variant_book}
                    <small>{variant.similarity.toFixed(2)}</small>
                  </button>
                ))}
              </div>
            )}

            {active && (
              <>
                <div className="diff-inline">
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '1rem',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                    }}
                  >
                    <span className="eyebrow">
                      {t('vr.collation')} — {active.variant_book}
                    </span>
                    <span className="diff-legend">
                      <span>
                        <i className="swatch" style={{ background: 'var(--cinnabar)' }} /> {t('vr.legend.del')}
                      </span>
                      <span>
                        <i className="swatch" style={{ background: 'var(--jade)' }} /> {t('vr.legend.ins')}
                      </span>
                    </span>
                  </div>

                  <Collation diff={active.diff} />

                  <div className="sim-meter">
                    <span className="eyebrow">{t('vr.similarity')}</span>
                    <span className="sim-meter__track">
                      <span className="sim-meter__fill" style={{ width: `${active.similarity * 100}%` }} />
                    </span>
                    <span className="sim-meter__n">{active.similarity.toFixed(3)}</span>
                  </div>

                  {active.witness_section_marker && (
                    <p className="muted" style={{ marginTop: '0.9rem', fontSize: '0.75rem' }}>
                      {t('vr.marker')} <span className="mono">{active.witness_section_marker}</span>
                    </p>
                  )}

                  {active.notable_differences.length > 0 && (
                    <div style={{ marginTop: '1.1rem' }}>
                      <span className="eyebrow">{t('vr.notable')}</span>
                      <div className="ann__tags" style={{ marginTop: '0.5rem' }}>
                        {active.notable_differences.map((difference, i) => (
                          <span className="tag tag--han" key={i}>
                            {difference.replace(/\s+/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <VariantMeta variant={active} />
              </>
            )}
          </>
        )}
      </div>
    </section>
  )
}
