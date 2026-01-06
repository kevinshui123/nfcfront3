import React, { useEffect, useRef } from 'react'

function loadAnime(cb) {
  if (window.anime) return cb()
  const s = document.createElement('script')
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js'
  s.onload = cb
  s.onerror = cb
  document.head.appendChild(s)
}

export default function ComplexSVGLogo({ text = 'AI Generated', startDelay = 3 }) {
  // use provided text prop, default to 'AI Generated'
  // startDelay allows callers to control when chars begin animating (seconds)
  const chars = Array.from(text)

  // compute per-char delay: start after startDelay, stagger each char (startDelay + index/6 s)
  const spans = chars.map((ch, i) => {
    const delay = startDelay + (i / 6)
    return (
      <span
        key={i}
        className="smoky-char"
        style={{ animationDelay: `${delay}s` }}
      >
        {ch === ' ' ? '\u00A0' : ch}
      </span>
    )
  })

  return (
    <div className="smoky-root" aria-hidden="false" style={{ textAlign: 'center' }}>
      <h3 className="smoky-heading" style={{ fontFamily: '"Finger Paint", Ma Shan Zheng, cursive, sans-serif', margin: 0 }}>
        {spans}
      </h3>
    </div>
  )
}


