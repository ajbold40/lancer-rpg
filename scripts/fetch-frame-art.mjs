// Downloads Massif's frame art into public/frames/<frame id>.png at build time.
// Runs only when VITE_SHOW_FRAME_ART=true, which should stay off until Massif grants permission.
// public/frames is git-ignored: the art is served by the deployed site, never committed.
import { readFile, mkdir, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'

if (process.env.VITE_SHOW_FRAME_ART !== 'true') {
  console.log('Frame art: off (VITE_SHOW_FRAME_ART is not "true"). Skipping download.')
  process.exit(0)
}

const packages = [
  'lancer-data',
  'long-rim-data',
  'ktb-data',
  'wallflower-data',
  'dustgrave-data',
  'sotw-data',
  'osr-data',
  'ssmr-data',
  'ows-data',
]

const outDir = join('public', 'frames')
await mkdir(outDir, { recursive: true })

let saved = 0
let skipped = 0
const failed = []

for (const pkg of packages) {
  const file = join('node_modules', '@massif', pkg, 'lib', 'frames.json')
  const frames = JSON.parse(await readFile(file, 'utf8'))
  for (const f of frames) {
    if (!f.image_url || f.image_url.includes('nodata')) {
      skipped++
      continue
    }
    const dest = join(outDir, `${f.id}.png`)
    try {
      await access(dest)
      saved++
      continue // already downloaded
    } catch {
      // not there yet
    }
    try {
      const res = await fetch(f.image_url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await writeFile(dest, Buffer.from(await res.arrayBuffer()))
      saved++
    } catch (err) {
      failed.push(`${f.name}: ${err.message}`)
    }
  }
}

console.log(`Frame art: ${saved} saved, ${skipped} without art, ${failed.length} failed.`)
for (const line of failed) console.warn(`  ${line}`)
// Never fail the build over art: cards just render without an image.
