import type { ReactNode } from 'react'
import { useI18n } from '../i18n'

export function SectionHead({
  no,
  title,
  sub,
  extra,
}: {
  no: string
  title: string
  sub?: string
  extra?: ReactNode
}) {
  return (
    <header className="section-head">
      <div className="section-head__no">{no}</div>
      <div className="section-head__body">
        <h2>{title}</h2>
        {sub && <p className="section-head__sub">{sub}</p>}
      </div>
      {extra}
    </header>
  )
}

export function Loading() {
  const { t } = useI18n()
  return (
    <div className="loading">
      <span className="spinner" aria-hidden />
      {t('ui.loading')}
    </div>
  )
}

export function ErrorBox({ message }: { message: string }) {
  const { t } = useI18n()
  return (
    <div className="error" role="alert">
      {t('ui.error')} <span className="mono">{message}</span>
    </div>
  )
}

/** A definition list rendered as the hairline key/value grid used throughout. */
export function KeyValues({ rows }: { rows: { label: string; value: ReactNode; han?: boolean; mono?: boolean }[] }) {
  return (
    <dl className="kv">
      {rows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd className={[row.han ? 'han' : '', row.mono ? 'mono' : ''].filter(Boolean).join(' ')}>{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** A labelled group of vocabulary tags, or an explicit "none recorded" note. */
export function TagField({ label, values, tone }: { label: string; values: string[]; tone?: 'cinnabar' | 'jade' | 'gold' }) {
  const { t } = useI18n()
  return (
    <div className="ann">
      <h5>{label}</h5>
      {values.length ? (
        <div className="ann__tags">
          {values.map((value, i) => (
            <span key={`${value}-${i}`} className={`tag tag--han${tone ? ` tag--${tone}` : ''}`}>
              {value}
            </span>
          ))}
        </div>
      ) : (
        <p className="ann__empty">{t('cl.none')}</p>
      )}
    </div>
  )
}

export function DistBar({
  rows,
  colour = 'cinnabar',
  format,
}: {
  rows: { key: string; count: number }[]
  colour?: 'cinnabar' | 'jade' | 'gold'
  format?: (key: string) => string
}) {
  const max = Math.max(...rows.map((r) => r.count), 1)
  return (
    <div>
      {rows.map((row) => (
        <div className="dist__row" key={row.key}>
          <span className="dist__key" title={row.key}>
            {format ? format(row.key) : row.key}
          </span>
          <span className="dist__bar">
            <i className={colour === 'cinnabar' ? '' : colour} style={{ width: `${(row.count / max) * 100}%` }} />
          </span>
          <span className="dist__n">{row.count.toLocaleString('en-US')}</span>
        </div>
      ))}
    </div>
  )
}
