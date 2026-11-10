# Hex Grid Design

Status: draft for review · Nov 2026

## Goals

- A shared hex battle map for Lancer encounters, played **live on a call or async over days**.
- **Players move their own mechs**; the GM controls NPCs, terrain and anything else.
- **Assist, don't enforce** to start: show what's legal, track resources, never block the GM.
- **Scale to automation** one piece at a time, so a player who doesn't want to do the heat math can turn on "do it for me" without anyone else changing how they play.

## Non-goals (for now)

- Character building. That's COMP/CON's job; we import from it.
- Full attack resolution, line of sight and cover math in v1.
- Map art. v1 maps are painted terrain on a hex grid, with an optional background image.

## Turn structure

Lancer has no initiative rolls. Each round, the players choose who goes first, then activations alternate between the player side and the GM side. Every character acts once per round. When one side runs out, the other side finishes.

The app tracks:
- round number
- which side is up
- which units have activated this round
- the unit currently taking its turn

Players can only move their own unit, and only during its turn. The GM can move anything at any time.

## Core idea: everything is an event

Every change to the board is an **event** appended to a log: `move`, `damage`, `heat`, `status_add`, `end_turn`, and so on. The current board state is built by applying events in order.

This one decision gives us most of what you asked for:

| Need | How events cover it |
|---|---|
| Live play | Clients subscribe to new events and apply them as they arrive. |
| Async play | The log *is* the history. Someone opening the app days later sees exactly what happened. |
| Undo | Revert the last event (GM only). |
| Combat log | Render the events as text: "Goblin moved 4 spaces · took 3 heat." |
| Automation later | A rules module reads an event, works out the consequences, and emits more events. With automation off, a human enters those same events by hand. The board never knows which one did it. |

### Automation as switches

Each piece of rules help is a module with three modes: **off**, **assist** (suggest, a human confirms), and **auto** (apply automatically). The mode can be set per table, with per-player overrides.

| Module | Assist | Auto |
|---|---|---|
| Movement range | Highlight reachable hexes | — |
| Engagement | Flag units that became engaged | Apply the movement stop |
| Heat | Show heat after an action | Add heat, roll overheating |
| Damage | Suggest damage after armor/resistance | Apply it, roll structure |
| Status timers | Remind at end of turn | Tick and expire statuses |

v1 ships movement range and engagement in assist mode. Everything else is manual tracking.

## Data model (Supabase)

```
campaigns     id, name, gm_user_id
members       campaign_id, user_id, role (gm | player), display_name
encounters    id, campaign_id, name, map_id, status (setup | active | done)
maps          id, campaign_id, name, radius or width/height, background_url
terrain       map_id, q, r, kind (blocking | difficult | cover_soft | cover_hard | ...)
units         id, encounter_id, side (pc | npc), owner_user_id, name, frame_id,
              size, speed, + max stats snapshot (hp, heatcap, structure, stress, evasion, edef...)
events        id, encounter_id, seq, actor_user_id, on_behalf_of_user_id, type, payload (jsonb), created_at
```

- Unit **current** values (position, HP, heat, statuses) come from replaying events, cached in a `unit_state` view or table for fast loads.
- `seq` is a per-encounter counter, so clients can detect gaps and refetch.
- **Row-level security:** players can insert events only for units they own, during that unit's turn. The GM can insert anything. Everyone in the campaign can read.

## Coordinates and rendering

- **Axial hex coordinates** `(q, r)`, flat-top. The math is hand-rolled in `src/table/hex.ts` (about 100 lines, unit-tested) instead of pulling in a library.
- **Isometric (2.5D) view** to suit front-facing standee sprites: hexes are squashed vertically, blocking terrain and cover are drawn as raised blocks, and units are upright standees drawn back to front. The view rotates in 60° steps so nothing stays hidden behind tall terrain.
- **SVG** to start. It's easy to style, theme and click, and fine for the few hundred hexes a Lancer map uses. Switch to PixiJS only if performance demands it.
- Pan and zoom; mobile works but desktop is the primary target.
- Tokens are placeholder hexes with the frame name and side color until sprite permission comes through. Then they take sprites keyed by frame or unit.

