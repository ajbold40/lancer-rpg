import { memo, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent, type WheelEvent } from 'react'
import { DIRECTIONS, edgeCorners, footprint, fromKey, HEX_SIZE, key, points, add, type Hex } from './hex'
import type { Reach } from './movement'
import { centerOf, ISO, LIFT_PER_LEVEL, makeProjection, type Projection } from './projection'
import { levelAt, ZONE_STYLE, ZONES, type BoardState, type Cell, type MapConfig, type Unit, type ZoneKind } from './state'

export interface BoardProps {
  state: BoardState
  map: MapConfig
  hexes: Hex[]
  mapSet: Set<string>
  /** View rotation in 30° steps. */
  rotation: number
  selectedId: string | null
  reach: Reach | null
  /** Hexes with a cost above this are in Boost range (drawn lighter). */
  normalRange: number
  /** True while a drag should paint rather than pan. */
  painting: boolean
  /** Highlight the grid for lining it up with background art. */
  calibrating: boolean
  backgroundUrl: string | null
  /** A hex was clicked (or pressed, while painting). `shift` is the GM free-move modifier. */
  onHexDown: (h: Hex, shift: boolean) => void
  onHexEnter: (h: Hex, dragging: boolean) => void
  onUnitClick: (id: string) => void
}

const SIDE_COLOR = { pc: '#4fb3d9', npc: '#e5534b' }


interface View {
  x: number
  y: number
  zoom: number
}

const lift = (h: number) => h * LIFT_PER_LEVEL

