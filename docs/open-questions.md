# Open Questions

One list for everything waiting on someone. Tick items off as they're settled, and note the answer.

## Check in the books

- [x] **Size 2 and 3 footprints on a hex grid.** Core book p59: SIZE N occupies N spaces on all sides; under SIZE 1 rounds up to 1 hex. So 3 hexes (2 across) for Size 2 and 7 (3 across) for Size 3, as drafted.
- [x] **Does hard cover block movement?** Core book p62: obstruction is by SIZE. Solid objects and characters the same SIZE or larger block; smaller ones can be passed through, and nobody ends a move in an occupied space. The board now treats hard cover as a Size 1 object (`HARD_COVER_SIZE` in `src/table/movement.ts`). Soft cover doesn't block.
- [x] **Engagement and movement.** Core book p62: becoming ENGAGED by a hostile of equal or greater SIZE ends the move immediately; already being engaged doesn't stop further movement. Hostiles also obstruct only if they're the same SIZE or larger. All now applied in move range.
- [x] **Manufacturer "catch" blurbs.** Rewritten from the core book (p117–118, p346–347, p394–407) in our own words; all five marked verified. Two fixes to the earlier wiki-based drafts: HA citizenship-through-service applies to colonial subjects, and the HORUS "leaks dangerous software" line was dropped as unconfirmed.
- [ ] **Where the core NPC classes come from.** They're in the core book (classes p284–321, templates p326–333) but not in Massif's open data packages. Check which COMP/CON content file (`.lcp`) that came with the book purchase includes them.

**Reading the books:** Google Drive only returns text for the first 101 pages of a PDF and won't hand over files above 10 MB, so attach full PDFs to the chat directly. The core book has been read this way.

## Permissions to ask for

- [ ] **Retrograde Minis:** using their sprites in the online grid. (AJ is emailing them.)
- [ ] **Massif Press:** showing frame art in the questionnaire. If they say yes, set `VITE_SHOW_FRAME_ART=true` in Vercel and redeploy.
- [ ] **COMP/CON devs:** whether a fan tool can look up pilot share codes. Ask in #comp-con or #lancer-vtt on the LANCER Discord.

## Design decisions

- [ ] **Climbing and falling details.** The board charges +2 per level climbed and flags drops of 3+. Jumping, climb checks (HULL/AGILITY) and actual fall damage are left to the table for now.

- [x] Do maps need a background image in v1? Yes: published maps are art with a hex grid. Built in Milestone 1.5 with grid calibration.
- [ ] How should cover and line of sight be shown before they're automated: GM-placed markers, or terrain only?
- [ ] Which automation does the table want first? Poll after a session or two.

## Setup and admin

- [ ] Point `lancer.boldenink.com` (or another subdomain) at the site. boldenink.com is confirmed, managed in Squarespace.
- [ ] Pick the app's real name to replace "Lancer Table".
- [ ] Supabase project and Discord application for Milestone 2.
