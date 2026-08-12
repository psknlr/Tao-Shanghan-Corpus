import type { ReactNode } from 'react'
import { useI18n } from '../i18n'
import type { ClausePayload } from '../types'
import { SectionHead } from './ui'
import { REPO_URL, REPO_BRANCH } from '../config'

const CHECK_LABEL: Record<string, 'pv.check.utf8' | 'pv.check.sha256' | 'pv.check.source_resolved' | 'pv.check.no_orphan_edges'> = {
  utf8: 'pv.check.utf8',
  sha256: 'pv.check.sha256',
  source_resolved: 'pv.check.source_resolved',
  no_orphan_edges: 'pv.check.no_orphan_edges',
}

function Step({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="trace__step">
      <div className="trace__rail">
        <span className="trace__node" aria-hidden />
        <span className="trace__line" aria-hidden />
      </div>
      <div className="trace__body">
        <div className="trace__label">{label}</div>
        {children}
      </div>
    </div>
  )
}

export function ProvenanceTrace({ payload }: { payload: ClausePayload }) {
  const { t, v, n } = useI18n()
  const { provenance: chain, clause } = payload
  const primaryFile = chain.files[0]

  return (
    <section className="section" id="provenance">
      <div className="wrap">
        <SectionHead no="08" title={t('pv.title')} sub={t('pv.sub')} />

        <div className="trace">
          <Step label={t('pv.step.record')}>
            <div className="trace__value mono">{chain.record.id}</div>
            <div className="trace__note">
              {v(clause.text_type)} · {t('pv.resolution')}: {v(chain.record.source_resolution)}
            </div>
          </Step>

          <Step label={t('pv.step.work')}>
            <div className="trace__value">
              {chain.work.title_zh} <span className="mono muted">{chain.work.source_id}</span>
            </div>
            <div className="trace__note">
              {chain.work.author} · {v(chain.work.dynasty)} · {n(chain.work.characters)} {t('tl.chars')} ·{' '}
              {n(chain.work.n_files)} {t('tl.field.files')} · {v(chain.work.witness_status)}
            </div>
          </Step>

          <Step label={t('pv.step.file')}>
            {primaryFile ? (
              <>
                <a
                  className="trace__value mono"
                  href={`${REPO_URL}/blob/${REPO_BRANCH}/${primaryFile.relative_path}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: 'none', borderBottom: '1px solid var(--rule)' }}
                >
                  {primaryFile.relative_path}
                </a>
                <div className="trace__note">
                  {n(primaryFile.bytes)} bytes · {n(primaryFile.characters)} {t('tl.chars')}
                  {chain.files_total > 1 && (
                    <>
                      {' '}
                      · +{n(chain.files_total - 1)} {t('pv.more_files')}
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="trace__value mono">—</div>
            )}
          </Step>

          <Step label={t('pv.step.hash')}>
            <div className="trace__value mono" style={{ wordBreak: 'break-all' }}>
              {chain.record.sha256 || primaryFile?.sha256 || '—'}
            </div>
            <div className="checks">
              {chain.checks.map((check) => (
                <div className="check" key={check.key}>
                  <span className="check__mark" style={{ color: check.ok ? 'var(--jade)' : 'var(--cinnabar)' }}>
                    {check.ok ? '✓' : '✗'}
                  </span>
                  {t(CHECK_LABEL[check.key] ?? 'pv.check.sha256')}
                </div>
              ))}
            </div>
          </Step>

          <Step label={t('pv.step.repo')}>
            <div className="trace__value">{chain.repository.name}</div>
            <div className="trace__note">
              <a href={chain.repository.url} target="_blank" rel="noreferrer">
                {chain.repository.url}
              </a>
              <br />
              <span className="mono">{chain.repository.upstream_path}</span>
              <br />
              {t('pv.licence')}: <span className="pending">{v(chain.repository.licence_status)}</span>
            </div>
          </Step>
        </div>
      </div>
    </section>
  )
}
