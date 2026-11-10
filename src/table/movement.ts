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

/** Hexes adjacent to a unit's footprint. */
function ring(u: Unit): Set<string> {
  const zone = new Set<string>()
  for (const h of footprint(u, u.size)) for (const n of neighbors(h)) zone.add(key(n))
  return zone
}

/** Hexes adjacent to any hostile unit's footprint. */
function threatZone(state: BoardState, mover: Unit): Set<string> {
  const zone = new Set<string>()
  for (const u of state.units) {
    if (u.id === mover.id || !hostile(mover, u)) continue
    for (const k of ring(u)) zone.add(k)
  }
  return zone
}

/**
 * Hard cover is treated as a Size 1 solid object (a wall, a wreck, a building corner).
 * Core rules: characters are obstructed by solid objects and characters the same SIZE or larger,
 * can pass through smaller ones, and can never end a move in an occupied space.
 */
export const HARD_COVER_SIZE = 1

/**
 * Where a unit can move with `budget` spaces (assist mode: nothing here blocks the GM).
 * Core rules, Section 3 (Movement):
 * - Difficult terrain costs 2 per space entered. Blocking terrain and off-map hexes are impassable.
 * - Obstruction is by SIZE: hostiles and hard cover the same SIZE or larger block; smaller ones
 *   can be passed through. Allies never obstruct. Nobody can end a move in an occupied space.
 * - Becoming ENGAGED by a hostile of equal or greater SIZE ends the move immediately.
 *   Hostiles the unit was already engaged with at the start don't stop it.
 */
export function reachable(state: BoardState, unitId: string, budget: number): Reach {
  const unit = state.units.find((u) => u.id === unitId)
  const cost = new Map<string, number>()
  const engaged = new Set<string>()
  if (!unit) return { cost, engaged }

  const occ = occupancy(state)
  const byId = new Map(state.units.map((u) => [u.id, u]))
  const zone = threatZone(state, unit)

  const startHexes = footprint(unit, unit.size).map(key)
  const hostiles = state.units.filter((u) => u.id !== unit.id && hostile(unit, u))
  // Hostiles big enough to stop this unit by engaging it, minus any it's already engaged with.
  const stoppers = hostiles
    .filter((h) => h.size >= unit.size)
    .map((h) => ring(h))
    .filter((zoneOf) => !startHexes.some((k) => zoneOf.has(k)))

  const passable = (anchor: Hex): boolean =>
    footprint(anchor, unit.size).every((h) => {
      const k = key(h)
      if (!state.map.has(k)) return false
      const t = state.terrain.get(k)
      if (t === 'blocking') return false
      if (t === 'cover_hard' && HARD_COVER_SIZE >= unit.size) return false
      const who = occ.get(k)
      if (!who || who === unit.id) return true
      const other = byId.get(who)!
      return !hostile(unit, other) || other.size < unit.size
    })

  const canStop = (anchor: Hex): boolean =>
    footprint(anchor, unit.size).every((h) => {
      const k = key(h)
      const who = occ.get(k)
      return (!who || who === unit.id) && state.terrain.get(k) !== 'cover_hard'
    })

  /** Would arriving here newly engage a hostile of equal or greater SIZE? Then the move ends here. */
  const stopsHere = (anchor: Hex): boolean => {
    const fp = footprint(anchor, unit.size).map(key)
    return stoppers.some((zoneOf) => fp.some((k) => zoneOf.has(k)))
  }

  const stepCost = (anchor: Hex): number =>
    footprint(anchor, unit.size).some((h) => state.terrain.get(key(h)) === 'difficult') ? 2 : 1

  // Dijkstra over anchor positions; costs are small integers so a sorted frontier is fine.
  const best = new Map<string, number>([[key(unit), 0]])
  const frontier: [Hex, number][] = [[{ q: unit.q, r: unit.r }, 0]]
  while (frontier.length) {
    frontier.sort((a, b) => a[1] - b[1])
    const [at, spent] = frontier.shift()!
    if (spent > (best.get(key(at)) ?? Infinity)) continue
    if (spent > 0 && stopsHere(at)) continue // engagement ends the move here
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
