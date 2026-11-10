// Axial hex coordinates (q, r). Works for flat-top and pointy-top layouts.
// Reference: redblobgames.com/grids/hexagons

export interface Hex {
  q: number
  r: number
}

export type Orientation = 'flat' | 'pointy'

export const key = (h: Hex) => `${h.q},${h.r}`

export function fromKey(k: string): Hex {
  const [q, r] = k.split(',').map(Number)
  return { q, r }
}

export const DIRECTIONS: Hex[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
]

export const add = (a: Hex, b: Hex): Hex => ({ q: a.q + b.q, r: a.r + b.r })

export const neighbors = (h: Hex): Hex[] => DIRECTIONS.map((d) => add(h, d))

export function distance(a: Hex, b: Hex): number {
  const dq = a.q - b.q
  const dr = a.r - b.r
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2
}

/** All hexes within `radius` of the origin: a hexagon-shaped map. */
export function hexagon(radius: number): Hex[] {
  const out: Hex[] = []
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) out.push({ q, r })
  }
  return out
}

/**
 * A rectangular map of `cols` × `rows` hexes with hex (0,0) at the top-left.
 * Pointy-top: odd rows are shifted right by half a hex. Flat-top: odd columns are shifted down.
 */
export function rectangle(cols: number, rows: number, o: Orientation): Hex[] {
  const out: Hex[] = []
  if (o === 'pointy') {
    for (let r = 0; r < rows; r++) {
      const off = Math.floor(r / 2)
      for (let q = -off; q < cols - off; q++) out.push({ q, r })
    }
  } else {
    for (let q = 0; q < cols; q++) {
      const off = Math.floor(q / 2)
      for (let r = -off; r < rows - off; r++) out.push({ q, r })
    }
  }
  return out
}

/** Rotate around the origin by `steps` × 60°. */
export function rotate(h: Hex, steps: number): Hex {
  let q = h.q
  let r = h.r
  const n = ((steps % 6) + 6) % 6
  for (let i = 0; i < n; i++) {
    const s = -q - r
    ;[q, r] = [-r, -s]
  }
  return { q: q + 0, r: r + 0 } // + 0 turns -0 into 0
}

/**
 * Hexes a unit occupies, anchored at `anchor`.
 * Core rules: a SIZE N character occupies N spaces on all sides, and anything smaller than SIZE 1
 * rounds up. On hexes: Size 1/2 and 1 → 1 hex, Size 2 → 3-hex triangle (2 across),
 * Size 3 → 7-hex flower (3 across). Size 4+ isn't used by any player frame yet.
 */
export function footprint(anchor: Hex, size: number): Hex[] {
  if (size <= 1) return [anchor]
  if (size < 3) return [anchor, add(anchor, DIRECTIONS[4]), add(anchor, DIRECTIONS[5])]
  return [anchor, ...neighbors(anchor)]
}

// ---- Plane geometry (before the isometric view is applied) -------------

/** Centre-to-corner size of a hex on the board plane, in px. */
export const HEX_SIZE = 36

export interface Point {
  x: number
  y: number
}

/** Hex centre on the flat board plane. */
export function toPlane(h: Hex, o: Orientation, size = HEX_SIZE): Point {
  return o === 'flat'
    ? { x: size * 1.5 * h.q, y: size * Math.sqrt(3) * (h.r + h.q / 2) }
    : { x: size * Math.sqrt(3) * (h.q + h.r / 2), y: size * 1.5 * h.r }
}

/** Corner offsets from a hex centre, clockwise (screen y points down). */
export function cornerOffsets(o: Orientation, size = HEX_SIZE): Point[] {
  const start = o === 'flat' ? 0 : -30
  return Array.from({ length: 6 }, (_, i) => {
    const a = ((start + 60 * i) * Math.PI) / 180
    return { x: size * Math.cos(a), y: size * Math.sin(a) }
  })
}

/** For each of the six DIRECTIONS, the indices of the two corners on the shared edge. */
export function edgeCorners(o: Orientation): [number, number][] {
  const corners = cornerOffsets(o, 1)
  return DIRECTIONS.map((d) => {
    const n = toPlane(d, o, 1)
    const ranked = corners
      .map((c, i) => ({ i, dist: Math.hypot(c.x - n.x / 2, c.y - n.y / 2) }))
      .sort((a, b) => a.dist - b.dist)
    return [ranked[0].i, ranked[1].i]
  })
}

export const points = (ps: Point[]) => ps.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
