# Campaign Layer Design

Status: draft · comes after the hex grid and questionnaire

Two tools: **faction rosters** for the mechs each faction fields, and a **story NPC tracker** for the people behind them.

Reference: [Gordian Blade, "Supercharge your Lancer campaign with faction rosters"](https://gordianblade.com/supercharge-your-lancer-campaign-with-faction-rosters/)

## Faction rosters

The idea, from the article: each faction gets a fixed menu of about nine NPC **builds**. A build is an NPC class plus two optional features, with a short designation like "Grenadier" or "Rifleman". Enemies repeat, so players learn them. Prep gets faster, because encounters are assembled from the menu. Templates (Grunt, Elite, Veteran, Commander) add variety on top.

### What the app does

- **Factions:** name, description, colors and emblem, and a GM-only notes field.
- **Roster builder:**
  - Pick 10–12 classes, with a running count by role against the suggested spread (≈3 Striker, 1 Artillery, 2 Defender, 2 Controller, 2 Support).
  - Add two optional features to each class.
  - Name each build.
  - Warn when two factions use the same designation.
- **Encounter builder:** pick builds from a roster, apply templates to individual units, and send the encounter to the hex board. Each unit keeps its faction colors and designation.
- **Off-roster units:** a "unique" flag for Big Bad mechs that don't belong on any menu.
- **Player view of rosters:**
  - The GM reveals a faction's roster when players earn it (e.g. a Gather Information downtime action).
  - Players see the builds and designations, but not stats or scan data.
  - Scanning a unit on the board can unlock its build's full stats for the table.

### NPC data

The NPC classes, features and templates are book content, and Massif's open data packages don't include the core NPC classes. The plan:

1. The GM loads NPC data by uploading the COMP/CON content files (`.lcp`) they own. We already read this format for frames.
2. Data stays in the GM's campaign. It's not bundled into the public site.

See [`open-questions.md`](open-questions.md): confirm which LCPs carry the core NPC classes.

## Story NPC tracker

For the named people in the campaign: rivals, contacts, faction officers, the Big Bad.

- **Profile:** name, callsign, faction, role, portrait slot, and an optional linked roster build or unique mech.
- **Status:** active, missing, captured, dead or unknown, with a history of changes ("Captured, session 4").
- **Attitude** toward the party: hostile / wary / neutral / friendly / ally, with history.
- **Relationships:** links to other NPCs and to player characters, each with a short note ("owes Vesper a favor").
- **Appearances:** the sessions and encounters they showed up in. When an NPC is placed on the board, the encounter is logged automatically.
- **Notes in two layers:**
  - What players know, which they can see.
  - GM-only secrets, which they can't.
- **Search and filters** by faction, status and last seen, so prep becomes "who haven't they seen in a while?"

## Sessions (light)

A simple session log of date, summary, encounters run and NPCs who appeared. It gives the tracker its timeline and helps players catch up.

## Data model sketch (Supabase)

```
factions          id, campaign_id, name, description, colors, emblem_url, gm_notes, revealed_to_players
roster_builds     id, faction_id, designation, npc_class_id, feature_ids[], notes, unique
npc_content       campaign_id, kind (class | feature | template), data (jsonb), source_lcp
story_npcs        id, campaign_id, name, callsign, faction_id, role, portrait_url, build_id,
                  status, attitude, player_notes, gm_notes
npc_history       npc_id, session_id, field (status | attitude), value, note
npc_relationships from_npc_id, to_npc_id | to_pilot_id, note
sessions          id, campaign_id, date, summary
appearances       npc_id, session_id, encounter_id
```

Encounter units created from a roster carry `build_id` and, when they're a named character, `story_npc_id`. That's how board events feed the tracker.

## Build order

1. Story NPC tracker and session log. No NPC rules data needed, so it's useful from session one.
2. LCP upload for NPC content.
3. Faction rosters and the roster builder.
4. Encounter builder → hex board.
5. Player-facing roster reveal and scan unlocks.
