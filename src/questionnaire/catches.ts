import type { Maker } from '../data/lancer'

// "The Catch": what a license from each manufacturer costs, in our own words.
// Checked against the Lancer core book: p117-118 (manufacturer intros), p346-347 (Union),
// p394-407 (People: Galactic Powers).
export interface Catch {
  headline: string
  body: string
  /** False until checked against the books. Unverified catches show a GM note. */
  verified: boolean
}

export const catches: Record<Maker, Catch> = {
  GMS: {
    headline: 'Union-issue',
    body:
      "The galactic standard: reliable, no-nonsense, and open to every pilot from day one. It's the cleanest option on the board, but it's still Union's kit, and Union's own past includes the Second Committee, an anthrochauvinist government whose colonial reconquests today's Union has renounced.",
    verified: true,
  },
  HA: {
    headline: 'An empire with a recruiting office',
    body:
      "Founded by an officer of Union's deposed anthrochauvinist regime and now an imperial power of billions. Armory teams occupy a world while annexation talks run, and are cleared to set up green zones and remove anti-Armory leaders if talks break down. For colonial subjects, a tour in the legions is the road to citizenship.",
    verified: true,
  },
  HORUS: {
    headline: 'Nobody knows who you work for',
    body:
      'No known leadership and no stated goal. Its operatives get cryptic, contradictory directives, sometimes with a promise that the memory of the job will be wiped afterward. Pilots whisper that a HORUS license only opens up when the last holder dies.',
    verified: true,
  },
  SSC: {
    headline: 'You are the product',
    body:
      "Behind the luxury brand, SSC's real business is human genetic material. Its member worlds are steered by cultural manipulation and coercion to breed best-fit bloodlines for colony buyers, complete with routine sampling and arranged couplings. Its covert teams hunt promising populations, whatever war is going on around them.",
    verified: true,
  },
  'IPS-N': {
    headline: 'Growth keeps the lights on',
    body:
      "The oldest name in shipping, built on worker-owned co-ops and anti-piracy work, and trusted almost everywhere. But the company needs growth to survive, and right now that growth comes from hauling for Harrison Armory's expansion while the Armory puts down colonial uprisings. Some of the board worry about the brand; the money keeps coming.",
    verified: true,
  },
}
