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
events        id, encounter_id, seq, actor_user_id, type, payload (jsonb), created_at
```

- Unit **current** values (position, HP, heat, statuses) come from replaying events, cached in a `unit_state` view or table for fast loads.
- `seq` is a per-encounter counter, so clients can detect gaps and refetch.
- **Row-level security:** players can insert events only for units they own, during that unit's turn. The GM can insert anything. Everyone in the campaign can read.

## Coordinates and rendering

- **Axial hex coordinates** `(q, r)`, using `honeycomb-grid` for the math (neighbors, distance, rings, pathfinding).
- **SVG** to start. It's easy to style, theme and click, and fine for the few hundred hexes a Lancer map uses. Switch to PixiJS only if performance demands it.
- Pan and zoom; mobile works but desktop is the primary target.
- Tokens are placeholder hexes with the frame name and side color until sprite permission comes through. Then they take sprites keyed by frame or unit.

### Size on a hex grid

Lancer units are Size ½, 1, 2 or 3. We need to decide how many hexes Size 2 and 3 occupy. A common hex convention is 1 hex for Size ½–1, a 3-hex cluster for Size 2, and a 7-hex flower for Size 3. **Check against the core book before building.**

## Movement (assist)

- Click your unit to show reachable hexes up to its Speed, with difficult terrain costing double and blocking terrain impassable.
- Boost shows a second, lighter ring.
- Moving out of engagement and into new engagement is flagged, not blocked.
- The GM can drag anything anywhere.

## Auth and identity

- Supabase Auth with **Discord login** (likely where the group already is) or email magic links.
- A player joins a campaign by invite link, then claims their unit. GM is whoever created the campaign.

## Async play

- Turn notifications: start with a **Discord webhook** post ("Your turn, Goblin") in the campaign channel. Email can come later.
- The GM can set a turn timer, or advance a stalled turn manually.

## Importing from COMP/CON

COMP/CON exports pilots and mechs as JSON. Importing a mech fills in the unit's frame, Size, Speed and max stats, so nobody retypes them. This is v1.5: until then, the GM picks a frame from the data and the app uses its base stats.

## Milestones

1. **Board, local only.** Render a map, paint terrain, place tokens, show move range. No backend. Proves out the hex math and the UI.
2. **Shared table.** Supabase project, auth, campaigns, the events table, realtime sync, turn tracker, players moving their own units.
3. **Tracking.** HP, heat, structure, stress, statuses, combat log, GM undo.
4. **Async.** Discord turn notifications, turn timer.
5. **COMP/CON import.**
6. **Automation modules**, one at a time, starting with whichever bookkeeping the table most wants handed off.

## Open questions

- Hex footprint for Size 2 and 3 (see above).
- Do maps need a background image in v1, or is painted terrain enough?
- Discord login, or email magic links?
- How should cover and line of sight be shown before they're automated: GM-placed markers, or terrain flags only?
- Which automation does the table want first? A quick poll after a session or two will answer this.
