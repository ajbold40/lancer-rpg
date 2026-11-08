# Lancer Table

Campaign tools for running a Lancer game: a frame-picker questionnaire for players and an online hex grid for turn-by-turn play.

## Stack

- Vite + React + TypeScript
- Supabase (auth, storage, realtime turn sync)
- Vercel for hosting
- Core game data from [`@massif/lancer-data`](https://github.com/massif-press/lancer-data)

## Getting started

```bash
npm install
cp .env.example .env.local   # add Supabase URL and anon key (optional for now)
npm run dev
```

## Roadmap

1. ~~Repo scaffold~~
2. Frame questionnaire: playstyle questions scored against frame roles and stats
3. Hex grid design doc: data model, rendering, realtime sync, MVP scope
4. Hex grid MVP: place units, move by Speed, turn order, HP/heat/structure tracking
5. Campaign layer: faction rosters, NPCs, COMP/CON pilot import

## Art and assets

- Frame artwork belongs to Massif Press. The `image_url` field in the data is not rendered unless Massif grants permission.
- Unit sprites are placeholders until sprite permissions are confirmed.

## License

This project is licensed under GPL-3.0-or-later (see `LICENSE`), matching `@massif/lancer-data`.

Lancer Table is not an official Lancer product; it is a third party work, and is not affiliated with Massif Press. Lancer Table is published via the Lancer Third Party License.

Lancer is copyright Massif Press.
