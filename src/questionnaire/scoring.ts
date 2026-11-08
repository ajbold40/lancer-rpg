import type { Frame, FrameRole, Maker } from '../data/lancer'
import type { Axis, Weights, WeightKey } from './questions'

const AXES: Axis[] = ['toughness', 'evasion', 'mobility', 'tech', 'heat', 'reach', 'size']
const ROLES: FrameRole[] = ['Striker', 'Controller', 'Defender', 'Support', 'Artillery', 'Balanced']
const MAKERS: Maker[] = ['GMS', 'IPS-N', 'SSC', 'HORUS', 'HA']

type AxisScores = Record<Axis, number>

function rawAxes(f: Frame): AxisScores {
  const s = f.stats
  return {
    toughness: s.hp + 2 * s.armor + 2 * s.size,
    evasion: s.evasion,
    mobility: s.speed,
    tech: 2 * s.tech_attack + s.edef + 0.5 * s.sp,
    heat: s.heatcap,
    reach: s.sensor_range,
    size: s.size,
  }
}

/** Scales every axis to 0–1 across the frames in play. */
export function normalizeAxes(frames: Frame[]): Map<string, AxisScores> {
  const raws = frames.map((f) => [f.id, rawAxes(f)] as const)
  const out = new Map<string, AxisScores>()
  const range = Object.fromEntries(
    AXES.map((a) => {
      const vals = raws.map(([, r]) => r[a])
      return [a, [Math.min(...vals), Math.max(...vals)]]
    }),
  ) as Record<Axis, [number, number]>
  for (const [id, r] of raws) {
    out.set(
      id,
      Object.fromEntries(
        AXES.map((a) => {
          const [lo, hi] = range[a]
          return [a, hi === lo ? 0.5 : (r[a] - lo) / (hi - lo)]
        }),
      ) as AxisScores,
    )
  }
  return out
}

export function sumWeights(chosen: Weights[]): Weights {
  const total: Weights = {}
  for (const w of chosen)
    for (const [k, v] of Object.entries(w) as [WeightKey, number][]) total[k] = (total[k] ?? 0) + v
  return total
}

export interface Contribution {
  key: WeightKey
  points: number
}

export interface Match {
  frame: Frame
  score: number
  contributions: Contribution[]
}

export function rankFrames(frames: Frame[], weights: Weights): Match[] {
  const axes = normalizeAxes(frames)
  return frames
    .map((frame) => {
      const a = axes.get(frame.id)!
      const contributions: Contribution[] = []
      for (const ax of AXES) {
        const w = weights[ax]
        // Centre axes on 0.5 so negative weights penalise high values and reward low ones.
        if (w) contributions.push({ key: ax, points: w * (a[ax] - 0.5) * 2 })
      }
      // Multi-role frames get their best role in full and a smaller share of the rest,
      // so two-role frames don't win just by having more tags.
      const roleHits = ROLES.filter((r) => weights[r] && frame.mechtype.includes(r))
        .map((r) => ({ key: r as WeightKey, points: weights[r]! }))
        .sort((x, y) => y.points - x.points)
      roleHits.forEach((h, i) => contributions.push({ key: h.key, points: i === 0 ? h.points : h.points * 0.35 }))
      for (const m of MAKERS) {
        const w = weights[m]
        if (w && frame.source === m) contributions.push({ key: m, points: w })
      }
      const score = contributions.reduce((t, c) => t + c.points, 0)
      return { frame, score, contributions }
    })
    .sort((x, y) => y.score - x.score || x.frame.name.localeCompare(y.frame.name))
}

/** Top picks plus a wildcard from a manufacturer not already in the top picks. */
export function pickResults(ranked: Match[], count = 3): { top: Match[]; wildcard?: Match } {
  const top = ranked.slice(0, count)
  const makers = new Set(top.map((m) => m.frame.source))
  const wildcard = ranked.slice(count).find((m) => !makers.has(m.frame.source))
  return { top, wildcard }
}

/** Plain-language reasons from the biggest positive contributions. */
export function reasons(m: Match, max = 3): string[] {
  const s = m.frame.stats
  const text = (key: WeightKey): string => {
    switch (key) {
      case 'toughness':
        return `Built to take hits: ${s.hp} HP, ${s.armor} Armor, Size ${s.size}`
      case 'evasion':
        return `Hard to hit: Evasion ${s.evasion}`
      case 'mobility':
        return `Fast: Speed ${s.speed}`
      case 'tech':
        return `Strong electronic warfare: Tech Attack ${s.tech_attack >= 0 ? '+' : ''}${s.tech_attack}, E-Defense ${s.edef}`
      case 'heat':
        return `Runs hot and likes it: Heat Capacity ${s.heatcap}`
      case 'reach':
        return `Sees a long way: Sensors ${s.sensor_range}`
      case 'size':
        return s.size >= 2 ? `Big: Size ${s.size}` : `Small: Size ${s.size}`
      case 'GMS':
      case 'IPS-N':
      case 'SSC':
      case 'HORUS':
      case 'HA':
        return `Built by ${key}, the manufacturer your answers pointed to`
      default:
        return `${/^[AEIOU]/.test(key) ? 'An' : 'A'} ${key}, the role you leaned toward`
    }
  }
  const seen = new Set<string>()
  return m.contributions
    .filter((c) => c.points > 0.25)
    .sort((a, b) => b.points - a.points)
    .map((c) => text(c.key))
    .filter((t) => (seen.has(t) ? false : (seen.add(t), true)))
    .slice(0, max)
}
