import { footprint, key, neighbors, type Hex } from './hex'
import { hasTag, levelAt, type BoardState, type Unit } from './state'

export interface Reach {
  /** Movement cost to reach each anchor hex. */
  cost: Map<string, number>
  /** Anchor hexes where the unit would end up engaged (adjacent to a hostile). */
  engaged: Set<string>
  /** Anchor hexes 3 or more levels below where the unit started: a fall if it just steps off. */
  drops: Set<string>
}

/** Every hex covered by a unit's footprint, keyed to the unit's id. */
export function occupancy(state: BoardState): Map<string, string> {
  const occ = new Map<string, string>()
  for (const u of state.units) for (const h of footprint(u, u.size)) occ.set(key(h), u.id)
  return occ
}

const hostile = (a: Unit, b: Unit) => a.side !== b.side

/** Anything under SIZE 1 rounds up when measuring (core p59). */
const height = (size: number) => Math.max(1, size)

/** Hexes adjacent to a unit's footprint. */
function ring(u: Unit): Set<string> {
  const zone = new Set<string>()
  for (const h of footprint(u, u.size)) for (const n of neighbors(h)) zone.add(key(n))
  return zone
}

interface Threat {
  unit: Unit
  ring: Set<string>
  level: number
}

/**
 * Adjacency is within one space in any direction, vertical included (core p62).
 * Two units on neighbouring hexes are adjacent if their vertical extents touch or overlap.
 */
function touches(t: Threat, fp: string[], level: number, size: number): boolean {
  if (!fp.some((k) => t.ring.has(k))) return false
  const top = Math.min(level + height(size), t.level + height(t.unit.size))
  return Math.max(level, t.level) <= top
}

function threats(state: BoardState, mover: Unit): Threat[] {
  return state.units
    .filter((u) => u.id !== mover.id && hostile(mover, u))
    .map((u) => ({ unit: u, ring: ring(u), level: levelAt(state, u, u.size) }))
}

/** How many levels you can step up without climbing. Smaller objects are stepped over. */
const stepUp = (size: number) => (size >= 2 ? size - 1 : 0)

/**
 * Where a unit can move with `budget` spaces (assist mode: nothing here blocks the GM).
 *
 * Core rules, Section 3 (Movement):
 * - Difficult terrain costs 2 per space entered. Impassable hexes and off-map hexes can't be entered.
 * - Hostiles the same SIZE or larger obstruct; smaller ones can be passed through. Allies never
 *   obstruct. Nobody can end a move in a space another character occupies.
 * - Becoming ENGAGED by a hostile of equal or greater SIZE ends the move immediately.
 *   Hostiles the unit was already engaged with at the start don't stop it.
 *
 * Height (our reading, GM can override with a free move):
 * - Terrain height is a surface: units stand on top of whatever is under them.
 * - Stepping down is free. Stepping up onto anything smaller than the unit is a normal step.
 * - Anything taller is climbed at half speed: +2 per level climbed (core p63, Climbing).
 * - Ramps: up one level at no extra cost.
 */
export function reachable(state: BoardState, map: Set<string>, unitId: string, budget: number): Reach {
  const unit = state.units.find((u) => u.id === unitId)
  const cost = new Map<string, number>()
  const engaged = new Set<string>()
  const drops = new Set<string>()
  if (!unit) return { cost, engaged, drops }

  const occ = occupancy(state)
  const byId = new Map(state.units.map((u) => [u.id, u]))
  const all = threats(state, unit)

  const startLevel = levelAt(state, unit, unit.size)
  const startFp = footprint(unit, unit.size).map(key)
  // Hostiles big enough to stop this unit by engaging it, minus any it's already engaged with.
  const stoppers = all.filter((t) => t.unit.size >= unit.size && !touches(t, startFp, startLevel, unit.size))

  const fpKeys = (anchor: Hex) => footprint(anchor, unit.size).map(key)

  const passable = (anchor: Hex): boolean =>
    fpKeys(anchor).every((k) => {
      if (!map.has(k) || hasTag(state, k, 'impassable')) return false
      const who = occ.get(k)
      if (!who || who === unit.id) return true
      const other = byId.get(who)!
      return !hostile(unit, other) || other.size < unit.size
    })

  const canStop = (anchor: Hex): boolean =>
    fpKeys(anchor).every((k) => {
      const who = occ.get(k)
      return !who || who === unit.id
    })

  const stopsHere = (anchor: Hex): boolean => {
    const fp = fpKeys(anchor)
    const level = levelAt(state, anchor, unit.size)
    return stoppers.some((t) => touches(t, fp, level, unit.size))
  }

  const stepCost = (from: Hex, to: Hex): number => {
    const fromLevel = levelAt(state, from, unit.size)
    const toLevel = levelAt(state, to, unit.size)
    const toFp = fpKeys(to)
    const base = toFp.some((k) => hasTag(state, k, 'difficult')) ? 2 : 1
    const rise = toLevel - fromLevel
    if (rise <= stepUp(unit.size)) return base
    const ramp = [...toFp, ...fpKeys(from)].some((k) => hasTag(state, k, 'ramp'))
    if (ramp && rise <= 1) return base
    return base + 2 * rise
  }

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
      const c = spent + stepCost(at, n)
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
    const fp = fpKeys(anchor)
    const level = levelAt(state, anchor, unit.size)
    if (all.some((t) => touches(t, fp, level, unit.size))) engaged.add(k)
    if (startLevel - level >= 3) drops.add(k)
  }
  return { cost, engaged, drops }
}

/** Is this unit currently adjacent to a hostile? */
export function isEngaged(state: BoardState, unitId: string): boolean {
  const unit = state.units.find((u) => u.id === unitId)
  if (!unit) return false
  const fp = footprint(unit, unit.size).map(key)
  const level = levelAt(state, unit, unit.size)
  return threats(state, unit).some((t) => touches(t, fp, level, unit.size))
}
