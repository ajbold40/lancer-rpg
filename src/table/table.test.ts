import { describe, expect, it } from 'vitest'
import { distance, footprint, hexagon, key, rotate } from './hex'
import { reachable, isEngaged } from './movement'
import { apply, emptyBoard, replay, type BoardState, type Unit } from './state'

const unit = (id: string, q: number, r: number, side: 'pc' | 'npc' = 'pc', size = 1, speed = 4): Unit => ({
  id, q, r, side, size, speed, name: id, frameId: 'mf_test', frameName: 'Test',
})

const board = (units: Unit[], terrain: [number, number, 'blocking' | 'difficult'][] = []): BoardState => {
  let s = emptyBoard()
  s = apply(s, { type: 'set_terrain', cells: terrain.map(([q, r, kind]) => ({ q, r, kind })) })
  for (const u of units) s = apply(s, { type: 'place_unit', unit: u })
  return s
}

describe('hex math', () => {
  it('measures distance', () => {
    expect(distance({ q: 0, r: 0 }, { q: 3, r: -1 })).toBe(3)
    expect(distance({ q: -2, r: 2 }, { q: 2, r: -2 })).toBe(4)
  })
  it('builds a hexagon map', () => {
    expect(hexagon(9)).toHaveLength(271)
  })
  it('rotates in 60° steps and back', () => {
    const h = { q: 2, r: -1 }
    expect(rotate(h, 6)).toEqual(h)
    expect(distance(rotate(h, 1), { q: 0, r: 0 })).toBe(distance(h, { q: 0, r: 0 }))
    expect(rotate(rotate(h, 2), 4)).toEqual(h)
  })
  it('gives Size 1, 2 and 3 footprints of 1, 3 and 7 hexes', () => {
    expect(footprint({ q: 0, r: 0 }, 0.5)).toHaveLength(1)
    expect(footprint({ q: 0, r: 0 }, 2)).toHaveLength(3)
    expect(new Set(footprint({ q: 0, r: 0 }, 3).map(key)).size).toBe(7)
  })
})

describe('movement', () => {
  it('reaches every hex within Speed on open ground', () => {
    const r = reachable(board([unit('a', 0, 0)]), 'a', 4)
    expect(r.cost.size).toBe(hexagon(4).length - 1)
  })
  it('charges 2 for difficult terrain', () => {
    const r = reachable(board([unit('a', 0, 0)], [[1, 0, 'difficult']]), 'a', 4)
    expect(r.cost.get('1,0')).toBe(2)
  })
  it('cannot enter blocking terrain', () => {
    const r = reachable(board([unit('a', 0, 0)], [[1, 0, 'blocking']]), 'a', 4)
    expect(r.cost.has('1,0')).toBe(false)
  })
  it('moves through allies but not hostiles, and never stops on anyone', () => {
    // Wall of blocking terrain except one gap at (1,0)
    const wall = [-1, 0, 1, 2].flatMap((r) => (r === 0 ? [] : [[1, r, 'blocking'] as [number, number, 'blocking']]))
    const withAlly = reachable(board([unit('a', 0, 0), unit('b', 1, 0)], wall), 'a', 3)
    expect(withAlly.cost.has('2,0')).toBe(true)
    expect(withAlly.cost.has('1,0')).toBe(false)
    const withFoe = reachable(board([unit('a', 0, 0), unit('x', 1, 0, 'npc')], wall), 'a', 2)
    expect(withFoe.cost.has('2,0')).toBe(false)
  })
  it('flags hexes next to hostiles as engaging', () => {
    const s = board([unit('a', 0, 0), unit('x', 3, 0, 'npc')])
    const r = reachable(s, 'a', 4)
    expect(r.engaged.has('2,0')).toBe(true)
    expect(r.engaged.has('-1,0')).toBe(false)
    expect(isEngaged(s, 'a')).toBe(false)
  })
  it('keeps a Size 2 footprint off blocking terrain', () => {
    const s = board([unit('big', 0, 0, 'pc', 2)], [[1, 1, 'blocking']])
    const r = reachable(s, 'big', 2)
    // anchoring at (1,0) would put a footprint hex on (1,1)
    expect(r.cost.has('1,0')).toBe(false)
  })
})

describe('events', () => {
  it('replays to the same board', () => {
    const events = [
      { type: 'place_unit' as const, unit: unit('a', 0, 0) },
      { type: 'move' as const, unitId: 'a', to: { q: 2, r: -1 } },
    ]
    const s = replay(events)
    expect(s.units[0]).toMatchObject({ q: 2, r: -1 })
  })
})
