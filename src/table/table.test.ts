import { describe, expect, it } from 'vitest'
import { distance, footprint, hexagon, key, rectangle, rotate, toPlane, type Hex } from './hex'
import { reachable, isEngaged } from './movement'
import { makeProjection } from './projection'
import { apply, emptyBoard, replay, type BoardState, type Cell, type Tag, type Unit } from './state'

const unit = (id: string, q: number, r: number, side: 'pc' | 'npc' = 'pc', size = 1, speed = 4): Unit => ({
  id, q, r, side, size, speed, name: id, frameId: 'mf_test', frameName: 'Test',
})

type CellSpec = [number, number, number, ...Tag[]] // q, r, height, tags

const MAP = new Set(hexagon(12).map(key))

const board = (units: Unit[], cells: CellSpec[] = []): BoardState => {
  let s = emptyBoard()
  s = apply(s, {
    type: 'set_cells',
    cells: cells.map(([q, r, h, ...tags]) => ({ q, r, cell: { h, tags } as Cell })),
  })
  for (const u of units) s = apply(s, { type: 'place_unit', unit: u })
  return s
}

const reach = (s: BoardState, id: string, budget: number) => reachable(s, MAP, id, budget)

describe('hex math', () => {
  it('measures distance', () => {
    expect(distance({ q: 0, r: 0 }, { q: 3, r: -1 })).toBe(3)
    expect(distance({ q: -2, r: 2 }, { q: 2, r: -2 })).toBe(4)
  })
  it('builds hexagon and rectangle maps', () => {
    expect(hexagon(9)).toHaveLength(271)
    expect(rectangle(31, 29, 'pointy')).toHaveLength(31 * 29)
    expect(rectangle(10, 8, 'flat')).toHaveLength(80)
  })
  it('lays a pointy rectangle out in straight rows', () => {
    const row3 = rectangle(5, 4, 'pointy').filter((h) => h.r === 3)
    const ys = new Set(row3.map((h) => toPlane(h, 'pointy').y))
    expect(ys.size).toBe(1)
    const xs = row3.map((h) => toPlane(h, 'pointy').x).sort((a, b) => a - b)
    expect(xs[0]).toBeGreaterThan(0) // odd rows shift right
  })
  it('rotates in 60° steps and back', () => {
    const h = { q: 2, r: -1 }
    expect(rotate(h, 6)).toEqual(h)
    expect(rotate(rotate(h, 2), 4)).toEqual(h)
  })
  it('gives Size 1, 2 and 3 footprints of 1, 3 and 7 hexes', () => {
    expect(footprint({ q: 0, r: 0 }, 0.5)).toHaveLength(1)
    expect(footprint({ q: 0, r: 0 }, 2)).toHaveLength(3)
    expect(new Set(footprint({ q: 0, r: 0 }, 3).map(key)).size).toBe(7)
  })
  it('keeps distances when the view rotates', () => {
    const a: Hex = { q: 0, r: 0 }
    const b: Hex = { q: 3, r: -1 }
    for (const angle of [0, 60, 90, 210]) {
      const p = makeProjection('pointy', angle, { x: 0, y: 0 })
      const pa = p.hexCenter(a)
      const pb = p.hexCenter(b)
      // undo the iso squash, then compare with plane distance
      const d = Math.hypot(pb.x - pa.x, (pb.y - pa.y) / 0.56)
      const plane = Math.hypot(toPlane(b, 'pointy').x - toPlane(a, 'pointy').x, toPlane(b, 'pointy').y - toPlane(a, 'pointy').y)
      expect(d).toBeCloseTo(plane, 6)
    }
  })
})

describe('movement on open ground', () => {
  it('reaches every hex within Speed', () => {
    const r = reach(board([unit('a', 0, 0)]), 'a', 4)
    expect(r.cost.size).toBe(hexagon(4).length - 1)
  })
  it('charges 2 for difficult terrain', () => {
    const r = reach(board([unit('a', 0, 0)], [[1, 0, 0, 'difficult']]), 'a', 4)
    expect(r.cost.get('1,0')).toBe(2)
  })
  it('cannot enter impassable hexes', () => {
    const r = reach(board([unit('a', 0, 0)], [[1, 0, 0, 'impassable']]), 'a', 4)
    expect(r.cost.has('1,0')).toBe(false)
  })
})

