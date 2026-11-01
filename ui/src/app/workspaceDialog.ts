import { useSyncExternalStore } from 'react'
import { z } from 'zod'

const dialogSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('check-in') }),
  z.object({ kind: z.literal('reservation-create') }),
  z.object({
    kind: z.literal('stay'),
    id: z.string(),
    action: z.enum(['detail', 'payment', 'close', 'extras']),
  }),
  z.object({ kind: z.literal('reservation-check-in'), id: z.string() }),
  z.object({ kind: z.literal('reservation-detail'), id: z.string() }),
])
type WorkspaceDialog = z.infer<typeof dialogSchema>
const changeEvent = 'camping-dialog-change'

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  window.addEventListener('hashchange', onChange)
  window.addEventListener(changeEvent, onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener('hashchange', onChange)
    window.removeEventListener(changeEvent, onChange)
  }
}

function snapshot() {
  return JSON.stringify(window.history.state?.campingDialog ?? null)
}

export function openWorkspaceDialog(dialog: WorkspaceDialog) {
  window.history.pushState(
    { ...window.history.state, campingDialog: dialog },
    '',
  )
  window.dispatchEvent(new Event(changeEvent))
}

export function replaceWorkspaceDialog(dialog: WorkspaceDialog) {
  window.history.replaceState(
    { ...window.history.state, campingDialog: dialog },
    '',
  )
  window.dispatchEvent(new Event(changeEvent))
}

export function closeWorkspaceDialog() {
  if (window.history.state?.campingDialog) window.history.back()
}

export function useWorkspaceDialog() {
  const value = useSyncExternalStore(subscribe, snapshot, () => 'null')
  const parsed = dialogSchema.safeParse(JSON.parse(value))
  return parsed.success ? parsed.data : null
}
