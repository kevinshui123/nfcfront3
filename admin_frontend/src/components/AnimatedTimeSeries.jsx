import React, { useEffect, useRef } from 'react'

// Simple animated SVG time-series line chart.
// Props:
// - data: array of numbers
// - width, height: dimensions
// - color: stroke color
export default function AnimatedTimeSeries({ data = [], width = 800, height = 200, color = '#66b0ff' }) {
  const pathRef = useRef(null)

  // normalize data to points
  const padding = 12
  const w = Math.max(200, width)
  const h = Math.max(80, height)
  const max = Math.max(1, ...data)
  const points = data.map((v, i) => {
    const x = padding + (i / Math.max(1, data.length - 1)) * (w - padding * 2)
    const y = padding + (1 - v / max) * (h - padding * 2)
    return [x, y]
  })

  const d = points.length > 0 ? points.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ') : ''

  useEffect(() => {
    const node = pathRef.current
    if (!node) return
    // prepare animation by stroke-dasharray
    const length = node.getTotalLength()
    node.style.strokeDasharray = length
    node.style.strokeDashoffset = length
    node.getBoundingClientRect() // force layout
    node.style.transition = 'stroke-dashoffset 1200ms cubic-bezier(.2,.9,.2,1)'
    node.style.strokeDashoffset = '0'
  }, [d])

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Time series chart">
      <defs>
        <linearGradient id="tsGrad" x1="0" x2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.92" />
          <stop offset="1" stopColor="#9bd1ff" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      {/* background grid lines */}
      <g stroke="rgba(255,255,255,0.03)" strokeWidth="1">
        <line x1={padding} x2={w - padding} y1={padding} y2={padding} />
        <line x1={padding} x2={w - padding} y1={h / 2} y2={h / 2} />
        <line x1={padding} x2={w - padding} y1={h - padding} y2={h - padding} />
      </g>
      {/* area under curve for subtle glow */}
      {d ? (
        <path d={d + ` L ${w - padding} ${h - padding} L ${padding} ${h - padding} Z`} fill="url(#tsGrad)" opacity="0.06" />
      ) : null}
      {/* animated line */}
      <path ref={pathRef} d={d} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* points */}
      {points.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={2.4} fill={color} opacity="0.95" />
      ))}
    </svg>
  )
}


