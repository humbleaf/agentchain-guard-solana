import { describe, it, expect } from 'vitest'
import { canonicalize } from './canonical.js'

describe('canonicalize', () => {
  it('should recursively sort object keys', () => {
    const input = {
      z: 1,
      a: {
        y: 2,
        b: 3
      },
      m: [1, 2, 3]
    }
    
    const output = canonicalize(input)
    const keys = Object.keys(JSON.parse(output))
    
    expect(keys).toEqual(['a', 'm', 'z'])
    expect(Object.keys(JSON.parse(output).a)).toEqual(['b', 'y'])
  })

  it('should handle arrays correctly', () => {
    const input = {
      items: [
        { id: 2, val: 'b' },
        { id: 1, val: 'a' }
      ]
    }
    
    const output = canonicalize(input)
    const parsed = JSON.parse(output)
    
    // Keys inside array objects should be sorted
    expect(Object.keys(parsed.items[0])).toEqual(['id', 'val'])
    // Array order itself should be preserved
    expect(parsed.items[0].id).toBe(2)
  })

  it('should be idempotent', () => {
    const input = { b: 2, a: 1, c: { e: 5, d: 4 } }
    const out1 = canonicalize(input)
    const out2 = canonicalize(JSON.parse(out1))
    expect(out1).toBe(out2)
  })
})
