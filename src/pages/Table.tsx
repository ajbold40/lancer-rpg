import { useEffect, useMemo, useState } from 'react'
import Board from '../table/Board'
import { key, type Hex } from '../table/hex'
import { isEngaged, reachable } from '../table/movement'
import { canPlace, loadEvents, replay, saveEvents, type BoardEvent, type Side, type Terrain } from '../table/state'
import { frames } from '../config/campaign'

type Tool = 'select' | 'paint' | 'place'
type Brush = Terrain | 'erase'

const BRUSHES: { id: Brush; label: string }[] = [
  { id: 'blocking', label: 'Blocking' },
  { id: 'cover_hard', label: 'Hard cover' },
  { id: 'cover_soft', label: 'Soft cover' },
  { id: 'difficult', label: 'Difficult' },
  { id: 'erase', label: 'Erase' },
]

const sortedFrames = [...frames].sort((a, b) => a.name.localeCompare(b.name))

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()))

export default function Table() {
  const [events, setEvents] = useState<BoardEvent[]>(loadEvents)
  const state = useMemo(() => replay(events), [events])
  useEffect(() => saveEvents(events), [events])

  const [tool, setTool] = useState<Tool>('select')
  const [brush, setBrush] = useState<Brush>('blocking')
  const [rotation, setRotation] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [boost, setBoost] = useState(false)

  const [placeFrame, setPlaceFrame] = useState(sortedFrames.find((f) => f.name === 'Everest')?.id ?? sortedFrames[0].id)
  const [placeSide, setPlaceSide] = useState<Side>('pc')
  const [placeName, setPlaceName] = useState('')

  const selected = state.units.find((u) => u.id === selectedId) ?? null
  const reach = useMemo(
    () => (selected && tool === 'select' ? reachable(state, selected.id, boost ? selected.speed * 2 : selected.speed) : null),
    [state, selected, tool, boost],
  )

  const push = (e: BoardEvent) => setEvents((prev) => [...prev, e])

  const paint = (h: Hex) => {
    const kind = brush === 'erase' ? null : brush
    if ((state.terrain.get(key(h)) ?? null) === kind) return
    push({ type: 'set_terrain', cells: [{ q: h.q, r: h.r, kind }] })
  }

  const onHexDown = (h: Hex, shift: boolean) => {
    if (tool === 'paint') return paint(h)
    if (tool === 'place') {
      const f = frames.find((x) => x.id === placeFrame)
      if (!f || !canPlace(state, h, f.stats.size)) return
      const count = state.units.filter((u) => u.side === placeSide).length + 1
      const unit = {
        id: newId(),
        name: placeName.trim() || `${placeSide === 'pc' ? 'Pilot' : 'Hostile'} ${count}`,
        side: placeSide,
        frameId: f.id,
        frameName: f.name,
        size: f.stats.size,
        speed: f.stats.speed,
        q: h.q,
        r: h.r,
      }
      push({ type: 'place_unit', unit })
      setPlaceName('')
      return
    }
    // Select tool: move the selected unit, or deselect.
    if (!selected) return
    const k = key(h)
    if (reach?.cost.has(k) || (shift && canPlace(state, h, selected.size, selected.id))) {
      push({ type: 'move', unitId: selected.id, to: h })
      setBoost(false)
    } else {
      setSelectedId(null)
    }
  }

  const onHexEnter = (h: Hex, dragging: boolean) => {
    if (tool === 'paint' && dragging) paint(h)
  }

  const onUnitClick = (id: string) => {
    if (tool !== 'select') setTool('select')
    setSelectedId((cur) => (cur === id ? null : id))
    setBoost(false)
  }

  const undo = () => setEvents((prev) => prev.slice(0, -1))
  const clearBoard = () => {
    if (window.confirm('Clear the whole board? This removes all terrain and units.')) {
      setEvents([])
      setSelectedId(null)
    }
  }

  return (
    <section className="table-page">
      <div className="table-toolbar">
        <div className="seg" role="group" aria-label="Tool">
          {(['select', 'paint', 'place'] as Tool[]).map((t) => (
            <button key={t} className={tool === t ? 'on' : ''} onClick={() => setTool(t)}>
              {t === 'select' ? 'Select / move' : t === 'paint' ? 'Paint terrain' : 'Place unit'}
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
          rotation={rotation}
          selectedId={selectedId}
          reach={reach}
          normalRange={selected?.speed ?? 0}
          painting={tool === 'paint'}
          onHexDown={onHexDown}
          onHexEnter={onHexEnter}
          onUnitClick={onUnitClick}
        />

        <aside className="table-panel">
          {tool === 'paint' && (
            <>
              <h3>Paint terrain</h3>
              <div className="brushes">
                {BRUSHES.map((b) => (
                  <button key={b.id} className={brush === b.id ? `brush ${b.id} on` : `brush ${b.id}`} onClick={() => setBrush(b.id)}>
                    <span className="swatch" />
                    {b.label}
                  </button>
                ))}
              </div>
              <p className="hint">Click or drag to paint. Right-drag to pan.</p>
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
              <p className="hint">Click an open hex to place. Size 2 and 3 take 3 and 7 hexes.</p>
            </>
          )}

          {tool === 'select' &&
            (selected ? (
              <>
                <h3>{selected.name}</h3>
                <p className="muted">
                  {selected.frameName} · {selected.side === 'pc' ? 'Player' : 'Hostile'} · Size {selected.size} · Speed {selected.speed}
                </p>
                {isEngaged(state, selected.id) && <p className="badge engaged">Engaged</p>}
                <label className="toggle">
                  <input type="checkbox" checked={boost} onChange={(e) => setBoost(e.target.checked)} />
                  Boost (show double move)
                </label>
                <p className="hint">
                  Click a highlighted hex to move. Amber rings mean you'd end up engaged; engaging an enemy your Size
                  or bigger ends your move. Shift-click any open hex to move freely (GM).
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
                <p className="hint">
                  Click a unit to see where it can move. Drag to pan, scroll to zoom, ⟲ ⟳ to rotate the view.
                </p>
                <p className="muted">
                  {state.units.length} unit{state.units.length === 1 ? '' : 's'} on the board · saved in this browser
                </p>
              </>
            ))}
        </aside>
      </div>
    </section>
  )
}
