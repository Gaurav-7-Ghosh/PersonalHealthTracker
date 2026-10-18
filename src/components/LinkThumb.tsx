import { useState } from 'react'
import type { LinkRef } from '../types'
import { youtubeThumb } from '../util'
import { Icon } from './Icon'
import { Photo } from './ui'

/** Your cover image if you added one, else the YouTube thumbnail, else a play glyph. */
export function LinkThumb({ link, className = 'link-thumb' }: { link: LinkRef; className?: string }) {
  const src = link.thumb ?? youtubeThumb(link.url)
  const [failed, setFailed] = useState<string>()
  if (link.cover) return <Photo id={link.cover} alt="" className={className} />
  if (src && failed !== src) return <img src={src} alt="" className={className} loading="lazy" onError={() => setFailed(src)} />
  return (
    <span className={className + ' ph'}>
      <Icon name="play" size={18} />
    </span>
  )
}
