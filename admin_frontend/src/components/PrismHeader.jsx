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
          background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 50%, #ffffff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          color: 'transparent',
          filter: 'drop-shadow(0 0 14px rgba(255,255,255,0.28)) drop-shadow(0 0 28px rgba(138,43,226,0.22))',
          animation: 'glowPulse 3s ease-in-out infinite alternate',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        SongZiKe
      </h1>
    </div>
  )
}


