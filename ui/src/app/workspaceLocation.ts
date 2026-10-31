import { useLayoutEffect, useSyncExternalStore, type MouseEvent } from 'react'
import { scrollWorkspaceToTop } from './workspaceScroll'

const sectionPaths = {
  home: '/hoy',
  stays: '/estadias',
  reservations: '/reservas',
  settings: '/configuracion',
} as const

export type WorkspaceSection = keyof typeof sectionPaths

export function workspaceHref(section: WorkspaceSection) {
  return sectionPaths[section]
}

export function workspaceSectionFromPath(pathname: string): WorkspaceSection {
  const path = pathname.replace(/\/$/, '')
  if (path === '/mas') return 'settings'
  for (const section of Object.keys(sectionPaths) as WorkspaceSection[]) {
    if (workspaceHref(section) === path) return section
  }
  return 'home'
}

export function migrateWorkspaceHash() {
  if (!window.location.hash.startsWith('#/')) return
  const section = workspaceSectionFromPath(window.location.hash.slice(1))
  window.history.replaceState(
    window.history.state,
    '',
    `${workspaceHref(section)}${window.location.search}`,
  )
}

export function navigateWorkspace(event: MouseEvent<HTMLAnchorElement>) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.currentTarget.target === '_blank' ||
    event.currentTarget.hasAttribute('download')
  )
    return
  event.preventDefault()
  const target = new URL(event.currentTarget.href)
  if (target.pathname !== window.location.pathname) {
    window.history.pushState(null, '', target.pathname + target.search)
    window.dispatchEvent(new Event('popstate'))
  }
  scrollWorkspaceToTop()
}

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  return () => window.removeEventListener('popstate', onChange)
}

export function useWorkspaceSection() {
  const section = useSyncExternalStore(
    subscribe,
    () => workspaceSectionFromPath(window.location.pathname),
    () => 'home' as const,
  )
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [section])
  return section
}
