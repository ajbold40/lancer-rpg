import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import Board from '../table/Board'
import { key, type Hex } from '../table/hex'
import { isEngaged, reachable } from '../table/movement'
import {
  canPlace,
  cellAt,
  levelAt,
  loadEvents,
  loadMap,
  mapHexes,
  replay,
  saveEvents,
  saveMap,
  ZONE_STYLE,
  ZONES,
  type BoardEvent,
  type Cell,
  type MapConfig,
  type Side,
  type Tag,
  type ZoneKind,
} from '../table/state'
import { deleteImage, getImage, imageSize, putImage } from '../table/images'
import { frames } from '../config/campaign'

type Tool = 'select' | 'terrain' | 'zones' | 'place' | 'map'

type Brush = { kind: 'height'; h: number } | { kind: 'tag'; tag: Tag } | { kind: 'clear' }

const HEIGHTS = [1, 2, 3, 4, 6]

const TAG_LABEL: Record<Tag, string> = {
  difficult: 'Difficult',
  dangerous: 'Dangerous',
  soft_cover: 'Soft cover',
  ramp: 'Ramp',
  impassable: 'Impassable',
}

const TOOL_LABEL: Record<Tool, string> = {
  select: 'Select / move',
  terrain: 'Terrain',
  zones: 'Zones',
  place: 'Place unit',
  map: 'Map',
}

const sortedFrames = [...frames].sort((a, b) => a.name.localeCompare(b.name))

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()))

