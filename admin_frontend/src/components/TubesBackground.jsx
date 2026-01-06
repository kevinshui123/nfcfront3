import React, { useEffect, useRef } from 'react'

export default function TubesBackground() {
  const canvasRef = useRef(null)
  const appRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    // Try loading as an ES module via dynamic import first (handles modern CDN modules).
    // Fallback to injecting a script tag for UMD if import fails.
    async function init() {
      const el = canvasRef.current
      if (!el) return

      const tryImportModule = async () => {
        try {
          // use the ESM build if available
          const moduleUrl = 'https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js'
          const mod = await import(/* @vite-ignore */ moduleUrl)
          const TubesCursor = mod && (mod.default || mod.TubesCursor || mod)
          return TubesCursor
        } catch (e) {
          return null
        }
      }

      const tryLoadUmd = async () => {
        return new Promise((resolve) => {
          const existing = Array.from(document.scripts).find(s => s.src && s.src.includes('tubes1.min.js'))
          if (existing && window.TubesCursor) return resolve(window.TubesCursor)
          const s = document.createElement('script')
          s.src = 'https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js'
          s.async = true
          s.onload = () => resolve(window.TubesCursor || null)
          s.onerror = () => resolve(null)
          document.body.appendChild(s)
        })
      }

      let TubesCursor = await tryImportModule()
      if (!TubesCursor) {
        TubesCursor = await tryLoadUmd()
      }
      if (cancelled) return
      if (!TubesCursor) {
        // leave element present; CSS fallback will show animated gradient
        return
      }

      try {
        const app = TubesCursor(el, {
          tubes: {
            colors: ['#f967fb', '#53bc28', '#6958d5'],
            lights: {
              intensity: 200,
              colors: ['#83f36e', '#fe8a2e', '#ff008a', '#60aed5']
            }
          }
        })
        appRef.current = app

        const onClick = () => {
          try {
            const colors = randomColors(3)
            const lightsColors = randomColors(4)
            if (app && app.tubes && typeof app.tubes.setColors === 'function') {
              app.tubes.setColors(colors)
            }
            if (app && app.tubes && typeof app.tubes.setLightsColors === 'function') {
              app.tubes.setLightsColors(lightsColors)
            }
          } catch (e) {}
        }
        document.body.addEventListener('click', onClick)

        return () => {
          document.body.removeEventListener('click', onClick)
          try { app && app.destroy && app.destroy() } catch (e) {}
        }
      } catch (e) {
        // ignore runtime errors
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="tubes-root" aria-hidden>
      <canvas ref={canvasRef} className="tubes-canvas" />
    </div>
  )
}

function randomColors (count) {
  return new Array(count)
    .fill(0)
    .map(() => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'))
}


