import { footprint, hexagon, key, type Hex } from './hex'

export type Terrain = 'blocking' | 'difficult' | 'cover_hard' | 'cover_soft'
export type Side = 'pc' | 'npc'

export interface Unit extends Hex {
  id: string
  name: string
  side: Side
  frameId: string
  frameName: string
  size: number
  speed: number
}

export interface BoardState {
  map: Set<string>
  terrain: Map<string, Terrain>
  units: Unit[]
}

// Every change is an event. Milestone 2 stores these in Supabase and syncs them;
// for now they live in the browser.
export type BoardEvent =
  | { type: 'set_terrain'; cells: { q: number; r: number; kind: Terrain | null }[] }
  | { type: 'place_unit'; unit: Unit }
  | { type: 'move'; unitId: string; to: Hex }
  | { type: 'remove_unit'; unitId: string }

export const MAP_RADIUS = 9

export function emptyBoard(): BoardState {
  return { map: new Set(hexagon(MAP_RADIUS).map(key)), terrain: new Map(), units: [] }
}

export function apply(state: BoardState, e: BoardEvent): BoardState {
  switch (e.type) {
    case 'set_terrain': {
      const terrain = new Map(state.terrain)
      for (const c of e.cells) {
        const k = key(c)
        if (!state.map.has(k)) continue
        if (c.kind) terrain.set(k, c.kind)
        else terrain.delete(k)
      }
      return { ...state, terrain }
    }
    case 'place_unit':
      return { ...state, units: [...state.units, e.unit] }
    case 'move':
      return {
        ...state,
        units: state.units.map((u) => (u.id === e.unitId ? { ...u, q: e.to.q, r: e.to.r } : u)),
      }
    case 'remove_unit':
      return { ...state, units: state.units.filter((u) => u.id !== e.unitId) }
  }
}

export const replay = (events: BoardEvent[]): BoardState => events.reduce(apply, emptyBoard())

/** Can a unit of this size stand with its anchor here (on the map, not blocked, not overlapping)? */
export function canPlace(state: BoardState, anchor: Hex, size: number, ignoreId?: string): boolean {
  const taken = new Set<string>()
  for (const u of state.units) if (u.id !== ignoreId) for (const h of footprint(u, u.size)) taken.add(key(h))
  return footprint(anchor, size).every((h) => {
    const k = key(h)
    return state.map.has(k) && state.terrain.get(k) !== 'blocking' && !taken.has(k)
  })
}

const STORAGE_KEY = 'lancer-table:board-events:v1'

export function loadEvents(): BoardEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as BoardEvent[]) : []
  } catch {
    return []
  }
}

export function saveEvents(events: BoardEvent[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
  } catch {
    // Storage unavailable (private window etc.): the board still works for this session.
  }
}
