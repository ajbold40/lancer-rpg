import { useMemo, useRef, useState, type MouseEvent, type PointerEvent, type WheelEvent } from 'react'
import { corners, footprint, fromKey, HEX_SIZE, ISO, key, points, toScreen, type Hex } from './hex'
import type { Reach } from './movement'
import type { BoardState, Terrain, Unit } from './state'

export interface BoardProps {
  state: BoardState
  rotation: number
  selectedId: string | null
  reach: Reach | null
  /** Units with a cost above this are in Boost range (drawn lighter). */
  normalRange: number
  /** True while a drag should paint rather than pan. */
  painting: boolean
  /** A hex was clicked (or pressed, while painting). `shift` is the GM free-move modifier. */
  onHexDown: (h: Hex, shift: boolean) => void
  onHexEnter: (h: Hex, dragging: boolean) => void
  onUnitClick: (id: string) => void
}

const LIFT: Record<Terrain, number> = { blocking: 30, cover_hard: 14, cover_soft: 10, difficult: 0 }

const SIDE_COLOR = { pc: '#4fb3d9', npc: '#e5534b' }

interface View {
  x: number
  y: number
  zoom: number
}

export default function Board(props: BoardProps) {
  const { state, rotation, selectedId, reach, normalRange, painting } = props
  const [view, setView] = useState<View>({ x: 0, y: 0, zoom: 1 })
  const [hover, setHover] = useState<string | null>(null)
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean; pan: boolean } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const hexes = useMemo(() => [...state.map].map(fromKey), [state.map])

  // Depth-sorted things that stand up off the ground: terrain blocks and units.
  const standing = useMemo(() => {
    type Item = { y: number; kind: 'block'; hex: Hex; terrain: Terrain } | { y: number; kind: 'unit'; unit: Unit }
    const items: Item[] = []
    for (const [k, t] of state.terrain) {
      if (!LIFT[t]) continue
      const hex = fromKey(k)
      items.push({ y: toScreen(hex, rotation).y, kind: 'block', hex, terrain: t })
    }
    for (const u of state.units) {
      const ys = footprint(u, u.size).map((h) => toScreen(h, rotation).y)
      items.push({ y: Math.max(...ys) + 0.1, kind: 'unit', unit: u })
    }
    return items.sort((a, b) => a.y - b.y)
  }, [state.terrain, state.units, rotation])

  // Convert a screen-pixel delta to viewBox units.
  const scale = () => {
    const svg = svgRef.current
    if (!svg) return 1
    return 1120 / svg.getBoundingClientRect().width
  }

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    const pan = !painting || e.button !== 0
    drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false, pan }
  }
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current
    if (!d || !d.pan) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.moved && Math.hypot(dx, dy) < 5) return
    d.moved = true
    const s = scale()
    setView((v) => ({ ...v, x: d.vx + dx * s, y: d.vy + dy * s }))
  }
  const onPointerUp = () => {
    // Leave `moved` readable for the click that follows, then clear.
    setTimeout(() => (drag.current = null), 0)
  }
  const onWheel = (e: WheelEvent<SVGSVGElement>) => {
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
    setView((v) => ({ ...v, zoom: Math.min(3, Math.max(0.4, v.zoom * factor)) }))
  }
  const wasPan = () => drag.current?.moved && drag.current.pan

  const hexHandlers = (h: Hex) => ({
    onPointerDown: (e: PointerEvent) => {
      if (painting && e.button === 0) props.onHexDown(h, e.shiftKey)
    },
    onClick: (e: MouseEvent) => {
      if (!painting && !wasPan()) props.onHexDown(h, e.shiftKey)
    },
    onPointerEnter: (e: PointerEvent) => {
      setHover(key(h))
      props.onHexEnter(h, painting && (e.buttons & 1) === 1)
    },
  })

  return (
    <div className="board">
      <svg
        ref={svgRef}
        viewBox="-560 -360 1120 720"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setHover(null)}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          <pattern id="difficult" width="10" height="6" patternUnits="userSpaceOnUse">
            <rect width="10" height="6" fill="#2b2a24" />
            <circle cx="3" cy="2" r="1.1" fill="#6b604a" />
            <circle cx="8" cy="5" r="0.9" fill="#5a5140" />
          </pattern>
        </defs>
        <g transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
          {/* Ground */}
          {hexes.map((h) => {
            const k = key(h)
            const t = state.terrain.get(k)
            const cost = reach?.cost.get(k)
            const fill = t === 'difficult' ? 'url(#difficult)' : t ? '#1d242c' : '#181e25'
            return (
              <g key={k} {...hexHandlers(h)} className="hex">
                <polygon points={points(corners(h, rotation))} fill={fill} stroke="#2a323c" strokeWidth={1} />
                {cost !== undefined && (
                  <polygon
                    points={points(corners(h, rotation, 0, 0.86))}
                    className={cost > normalRange ? 'reach boost' : 'reach'}
                  />
                )}
                {reach?.engaged.has(k) && (
                  <polygon points={points(corners(h, rotation, 0, 0.7))} className="engage-mark" />
                )}
                {hover === k && <polygon points={points(corners(h, rotation))} className="hover" />}
              </g>
            )
          })}

          {/* Blocks and units, back to front */}
          {standing.map((item) =>
            item.kind === 'block' ? (
              <Block
                key={`b${key(item.hex)}`}
                hex={item.hex}
                terrain={item.terrain}
                rotation={rotation}
                handlers={hexHandlers(item.hex)}
                reachCost={reach?.cost.get(key(item.hex))}
                boost={(reach?.cost.get(key(item.hex)) ?? 0) > normalRange}
                engaged={!!reach?.engaged.has(key(item.hex))}
                hovered={hover === key(item.hex)}
              />
            ) : (
              <Standee
                key={item.unit.id}
                unit={item.unit}
                rotation={rotation}
                selected={item.unit.id === selectedId}
                onClick={() => !wasPan() && props.onUnitClick(item.unit.id)}
              />
            ),
          )}
        </g>
      </svg>
      <div className="board-zoom">
        <button onClick={() => setView((v) => ({ ...v, zoom: Math.min(3, v.zoom * 1.2) }))} aria-label="Zoom in">+</button>
        <button onClick={() => setView((v) => ({ ...v, zoom: Math.max(0.4, v.zoom / 1.2) }))} aria-label="Zoom out">−</button>
        <button onClick={() => setView({ x: 0, y: 0, zoom: 1 })} aria-label="Reset view">⌂</button>
      </div>
    </div>
  )
}

