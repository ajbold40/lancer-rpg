import type { Maker } from '../data/lancer'

// "The Catch": what a license from each manufacturer costs, in our own words.
// Written from the LANCER Wiki (CC BY-SA 4.0) where marked; check everything against the books.
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
      "The state's own manufacturer: standard, reliable, accountable to Union. The cleanest option on the board, though Union's own history isn't spotless, and the old regime it replaced is where Harrison Armory came from.",
    verified: false,
  },
  HA: {
    headline: 'An empire with a recruiting office',
    body:
      "Founded by loyalists of Union's old imperialist regime. Armory annexation teams negotiate with a world first and are cleared to use force when talks fail. In Armory territory, citizenship is mostly earned through military service.",
    verified: true,
  },
  HORUS: {
    headline: 'Nobody knows who you work for',
    body:
      "No known leadership, no accountability. HORUS leaks dangerous software onto the open network, hands operatives contradictory orders, and has wiped agents' memories after the job. Licenses tend to open up when another holder dies.",
    verified: true,
  },
  SSC: {
    headline: 'An exclusive club',
    body:
      'Elite, bespoke and expensive. The catch is who gets let in, and what "perfecting" a pilot costs.',
    verified: false,
  },
  'IPS-N': {
    headline: 'The company that owns the shipping lanes',
    body:
      'The galaxy runs on its cargo. The catch is how much power comes with controlling what moves and who it reaches.',
    verified: false,
  },
}
