import { useLayoutEffect, useSyncExternalStore } from 'react'

const sectionPaths = {
  home: '/hoy',
  stays: '/estadias',
  reservations: '/reservas',
  more: '/mas',
  settings: '/configuracion',
} as const

export type WorkspaceSection = keyof typeof sectionPaths

export function workspaceHref(section: WorkspaceSection) {
  return `#${sectionPaths[section]}`
}

export function workspaceSectionFromHash(hash: string): WorkspaceSection {
  for (const section of Object.keys(sectionPaths) as WorkspaceSection[]) {
    if (workspaceHref(section) === hash) return section
  }
  return 'home'
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function useWorkspaceSection() {
  const section = useSyncExternalStore(
    subscribe,
    () => workspaceSectionFromHash(window.location.hash),
    () => 'home' as const,
  )
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [section])
  return section
}
