import React, { useEffect, useRef } from 'react'

export default function AnimatedStrokeText({ text, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // trigger animation
    el.classList.remove('running')
    // force reflow
    void el.offsetWidth
    el.classList.add('running')
  }, [text])

  return (
    <svg ref={ref} className={`stroke-text ${className}`} viewBox="0 0 800 120" preserveAspectRatio="xMidYMid meet" role="img" aria-label={text}>
      <text x="50%" y="60%" textAnchor="middle" fontFamily="Inter, system-ui, -apple-system, 'Segoe UI', Roboto" fontWeight="700" fontSize="48">
        {text}
      </text>
    </svg>
  )
}


