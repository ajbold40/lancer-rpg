# Open Questions

One list for everything waiting on someone. Tick items off as they're settled, and note the answer.

## Check in the books

- [ ] **Size 2 and 3 footprints on a hex grid.** The draft rule is 3 hexes for Size 2 and 7 for Size 3. Change in `footprint()` in `src/table/hex.ts`.
- [ ] **Does hard cover block movement?** Right now cover is passable and only blocking terrain stops movement. Change in `src/table/movement.ts`.
- [ ] **Engagement and movement.** The board flags hexes where you'd become engaged but doesn't stop you there. Check when engagement ends a move (e.g. Size comparisons) before that becomes automation.
- [ ] **Manufacturer "catch" blurbs for SSC and IPS-N**, plus the GMS/Union line. They're marked as drafts on the results page. Edit in `src/questionnaire/catches.ts` and set `verified: true`.

- [ ] **Where the core NPC classes come from.** They're not in Massif's open data packages. Check which COMP/CON content files (`.lcp`) that come with the books include NPC classes, features and templates.

## Permissions to ask for

- [ ] **Retrograde Minis:** using their sprites in the online grid. (AJ is emailing them.)
- [ ] **Massif Press:** showing frame art in the questionnaire. If they say yes, set `VITE_SHOW_FRAME_ART=true` in Vercel and redeploy.
- [ ] **COMP/CON devs:** whether a fan tool can look up pilot share codes. Ask in #comp-con or #lancer-vtt on the LANCER Discord.

## Design decisions

- [ ] Do maps need a background image in v1, or is painted terrain enough?
- [ ] How should cover and line of sight be shown before they're automated: GM-placed markers, or terrain only?
- [ ] Which automation does the table want first? Poll after a session or two.

## Setup and admin

- [ ] Point a domain at the site (e.g. `lancer.boldenink.com`) once the boldenink.com account is found.
- [ ] Pick the app's real name to replace "Lancer Table".
- [ ] Supabase project and Discord application for Milestone 2.
