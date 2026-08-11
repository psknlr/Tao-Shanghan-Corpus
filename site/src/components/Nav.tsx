import { useI18n, type Lang } from '../i18n'
import { REPO_URL } from '../config'

const LINKS: { href: string; key: Parameters<ReturnType<typeof useI18n>['t']>[0] }[] = [
  { href: '#glance', key: 'nav.explore' },
  { href: '#timeline', key: 'nav.sources' },
  { href: '#clauses', key: 'nav.clauses' },
  { href: '#commentary', key: 'nav.commentary' },
  { href: '#variants', key: 'nav.variants' },
  { href: '#graph', key: 'nav.graph' },
  { href: '#provenance', key: 'nav.provenance' },
  { href: '#quality', key: 'nav.quality' },
]

export function Nav({ theme, onTheme }: { theme: 'light' | 'dark'; onTheme: () => void }) {
  const { t, lang, setLang } = useI18n()

  return (
    <nav className="nav">
      <div className="wrap nav__inner">
        <a className="nav__brand" href="#top">
          <span className="nav__seal" aria-hidden>
            傷
          </span>
          <span className="nav__title">Historical Shanghan Corpus</span>
        </a>

        <div className="nav__links">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {t(link.key)}
            </a>
          ))}
          <a href={REPO_URL} target="_blank" rel="noreferrer">
            {t('nav.github')} ↗
          </a>
        </div>

        <div className="nav__tools">
          <div className="lang-toggle" role="group" aria-label="Interface language">
            {(['en', 'zh'] as Lang[]).map((code) => (
              <button
                key={code}
                type="button"
                data-on={lang === code}
                aria-pressed={lang === code}
                onClick={() => setLang(code)}
              >
                {code === 'en' ? 'EN' : '中文'}
              </button>
            ))}
          </div>
          <button className="icon-btn" type="button" onClick={onTheme} title={t('nav.theme')} aria-label={t('nav.theme')}>
            {theme === 'light' ? '◐' : '◑'}
          </button>
        </div>
      </div>
    </nav>
  )
}
