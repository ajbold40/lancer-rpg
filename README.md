# Lancer Table

Campaign tools for running a Lancer game: a frame-picker questionnaire for players and an online hex grid for turn-by-turn play.

## Stack

- Vite + React + TypeScript
- Supabase (auth, storage, realtime turn sync)
- Vercel for hosting
- Core and supplement game data from Massif's `@massif/*-data` packages (GPL-3.0-or-later). Turn books on or off in `src/config/campaign.ts`.

## Getting started

```bash
npm install
cp .env.example .env.local   # add Supabase URL and anon key (optional for now)
npm run dev
```

## Roadmap

1. ~~Repo scaffold~~
2. ~~Frame questionnaire v1~~: 11 questions, 55 frames (core + 8 supplements), manufacturer "catch" blurbs (checked against the core book).
3. Hex grid design doc: see [`docs/grid-design.md`](docs/grid-design.md) (draft)
4. Hex grid MVP:
   - ~~Milestone 1: local isometric board~~ (terrain, units, move range, engagement, rotation, undo)
   - ~~Milestone 1.5: real maps~~ (heights, zones, background art with grid calibration, pointy/flat hexes)
   - Milestone 2: Supabase, Discord login, realtime sync, turn tracker, GM proxy
   - Milestone 3: HP/heat/structure tracking, combat log
5. COMP/CON pilot import and a pilot roster page
6. Campaign layer: faction rosters, encounter builder, story NPC tracker. See [`docs/campaign-design.md`](docs/campaign-design.md) (draft)

## Open questions

Everything waiting on a book check, a permission or a decision is in [`docs/open-questions.md`](docs/open-questions.md).

## Art and assets

- Frame artwork belongs to Massif Press and is **off by default**. Once Massif grants permission, set `VITE_SHOW_FRAME_ART=true` in Vercel's environment variables and redeploy. The build then downloads the art into `public/frames/` (git-ignored), so it is served by the site but never committed to this public repo.
- Unit sprites are placeholders until sprite permissions are confirmed.

## License

This project is licensed under GPL-3.0-or-later (see `LICENSE`), matching `@massif/lancer-data`.

Lancer Table is not an official Lancer product; it is a third party work, and is not affiliated with Massif Press. Lancer Table is published via the Lancer Third Party License.

Lancer is copyright Massif Press.
