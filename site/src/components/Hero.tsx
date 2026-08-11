import { useI18n } from '../i18n'
import { DOWNLOAD_URL, REPO_URL } from '../config'
import type { CorpusSummary } from '../types'

/**
 * The hero diagram is a hand-laid schematic of the featured clause's ego
 * network — the same structure the Relation Graph section renders from data.
 * It is drawn by hand here so the first paint carries no data dependency.
 */

type Satellite = {
  label: string
  x: number
  y: number
  kind: 'commentary' | 'variant' | 'differential' | 'formula'
  note?: string
}

const SATELLITES: Satellite[] = [
  { label: '成無己', x: 126, y: 74, kind: 'commentary', note: '金' },
  { label: '方有執', x: 282, y: 48, kind: 'commentary', note: '明' },
  { label: '柯琴', x: 438, y: 74, kind: 'commentary', note: '清' },
  { label: '桂本', x: 66, y: 206, kind: 'variant', note: '0.98' },
  { label: '千金翼方', x: 74, y: 296, kind: 'variant', note: '0.69' },
  { label: '條 13', x: 130, y: 386, kind: 'differential' },
  { label: '條 27', x: 282, y: 410, kind: 'differential' },
  { label: '條 38', x: 434, y: 386, kind: 'differential' },
  { label: '桂枝麻黃各半湯', x: 452, y: 250, kind: 'formula' },
]

const STROKE: Record<Satellite['kind'], string> = {
  commentary: 'var(--jade)',
  variant: 'var(--gold)',
  differential: 'var(--cinnabar)',
  formula: 'var(--ink-3)',
}

const DASH: Record<Satellite['kind'], string | undefined> = {
  commentary: undefined,
  variant: '5 4',
  differential: '1.5 4',
  formula: '9 5',
}

const CX = 282
const CY = 236
const R = 40

function pillWidth(label: string): number {
  // Han characters are full-width; the few Latin/space glyphs used are not.
  const han = [...label].filter((ch) => /[㐀-鿿]/.test(ch)).length
  const rest = [...label].length - han
  return Math.max(52, han * 15 + rest * 7 + 20)
}

/** Stop the connector at the pill's edge so the line never crosses the label. */
function edgePoint(sat: Satellite): [number, number] {
  const w = pillWidth(sat.label) / 2 + 3
  const h = 15
  const dx = CX - sat.x
  const dy = CY - sat.y
  const scale = Math.min(
    dx === 0 ? Infinity : Math.abs(w / dx),
    dy === 0 ? Infinity : Math.abs(h / dy),
  )
  return [sat.x + dx * scale, sat.y + dy * scale]
}

