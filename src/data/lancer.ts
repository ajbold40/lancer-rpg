// Core Lancer data from @massif/lancer-data (GPL-3.0-or-later, Massif Press).
// Supplement content (Long Rim, KTB, etc.) ships as .lcp files and is not included here.
import framesJson from '@massif/lancer-data/lib/frames.json'

export type FrameRole =
  | 'Striker'
  | 'Controller'
  | 'Defender'
  | 'Support'
  | 'Artillery'
  | 'Balanced'

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

export interface Frame {
  id: string
  name: string
  source: string // manufacturer code: GMS, IPS-N, SSC, HORUS, HA
  license_level: number
  mechtype: FrameRole[]
  stats: FrameStats
  // image_url points at Massif artwork. Don't render it without Massif's permission.
  image_url?: string
}

export const frames = framesJson as unknown as Frame[]

export const manufacturers: Record<string, string> = {
  GMS: 'General Massive Systems',
  'IPS-N': 'IPS-Northstar',
  SSC: 'Smith-Shimano Corpro',
  HORUS: 'HORUS',
  HA: 'Harrison Armory',
}
