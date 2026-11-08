// GM settings for this campaign. Turn books off to keep their frames out of the
// Frames list and the questionnaire.
import { allFrames, type BookId } from '../data/lancer'

export const booksInPlay: Record<BookId, boolean> = {
  core: true,
  'long-rim': true,
  ktb: true,
  wallflower: true,
  dustgrave: true,
  sotw: true,
  osr: true,
  ssmr: true,
  ows: true,
}

export const frames = allFrames.filter((f) => booksInPlay[f.book])

// Frame art belongs to Massif Press. Leave this off until you have their permission.
// Turning it on: set VITE_SHOW_FRAME_ART=true in Vercel's environment variables.
// The build then downloads the art into public/frames (git-ignored) so it is served
// by the site but never committed to the public repo.
export const showFrameArt = import.meta.env.VITE_SHOW_FRAME_ART === 'true'