export default function Board(props: BoardProps) {
  const { state, map, hexes, mapSet, rotation, reach, normalRange, painting, calibrating, backgroundUrl } = props
  const [view, setView] = useState<View>({ x: 0, y: 0, zoom: 1 })
  const [hover, setHover] = useState<string | null>(null)
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean; pan: boolean } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const proj = useMemo(
    () => makeProjection(map.orientation, rotation * 30, centerOf(hexes, map.orientation)),
    [map.orientation, rotation, hexes],
  )

  // Fit the whole map in view.
  const box = useMemo(() => {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const h of hexes)
      for (const p of proj.hexCorners(h)) {
        minX = Math.min(minX, p.x)
        maxX = Math.max(maxX, p.x)
        minY = Math.min(minY, p.y)
        maxY = Math.max(maxY, p.y)
      }
    const pad = 70
    if (!isFinite(minX)) return { x: -400, y: -300, w: 800, h: 600 }
    return { x: minX - pad, y: minY - pad - 40, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 + 40 }
  }, [hexes, proj])

  const solid = map.terrainView !== 'flat'

  // Depth-sorted things that stand up off the ground: terrain blocks and units.
  const standing = useMemo(() => {
    type Item = { y: number; kind: 'block'; hex: Hex; cell: Cell } | { y: number; kind: 'unit'; unit: Unit; level: number }
    const items: Item[] = []
    if (solid)
      for (const [k, cell] of state.cells) {
        if (cell.h <= 0 || !mapSet.has(k)) continue
        const hex = fromKey(k)
        items.push({ y: proj.hexCenter(hex).y, kind: 'block', hex, cell })
      }
    for (const u of state.units) {
      const ys = footprint(u, u.size).map((h) => proj.hexCenter(h).y)
      items.push({ y: Math.max(...ys) + 0.01, kind: 'unit', unit: u, level: solid ? levelAt(state, u, u.size) : 0 })
    }
    return items.sort((a, b) => a.y - b.y)
  }, [state, mapSet, proj, solid])

  const scale = () => {
    const svg = svgRef.current
    if (!svg) return 1
    const r = svg.getBoundingClientRect()
    return Math.max(box.w / r.width, box.h / r.height)
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
    setTimeout(() => (drag.current = null), 0)
  }
  const onWheel = (e: WheelEvent<SVGSVGElement>) => {
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
    setView((v) => ({ ...v, zoom: Math.min(5, Math.max(0.3, v.zoom * factor)) }))
  }
  const wasPan = () => drag.current?.moved && drag.current.pan

  const handlersFor = (h: Hex) => ({
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
  // Keep a stable reference so memoised layers don't re-render on every hover.
  const handlersRef = useRef(handlersFor)
  useLayoutEffect(() => {
    handlersRef.current = handlersFor
  })
  const stableHandlers = useMemo(
    () => (h: Hex) => ({
      onPointerDown: (e: PointerEvent) => handlersRef.current(h).onPointerDown(e),
      onClick: (e: MouseEvent) => handlersRef.current(h).onClick(e),
      onPointerEnter: (e: PointerEvent) => handlersRef.current(h).onPointerEnter(e),
    }),
    [],
  )

  const levelOf = (k: string) => (solid ? (state.cells.get(k)?.h ?? 0) : 0)
  const bg = map.background
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2

  return (
    <div className="board">
      <svg
        ref={svgRef}
        viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setHover(null)}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Patterns />
        <g transform={`translate(${view.x} ${view.y}) translate(${cx} ${cy}) scale(${view.zoom}) translate(${-cx} ${-cy})`}>
          {bg && backgroundUrl && (
            <g transform={proj.matrix}>
              <image
                href={backgroundUrl}
                x={-bg.originX * (HEX_SIZE / bg.hexPx)}
                y={-bg.originY * (HEX_SIZE / bg.hexPx)}
                width={bg.width * (HEX_SIZE / bg.hexPx)}
                height={bg.height * (HEX_SIZE / bg.hexPx)}
                opacity={bg.opacity}
                preserveAspectRatio="none"
                style={{ pointerEvents: 'none' }}
              />
            </g>
          )}

          <Ground
            hexes={hexes}
            cells={state.cells}
            proj={proj}
            hasBackground={!!(bg && backgroundUrl)}
            gridOpacity={calibrating ? 1 : map.gridOpacity}
            calibrating={calibrating}
            showHeights={!solid}
            handlers={stableHandlers}
          />
          <Zones zones={state.zones} mapSet={mapSet} proj={proj} />

          {/* Movement overlays on open ground (blocks draw their own on their tops) */}
          {reach &&
            [...reach.cost].map(([k, c]) =>
              levelOf(k) > 0 ? null : (
                <Overlay key={`r${k}`} k={k} proj={proj} boost={c > normalRange} engaged={reach.engaged.has(k)} drop={reach.drops.has(k)} />
              ),
            )}

          {standing.map((item) =>
            item.kind === 'block' ? (
              <Block
                key={`b${key(item.hex)}`}
                hex={item.hex}
                cell={item.cell}
                state={state}
                proj={proj}
                ghost={map.terrainView === 'ghost' || !!(bg && backgroundUrl && map.terrainView !== 'solid')}
                handlers={stableHandlers(item.hex)}
                reachCost={reach?.cost.get(key(item.hex))}
                boost={(reach?.cost.get(key(item.hex)) ?? 0) > normalRange}
                engaged={!!reach?.engaged.has(key(item.hex))}
                drop={!!reach?.drops.has(key(item.hex))}
              />
            ) : (
              <Standee
                key={item.unit.id}
                unit={item.unit}
                proj={proj}
                level={item.level}
                selected={item.unit.id === props.selectedId}
                onClick={() => !wasPan() && props.onUnitClick(item.unit.id)}
              />
            ),
          )}

          {hover && mapSet.has(hover) && (
            <polygon points={points(proj.hexCorners(fromKey(hover), lift(levelOf(hover))))} className="hover" />
          )}
        </g>
      </svg>
      <div className="board-zoom">
        <button onClick={() => setView((v) => ({ ...v, zoom: Math.min(5, v.zoom * 1.25) }))} aria-label="Zoom in">+</button>
        <button onClick={() => setView((v) => ({ ...v, zoom: Math.max(0.3, v.zoom / 1.25) }))} aria-label="Zoom out">−</button>
        <button onClick={() => setView({ x: 0, y: 0, zoom: 1 })} aria-label="Fit map">⌂</button>
      </div>
    </div>
  )
}

