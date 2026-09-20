import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { CssBaseline, ThemeProvider } from '@mui/material'
import App from './App'
import { createAppStore } from './app/store'
import { theme } from './app/theme'

async function startApp() {
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS === 'true') {
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
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </Provider>
    </StrictMode>,
  )
}

void startApp().catch((error: unknown) => {
  console.error('No se pudo iniciar la aplicación', error)
  const root = document.getElementById('root')
  if (root)
    root.textContent =
      'No se pudo iniciar la aplicación. Recargá la página para reintentar.'
})
