export type Theme = 'light' | 'dark'

/**
 * The theme attribute is applied to <html> outside React's effect cycle.
 *
 * The relation graph paints to a canvas and therefore has to resolve the CSS
 * custom properties itself. React runs child effects before parent effects, so
 * if the attribute were set from an effect in App the graph would read the
 * previous theme's tokens on every switch. Applying it eagerly — at module load
 * and again synchronously in the toggle handler — keeps the DOM authoritative
 * before any component reads computed styles.
 */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem('shc-theme', theme)
  } catch {
    // Private-mode storage failures are not worth surfacing.
  }
}

export function resolveInitialTheme(): Theme {
  let stored: string | null = null
  try {
    stored = localStorage.getItem('shc-theme')
  } catch {
    stored = null
  }
  if (stored === 'light' || stored === 'dark') return stored
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}
