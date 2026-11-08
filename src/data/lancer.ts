// Lancer frame data from Massif Press's published COMP/CON packages (all GPL-3.0-or-later).
// Core book: @massif/lancer-data. Each supplement ships its own player-facing package.
import coreFrames from '@massif/lancer-data/lib/frames.json'
import longRimFrames from '@massif/long-rim-data/lib/frames.json'
import ktbFrames from '@massif/ktb-data/lib/frames.json'
import wallflowerFrames from '@massif/wallflower-data/lib/frames.json'
import dustgraveFrames from '@massif/dustgrave-data/lib/frames.json'
import sotwFrames from '@massif/sotw-data/lib/frames.json'
import osrFrames from '@massif/osr-data/lib/frames.json'
import ssmrFrames from '@massif/ssmr-data/lib/frames.json'
import owsFrames from '@massif/ows-data/lib/frames.json'

export type FrameRole =
  | 'Striker'
  | 'Controller'
  | 'Defender'
  | 'Support'
  | 'Artillery'
  | 'Balanced'

export type Maker = 'GMS' | 'IPS-N' | 'SSC' | 'HORUS' | 'HA'

export interface FrameStats {
  size: number
  structure: number
  stress: number
  armor: number
  hp: number
  evasion: number
  edef: number
  heatcap: number
  repcap: number
  sensor_range: number
  tech_attack: number
  save: number
  speed: number
  sp: number
}

export type BookId =
  | 'core'
  | 'long-rim'
  | 'ktb'
  | 'wallflower'
  | 'dustgrave'
  | 'sotw'
  | 'osr'
  | 'ssmr'
  | 'ows'

export interface Frame {
  id: string
  name: string
  source: Maker
  license_level: number
  mechtype: FrameRole[]
  stats: FrameStats
  /** Name of the base frame this is a variant of, if any. */
  variant?: string
  // image_url points at Massif artwork. Don't render it without Massif's permission.
  image_url?: string
  book: BookId
}

export const books: Record<BookId, string> = {
  core: 'Core Book',
  'long-rim': 'The Long Rim',
  ktb: 'Karrakin Trade Baronies',
  wallflower: 'No Room for a Wallflower',
  dustgrave: 'Dustgrave',
  sotw: 'Shadow of the Wolf',
  osr: 'Operation Solstice Rain',
  ssmr: "Siren's Song: A Mountain's Remorse",
  ows: 'Operation Winter Scar',
}

const raw: [BookId, unknown][] = [
  ['core', coreFrames],
  ['long-rim', longRimFrames],
  ['ktb', ktbFrames],
  ['wallflower', wallflowerFrames],
  ['dustgrave', dustgraveFrames],
  ['sotw', sotwFrames],
  ['osr', osrFrames],
  ['ssmr', ssmrFrames],
  ['ows', owsFrames],
]

export const allFrames: Frame[] = raw.flatMap(([book, list]) =>
  (list as Omit<Frame, 'book'>[]).map((f) => ({ ...f, book })),
)

export const manufacturers: Record<Maker, string> = {
  GMS: 'General Massive Systems',
  'IPS-N': 'IPS-Northstar',
  SSC: 'Smith-Shimano Corpro',
  HORUS: 'HORUS',
  HA: 'Harrison Armory',
}

/** How a pilot gets this frame, in plain words. */
export function licensePath(f: Frame): string {
  if (f.license_level === 0 && f.book === 'core')
    return 'Available from the start: every pilot has GMS gear at License Level 0.'
  if (f.license_level === 0)
    return `A GMS frame from ${books[f.book]}. Ask your GM how it's unlocked in this campaign.`
  if (f.variant)
    return `A variant of the ${f.variant}. It unlocks at rank ${f.license_level} of the ${f.variant} license, if your GM is using ${books[f.book]}.`
  return `Unlocks at rank ${f.license_level} of the ${f.name} license (${manufacturers[f.source]}).`
}