### Size on a hex grid

Lancer units are Size ½, 1, 2 or 3. We need to decide how many hexes Size 2 and 3 occupy. Core p59: SIZE N occupies N spaces on all sides. On hexes that's 1 hex for Size ½–1, a 3-hex triangle for Size 2, and a 7-hex flower for Size 3.

## Movement (assist)

- Click your unit to show reachable hexes up to its Speed, with difficult terrain costing double and blocking terrain impassable.
- Boost shows a second, lighter ring.
- Moving out of engagement and into new engagement is flagged, not blocked.
- Obstruction is by Size (core p62): hostiles and hard cover (treated as Size 1) block units their Size or smaller; bigger units pass through but can't stop there. Becoming engaged by an equal or larger hostile ends the move.
- The GM can drag anything anywhere.

## Auth and identity

- **Discord login** through Supabase Auth.
- A player joins a campaign by invite link, then claims their unit. The GM is whoever created the campaign.
- Units don't have to be claimed. An unclaimed PC unit is controlled by the GM.

### GM proxy (couch play)

When players are in the same room, they shouldn't all need to log in. The GM can **act as any player**:

- A "Playing as" switcher in the GM's view picks which player's unit the GM is driving. The turn rules then apply as if that player were acting.
- Events record both the person who did it and who it was for: `actor_user_id` (the GM) and `on_behalf_of` (the player, or null). The combat log shows "Goblin moved (via GM)".
- A player can log in mid-session and take over their unit without anything else changing.
- Mixed tables work: two players at the GM's house on the GM's screen, one remote player on their own device.

## Async play

- Turn notifications: start with a **Discord webhook** post ("Your turn, Goblin") in the campaign channel. Email can come later.
- The GM can set a turn timer, or advance a stalled turn manually.

## Importing from COMP/CON

Reference: [COMP/CON FAQ: Sharing Pilots](https://github.com/massif-press/compcon/wiki/Frequently-Asked-Questions#sharing-pilots).

COMP/CON stays the source of truth for **builds** (pilot, frame, loadout, talents). This app owns **combat state** (position, HP, heat, statuses). Import flows one way, from COMP/CON into the unit.

1. **File import (planned).** COMP/CON's "Export Pilot" downloads a pilot `.json` with no account needed. The player uploads it and picks which mech to bring. That fills in frame, Size, Speed and max stats. The format is COMP/CON's own and documented by the lancer-data spec.
2. **Share code (to investigate).** COMP/CON accounts can generate a 6-character share code (valid 90 days), and Foundry's Lancer system imports by code. Resolving a code means calling COMP/CON's cloud backend, which has no published API. Ask in the LANCER Discord (#comp-con or #lancer-vtt) before building against it.
3. **Re-sync between sessions.** After a level-up, re-import and the unit's max stats and loadout update. Combat state is untouched.

### Pilot roster page

COMP/CON has no public link to a pilot, so the site keeps its own copies:

- Each player uploads their pilot export once. The roster shows a card per pilot with callsign, frame, loadout and License Level, and players re-upload after a level-up. This is the same import the board uses.
- A card can also hold the player's COMP/CON **share code**, so teammates can pull the full sheet into their own COMP/CON.
- If share-code lookups are approved later, the roster could refresh itself from the code instead of needing re-uploads.

## Milestones

1. **Board, local only.** ✅ Done: isometric map, terrain painting, unit placement by frame, move range with Boost, engagement flags, rotation, undo. Saved in the browser.
2. **Shared table.** Supabase project, Discord login, campaigns, the events table, realtime sync, turn tracker, players moving their own units, GM proxy.
3. **Tracking.** HP, heat, structure, stress, statuses, combat log, GM undo.
4. **Async.** Discord turn notifications, turn timer.
5. **COMP/CON import:** pilot file first, share codes if the devs are OK with it.
6. **Automation modules**, one at a time, starting with whichever bookkeeping the table most wants handed off.

## Open questions

Tracked in [`open-questions.md`](open-questions.md), along with book checks and permissions.