function HeroDiagram() {
  return (
    <svg viewBox="0 0 564 442" role="img" aria-label="Ego network of canonical clause 23">
      <defs>
        <radialGradient id="halo" cx="50%" cy="50%">
          <stop offset="0%" stopColor="var(--cinnabar)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--cinnabar)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx={CX} cy={CY} r="150" fill="url(#halo)" />
      <circle cx={CX} cy={CY} r="112" fill="none" stroke="var(--rule-soft)" strokeWidth="1" />
      <circle cx={CX} cy={CY} r="168" fill="none" stroke="var(--rule-soft)" strokeWidth="1" />

      {/* connectors, drawn first so the label pills sit on top of them */}
      {SATELLITES.map((sat, i) => {
        const [ex, ey] = edgePoint(sat)
        const sx = CX + ((sat.x - CX) / Math.hypot(sat.x - CX, sat.y - CY)) * R
        const sy = CY + ((sat.y - CY) / Math.hypot(sat.x - CX, sat.y - CY)) * R
        return (
          <line
            key={sat.label}
            className="edge-in"
            x1={sx}
            y1={sy}
            x2={ex}
            y2={ey}
            stroke={STROKE[sat.kind]}
            strokeWidth="1.25"
            strokeDasharray={DASH[sat.kind]}
            style={{ animationDelay: `${0.15 + i * 0.07}s` }}
          />
        )
      })}

      {/* edge-type keys, placed just outside the inner ring */}
      <g fontFamily="var(--mono)" fontSize="9" fill="var(--ink-3)" letterSpacing="0.08em">
        <text x={CX + 8} y={CY - 92} textAnchor="middle">
          COMMENTARY
        </text>
        <text x={CX - 118} y={CY - 20} textAnchor="middle">
          VARIANT
        </text>
        <text x={CX - 6} y={CY + 108} textAnchor="middle">
          DIFFERENTIAL
        </text>
      </g>

      {/* centre — the featured clause */}
      <g className="node-in" style={{ animationDelay: '0.05s' }}>
        <circle cx={CX} cy={CY} r={R} fill="var(--cinnabar)" />
        <text
          x={CX}
          y={CY - 4}
          textAnchor="middle"
          fontFamily="var(--serif)"
          fontSize="27"
          fill="#fff"
          fillOpacity="0.97"
        >
          23
        </text>
        <text x={CX} y={CY + 16} textAnchor="middle" fontFamily="var(--han)" fontSize="10" fill="#fff" fillOpacity="0.7">
          條文
        </text>
      </g>

      {/* satellites */}
      {SATELLITES.map((sat, i) => {
        const w = pillWidth(sat.label)
        return (
          <g key={sat.label} className="node-in" style={{ animationDelay: `${0.4 + i * 0.07}s` }}>
            <rect
              x={sat.x - w / 2}
              y={sat.y - 15}
              width={w}
              height={30}
              rx="3"
              fill="var(--surface)"
              stroke={STROKE[sat.kind]}
              strokeOpacity="0.5"
            />
            <text
              x={sat.x}
              y={sat.y + 5}
              textAnchor="middle"
              fontFamily="var(--han)"
              fontSize="13.5"
              fill="var(--ink)"
            >
              {sat.label}
            </text>
            {sat.note && (
              <text
                x={sat.x + w / 2 + 6}
                y={sat.y + 4}
                fontFamily="var(--mono)"
                fontSize="8.5"
                fill={STROKE[sat.kind]}
                fillOpacity="0.85"
              >
                {sat.note}
              </text>
            )}
          </g>
        )
      })}

      <circle className="pulse-dot" cx={CX} cy={CY} r="3" fill="#fff" fillOpacity="0.9" />
    </svg>
  )
}

export function Hero({ summary }: { summary: CorpusSummary | null }) {
  const { t } = useI18n()

  return (
    <header className="hero" id="top">
      <div className="wrap hero__grid">
        <div>
          <p className="hero__zh han">{t('hero.zh')}</p>
          <h1>{t('hero.title')}</h1>
          <p className="hero__lede">{t('hero.lede')}</p>
          <p className="hero__zh-sub han">{t('hero.sub')}</p>

          <div className="hero__actions">
            <a className="btn btn--primary" href="#clauses">
              {t('hero.cta.explore')}
            </a>
            <a className="btn" href={REPO_URL} target="_blank" rel="noreferrer">
              {t('hero.cta.github')}
            </a>
            <a className="btn btn--ghost" href={DOWNLOAD_URL}>
              {t('hero.cta.download')}
            </a>
          </div>

          <div className="hero__meta">
            <span className="tag tag--cinnabar mono">v{summary?.version ?? '1.0'}</span>
            <span className="tag">{t('hero.badge.license')}</span>
            <span className="tag">{t('hero.badge.lang')}</span>
            {summary && <span className="tag tag--jade mono">{summary.validation.overall_status}</span>}
          </div>
        </div>

        <figure className="hero__figure">
          <HeroDiagram />
          <figcaption>{t('hero.figure.caption')}</figcaption>
        </figure>
      </div>
    </header>
  )
}
