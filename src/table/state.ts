import { footprint, key, rectangle, type Hex, type Orientation } from './hex'

/** Ground properties a hex can have, in any combination. */
export type Tag = 'difficult' | 'dangerous' | 'soft_cover' | 'ramp' | 'impassable'
export const TAGS: Tag[] = ['difficult', 'dangerous', 'soft_cover', 'ramp', 'impassable']

/** A hex's terrain: `h` is the height of whatever stands there (0 = open ground). */
export interface Cell {
  h: number
  tags: Tag[]
}

export type ZoneKind = 'deploy_player' | 'deploy_enemy' | 'ingress' | 'objective'
export const ZONES: ZoneKind[] = ['deploy_player', 'deploy_enemy', 'ingress', 'objective']

export const ZONE_STYLE: Record<ZoneKind, { color: string; label: string }> = {
  deploy_player: { color: '#3fc7a0', label: 'Player deployment' },
  deploy_enemy: { color: '#e14fd0', label: 'Enemy deployment' },
  ingress: { color: '#e8d23d', label: 'Ingress' },
  objective: { color: '#4fd6e5', label: 'Objective' },
}

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
  cells: Map<string, Cell>
  zones: Record<ZoneKind, Set<string>>
  units: Unit[]
}

// Every change to what's on the board is an event. Milestone 2 stores these in Supabase and
// syncs them; for now they live in the browser.
export type BoardEvent =
  | { type: 'set_cells'; cells: { q: number; r: number; cell: Cell | null }[] }
  | { type: 'set_zone'; zone: ZoneKind; on: boolean; cells: Hex[] }
  | { type: 'place_unit'; unit: Unit }
  | { type: 'move'; unitId: string; to: Hex }
  | { type: 'remove_unit'; unitId: string }

export function emptyBoard(): BoardState {
  return {
    cells: new Map(),
    zones: { deploy_player: new Set(), deploy_enemy: new Set(), ingress: new Set(), objective: new Set() },
    units: [],
  }
}

export function apply(state: BoardState, e: BoardEvent): BoardState {
  switch (e.type) {
    case 'set_cells': {
      const cells = new Map(state.cells)
      for (const c of e.cells) {
        const k = key(c)
        if (!c.cell || (c.cell.h === 0 && c.cell.tags.length === 0)) cells.delete(k)
        else cells.set(k, { h: c.cell.h, tags: [...c.cell.tags] })
      }
      return { ...state, cells }
    }
    case 'set_zone': {
      const set = new Set(state.zones[e.zone])
      for (const h of e.cells) {
        if (e.on) set.add(key(h))
        else set.delete(key(h))
      }
      return { ...state, zones: { ...state.zones, [e.zone]: set } }
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

export const cellAt = (state: BoardState, k: string): Cell => state.cells.get(k) ?? { h: 0, tags: [] }

export const hasTag = (state: BoardState, k: string, t: Tag) => state.cells.get(k)?.tags.includes(t) ?? false

/** The level a unit stands at: the top of the tallest terrain under its footprint. */
export function levelAt(state: BoardState, anchor: Hex, size: number): number {
  return Math.max(...footprint(anchor, size).map((h) => state.cells.get(key(h))?.h ?? 0))
}

/** Can a unit of this size stand here (on the map, not impassable, not overlapping a unit)? */
export function canPlace(state: BoardState, map: Set<string>, anchor: Hex, size: number, ignoreId?: string): boolean {
  const taken = new Set<string>()
  for (const u of state.units) if (u.id !== ignoreId) for (const h of footprint(u, u.size)) taken.add(key(h))
  return footprint(anchor, size).every((h) => {
    const k = key(h)
    return map.has(k) && !hasTag(state, k, 'impassable') && !taken.has(k)
  })
}

// ---- Map settings ------------------------------------------------------
// The map's shape and background aren't events: they're set up once per map (and will live in
// the maps table in Supabase), and calibration nudges shouldn't flood the undo history.

export interface Background {
  /** IndexedDB key of the uploaded image. */
  imageId: string
  width: number
  height: number
  /** Centre-to-corner size of one hex in the image, in image px. */
  hexPx: number
  /** Image px position of the centre of hex (0,0), the top-left hex. */
  originX: number
  originY: number
  opacity: number
}

export type TerrainView = 'solid' | 'ghost' | 'flat'

export interface MapConfig {
  cols: number
  rows: number
  orientation: Orientation
  background: Background | null
  terrainView: TerrainView
  gridOpacity: number
}

export const defaultMap = (): MapConfig => ({
  cols: 24,
  rows: 18,
  orientation: 'pointy',
  background: null,
  terrainView: 'solid',
  gridOpacity: 0.6,
})

export const mapHexes = (m: MapConfig) => rectangle(m.cols, m.rows, m.orientation)

// ---- Local persistence -------------------------------------------------

const EVENTS_KEY = 'lancer-table:board-events:v2'
const MAP_KEY = 'lancer-table:map:v1'

function load<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {
    // Storage unavailable (private window etc.): the board still works for this session.
  }
}

export const loadEvents = () => load<BoardEvent[]>(EVENTS_KEY, [])
export const saveEvents = (e: BoardEvent[]) => save(EVENTS_KEY, e)
export const loadMap = () => ({ ...defaultMap(), ...load<Partial<MapConfig>>(MAP_KEY, {}) })
export const saveMap = (m: MapConfig) => save(MAP_KEY, m)
