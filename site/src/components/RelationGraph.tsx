import { useEffect, useMemo, useRef, useState } from 'react'
import type { Core, ElementDefinition } from 'cytoscape'
import { useI18n } from '../i18n'
import type { ClausePayload, GraphEdge, GraphNeighbour } from '../types'
import { SectionHead } from './ui'

/** Token name per relation type; resolved against the live theme before drawing. */
const REL_TOKEN: Record<string, string> = {
  commentary_support: '--jade',
  variant: '--gold',
  differential: '--cinnabar',
  sequence: '--ink-3',
  same_formula_family: '--graph-indigo',
  mistreatment_transformation: '--graph-plum',
  transmission: '--graph-teal',
  contraindication: '--graph-rust',
}

const REL_ORDER = Object.keys(REL_TOKEN)

/** Resolve the palette once per draw: getComputedStyle is not cheap per edge. */
function readPalette(): Record<string, string> {
  const style = getComputedStyle(document.documentElement)
  const names = ['--ink', '--ink-2', '--ink-3', '--surface', '--cinnabar', '--rule', ...Object.values(REL_TOKEN)]
  const palette: Record<string, string> = {}
  for (const name of new Set(names)) palette[name] = style.getPropertyValue(name).trim()
  return palette
}

/**
 * Deterministic radial layout: neighbours are sorted by relation type so that
 * like types sit together on the rim, then spread across two or three radii —
 * a single ring cannot hold a 20-node ego network without labels colliding.
 * cy.fit() rescales afterwards, so the absolute radii only set the proportions.
 */
const RINGS = [
  { upTo: 8, radii: [190] },
  { upTo: 14, radii: [170, 250] },
  { upTo: Infinity, radii: [165, 245, 325] },
]

function positionFor(order: number, total: number, cx: number, cy: number) {
  const { radii } = RINGS.find((ring) => total <= ring.upTo)!
  const angle = -Math.PI / 2 + (order / Math.max(total, 1)) * Math.PI * 2
  const radius = radii[order % radii.length]
  return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius * 0.9 }
}