function Patterns() {
  return (
    <defs>
      <pattern id="t-difficult" width="10" height="6" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="2" r="1.2" fill="#c9b27c" opacity="0.7" />
        <circle cx="8" cy="5" r="1" fill="#a8925e" opacity="0.7" />
      </pattern>
      <pattern id="t-dangerous" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="5" height="10" fill="#f08a24" opacity="0.55" />
      </pattern>
      <pattern id="t-ramp" width="12" height="8" patternUnits="userSpaceOnUse">
        <path d="M1 7 L6 2 L11 7" fill="none" stroke="#c08cf0" strokeWidth="1.4" opacity="0.9" />
      </pattern>
    </defs>
  )
}

interface GroundProps {
  hexes: Hex[]
  cells: Map<string, Cell>
  proj: Projection
  hasBackground: boolean
  gridOpacity: number
  calibrating: boolean
  showHeights: boolean
  handlers: (h: Hex) => object
}

const Ground = memo(function Ground({ hexes, cells, proj, hasBackground, gridOpacity, calibrating, showHeights, handlers }: GroundProps) {
  return (
    <g className="ground">
      {hexes.map((h) => {
        const k = key(h)
        const cell = cells.get(k)
        const pts = points(proj.hexCorners(h))
        const tags = cell?.tags ?? []
        return (
          <g key={k} className="hex" {...handlers(h)}>
            <polygon
              points={pts}
              fill={hasBackground ? 'rgba(0,0,0,0.001)' : '#181e25'}
              stroke={calibrating ? '#4fe3ff' : '#55606c'}
              strokeOpacity={gridOpacity}
              strokeWidth={calibrating ? 1.2 : 0.8}
            />
            {tags.includes('impassable') && <polygon points={pts} fill="#05070a" opacity={0.75} />}
            {tags.includes('soft_cover') && <polygon points={pts} fill="#3f8f4a" opacity={0.38} />}
            {tags.includes('difficult') && <polygon points={pts} fill="url(#t-difficult)" />}
            {tags.includes('dangerous') && <polygon points={pts} fill="url(#t-dangerous)" />}
            {tags.includes('ramp') && <polygon points={pts} fill="url(#t-ramp)" />}
            {showHeights && cell && cell.h > 0 && (
              <text {...proj.hexCenter(h)} dy={4} textAnchor="middle" className="height-label">
                {cell.h}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
})

const Zones = memo(function Zones({ zones, mapSet, proj }: { zones: Record<ZoneKind, Set<string>>; mapSet: Set<string>; proj: Projection }) {
  const edges = edgeCorners(proj.orientation)
  return (
    <g className="zones">
      {ZONES.map((z) => {
        const set = zones[z]
        if (!set.size) return null
        const color = ZONE_STYLE[z].color
        const fills: string[] = []
        const lines: string[] = []
        for (const k of set) {
          if (!mapSet.has(k)) continue
          const h = fromKey(k)
          const c = proj.hexCorners(h)
          fills.push(points(c))
          DIRECTIONS.forEach((d, i) => {
            if (set.has(key(add(h, d)))) return
            const [a, b] = edges[i]
            lines.push(`M${c[a].x.toFixed(1)} ${c[a].y.toFixed(1)}L${c[b].x.toFixed(1)} ${c[b].y.toFixed(1)}`)
          })
        }
        return (
          <g key={z}>
            {fills.map((p, i) => (
              <polygon key={i} points={p} fill={color} opacity={0.14} />
            ))}
            <path d={lines.join('')} stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" />
          </g>
        )
      })}
    </g>
  )
})

function Overlay({ k, proj, boost, engaged, drop, liftPx = 0 }: { k: string; proj: Projection; boost: boolean; engaged: boolean; drop: boolean; liftPx?: number }) {
  const h = fromKey(k)
  return (
    <g style={{ pointerEvents: 'none' }}>
      <polygon points={points(proj.hexCorners(h, liftPx, 0.86))} className={boost ? 'reach boost' : 'reach'} />
      {engaged && <polygon points={points(proj.hexCorners(h, liftPx, 0.68))} className="engage-mark" />}
      {drop && (
        <text {...proj.hexCenter(h, liftPx)} dy={4} textAnchor="middle" className="drop-mark">
          ↓
        </text>
      )}
    </g>
  )
}

function Block({
  hex,
  cell,
  state,
  proj,
  ghost,
  handlers,
  reachCost,
  boost,
  engaged,
  drop,
}: {
  hex: Hex
  cell: Cell
  state: BoardState
  proj: Projection
  ghost: boolean
  handlers: object
  reachCost?: number
  boost: boolean
  engaged: boolean
  drop: boolean
}) {
  const top = lift(cell.h)
  const topPts = proj.hexCorners(hex, top)
  const center = proj.hexCenter(hex)
  const edges = edgeCorners(proj.orientation)
  const faces: { pts: string; shade: number }[] = []
  DIRECTIONS.forEach((d, i) => {
    const nh = state.cells.get(key(add(hex, d)))?.h ?? 0
    if (nh >= cell.h) return // hidden behind a neighbour at least as tall
    const [a, b] = edges[i]
    const baseA = proj.hexCorners(hex, lift(nh))[a]
    const baseB = proj.hexCorners(hex, lift(nh))[b]
    const midY = (baseA.y + baseB.y) / 2 + lift(nh)
    if (midY <= center.y + 0.01) return // faces away from the viewer
    const dx = (baseA.x + baseB.x) / 2 - center.x
    faces.push({ pts: points([baseA, baseB, topPts[b], topPts[a]]), shade: dx < 0 ? 0 : 1 })
  })
  const tall = cell.h >= 4
  const palette = ghost
    ? { top: 'rgba(120,135,150,0.28)', side: ['rgba(60,70,82,0.45)', 'rgba(45,52,62,0.45)'], stroke: '#9fb0c2' }
    : tall
      ? { top: '#525d6b', side: ['#3a434e', '#2e353e'], stroke: '#1a1f25' }
      : { top: '#5e5c52', side: ['#45433a', '#393730'], stroke: '#1a1f25' }
  return (
    <g {...handlers} className="block">
      {faces.map((f, i) => (
        <polygon key={i} points={f.pts} fill={palette.side[f.shade]} stroke={palette.stroke} strokeWidth={0.5} />
      ))}
      <polygon points={points(topPts)} fill={palette.top} stroke={palette.stroke} strokeWidth={0.6} />
      {cell.tags.includes('ramp') && <polygon points={points(topPts)} fill="url(#t-ramp)" />}
      {cell.tags.includes('difficult') && <polygon points={points(topPts)} fill="url(#t-difficult)" />}
      {cell.tags.includes('dangerous') && <polygon points={points(topPts)} fill="url(#t-dangerous)" />}
      {reachCost !== undefined && <Overlay k={key(hex)} proj={proj} boost={boost} engaged={engaged} drop={drop} liftPx={top} />}
    </g>
  )
}

function Standee({ unit, proj, level, selected, onClick }: { unit: Unit; proj: Projection; level: number; selected: boolean; onClick: () => void }) {
  const fp = footprint(unit, unit.size)
  const liftPx = lift(level)
  const pts = fp.map((h) => proj.hexCenter(h, liftPx))
  const cx = pts.reduce((t, p) => t + p.x, 0) / pts.length
  const cy = pts.reduce((t, p) => t + p.y, 0) / pts.length
  const s = unit.size <= 0.5 ? 0.8 : unit.size <= 1 ? 1 : unit.size < 3 ? 1.45 : 1.9
  const w = 34 * s
  const h = 52 * s
  const color = SIDE_COLOR[unit.side]
  return (
    <g className={selected ? 'standee selected' : 'standee'} onClick={onClick}>
      {fp.map((hx) => (
        <polygon key={key(hx)} points={points(proj.hexCorners(hx, liftPx, 0.9))} fill={color} opacity={0.22} />
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
