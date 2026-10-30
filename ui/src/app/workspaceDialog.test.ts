import { afterEach, expect, it, vi } from 'vitest'
import { closeWorkspaceDialog, openWorkspaceDialog } from './workspaceDialog'

afterEach(() => vi.unstubAllGlobals())

it('opens a dialog without changing the route or losing existing history state', () => {
  const pushState = vi.fn()
  const dispatchEvent = vi.fn()
  vi.stubGlobal('window', {
    history: { state: { position: 200 }, pushState },
    dispatchEvent,
  })
  openWorkspaceDialog({ kind: 'stay', id: 'stay-1', action: 'payment' })
  expect(pushState).toHaveBeenCalledWith(
    {
      position: 200,
      campingDialog: { kind: 'stay', id: 'stay-1', action: 'payment' },
    },
    '',
  )
  expect(dispatchEvent.mock.calls[0]?.[0].type).toBe('camping-dialog-change')
})

it('closes the dialog using its history entry so Back keeps the underlying page', () => {
  const back = vi.fn()
  vi.stubGlobal('window', {
    history: { state: { campingDialog: { kind: 'check-in' } }, back },
  })
  closeWorkspaceDialog()
  expect(back).toHaveBeenCalledOnce()
})

it('does not leave the page when no dialog is open', () => {
  const back = vi.fn()
  vi.stubGlobal('window', { history: { state: null, back } })
  closeWorkspaceDialog()
  expect(back).not.toHaveBeenCalled()
})
