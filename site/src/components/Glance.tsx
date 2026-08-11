import { compact, useI18n } from '../i18n'
import type { CorpusSummary } from '../types'
import { DistBar, SectionHead } from './ui'

/* -------------------------------------------------------------- pipeline --- */

const BOX_W = 128
const BOX_H = 46
const COLS = [8, 166, 324, 482, 640, 798]

type Stage = { label: string; zh: string; value: string; tone?: 'cinnabar' | 'jade' | 'gold' }

function Box({ x, y, stage, zh }: { x: number; y: number; stage: Stage; zh: boolean }) {
  const stroke =
    stage.tone === 'cinnabar' ? 'var(--cinnabar)' : stage.tone === 'jade' ? 'var(--jade)' : stage.tone === 'gold' ? 'var(--gold)' : 'var(--rule)'
  return (
    <g>
      <rect x={x} y={y} width={BOX_W} height={BOX_H} rx="3" fill="var(--surface)" stroke={stroke} strokeOpacity="0.55" />
      <text
        x={x + BOX_W / 2}
        y={y + 19}
        textAnchor="middle"
        fontSize={zh ? 12 : 10.5}
        fill="var(--ink)"
        fontFamily={zh ? 'var(--han)' : 'var(--sans)'}
      >
        {zh ? stage.zh : stage.label}
      </text>
      <text
        x={x + BOX_W / 2}
        y={y + 35}
        textAnchor="middle"
        fontSize="11.5"
        fontFamily="var(--mono)"
        fill={stage.tone ? stroke : 'var(--ink-2)'}
      >
        {stage.value}
      </text>
    </g>
  )
}

function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const mid = (x1 + x2) / 2
  const d = y1 === y2 ? `M${x1},${y1} L${x2},${y2}` : `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`
  return <path d={d} fill="none" stroke="var(--rule)" strokeWidth="1" markerEnd="url(#flow-arrow)" />
}

function Pipeline({ summary }: { summary: CorpusSummary }) {
  const { t, lang } = useI18n()
  const zh = lang === 'zh'
  const h = summary.headline
  const midY = 100
  const fanY = [28, 100, 172]

  const trunk: Stage[] = [
    { label: t('glance.works'), zh: '歷史文獻', value: String(h.historical_works) },
    { label: t('glance.files'), zh: '源文本', value: String(h.source_files) },
    { label: t('glance.clauses'), zh: '條文記錄', value: String(h.clause_records) },
  ]
  const fan: Stage[] = [
    { label: t('glance.commentaries'), zh: '注釋', value: h.commentaries.toLocaleString('en-US'), tone: 'jade' },
    { label: t('glance.variants'), zh: '異文', value: h.variants.toLocaleString('en-US'), tone: 'gold' },
    { label: t('glance.relations'), zh: '關係', value: h.relations.toLocaleString('en-US'), tone: 'cinnabar' },
  ]

  return (
    <svg viewBox="0 0 940 250" role="img" aria-label={t('glance.pipeline')}>
      <defs>
        <marker id="flow-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,1 L7,4 L0,7" fill="none" stroke="var(--ink-3)" strokeWidth="1" />
        </marker>
      </defs>

      {trunk.map((_, i) =>
        i < trunk.length - 1 ? (
          <Arrow key={`t${i}`} x1={COLS[i] + BOX_W} y1={midY + BOX_H / 2} x2={COLS[i + 1] - 4} y2={midY + BOX_H / 2} />
        ) : null,
      )}
      {fanY.map((y, i) => (
        <Arrow key={`f${i}`} x1={COLS[2] + BOX_W} y1={midY + BOX_H / 2} x2={COLS[3] - 4} y2={y + BOX_H / 2} />
      ))}
      {fanY.map((y, i) => (
        <Arrow key={`m${i}`} x1={COLS[3] + BOX_W} y1={y + BOX_H / 2} x2={COLS[4] - 4} y2={midY + BOX_H / 2} />
      ))}
      <Arrow x1={COLS[4] + BOX_W} y1={midY + BOX_H / 2} x2={COLS[5] - 4} y2={midY + BOX_H / 2} />

      {trunk.map((stage, i) => (
        <Box key={stage.label} x={COLS[i]} y={midY} stage={stage} zh={zh} />
      ))}
      {fan.map((stage, i) => (
        <Box key={stage.label} x={COLS[3]} y={fanY[i]} stage={stage} zh={zh} />
      ))}
      <Box
        x={COLS[4]}
        y={midY}
        zh={zh}
        stage={{ label: 'Unified records', zh: '統一記錄', value: h.unified_records.toLocaleString('en-US') }}
      />
      <Box
        x={COLS[5]}
        y={midY}
        zh={zh}
        stage={{
          label: 'Validation & review',
          zh: '驗證與審核',
          value: summary.validation.overall_status,
          tone: 'jade',
        }}
      />
    </svg>
  )
}

/* ----------------------------------------------------------------- section --- */

export function Glance({ summary }: { summary: CorpusSummary }) {
  const { t, v, n } = useI18n()
  const h = summary.headline

  const cards = [
    { value: n(h.historical_works), label: t('glance.works'), zh: '歷史文獻' },
    { value: n(h.source_files), label: t('glance.files'), zh: '源文本文件' },
    { value: compact(h.characters), label: t('glance.characters'), zh: '字符總量' },
    { value: n(h.clause_records), label: t('glance.clauses'), zh: '條文記錄' },
    { value: n(h.canonical_clauses), label: t('glance.canonical'), zh: '經典條文' },
    { value: n(h.commentaries), label: t('glance.commentaries'), zh: '歷代注釋' },
    { value: n(h.variants), label: t('glance.variants'), zh: '異文' },
    { value: n(h.relations), label: t('glance.relations'), zh: '語義關係' },
  ]

  return (
    <section className="section" id="glance">
      <div className="wrap">
        <SectionHead no="02" title={t('glance.title')} sub={t('glance.sub')} />

        <div className="stats">
          {cards.map((card) => (
            <div className="stat" key={card.label}>
              <div className="stat__value">{card.value}</div>
              <div className="stat__label">{card.label}</div>
              <div className="stat__zh">{card.zh}</div>
            </div>
          ))}
        </div>

        <div className="pipeline">
          <Pipeline summary={summary} />
        </div>

        <div className="dist-grid">
          <div className="dist">
            <h4>{t('glance.dist.dynasty')}</h4>
            <DistBar rows={summary.distributions.dynasty} format={v} />
          </div>
          <div className="dist">
            <h4>{t('glance.dist.relation')}</h4>
            <DistBar rows={summary.distributions.relation_type} colour="jade" format={v} />
          </div>
          <div className="dist">
            <h4>{t('glance.dist.channel')}</h4>
            <DistBar rows={summary.distributions.six_channel} colour="gold" />
          </div>
          <div className="dist">
            <h4>{t('glance.dist.formula')}</h4>
            <DistBar rows={summary.distributions.top_formulae} />
          </div>
        </div>
      </div>
    </section>
  )
}