describe('obstruction and engagement (core p62)', () => {
  // Impassable wall along q=1 except one gap at (1,0)
  const wall: CellSpec[] = [-3, -2, -1, 1, 2, 3].map((r) => [1, r, 0, 'impassable'])
  it('moves through allies but never stops on them', () => {
    const r = reach(board([unit('a', 0, 0), unit('b', 1, 0)], wall), 'a', 3)
    expect(r.cost.has('2,0')).toBe(true)
    expect(r.cost.has('1,0')).toBe(false)
  })
  it('is blocked by hostiles of equal or greater Size', () => {
    const r = reach(board([unit('a', 0, 0), unit('x', 1, 0, 'npc')], wall), 'a', 3)
    expect(r.cost.has('2,0')).toBe(false)
  })
  it('can pass through smaller hostiles but not stop on them', () => {
    const r = reach(board([unit('big', 0, 0, 'pc', 2, 4), unit('pilot', 2, -1, 'npc', 0.5)]), 'big', 4)
    expect(r.cost.has('2,-1')).toBe(false)
    expect(r.cost.has('3,-1')).toBe(true)
  })
  it('stops when it becomes engaged by an equal or larger hostile', () => {
    const r = reach(board([unit('a', 0, 0), unit('x', 3, 0, 'npc')]), 'a', 4)
    expect(r.cost.has('2,0')).toBe(true)
    expect(r.cost.has('2,1')).toBe(true)
    expect(r.cost.has('3,1')).toBe(false)
  })
  it('is not stopped by a smaller hostile', () => {
    const r = reach(board([unit('big', 0, 0, 'pc', 2, 5), unit('x', 3, 0, 'npc', 1)]), 'big', 5)
    expect(r.cost.has('5,-1')).toBe(true)
  })
  it('keeps moving if it started engaged with that hostile', () => {
    const r = reach(board([unit('a', 0, 0), unit('x', 1, 0, 'npc')]), 'a', 3)
    expect(r.cost.has('2,1')).toBe(true)
  })
})

describe('height', () => {
  it('climbs at half speed: +2 per level', () => {
    const r = reach(board([unit('a', 0, 0)], [[1, 0, 2]]), 'a', 6)
    expect(r.cost.get('1,0')).toBe(5) // 1 step + 2 levels × 2
  })
  it('steps down for free', () => {
    const r = reach(board([unit('a', 0, 0)], [[0, 0, 2]]), 'a', 4)
    expect(r.cost.get('1,0')).toBe(1)
  })
  it('lets big mechs step over smaller objects', () => {
    const r = reach(board([unit('big', 0, 0, 'pc', 2, 4)], [[2, -1, 1]]), 'big', 4)
    expect(r.cost.get('2,-1')).toBe(2)
  })
  it('takes ramps up one level at no extra cost', () => {
    const r = reach(board([unit('a', 0, 0)], [[1, 0, 1, 'ramp'], [2, 0, 2]]), 'a', 4)
    expect(r.cost.get('1,0')).toBe(1)
    expect(r.cost.get('2,0')).toBe(2)
  })
  it('flags drops of 3 or more', () => {
    const roof: CellSpec[] = [[0, 0, 6], [1, 0, 6]]
    const r = reach(board([unit('a', 0, 0)], roof), 'a', 4)
    expect(r.drops.has('2,0')).toBe(true)
    expect(r.drops.has('1,0')).toBe(false)
  })
  it("isn't engaged by a hostile far below it", () => {
    const s = board([unit('a', 0, 0), unit('x', 1, 0, 'npc')], [[0, 0, 6]])
    expect(isEngaged(s, 'a')).toBe(false)
    const level = board([unit('a', 0, 0), unit('x', 1, 0, 'npc')], [[0, 0, 1]])
    expect(isEngaged(level, 'a')).toBe(true) // one level up still touches
  })
})

describe('events', () => {
  it('replays to the same board', () => {
    const s = replay([
      { type: 'place_unit', unit: unit('a', 0, 0) },
      { type: 'move', unitId: 'a', to: { q: 2, r: -1 } },
      { type: 'set_cells', cells: [{ q: 1, r: 1, cell: { h: 2, tags: ['ramp'] } }] },
      { type: 'set_zone', zone: 'objective', on: true, cells: [{ q: 0, r: 0 }] },
    ])
    expect(s.units[0]).toMatchObject({ q: 2, r: -1 })
    expect(s.cells.get('1,1')).toEqual({ h: 2, tags: ['ramp'] })
    expect(s.zones.objective.has('0,0')).toBe(true)
  })
  it('clears a cell back to open ground', () => {
    const s = replay([
      { type: 'set_cells', cells: [{ q: 1, r: 1, cell: { h: 2, tags: [] } }] },
      { type: 'set_cells', cells: [{ q: 1, r: 1, cell: { h: 0, tags: [] } }] },
    ])
    expect(s.cells.size).toBe(0)
  })
})
