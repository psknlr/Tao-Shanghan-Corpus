import { useCallback, useEffect, useState } from 'react'
import { useClause, useCorpus } from './data'
import { useI18n } from './i18n'
import { applyTheme, resolveInitialTheme, type Theme } from './theme'
import { Nav } from './components/Nav'
import { Hero } from './components/Hero'
import { Glance } from './components/Glance'
import { Timeline } from './components/Timeline'
import { ClauseExplorer } from './components/ClauseExplorer'
import { CommentaryExplorer } from './components/CommentaryExplorer'
import { VariantViewer } from './components/VariantViewer'
import { RelationGraph } from './components/RelationGraph'
import { ProvenanceTrace } from './components/ProvenanceTrace'
import { DataQuality } from './components/DataQuality'
import { DataAccess, Footer } from './components/DataAccess'
import { ErrorBox, Loading } from './components/ui'

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme)

  // The DOM attribute is written here, in the handler, rather than in an effect:
  // see the note in theme.ts on why the graph needs it applied before re-render.
  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'light' ? 'dark' : 'light'
      applyTheme(next)
      return next
    })
  }, [])

  return [theme, toggle]
}

export default function App() {
  const { t } = useI18n()
  const [theme, toggleTheme] = useTheme()
  const corpus = useCorpus()

  // One clause selection drives sections 04–08, so a reader picks a record once
  // and then sees its commentary, variants, network and provenance in sequence.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  useEffect(() => {
    if (corpus.data && !selectedId) setSelectedId(corpus.data.summary.featured_clause_id)
  }, [corpus.data, selectedId])

  const clause = useClause(selectedId)

  const openClause = useCallback((clauseId: string) => {
    setSelectedId(clauseId)
    document.getElementById('clauses')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <>
      <Nav theme={theme} onTheme={toggleTheme} />
      <Hero summary={corpus.data?.summary ?? null} />

      {corpus.error && (
        <div className="wrap" style={{ padding: '2rem 0' }}>
          <ErrorBox message={corpus.error} />
        </div>
      )}

      {!corpus.data && !corpus.error && (
        <div className="wrap">
          <Loading />
        </div>
      )}

      {corpus.data && (
        <>
          <Glance summary={corpus.data.summary} />

          <Timeline bands={corpus.data.timeline.bands} sources={corpus.data.sources} />

          <ClauseExplorer
            index={corpus.data.index}
            selected={selectedId ?? ''}
            onSelect={setSelectedId}
            payload={clause.data}
            error={clause.error}
          />

          {clause.data ? (
            <>
              <CommentaryExplorer payload={clause.data} />
              <VariantViewer payload={clause.data} />
              <RelationGraph payload={clause.data} onOpenClause={openClause} theme={theme} />
              <ProvenanceTrace payload={clause.data} />
            </>
          ) : (
            <div className="wrap" style={{ padding: '3rem 0' }}>
              {clause.error ? <ErrorBox message={clause.error} /> : <Loading />}
            </div>
          )}

          <DataQuality summary={corpus.data.summary} />
          <DataAccess summary={corpus.data.summary} />
          <Footer summary={corpus.data.summary} />
        </>
      )}

      {!corpus.data && (
        <div className="wrap" style={{ paddingBottom: '4rem' }}>
          <p className="muted" style={{ fontSize: '0.82rem' }}>
            {t('ui.loading')}
          </p>
        </div>
      )}
    </>
  )
}
