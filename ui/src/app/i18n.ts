import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from '../locales/es'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: typeof es }
  }
}

export const i18nReady = i18n.use(initReactI18next).init({
  resources: { es: { translation: es } },
  lng: 'es-CL',
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
})

export default i18n