export function RelationGraph({
  payload,
  onOpenClause,
  theme,
}: {
  payload: ClausePayload
  onOpenClause: (clauseId: string) => void
  theme: 'light' | 'dark'
}) {
  const { t, v, n, clause } = useI18n()
  const stageRef = useRef<HTMLDivElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const edge of payload.graph.edges) counts.set(edge.type, (counts.get(edge.type) ?? 0) + 1)
    return [...counts.entries()].sort(
      (a, b) => REL_ORDER.indexOf(a[0]) - REL_ORDER.indexOf(b[0]),
    )
  }, [payload])

  const [enabled, setEnabled] = useState<Set<string>>(new Set())
  useEffect(() => {
    // Start with every relation type present on this clause switched on.
    setEnabled(new Set(typeCounts.map(([type]) => type)))
    setSelectedId(null)
  }, [typeCounts])

  const visible = useMemo(() => {
    const edges = payload.graph.edges.filter((edge) => enabled.has(edge.type))
    const keep = new Set(edges.map((edge) => edge.other))
    const neighbours = payload.graph.neighbours.filter((node) => keep.has(node.id))
    return { edges, neighbours }
  }, [payload, enabled])

  useEffect(() => {
    const container = stageRef.current
    if (!container) return

    // Cytoscape is the single largest dependency; loading it here keeps it out
    // of the initial bundle so the page paints before the graph is reached.
    let instance: Core | null = null
    let cancelled = false

    const palette = readPalette()
    const ink = palette['--ink']
    const surface = palette['--surface']
    const cinnabar = palette['--cinnabar']
    const rule = palette['--rule']

    const centre = payload.clause
    const centreLabel =
      centre.canonical_clause_no !== null ? clause(centre.canonical_clause_no) : centre.clause_id.slice(-8)

    const cx = container.clientWidth / 2
    const cy = container.clientHeight / 2

    const ordered = [...visible.neighbours].sort((a, b) => {
      const at = visible.edges.find((e) => e.other === a.id)?.type ?? ''
      const bt = visible.edges.find((e) => e.other === b.id)?.type ?? ''
      const diff = REL_ORDER.indexOf(at) - REL_ORDER.indexOf(bt)
      return diff !== 0 ? diff : a.id.localeCompare(b.id)
    })

    const elements: ElementDefinition[] = [
      {
        data: { id: centre.clause_id, label: centreLabel, kind: 'centre' },
        position: { x: cx, y: cy },
        locked: true,
      },
      ...ordered.map((node, i) => ({
        data: {
          id: node.id,
          label: node.type === 'clause' ? (node.no !== null && node.no !== undefined ? clause(node.no) : node.id.slice(-6)) : node.label,
          kind: node.type,
        },
        position: positionFor(i, ordered.length, cx, cy),
      })),
      ...visible.edges.map((edge) => ({
        data: {
          id: edge.relation_id,
          source: edge.direction === 'out' ? centre.clause_id : edge.other,
          target: edge.direction === 'out' ? edge.other : centre.clause_id,
          kind: edge.type,
          colour: palette[REL_TOKEN[edge.type] ?? '--ink-3'] || palette['--ink-3'],
        },
      })),
    ]

    import('cytoscape').then(({ default: cytoscape }) => {
      if (cancelled) return
      instance = cytoscape({
      container,
      elements,
      layout: { name: 'preset' },
      minZoom: 0.35,
      maxZoom: 2.6,
      wheelSensitivity: 0.24,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': surface,
            'border-width': 1.2,
            'border-color': rule,
            label: 'data(label)',
            color: ink,
            'font-size': 11,
            'font-family': 'Songti SC, Source Han Serif SC, Noto Serif CJK SC, serif',
            'text-valign': 'center',
            'text-halign': 'center',
            'text-max-width': '84px',
            'text-wrap': 'ellipsis',
            width: 'label',
            height: 26,
            padding: '8px',
            shape: 'round-rectangle',
          },
        },
        {
          selector: 'node[kind = "centre"]',
          style: {
            'background-color': cinnabar,
            'border-width': 0,
            color: '#ffffff',
            'font-size': 14,
            width: 62,
            height: 62,
            shape: 'ellipse',
            'z-index': 10,
          },
        },
        { selector: 'node[kind = "clause"]', style: { shape: 'ellipse', width: 46, height: 46, 'font-size': 10.5 } },
        { selector: 'node[kind = "variant"]', style: { shape: 'round-diamond', height: 40, padding: '14px' } },
        {
          selector: 'node:selected',
          style: { 'border-width': 2, 'border-color': cinnabar, 'z-index': 20 },
        },
        {
          selector: 'edge',
          style: {
            width: 1.2,
            'line-color': 'data(colour)',
            'target-arrow-color': 'data(colour)',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.62,
            'curve-style': 'straight',
            opacity: 0.62,
          },
        },
        { selector: 'edge[kind = "variant"]', style: { 'line-style': 'dashed' } },
        { selector: 'edge[kind = "differential"]', style: { 'line-style': 'dotted' } },
        { selector: 'edge:selected', style: { width: 2.4, opacity: 1 } },
      ],
      })

      instance.on('tap', 'node', (event) => setSelectedId(event.target.id()))
      instance.on('tap', (event) => {
        if (event.target === instance) setSelectedId(null)
      })
      instance.fit(undefined, 42)
    })

    return () => {
      cancelled = true
      instance?.destroy()
    }
    // `clause` is part of the deps so node labels are redrawn on a language switch.
  }, [payload, visible, theme, clause])

  const selectedNode: GraphNeighbour | null =
    payload.graph.neighbours.find((node) => node.id === selectedId) ?? null
  const selectedEdges: GraphEdge[] = selectedId
    ? payload.graph.edges.filter((edge) => edge.other === selectedId)
    : []
  const isCentre = selectedId === payload.clause.clause_id

  const commentary = selectedNode?.type === 'commentary'
    ? payload.commentaries.find((c) => c.commentary_id === selectedNode.id)
    : undefined
  const variant = selectedNode?.type === 'variant'
    ? payload.variants.find((x) => x.variant_id === selectedNode.id)
    : undefined

  return (
    <section className="section section--tint" id="graph">
      <div className="wrap">
        <SectionHead
          no="07"
          title={t('gr.title')}
          sub={t('gr.sub')}
          extra={
            <span className="tag mono">
              {n(visible.edges.length)} {t('gr.edges')} · {n(visible.neighbours.length + 1)} {t('gr.nodes')}
            </span>
          }
        />

        <div className="filters">
          {typeCounts.map(([type, count]) => {
            const on = enabled.has(type)
            return (
              <button
                key={type}
                type="button"
                className="filter"
                data-on={on}
                aria-pressed={on}
                onClick={() => {
                  const next = new Set(enabled)
                  if (on) next.delete(type)
                  else next.add(type)
                  setEnabled(next)
                }}
              >
                <span
                  className="filter__key"
                  style={{ background: `var(${REL_TOKEN[type] ?? '--ink-3'})` }}
                  aria-hidden
                />
                {v(type)}
                <span className="filter__n">{count}</span>
              </button>
            )
          })}
        </div>

        <div className="graph-wrap">
          <div className="graph-stage">
            <div className="graph-stage__cy" ref={stageRef} />
            <span className="graph-hint">{t('gr.hint')}</span>
          </div>

          <aside className="card node-detail">
            {!selectedId && <p className="node-detail__empty">{t('gr.detail.empty')}</p>}

            {isCentre && (
              <>
                <div className="node-detail__type" style={{ color: 'var(--cinnabar)' }}>
                  {t('gr.center')}
                </div>
                <div className="node-detail__title">
                  {payload.clause.canonical_clause_no !== null
                    ? clause(payload.clause.canonical_clause_no)
                    : payload.clause.clause_id}
                </div>
                <p className="node-detail__body">{payload.clause.original_text}</p>
              </>
            )}

            {selectedNode && (
              <>
                <div
                  className="node-detail__type"
                  style={{
                    color:
                      selectedNode.type === 'commentary'
                        ? 'var(--jade)'
                        : selectedNode.type === 'variant'
                          ? 'var(--gold)'
                          : 'var(--cinnabar)',
                  }}
                >
                  {v(selectedNode.type === 'commentary' ? 'commentary_support' : selectedNode.type)}
                </div>
                <div className="node-detail__title">
                  {selectedNode.type === 'clause' && selectedNode.no != null
                    ? `${clause(selectedNode.no)} · `
                    : ''}
                  {selectedNode.label}
                </div>

                {commentary && (
                  <>
                    <p className="muted mono" style={{ fontSize: '0.68rem', marginTop: '0.3rem' }}>
                      {commentary.book} · {v(commentary.dynasty)}
                    </p>
                    <p className="node-detail__body">{commentary.text}</p>
                  </>
                )}
                {variant && (
                  <>
                    <p className="muted mono" style={{ fontSize: '0.68rem', marginTop: '0.3rem' }}>
                      {t('vr.similarity')} {variant.similarity.toFixed(3)}
                    </p>
                    <p className="node-detail__body">{variant.variant_body}</p>
                  </>
                )}
                {selectedNode.type === 'clause' && (
                  <>
                    <p className="node-detail__body">{selectedNode.label}…</p>
                    <button
                      type="button"
                      className="btn btn--sm"
                      style={{ marginTop: '0.6rem' }}
                      onClick={() => onOpenClause(selectedNode.id)}
                    >
                      {t('gr.open')} →
                    </button>
                  </>
                )}

                {selectedEdges.map((edge) => (
                  <div key={edge.relation_id} style={{ marginTop: '0.85rem', borderTop: '1px solid var(--rule-soft)', paddingTop: '0.6rem' }}>
                    <div className="mono" style={{ fontSize: '0.66rem', color: 'var(--ink-3)' }}>
                      {edge.relation_id} · {v(edge.type)} · {t('gr.confidence')}{' '}
                      {typeof edge.confidence === 'number' ? edge.confidence.toFixed(2) : v(String(edge.confidence))}
                    </div>
                    <p className="han" style={{ fontSize: '0.78rem', marginTop: '0.25rem', color: 'var(--ink-2)' }}>
                      {edge.description}
                    </p>
                  </div>
                ))}
              </>
            )}
          </aside>
        </div>
      </div>
    </section>
  )
}
