import { describe, expect, it } from 'vitest'
import { distance, footprint, hexagon, key, rotate } from './hex'
import { reachable, isEngaged } from './movement'
import { apply, emptyBoard, replay, type BoardState, type Unit } from './state'

const unit = (id: string, q: number, r: number, side: 'pc' | 'npc' = 'pc', size = 1, speed = 4): Unit => ({
  id, q, r, side, size, speed, name: id, frameId: 'mf_test', frameName: 'Test',
})

const board = (units: Unit[], terrain: [number, number, 'blocking' | 'difficult' | 'cover_hard'][] = []): BoardState => {
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
  // Wall of blocking terrain along q=1 except one gap at (1,0)
  const wall = [-3, -2, -1, 1, 2, 3].map((r) => [1, r, 'blocking'] as [number, number, 'blocking'])
  it('moves through allies but never stops on them', () => {
    const withAlly = reachable(board([unit('a', 0, 0), unit('b', 1, 0)], wall), 'a', 3)
    expect(withAlly.cost.has('2,0')).toBe(true)
    expect(withAlly.cost.has('1,0')).toBe(false)
  })
  it('is blocked by hostiles of equal or greater Size', () => {
    const r = reachable(board([unit('a', 0, 0), unit('x', 1, 0, 'npc')], wall), 'a', 3)
    expect(r.cost.has('2,0')).toBe(false)
  })
  it('can pass through smaller hostiles but not stop on them', () => {
    const s = board([unit('big', 0, 0, 'pc', 2, 4), unit('pilot', 2, -1, 'npc', 0.5)])
    const r = reachable(s, 'big', 4)
    expect(r.cost.has('2,-1')).toBe(false) // can't end on the pilot
    expect(r.cost.has('3,-1')).toBe(true) // but can get past it
  })
  it('stops when it becomes engaged by an equal or larger hostile', () => {
    const r = reachable(board([unit('a', 0, 0), unit('x', 3, 0, 'npc')]), 'a', 4)
    expect(r.cost.has('2,0')).toBe(true) // engaging hex is reachable...
    expect(r.cost.has('2,1')).toBe(true)
    expect(r.cost.has('3,1')).toBe(false) // ...but you can't walk along the enemy's side
  })
  it('is not stopped by a smaller hostile', () => {
    const r = reachable(board([unit('big', 0, 0, 'pc', 2, 5), unit('x', 3, 0, 'npc', 1)]), 'big', 5)
    expect(r.cost.has('5,-1')).toBe(true) // past the Size 1 hostile; a Size 2 hostile would stop it
  })
  it('keeps moving if it started engaged with that hostile', () => {
    const r = reachable(board([unit('a', 0, 0), unit('x', 1, 0, 'npc')]), 'a', 3)
    expect(r.cost.has('1,1')).toBe(true)
    expect(r.cost.has('2,1')).toBe(true)
  })
  it('treats hard cover as a Size 1 object', () => {
    const cover: [number, number, 'cover_hard'][] = [[1, 0, 'cover_hard']]
    const small = reachable(board([unit('a', 0, 0)], cover), 'a', 4)
    expect(small.cost.has('1,0')).toBe(false)
    const big = reachable(board([unit('big', -1, 0, 'pc', 3, 4)], cover), 'big', 4)
    // a Size 3 can step over it, but never end on it
    expect([...big.cost.keys()].some((k) => k.startsWith('2,'))).toBe(true)
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
