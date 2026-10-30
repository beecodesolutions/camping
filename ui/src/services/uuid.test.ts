import { afterEach, describe, expect, it, vi } from 'vitest'
import { createUuid } from './uuid'

describe('createUuid', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('uses getRandomValues when randomUUID is unavailable', () => {
    const bytes = Uint8Array.from([
      0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x06, 0x77, 0x08, 0x99, 0xaa,
      0xbb, 0xcc, 0xdd, 0xee, 0xff,
    ])
    vi.stubGlobal('crypto', {
      getRandomValues: (target: Uint8Array) => {
        target.set(bytes)
        return target
      },
    })

    expect(createUuid()).toBe('00112233-4455-4677-8899-aabbccddeeff')
  })

  it('uses native randomUUID when available', () => {
    const randomUUID = vi.fn(() => 'native-uuid')
    vi.stubGlobal('crypto', { randomUUID })

    expect(createUuid()).toBe('native-uuid')
    expect(randomUUID).toHaveBeenCalledOnce()
  })
})
