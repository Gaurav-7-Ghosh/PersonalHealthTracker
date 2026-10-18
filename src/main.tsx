import { createRoot } from 'react-dom/client'
import { App } from './App'
import { StoreProvider } from './store'
import type { Route } from './types'
import './styles.css'

// A link shared from the iPhone share sheet arrives as ?url=...&title=...
function initialRoute(): Route {
  try {
    const p = new URLSearchParams(location.search)
    const url = p.get('url') ?? p.get('text') ?? undefined
    if (url) {
      history.replaceState(null, '', location.pathname)
      return { name: 'capture', url, title: p.get('title') ?? undefined }
    }
  } catch {
    /* not available in every viewer */
  }
  return { name: 'today' }
}

createRoot(document.getElementById('root')!).render(
  <StoreProvider initialRoute={initialRoute()}>
    <App />
  </StoreProvider>,
)

if ('serviceWorker' in navigator && location.protocol === 'https:' && import.meta.env.MODE !== 'artifact') {
  navigator.serviceWorker.register('./sw.js').catch(() => {})
}
