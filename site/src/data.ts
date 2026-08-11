import { useEffect, useState } from 'react'
import type {
  ClausePayload,
  CorpusSummary,
  DownloadMetrics,
  RelationType,
  SearchEntry,
  SourceWork,
  TimelineBand,
} from './types'

/**
 * All payloads are static files under public/data, emitted by
 * scripts/build_demo_data.py. Nothing here talks to a server: the site is a
 * plain static deployment and each clause is fetched only when it is opened.
 */
const BASE = import.meta.env.BASE_URL

const cache = new Map<string, Promise<unknown>>()

export function loadJSON<T>(path: string): Promise<T> {
  const url = `${BASE}data/${path}`
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url).then((response) => {
        if (!response.ok) throw new Error(`${response.status} ${response.statusText} — ${path}`)
        return response.json()
      }),
    )
  }
  return cache.get(url) as Promise<T>
}

export const loadClause = (clauseId: string) => loadJSON<ClausePayload>(`clauses/${clauseId}.json`)

export interface CorpusBundle {
  summary: CorpusSummary
  timeline: { bands: TimelineBand[] }
  index: SearchEntry[]
  relationTypes: RelationType[]
  sources: SourceWork[]
  /** Null when metrics.json is absent — a local dev build, for instance. */
  metrics: DownloadMetrics | null
}

type Resource<T> = { data: T | null; error: string | null }

export function useCorpus(): Resource<CorpusBundle> {
  const [state, setState] = useState<Resource<CorpusBundle>>({ data: null, error: null })

  useEffect(() => {
    let live = true
    Promise.all([
      loadJSON<CorpusSummary>('corpus_summary.json'),
      loadJSON<{ bands: TimelineBand[] }>('timeline.json'),
      loadJSON<SearchEntry[]>('search_index.json'),
      loadJSON<RelationType[]>('relation_types.json'),
      loadJSON<SourceWork[]>('sources.json'),
      // Download counts are an optional extra: a missing or unreadable
      // metrics.json must never stop the corpus itself from loading.
      loadJSON<DownloadMetrics>('metrics.json').catch(() => null),
    ])
      .then(([summary, timeline, index, relationTypes, sources, metrics]) => {
        if (live) setState({ data: { summary, timeline, index, relationTypes, sources, metrics }, error: null })
      })
      .catch((err: Error) => {
        if (live) setState({ data: null, error: err.message })
      })
    return () => {
      live = false
    }
  }, [])

  return state
}

export function useClause(clauseId: string | null): Resource<ClausePayload> {
  const [state, setState] = useState<Resource<ClausePayload>>({ data: null, error: null })

  useEffect(() => {
    if (!clauseId) return
    let live = true
    loadClause(clauseId)
      .then((payload) => {
        if (live) setState({ data: payload, error: null })
      })
      .catch((err: Error) => {
        if (live) setState({ data: null, error: err.message })
      })
    return () => {
      live = false
    }
  }, [clauseId])

  return state
}

/**
 * Ranked search over the clause index. A bare number matches a canonical clause
 * number exactly and outranks everything else; otherwise the query is matched
 * against clause text, formulae, symptoms, pulse signs, patterns, materia
 * medica, chapter and the commentators aligned to the clause.
 */
export function searchClauses(index: SearchEntry[], rawQuery: string, limit = 120): SearchEntry[] {
  const query = rawQuery.trim()
  if (!query) return index.slice(0, limit)

  const numeric = /^\d+$/.test(query) ? Number(query) : null
  const needle = query.toLowerCase()
  const scored: { entry: SearchEntry; score: number }[] = []

  for (const entry of index) {
    let score = 0
    if (numeric !== null && entry.no === numeric) score += 1000
    if (entry.id.toLowerCase().includes(needle)) score += 60
    if (entry.formulae.some((f) => f.includes(query))) score += 40
    if (entry.commentators.some((c) => c.includes(query))) score += 30
    if (entry.symptoms.some((s) => s.includes(query))) score += 22
    if (entry.pulse.some((p) => p.includes(query))) score += 18
    if (entry.patterns.some((p) => p.includes(query))) score += 18
    if (entry.herbs.some((h) => h.includes(query))) score += 14
    if (entry.six_channel.includes(query)) score += 12
    if (entry.chapter.includes(query)) score += 8
    if (entry.text.includes(query)) score += 6
    if (score > 0) {
      // Prefer canonical clauses, then lower clause numbers, as a stable tiebreak.
      if (entry.no !== null) score += 3
      scored.push({ entry, score })
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const an = a.entry.no ?? Number.MAX_SAFE_INTEGER
    const bn = b.entry.no ?? Number.MAX_SAFE_INTEGER
    return an - bn
  })

  return scored.slice(0, limit).map((s) => s.entry)
}
