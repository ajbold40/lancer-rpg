import type { FrameRole, Maker } from '../data/lancer'

/** Playstyle axes, each scored 0–1 per frame from its stats (see scoring.ts). */
export type Axis = 'toughness' | 'evasion' | 'mobility' | 'tech' | 'heat' | 'reach' | 'size'

export type WeightKey = Axis | FrameRole | Maker

export type Weights = Partial<Record<WeightKey, number>>

export interface Option {
  label: string
  weights: Weights
}

export interface Question {
  id: string
  prompt: string
  options: Option[]
}

export const questions: Question[] = [
  {
    id: 'position',
    prompt: 'When the shooting starts, where are you?',
    options: [
      { label: 'Front line, in their face', weights: { toughness: 1.5, Striker: 1, Defender: 1, reach: -1 } },
      { label: 'Mid-range, picking my fights', weights: { Striker: 0.5, Controller: 0.5, Balanced: 1 } },
      { label: "Far back, where nobody's looking", weights: { reach: 2, Artillery: 1.5 } },
      { label: "Wherever I'm needed, moving constantly", weights: { mobility: 2, evasion: 0.5 } },
    ],
  },
  {
    id: 'missile',
    prompt: "A missile's coming at you. You…",
    options: [
      { label: "Tank it. That's what armor is for.", weights: { toughness: 2, evasion: -1 } },
      { label: "Aren't there anymore.", weights: { evasion: 2, mobility: 1, toughness: -1 } },
      { label: 'Hack it out of the sky.', weights: { tech: 2 } },
    ],
  },
  {
    id: 'great-turn',
    prompt: 'What does a great turn look like?',
    options: [
      { label: 'One huge hit that deletes something', weights: { Striker: 2 } },
      { label: "The enemy can't do what they planned", weights: { Controller: 2 } },
      { label: 'My team survives because of me', weights: { Support: 1.5, Defender: 1.5 } },
      { label: 'Raining fire from across the map', weights: { Artillery: 2, reach: 1 } },
    ],
  },
  {
    id: 'risk',
    prompt: 'How do you feel about risk?',
    options: [
      { label: 'Push the reactor. Overheating is worth it.', weights: { heat: 2, HA: 0.5 } },
      { label: "Calculated. I'll gamble if it pays.", weights: { heat: 0.5 } },
      { label: 'Safe and reliable, every time.', weights: { toughness: 0.5, GMS: 0.5, 'IPS-N': 0.5, heat: -0.5 } },
    ],
  },
  {
    id: 'bookkeeping',
    prompt: 'How much bookkeeping do you want on your turn?',
    options: [
      { label: 'Give me lots of moving parts', weights: { tech: 0.5, Controller: 1, HORUS: 1 } },
      { label: "Some, if it's fun", weights: { Balanced: 0.5 } },
      { label: 'Keep it simple. I want to roll dice.', weights: { Striker: 1, 'IPS-N': 1, tech: -1 } },
    ],
  },
  {
    id: 'body',
    prompt: 'Your mech is…',
    options: [
      { label: 'Massive. A walking fortress.', weights: { size: 2, toughness: 1 } },
      { label: 'Close to human-sized, and nimble', weights: { size: -1.5, evasion: 1, mobility: 1 } },
      { label: "Doesn't matter. It's what it does.", weights: { Balanced: 0.5 } },
    ],
  },
  {
    id: 'fantasy',
    prompt: 'Pick a fantasy.',
    options: [
      { label: 'A pirate brawler with a harpoon', weights: { 'IPS-N': 2, Striker: 1 } },
      { label: 'A precision duelist: elite and expensive', weights: { SSC: 2, evasion: 1 } },
      { label: 'A glitch-witch bending reality', weights: { HORUS: 2, tech: 0.5 } },
      { label: 'An imperial war machine', weights: { HA: 2, heat: 1, Artillery: 0.5 } },
    ],
  },
  {
    id: 'rescue',
    prompt: "Your team's in trouble. You…",
    options: [
      { label: 'Step in front of the guns', weights: { Defender: 2, toughness: 1 } },
      { label: 'Patch them up and get them repositioned', weights: { Support: 2 } },
      { label: "Lock down whatever's hurting them", weights: { Controller: 2 } },
      { label: 'Kill it faster', weights: { Striker: 2 } },
    ],
  },
  {
    id: 'ewar',
    prompt: 'Electronic warfare is…',
    options: [
      { label: 'My whole thing', weights: { tech: 2.5, HORUS: 0.5 } },
      { label: 'A nice tool to have', weights: { tech: 0.75 } },
      { label: 'Something that happens to other people', weights: { tech: -1.5, toughness: 0.5 } },
    ],
  },
  {
    id: 'reputation',
    prompt: 'How do you want enemies to feel about you?',
    options: [
      { label: 'Terrified to get close', weights: { Striker: 1, toughness: 1 } },
      { label: 'Unable to find you', weights: { evasion: 1.5, mobility: 0.5 } },
      { label: 'Like nothing they do works', weights: { Controller: 1.5, tech: 0.5 } },
      { label: 'Like killing your friends is pointless', weights: { Support: 1.5, Defender: 1 } },
    ],
  },
  {
    id: 'strings',
    prompt: 'Every license comes with strings. Which can you live with?',
    options: [
      { label: "Working for an empire that annexes worlds, as long as I'm the best-armed person there", weights: { HA: 2 } },
      { label: "Gear from people I'll never meet, with instructions that don't add up", weights: { HORUS: 2 } },
      { label: 'Paying a premium to an exclusive club that decides who is worthy', weights: { SSC: 2 } },
      { label: 'Making a megacorp richer, because the cargo has to move', weights: { 'IPS-N': 2 } },
      { label: "None of it. I'll stick with Union-issue.", weights: { GMS: 3, Balanced: 1 } },
    ],
  },
]
