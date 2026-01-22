import React from 'react'

export default function PrismHeader() {
  return (
    <div
      className="prism-header"
      style={{
        position: 'fixed',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        height: 'auto',
        pointerEvents: 'none',
        zIndex: 1400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 8px',
      }}
    >
      <h1
        className="prism-title"
        style={{
          margin: 0,
          fontSize: 'clamp(1.2rem, 3.2vw, 2.2rem)',
          fontWeight: 900,
          letterSpacing: '-0.02em',
          color: '#111',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        SongZiKe
      </h1>
    </div>
  )
}


