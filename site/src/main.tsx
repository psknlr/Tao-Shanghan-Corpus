import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { I18nProvider } from './i18n'
import { applyTheme, resolveInitialTheme } from './theme'
import './styles.css'

// Applied before the first render so the canvas-based graph never reads a stale
// palette, and so the page does not flash the light theme for dark-mode readers.
applyTheme(resolveInitialTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)
