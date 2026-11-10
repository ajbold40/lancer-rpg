// Axial hex coordinates (q, r), flat-top orientation.
// Reference: redblobgames.com/grids/hexagons

export interface Hex {
  q: number
  r: number
}

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

/** Rotate around the origin by `steps` × 60° clockwise. */
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

// ---- Screen projection -------------------------------------------------

export const HEX_SIZE = 36 // centre to corner, in px before the iso squash
export const ISO = 0.56 // vertical squash for the 2.5D look

/** Flat-top hex centre on the unsquashed plane. */
export function toPlane(h: Hex): { x: number; y: number } {
  return {
    x: HEX_SIZE * 1.5 * h.q,
    y: HEX_SIZE * Math.sqrt(3) * (h.r + h.q / 2),
  }
}

/** Screen position of a hex centre (squashed), after view rotation. */
export function toScreen(h: Hex, rotation: number): { x: number; y: number } {
  const p = toPlane(rotate(h, rotation))
  return { x: p.x, y: p.y * ISO }
}

/** Screen-space corners of a hex, optionally lifted by `lift` px. */
export function corners(h: Hex, rotation: number, lift = 0, scale = 1): { x: number; y: number }[] {
  const c = toScreen(h, rotation)
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i
    return {
      x: c.x + HEX_SIZE * scale * Math.cos(a),
      y: c.y + HEX_SIZE * scale * Math.sin(a) * ISO - lift,
    }
  })
}

export const points = (ps: { x: number; y: number }[]) => ps.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
