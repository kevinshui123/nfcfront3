import React, { useEffect, useRef } from 'react'

function loadAnime(cb) {
  if (window.anime) return cb()
  const s = document.createElement('script')
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js'
  s.onload = cb
  s.onerror = cb
  document.head.appendChild(s)
}

export default function AnimatedSVGHeading({ text }) {
  const containerRef = useRef(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    // create svg
    el.innerHTML = ''
    const svgNS = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(svgNS, 'svg')
    svg.setAttribute('viewBox', '0 0 800 120')
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
    svg.classList.add('subtitle-svg')

    const txt = document.createElementNS(svgNS, 'text')
    txt.setAttribute('x', '50%')
    txt.setAttribute('y', '60%')
    txt.setAttribute('text-anchor', 'middle')
    txt.setAttribute('font-family', 'Inter, system-ui, -apple-system, "Segoe UI", Roboto')
    txt.setAttribute('font-weight', '700')
    txt.setAttribute('font-size', '48')
    txt.setAttribute('fill', 'none')
    txt.setAttribute('stroke', '#ffffff')
    txt.setAttribute('stroke-width', '2')
    txt.classList.add('path')
    txt.textContent = text
    svg.appendChild(txt)
    el.appendChild(svg)

    loadAnime(() => {
      try {
        const paths = svg.querySelectorAll('.path')
        if (!paths || !paths.length) return
        if (window.anime) {
          window.anime({
            targets: paths,
            loop: true,
            direction: 'alternate',
            strokeDashoffset: [window.anime.setDashoffset, 0],
            easing: 'easeInOutSine',
            duration: 900,
            delay: (el, i) => i * 200
          })
        }
      } catch (e) { console.warn(e) }
    })

    return () => { el.innerHTML = '' }
  }, [text])

  return <div ref={containerRef} style={{ width: '100%', maxWidth: 520 }} />
}