function Block({
  hex,
  terrain,
  rotation,
  handlers,
  reachCost,
  boost,
  engaged,
  hovered,
}: {
  hex: Hex
  terrain: Terrain
  rotation: number
  handlers: object
  reachCost?: number
  boost: boolean
  engaged: boolean
  hovered: boolean
}) {
  const lift = LIFT[terrain]
  const base = corners(hex, rotation, 0, 0.94)
  const top = corners(hex, rotation, lift, 0.94)
  const palette =
    terrain === 'blocking'
      ? { top: '#4a5563', side: '#323b46', side2: '#2a3139', opacity: 1 }
      : terrain === 'cover_hard'
        ? { top: '#5c5a4f', side: '#403e36', side2: '#36342d', opacity: 1 }
        : { top: '#4f6b4a', side: '#3a5136', side2: '#33482f', opacity: 0.7 }
  // Flat-top corners 0..5 run clockwise from the right; 0→1→2→3 are the front (bottom) edges.
  const faces = [0, 1, 2].map((i) => [base[i], base[i + 1], top[i + 1], top[i]])
  return (
    <g {...handlers} opacity={palette.opacity} className="block">
      {faces.map((f, i) => (
        <polygon key={i} points={points(f)} fill={i === 1 ? palette.side : palette.side2} stroke="#1a1f25" strokeWidth={0.6} />
      ))}
      <polygon points={points(top)} fill={palette.top} stroke="#1a1f25" strokeWidth={0.6} />
      {/* Overlays sit on the block's top face so they aren't hidden under it. */}
      {reachCost !== undefined && (
        <polygon points={points(corners(hex, rotation, lift, 0.8))} className={boost ? 'reach boost' : 'reach'} />
      )}
      {engaged && <polygon points={points(corners(hex, rotation, lift, 0.66))} className="engage-mark" />}
      {hovered && <polygon points={points(top)} className="hover" />}
    </g>
  )
}

function Standee({
  unit,
  rotation,
  selected,
  onClick,
}: {
  unit: Unit
  rotation: number
  selected: boolean
  onClick: () => void
}) {
  const fp = footprint(unit, unit.size)
  const pts = fp.map((h) => toScreen(h, rotation))
  const cx = pts.reduce((t, p) => t + p.x, 0) / pts.length
  const cy = pts.reduce((t, p) => t + p.y, 0) / pts.length
  const s = unit.size <= 0.5 ? 0.8 : unit.size <= 1 ? 1 : unit.size < 3 ? 1.45 : 1.9
  const w = 34 * s
  const h = 52 * s
  const color = SIDE_COLOR[unit.side]
  return (
    <g className={selected ? 'standee selected' : 'standee'} onClick={onClick}>
      {fp.map((hx) => (
        <polygon key={key(hx)} points={points(corners(hx, rotation, 0, 0.9))} fill={color} opacity={0.18} />
      ))}
      <ellipse cx={cx} cy={cy} rx={HEX_SIZE * 0.62 * s} ry={HEX_SIZE * 0.62 * s * ISO} fill="#0b0e11" stroke={color} strokeWidth={2} />
      <rect x={cx - w / 2} y={cy - h} width={w} height={h} rx={3} fill="#12171c" stroke={color} strokeWidth={selected ? 3 : 1.5} />
      <rect x={cx - w / 2} y={cy - h} width={w} height={9 * s} rx={3} fill={color} />
      <text x={cx} y={cy - h / 2 + 2} textAnchor="middle" className="standee-frame" fontSize={8 * Math.min(s, 1.3)}>
        {unit.frameName.toUpperCase()}
      </text>
      <text x={cx} y={cy + 16 + 8 * (s - 1)} textAnchor="middle" className="standee-name">
        {unit.name}
      </text>
    </g>
  )
}
