import { footprint, key, neighbors, type Hex } from './hex'
import type { BoardState, Unit } from './state'

export interface Reach {
  /** Movement cost to reach each anchor hex. */
  cost: Map<string, number>
  /** Anchor hexes where the unit would end up engaged (adjacent to a hostile). */
  engaged: Set<string>
}

/** Every hex covered by a unit's footprint, keyed to the unit's id. */
export function occupancy(state: BoardState): Map<string, string> {
  const occ = new Map<string, string>()
  for (const u of state.units) for (const h of footprint(u, u.size)) occ.set(key(h), u.id)
  return occ
}

const hostile = (a: Unit, b: Unit) => a.side !== b.side

/** Hexes adjacent to any hostile unit's footprint. */
function threatZone(state: BoardState, mover: Unit): Set<string> {
  const zone = new Set<string>()
  for (const u of state.units) {
    if (u.id === mover.id || !hostile(mover, u)) continue
    for (const h of footprint(u, u.size)) for (const n of neighbors(h)) zone.add(key(n))
  }
  return zone
}

/**
 * Where a unit can move with `budget` spaces (assist mode: nothing here blocks the GM).
 * - Difficult terrain costs 2 per hex entered; blocking terrain and off-map hexes are impassable.
 * - Allies can be moved through but not stopped on; hostiles block.
 */
export function reachable(state: BoardState, unitId: string, budget: number): Reach {
  const unit = state.units.find((u) => u.id === unitId)
  const cost = new Map<string, number>()
  const engaged = new Set<string>()
  if (!unit) return { cost, engaged }

  const occ = occupancy(state)
  const byId = new Map(state.units.map((u) => [u.id, u]))
  const zone = threatZone(state, unit)

  const passable = (anchor: Hex): boolean =>
    footprint(anchor, unit.size).every((h) => {
      const k = key(h)
      if (!state.map.has(k)) return false
      if (state.terrain.get(k) === 'blocking') return false
      const who = occ.get(k)
      return !who || who === unit.id || !hostile(unit, byId.get(who)!)
    })

  const canStop = (anchor: Hex): boolean =>
    footprint(anchor, unit.size).every((h) => {
      const who = occ.get(key(h))
      return !who || who === unit.id
    })

  const stepCost = (anchor: Hex): number =>
    footprint(anchor, unit.size).some((h) => state.terrain.get(key(h)) === 'difficult') ? 2 : 1

  // Dijkstra over anchor positions; costs are small integers so a sorted frontier is fine.
  const best = new Map<string, number>([[key(unit), 0]])
  const frontier: [Hex, number][] = [[{ q: unit.q, r: unit.r }, 0]]
  while (frontier.length) {
    frontier.sort((a, b) => a[1] - b[1])
    const [at, spent] = frontier.shift()!
    if (spent > (best.get(key(at)) ?? Infinity)) continue
    for (const n of neighbors(at)) {
      if (!passable(n)) continue
      const c = spent + stepCost(n)
      if (c > budget || c >= (best.get(key(n)) ?? Infinity)) continue
      best.set(key(n), c)
      frontier.push([n, c])
    }
  }

  for (const [k, c] of best) {
    if (k === key(unit)) continue
    const [q, r] = k.split(',').map(Number)
    const anchor = { q, r }
    if (!canStop(anchor)) continue
    cost.set(k, c)
    if (footprint(anchor, unit.size).some((h) => zone.has(key(h)))) engaged.add(k)
  }
  return { cost, engaged }
}

/** Is this unit currently adjacent to a hostile? */
export function isEngaged(state: BoardState, unitId: string): boolean {
  const unit = state.units.find((u) => u.id === unitId)
  if (!unit) return false
  const zone = threatZone(state, unit)
  return footprint(unit, unit.size).some((h) => zone.has(key(h)))
}
