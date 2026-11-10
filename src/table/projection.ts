import { cornerOffsets, toPlane, type Hex, type Orientation, type Point } from './hex'

/** Vertical squash for the 2.5D look. */
export const ISO = 0.56
/** Screen px of lift per level of terrain height. */
export const LIFT_PER_LEVEL = 16

/**
 * Turns flat board-plane points into isometric screen points:
 * move the map centre to the origin, rotate by the view angle, squash vertically,
 * then lift by height.
 */
export interface Projection {
  orientation: Orientation
  /** View rotation in degrees (clockwise on screen). */
  angle: number
  point: (p: Point, lift?: number) => Point
  hexCenter: (h: Hex, lift?: number) => Point
  hexCorners: (h: Hex, lift?: number, scale?: number) => Point[]
  /** SVG matrix() that maps plane coordinates to screen, for drawing background art. */
  matrix: string
}

export function makeProjection(orientation: Orientation, angle: number, center: Point): Projection {
  const rad = (angle * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const offsets = cornerOffsets(orientation)

  const point = (p: Point, lift = 0): Point => {
    const x = p.x - center.x
    const y = p.y - center.y
    return { x: cos * x - sin * y, y: ISO * (sin * x + cos * y) - lift }
  }

  const hexCenter = (h: Hex, lift = 0) => point(toPlane(h, orientation), lift)

  const hexCorners = (h: Hex, lift = 0, scale = 1) => {
    const c = toPlane(h, orientation)
    return offsets.map((o) => point({ x: c.x + o.x * scale, y: c.y + o.y * scale }, lift))
  }

  const e = -(cos * center.x - sin * center.y)
  const f = -ISO * (sin * center.x + cos * center.y)
  const matrix = `matrix(${cos} ${ISO * sin} ${-sin} ${ISO * cos} ${e} ${f})`

  return { orientation, angle, point, hexCenter, hexCorners, matrix }
}

/** Plane-space centre of a set of hexes. */
export function centerOf(hexes: Hex[], o: Orientation): Point {
  if (!hexes.length) return { x: 0, y: 0 }
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const h of hexes) {
    const p = toPlane(h, o)
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
}