export default function Table() {
  const [events, setEvents] = useState<BoardEvent[]>(loadEvents)
  const state = useMemo(() => replay(events), [events])
  useEffect(() => saveEvents(events), [events])

  const [map, setMap] = useState<MapConfig>(loadMap)
  useEffect(() => saveMap(map), [map])
  const { cols, rows, orientation } = map
  const hexes = useMemo(() => mapHexes({ ...map, cols, rows, orientation }), [cols, rows, orientation]) // eslint-disable-line react-hooks/exhaustive-deps
  const mapSet = useMemo(() => new Set(hexes.map(key)), [hexes])

  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)
  const imageId = map.background?.imageId
  useEffect(() => {
    let url: string | null = null
    let cancelled = false
    if (imageId)
      getImage(imageId).then((blob) => {
        if (cancelled || !blob) return
        url = URL.createObjectURL(blob)
        setBackgroundUrl(url)
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
      setBackgroundUrl(null)
    }
  }, [imageId])

  const [tool, setTool] = useState<Tool>('select')
  const [brush, setBrush] = useState<Brush>({ kind: 'height', h: 2 })
  const [zone, setZone] = useState<ZoneKind>('deploy_player')
  const [rotation, setRotation] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [boost, setBoost] = useState(false)

  const [placeFrame, setPlaceFrame] = useState(sortedFrames.find((f) => f.name === 'Everest')?.id ?? sortedFrames[0].id)
  const [placeSide, setPlaceSide] = useState<Side>('pc')
  const [placeName, setPlaceName] = useState('')

  const selected = state.units.find((u) => u.id === selectedId) ?? null
  const reach = useMemo(
    () =>
      selected && tool === 'select'
        ? reachable(state, mapSet, selected.id, boost ? selected.speed * 2 : selected.speed)
        : null,
    [state, mapSet, selected, tool, boost],
  )

  const push = (e: BoardEvent) => setEvents((prev) => [...prev, e])

  // ---- Painting: one drag stroke = one event, so Undo removes the whole stroke ----
  const stroke = useRef<{ adding: boolean } | null>(null)
  useEffect(() => {
    const end = () => (stroke.current = null)
    window.addEventListener('pointerup', end)
    return () => window.removeEventListener('pointerup', end)
  }, [])

  const paintedCell = (h: Hex, adding: boolean): Cell | null => {
    const cur = cellAt(state, key(h))
    if (brush.kind === 'clear') return null
    if (brush.kind === 'height') return { h: brush.h, tags: cur.tags }
    const tags = adding ? [...new Set([...cur.tags, brush.tag])] : cur.tags.filter((t) => t !== brush.tag)
    return { h: cur.h, tags }
  }

  const paint = (h: Hex, starting: boolean) => {
    if (!mapSet.has(key(h))) return
    if (starting) {
      const k = key(h)
      const adding =
        tool === 'zones'
          ? !state.zones[zone].has(k)
          : brush.kind === 'tag'
            ? !cellAt(state, k).tags.includes(brush.tag)
            : true
      stroke.current = { adding }
    }
    const s = stroke.current
    if (!s) return
    setEvents((prev) => {
      const last = prev[prev.length - 1]
      const ev: BoardEvent =
        tool === 'zones'
          ? { type: 'set_zone', zone, on: s.adding, cells: [{ q: h.q, r: h.r }] }
          : { type: 'set_cells', cells: [{ q: h.q, r: h.r, cell: paintedCell(h, s.adding) }] }
      if (!starting && last && last.type === ev.type) {
        // extend the current stroke
        if (last.type === 'set_zone' && ev.type === 'set_zone') return [...prev.slice(0, -1), { ...last, cells: [...last.cells, ...ev.cells] }]
        if (last.type === 'set_cells' && ev.type === 'set_cells') return [...prev.slice(0, -1), { ...last, cells: [...last.cells, ...ev.cells] }]
      }
      return [...prev, ev]
    })
  }

  const onHexDown = (h: Hex, shift: boolean) => {
    if (tool === 'terrain' || tool === 'zones') return paint(h, true)
    if (tool === 'place') {
      const f = frames.find((x) => x.id === placeFrame)
      if (!f || !canPlace(state, mapSet, h, f.stats.size)) return
      const count = state.units.filter((u) => u.side === placeSide).length + 1
      push({
        type: 'place_unit',
        unit: {
          id: newId(),
          name: placeName.trim() || `${placeSide === 'pc' ? 'Pilot' : 'Hostile'} ${count}`,
          side: placeSide,
          frameId: f.id,
          frameName: f.name,
          size: f.stats.size,
          speed: f.stats.speed,
          q: h.q,
          r: h.r,
        },
      })
      setPlaceName('')
      return
    }
    if (tool !== 'select' || !selected) return
    if (reach?.cost.has(key(h)) || (shift && canPlace(state, mapSet, h, selected.size, selected.id))) {
      push({ type: 'move', unitId: selected.id, to: h })
      setBoost(false)
    } else {
      setSelectedId(null)
    }
  }

  const onHexEnter = (h: Hex, dragging: boolean) => {
    if ((tool === 'terrain' || tool === 'zones') && dragging && stroke.current) paint(h, false)
  }

  const onUnitClick = (id: string) => {
    if (tool !== 'select') setTool('select')
    setSelectedId((cur) => (cur === id ? null : id))
    setBoost(false)
  }

  const undo = () => setEvents((prev) => prev.slice(0, -1))
  const clearBoard = () => {
    if (window.confirm('Clear the board? This removes all terrain, zones and units. The map size and background stay.')) {
      setEvents([])
      setSelectedId(null)
    }
  }

  // ---- Map settings ----
  const setBg = (patch: Partial<NonNullable<MapConfig['background']>>) =>
    setMap((m) => (m.background ? { ...m, background: { ...m.background, ...patch } } : m))

  const onUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const size = await imageSize(file)
      const id = newId()
      await putImage(id, file)
      if (map.background) await deleteImage(map.background.imageId)
      // Starting guess: the map's current columns span the image width.
      const across = map.orientation === 'pointy' ? Math.sqrt(3) * map.cols : 1.5 * map.cols + 0.5
      const hexPx = Math.max(8, size.width / across)
      setMap((m) => ({
        ...m,
        terrainView: m.terrainView === 'solid' ? 'ghost' : m.terrainView,
        background: {
          imageId: id,
          width: size.width,
          height: size.height,
          hexPx: Math.round(hexPx * 10) / 10,
          originX: Math.round(map.orientation === 'pointy' ? (Math.sqrt(3) / 2) * hexPx : hexPx),
          originY: Math.round(map.orientation === 'pointy' ? hexPx : (Math.sqrt(3) / 2) * hexPx),
          opacity: 1,
        },
      }))
    } catch {
      window.alert("That file couldn't be read as an image.")
    }
  }

  const removeBackground = async () => {
    if (map.background) await deleteImage(map.background.imageId)
    setMap((m) => ({ ...m, background: null }))
  }

  const fitToImage = () => {
    const bg = map.background
    if (!bg) return
    const s = bg.hexPx
    const stepX = map.orientation === 'pointy' ? Math.sqrt(3) * s : 1.5 * s
    const stepY = map.orientation === 'pointy' ? 1.5 * s : Math.sqrt(3) * s
    setMap((m) => ({
      ...m,
      cols: Math.max(1, Math.floor((bg.width - bg.originX) / stepX) + 1),
      rows: Math.max(1, Math.floor((bg.height - bg.originY) / stepY) + 1),
    }))
  }

  const selectedLevel = selected ? levelAt(state, selected, selected.size) : 0

  return (
    <section className="table-page">
      <div className="table-toolbar">
        <div className="seg" role="group" aria-label="Tool">
          {(Object.keys(TOOL_LABEL) as Tool[]).map((t) => (
            <button key={t} className={tool === t ? 'on' : ''} onClick={() => setTool(t)}>
              {TOOL_LABEL[t]}
            </button>
          ))}
        </div>
        <div className="seg">
          <button onClick={() => setRotation((r) => r - 1)} aria-label="Rotate left">⟲</button>
          <button onClick={() => setRotation((r) => r + 1)} aria-label="Rotate right">⟳</button>
        </div>
        <div className="seg">
          <button onClick={undo} disabled={!events.length}>Undo</button>
          <button onClick={clearBoard} disabled={!events.length}>Clear</button>
        </div>
      </div>

      <div className="table-layout">
        <Board
          state={state}
          map={map}
          hexes={hexes}
          mapSet={mapSet}
          rotation={rotation}
          selectedId={selectedId}
          reach={reach}
          normalRange={selected?.speed ?? 0}
          painting={tool === 'terrain' || tool === 'zones'}
          calibrating={tool === 'map' && !!map.background}
          backgroundUrl={backgroundUrl}
          onHexDown={onHexDown}
          onHexEnter={onHexEnter}
          onUnitClick={onUnitClick}
        />

        <aside className="table-panel">
          {tool === 'terrain' && (
            <>
              <h3>Terrain</h3>
              <p className="panel-label">Height (buildings, crates, rocks)</p>
              <div className="chip-row">
                {HEIGHTS.map((h) => (
                  <button
                    key={h}
                    className={brush.kind === 'height' && brush.h === h ? 'chip on' : 'chip'}
                    onClick={() => setBrush({ kind: 'height', h })}
                  >
                    {h}
                  </button>
                ))}
                <button
                  className={brush.kind === 'height' && brush.h === 0 ? 'chip on' : 'chip'}
                  onClick={() => setBrush({ kind: 'height', h: 0 })}
                  title="Flatten to ground level, keeping tags"
                >
                  Ground
                </button>
              </div>
              <p className="panel-label">Ground types (click again to remove)</p>
              <div className="brushes">
                {(Object.keys(TAG_LABEL) as Tag[]).map((t) => (
                  <button
                    key={t}
                    className={brush.kind === 'tag' && brush.tag === t ? `brush ${t} on` : `brush ${t}`}
                    onClick={() => setBrush({ kind: 'tag', tag: t })}
                  >
                    <span className="swatch" />
                    {TAG_LABEL[t]}
                  </button>
                ))}
                <button className={brush.kind === 'clear' ? 'brush erase on' : 'brush erase'} onClick={() => setBrush({ kind: 'clear' })}>
                  <span className="swatch" />
                  Erase all
                </button>
              </div>
              <p className="hint">Click or drag to paint. A whole stroke undoes in one step. Right-drag to pan.</p>
            </>
          )}

          {tool === 'zones' && (
            <>
              <h3>Zones</h3>
              <div className="brushes">
                {ZONES.map((z) => (
                  <button key={z} className={zone === z ? 'brush on' : 'brush'} onClick={() => setZone(z)}>
                    <span className="swatch" style={{ background: ZONE_STYLE[z].color }} />
                    {ZONE_STYLE[z].label}
                  </button>
                ))}
              </div>
              <p className="hint">Drag to paint a zone. Start on a hex that's already in the zone to erase. Zones can overlap.</p>
            </>
          )}

          {tool === 'place' && (
            <>
              <h3>Place unit</h3>
              <label>
                Frame
                <select value={placeFrame} onChange={(e) => setPlaceFrame(e.target.value)}>
                  {sortedFrames.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.source}, Size {f.stats.size})
                    </option>
                  ))}
                </select>
              </label>
              <div className="seg">
                <button className={placeSide === 'pc' ? 'on pc' : ''} onClick={() => setPlaceSide('pc')}>Player</button>
                <button className={placeSide === 'npc' ? 'on npc' : ''} onClick={() => setPlaceSide('npc')}>Hostile</button>
              </div>
              <label>
                Name (optional)
                <input value={placeName} onChange={(e) => setPlaceName(e.target.value)} placeholder="Callsign" />
              </label>
              <p className="hint">Click an open hex to place. Units stand on top of whatever terrain is there.</p>
            </>
          )}

          {tool === 'map' && (
            <>
              <h3>Map</h3>
              <div className="field-row">
                <label>
                  Columns
                  <input type="number" min={1} max={80} value={map.cols} onChange={(e) => setMap((m) => ({ ...m, cols: clamp(+e.target.value, 1, 80) }))} />
                </label>
                <label>
                  Rows
                  <input type="number" min={1} max={80} value={map.rows} onChange={(e) => setMap((m) => ({ ...m, rows: clamp(+e.target.value, 1, 80) }))} />
                </label>
              </div>
              <p className="panel-label">Hex orientation</p>
              <div className="seg">
                <button className={map.orientation === 'pointy' ? 'on' : ''} onClick={() => setMap((m) => ({ ...m, orientation: 'pointy' }))}>Pointy top</button>
                <button className={map.orientation === 'flat' ? 'on' : ''} onClick={() => setMap((m) => ({ ...m, orientation: 'flat' }))}>Flat top</button>
              </div>

              <p className="panel-label">Background art</p>
              {!map.background ? (
                <label className="upload">
                  <input type="file" accept="image/*" onChange={onUpload} />
                  Upload map image
                </label>
              ) : (
                <>
                  <p className="hint">Line the cyan grid up with the art: hex size first, then the first hex's centre.</p>
                  <Slider label="Hex size (px)" value={map.background.hexPx} min={8} max={200} step={0.1} onChange={(v) => setBg({ hexPx: v })} />
                  <Slider label="First hex centre X (px)" value={map.background.originX} min={-200} max={400} step={0.5} onChange={(v) => setBg({ originX: v })} />
                  <Slider label="First hex centre Y (px)" value={map.background.originY} min={-200} max={400} step={0.5} onChange={(v) => setBg({ originY: v })} />
                  <Slider label="Art opacity" value={map.background.opacity} min={0.1} max={1} step={0.05} onChange={(v) => setBg({ opacity: v })} />
                  <button className="secondary" onClick={fitToImage}>Fit columns and rows to the art</button>
                  <div className="seg">
                    <label className="upload small">
                      <input type="file" accept="image/*" onChange={onUpload} />
                      Replace
                    </label>
                    <button onClick={removeBackground}>Remove</button>
                  </div>
                  <p className="hint">The image stays in this browser only. It isn't uploaded anywhere.</p>
                </>
              )}

              <p className="panel-label">Terrain display</p>
              <div className="seg">
                {(['solid', 'ghost', 'flat'] as const).map((v) => (
                  <button key={v} className={map.terrainView === v ? 'on' : ''} onClick={() => setMap((m) => ({ ...m, terrainView: v }))}>
                    {v === 'solid' ? 'Solid' : v === 'ghost' ? 'See-through' : 'Flat'}
                  </button>
                ))}
              </div>
              <Slider label="Grid lines" value={map.gridOpacity} min={0} max={1} step={0.05} onChange={(v) => setMap((m) => ({ ...m, gridOpacity: v }))} />
            </>
          )}

          {tool === 'select' &&
            (selected ? (
              <>
                <h3>{selected.name}</h3>
                <p className="muted">
                  {selected.frameName} · {selected.side === 'pc' ? 'Player' : 'Hostile'} · Size {selected.size} · Speed {selected.speed}
                  {selectedLevel > 0 && ` · on height ${selectedLevel}`}
                </p>
                {isEngaged(state, selected.id) && <p className="badge engaged">Engaged</p>}
                <label className="toggle">
                  <input type="checkbox" checked={boost} onChange={(e) => setBoost(e.target.checked)} />
                  Boost (show double move)
                </label>
                <p className="hint">
                  Click a highlighted hex to move. Amber rings mean you'd end up engaged; engaging an enemy your Size or
                  bigger ends your move. Climbing costs 2 per level; ↓ marks a drop of 3+ (fall damage if you step off).
                  Shift-click any open hex to move freely (GM).
                </p>
                <button
                  className="danger"
                  onClick={() => {
                    push({ type: 'remove_unit', unitId: selected.id })
                    setSelectedId(null)
                  }}
                >
                  Remove unit
                </button>
              </>
            ) : (
              <>
                <h3>Select a unit</h3>
                <p className="hint">Click a unit to see where it can move. Drag to pan, scroll to zoom, ⟲ ⟳ to rotate.</p>
                <p className="muted">
                  {map.cols} × {map.rows} map · {state.units.length} unit{state.units.length === 1 ? '' : 's'} · saved in this browser
                </p>
              </>
            ))}
        </aside>
      </div>
    </section>
  )
}

const clamp = (v: number, lo: number, hi: number) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : lo)

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="slider">
      <span>
        {label}
        <input
          type="number"
          value={value}
          step={step}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (Number.isFinite(v)) onChange(v)
          }}
        />
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
    </label>
  )
}
