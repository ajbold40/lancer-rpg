import { useState } from 'react'
import type { Frame } from '../data/lancer'
import { showFrameArt } from '../config/campaign'

/** Frame art from public/frames, shown only when the art switch is on. Hides itself if missing. */
export default function FrameArt({ frame }: { frame: Frame }) {
  const [missing, setMissing] = useState(false)
  if (!showFrameArt || missing) return null
  return (
    <div className="frame-art">
      <img
        src={`/frames/${frame.id}.png`}
        alt={`${frame.name} frame art`}
        loading="lazy"
        onError={() => setMissing(true)}
      />
    </div>
  )
}
