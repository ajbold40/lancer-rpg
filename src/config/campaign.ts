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
