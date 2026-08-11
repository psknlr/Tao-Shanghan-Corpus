import { useI18n } from '../i18n'
import type { CorpusSummary } from '../types'
import { SectionHead } from './ui'
import { LAYER_URL } from '../config'

type Row = { key: string; value: string | number | boolean }

/**
 * Field names are printed verbatim as they appear in
 * 09_validation/validation_report.json, so a reader can map every row on this
 * page back to the released report one-to-one.
 */
function ReportTable({ caption, rows }: { caption: string; rows: Row[] }) {
  return (
    <div className="vtable-wrap">
    <table className="vtable">
      <caption>{caption}</caption>
      <tbody>
        {rows.map((row) => {
          const isZero = row.value === 0
          const isTrue = row.value === true
          const text =
            typeof row.value === 'boolean' ? (row.value ? 'true' : 'false') : String(row.value)
          const ratio = typeof row.value === 'string' && /^(\d+)\/\1(\s|$)/.test(row.value)
          return (
            <tr key={row.key}>
              <th scope="row" className="mono" style={{ fontSize: '0.76rem' }}>
                {row.key}
              </th>
              <td className={isZero || isTrue || ratio || text === 'PASS' ? 'ok' : ''}>{text}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
    </div>
  )
}

export function DataQuality({ summary }: { summary: CorpusSummary }) {
  const { t } = useI18n()
  const validation = summary.validation

  const schemaRows: Row[] = Object.entries(validation.schema).map(([key, value]) => ({ key, value }))
  const structuralRows: Row[] = Object.entries(validation.structural).map(([key, value]) => ({ key, value }))
  const integrityRows: Row[] = Object.entries(validation.integrity).map(([key, value]) => ({ key, value }))
  const provenanceRows: Row[] = Object.entries(validation.provenance).map(([layer, stats]) => ({
    key: layer,
    value: `${stats.resolved_to_source_files}/${stats.records}  (${stats.rate.toFixed(2)})`,
  }))

  return (
    <section className="section section--tint" id="quality">
      <div className="wrap">
        <SectionHead no="09" title={t('dq.title')} sub={t('dq.sub')} />

        <div className="quality-hero">
          <span className="badge-pass">
            <span className="dot" aria-hidden />
            {validation.overall_status}
          </span>
          <div>
            <div className="quality-hero__status">{t('dq.pass')}</div>
            <div className="quality-hero__meta">
              {t('dq.validated')} {summary.validated_on} · schema {summary.schema_version} ·{' '}
              <a href={LAYER_URL.validation} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
                09_validation/
              </a>{' '}
              ·{' '}
              <a href={LAYER_URL.code} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
                code/
              </a>
            </div>
          </div>
        </div>

        {/* Two columns, not three: the report keys are long enough that a third
            column squeezes the value cells into mid-token wrapping. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))', gap: '0 2.5rem' }}>
          <ReportTable caption={t('dq.schema')} rows={schemaRows} />
          <ReportTable caption={t('dq.integrity')} rows={integrityRows} />
          <ReportTable caption={t('dq.structural')} rows={structuralRows} />
          <div>
            <ReportTable caption={t('dq.provenance')} rows={provenanceRows} />
            <ReportTable
              caption={t('dq.dupes')}
              rows={Object.entries(validation.duplicates)
                .filter(([key]) => key !== 'interpretation')
                .map(([key, value]) => ({ key, value }))}
            />
          </div>
        </div>

        <p className="muted" style={{ fontSize: '0.78rem', marginTop: '0.75rem', maxWidth: '78ch' }}>
          {String(validation.duplicates.interpretation ?? '')}
        </p>

      </div>
    </section>
  )
}
