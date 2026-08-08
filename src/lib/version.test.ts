import { describe, expect, it } from 'vitest'
import { APP_NAME } from './version'

describe('harness', () => {
  it('resolves the @ alias and imports source', () => {
    expect(APP_NAME).toBe('TP Drills')
  })
})
