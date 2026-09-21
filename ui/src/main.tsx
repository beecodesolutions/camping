import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import App from './App'
import i18n, { i18nReady } from './app/i18n'
import { createAppStore } from './app/store'

async function startApp() {
  await i18nReady
  document.documentElement.lang = i18n.language
  document.title = i18n.t('common.appName')
  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    const { worker } = await import('./mocks/browser')
    await worker.start({
      onUnhandledRequest(request, print) {
        if (new URL(request.url).pathname.startsWith('/api/')) print.error()
      },
    })
  }

  const root = document.getElementById('root')
  if (!root) throw new Error('No se encontró el contenedor de la aplicación')

  createRoot(root).render(
    <StrictMode>
      <Provider store={createAppStore()}>
        <App />
      </Provider>
    </StrictMode>,
  )
}

void startApp().catch((error: unknown) => {
  console.error('No se pudo iniciar la aplicación', error)
  const root = document.getElementById('root')
  if (root) root.textContent = i18n.t('errors.startup')
})
