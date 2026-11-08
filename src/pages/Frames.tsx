import { useMemo, useState } from 'react'
import { frames, manufacturers, type FrameRole } from '../data/lancer'

const roles: (FrameRole | 'All')[] = [
  'All',
  'Striker',
  'Controller',
  'Defender',
  'Support',
  'Artillery',
  'Balanced',
]

export default function Frames() {
  const [role, setRole] = useState<(typeof roles)[number]>('All')

  const shown = useMemo(
    () =>
      frames
        .filter((f) => role === 'All' || f.mechtype.includes(role))
        .sort((a, b) => a.source.localeCompare(b.source) || a.name.localeCompare(b.name)),
    [role],
  )

  return (
    <section className="page">
      <h1>Frames</h1>
      <div className="chips">
        {roles.map((r) => (
          <button key={r} className={r === role ? 'chip on' : 'chip'} onClick={() => setRole(r)}>
            {r}
          </button>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Frame</th>
              <th>Maker</th>
              <th>Role</th>
              <th>Size</th>
              <th>HP</th>
              <th>Armor</th>
              <th>Evasion</th>
              <th>E-Def</th>
              <th>Speed</th>
              <th>Heat</th>
              <th>Sensors</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((f) => (
              <tr key={f.id}>
                <td>{f.name}</td>
                <td title={manufacturers[f.source]}>{f.source}</td>
                <td>{f.mechtype.join(', ')}</td>
                <td>{f.stats.size}</td>
                <td>{f.stats.hp}</td>
                <td>{f.stats.armor}</td>
                <td>{f.stats.evasion}</td>
                <td>{f.stats.edef}</td>
                <td>{f.stats.speed}</td>
                <td>{f.stats.heatcap}</td>
                <td>{f.stats.sensor_range}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
