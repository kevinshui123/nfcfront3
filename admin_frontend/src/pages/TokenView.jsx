import React, { useEffect, useState, useRef } from 'react'
import AnimatedStrokeText from '../components/AnimatedStrokeText'
import AnimatedSVGHeading from '../components/AnimatedSVGHeading'
import ComplexSVGLogo from '../components/ComplexSVGLogo'
import PrismHeader from '../components/PrismHeader'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Checkbox, Row, Col, Button, Upload, message, Spin, Image } from 'antd'
import { aiGenerate, socialPublish, getTokenContent, saveContent } from '../api'
import TopControls from '../components/TopControls'
import { t } from '../i18n'

export default function TokenView() {
  const { token } = useParams()
  const [step, setStep] = useState(1) // 0=take photo, 1=select platform, 2=ai generate, 3=redirect
  const [langState, setLangState] = useState(localStorage.getItem('sz_lang') || 'en')
  useEffect(() => {
    const onLang = () => setLangState(localStorage.getItem('sz_lang') || 'en')
    window.addEventListener('langchange', onLang)
    return () => window.removeEventListener('langchange', onLang)
  }, [])
  const [needLangSelect, setNeedLangSelect] = useState(true)
  // Ensure dark theme is applied when language selection is shown,
  // since TopControls (which normally sets theme) may be hidden.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (needLangSelect) {
        try { document.documentElement.setAttribute('data-theme', 'dark') } catch(e){}
        try { document.body.setAttribute('data-theme', 'dark') } catch(e){}
        try { localStorage.setItem('sz_theme', 'dark') } catch(e){}
      }
    }
  }, [needLangSelect])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState(null)
  const [selected, setSelected] = useState([])
  const [prompt, setPrompt] = useState('')
  const [aiResult, setAiResult] = useState(null)
  const [aiTitle, setAiTitle] = useState(null)
  const [photoUrl, setPhotoUrl] = useState(null)
  const [photos, setPhotos] = useState([]) // accumulate up to 3 photos
  const [aiLoading, setAiLoading] = useState(false)
  const [aiProgress, setAiProgress] = useState(0)
  const [pubLoading, setPubLoading] = useState(false)
  const threeCanvasRef = useRef(null)
  const [savedId, setSavedId] = useState(null)
  const [publishResult, setPublishResult] = useState(null)

  useEffect(() => {
    let mounted = true
    getTokenContent(token).then(d => { if (mounted) setContent(d) }).catch(()=>{}).finally(()=> mounted && setLoading(false))
    return ()=> mounted = false
  }, [token])

  // Load anime.js and three.js and initialize a subtle 3D particle background
  useEffect(() => {
    let cancelled = false
    const loadScript = (src, asModule = false) => new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts).find(s => s.src && s.src.includes(src.split('/').pop()))
      if (existing) return resolve(existing)
      const s = document.createElement('script')
      if (asModule) s.type = 'module'
      s.src = src
      s.onload = () => resolve(s)
      s.onerror = reject
      document.body.appendChild(s)
    })

    async function initThree() {
      try {
        await loadScript('https://unpkg.com/animejs@3.2.1/lib/anime.min.js')
        await loadScript('https://unpkg.com/three@0.154.0/build/three.min.js')
        if (cancelled) return
        const THREE = window.THREE
        if (!THREE) return
        const canvasHolder = threeCanvasRef.current
        if (!canvasHolder) return

        // create renderer attached to holder
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        renderer.setPixelRatio(window.devicePixelRatio || 1)
        renderer.setSize(canvasHolder.clientWidth, canvasHolder.clientHeight)
        renderer.domElement.style.position = 'absolute'
        renderer.domElement.style.inset = '0'
        renderer.domElement.style.zIndex = 0
        canvasHolder.appendChild(renderer.domElement)

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(50, canvasHolder.clientWidth / canvasHolder.clientHeight, 0.1, 1000)
        camera.position.z = 40
        // create a soft circular sprite texture for glow points
        const spriteCanvas = document.createElement('canvas')
        spriteCanvas.width = 64
        spriteCanvas.height = 64
        const sc = spriteCanvas.getContext('2d')
        const grad = sc.createRadialGradient(32,32,4,32,32,32)
        grad.addColorStop(0, 'rgba(255,255,255,0.95)')
        grad.addColorStop(0.2, 'rgba(166,214,255,0.9)')
        grad.addColorStop(0.45, 'rgba(110,167,255,0.55)')
        grad.addColorStop(1, 'rgba(110,167,255,0.0)')
        sc.fillStyle = grad
        sc.fillRect(0,0,64,64)
        const spriteTex = new THREE.CanvasTexture(spriteCanvas)

        // Torus ring of particles
        const ringCount = 180
        const ringGeo = new THREE.BufferGeometry()
        const ringPos = new Float32Array(ringCount * 3)
        const ringRadius = 44
        for (let i = 0; i < ringCount; i++) {
          const a = (i / ringCount) * Math.PI * 2
          ringPos[i*3+0] = Math.cos(a) * ringRadius + (Math.random()-0.5) * 6
          ringPos[i*3+1] = Math.sin(a) * 6 + (Math.random()-0.5) * 4
          ringPos[i*3+2] = Math.sin(a) * ringRadius * 0.25 + (Math.random()-0.5) * 8
        }
        ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3))
        const ringMat = new THREE.PointsMaterial({ size: 2.4, map: spriteTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.95 })
        const ringPoints = new THREE.Points(ringGeo, ringMat)
        scene.add(ringPoints)

        // Wave field of particles (grid with wave movement)
        const cols = 36, rows = 8
        const waveGeo = new THREE.BufferGeometry()
        const wavePos = new Float32Array(cols * rows * 3)
        const baseX = -60
        const baseZ = -20
        const waveOffsets = []
        let idx = 0
        for (let x = 0; x < cols; x++) {
          for (let z = 0; z < rows; z++) {
            wavePos[idx*3+0] = baseX + x * 4 + (Math.random()-0.5)*1.2
            wavePos[idx*3+1] = (Math.sin(x*0.3 + z*0.6) * 2) + (Math.random()-0.5)*1.2
            wavePos[idx*3+2] = baseZ + z * 8 + (Math.random()-0.5)*2
            waveOffsets.push(Math.random() * Math.PI * 2)
            idx++
          }
        }
        waveGeo.setAttribute('position', new THREE.BufferAttribute(wavePos, 3))
        const waveMat = new THREE.PointsMaterial({ size: 1.6, map: spriteTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 })
        const wavePoints = new THREE.Points(waveGeo, waveMat)
        scene.add(wavePoints)

        // small floating particles for random flow
        const floatCount = 60
        const floatGeo = new THREE.BufferGeometry()
        const floatPos = new Float32Array(floatCount * 3)
        const floatSeeds = []
        for (let i = 0; i < floatCount; i++) {
          floatPos[i*3+0] = (Math.random()-0.5) * 140
          floatPos[i*3+1] = (Math.random()-0.5) * 60
          floatPos[i*3+2] = (Math.random()-0.5) * 140
          floatSeeds.push(Math.random() * 1000)
        }
        floatGeo.setAttribute('position', new THREE.BufferAttribute(floatPos, 3))
        const floatMat = new THREE.PointsMaterial({ size: 1.0, color: 0xaadfff, map: spriteTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 })
        const floatPoints = new THREE.Points(floatGeo, floatMat)
        scene.add(floatPoints)

        // subtle animation loop
        let rafId = null
        const start = Date.now()
        function animate() {
          const t = (Date.now() - start) * 0.0012
          // rotate ring slowly and breathe
          ringPoints.rotation.y = t * 0.12
          ringPoints.rotation.x = Math.sin(t * 0.2) * 0.02
          // update wave y positions
          const wPos = waveGeo.attributes.position.array
          let ii = 0
          for (let x = 0; x < cols; x++) {
            for (let z = 0; z < rows; z++) {
              const base = (x * rows + z) * 3
              wPos[base+1] = Math.sin(x*0.45 + t*1.4 + waveOffsets[x*rows+z]) * 3 + Math.cos(z*0.6 + t*0.9) * 1.2
              ii++
            }
          }
          waveGeo.attributes.position.needsUpdate = true

          // float points drift using seeds
          const fPos = floatGeo.attributes.position.array
          for (let i = 0; i < floatCount; i++) {
            const base = i*3
            const s = floatSeeds[i]
            fPos[base+0] += Math.sin(t*0.6 + s) * 0.02
            fPos[base+1] += Math.cos(t*0.8 + s) * 0.01
            fPos[base+2] += Math.sin(t*0.5 + s*0.3) * 0.02
          }
          floatGeo.attributes.position.needsUpdate = true

          renderer.render(scene, camera)
          rafId = requestAnimationFrame(animate)
        }
        animate()

        // handle resize
        const onResize = () => {
          if (!canvasHolder) return
          const w = canvasHolder.clientWidth
          const h = canvasHolder.clientHeight
          camera.aspect = w / h
          camera.updateProjectionMatrix()
          renderer.setSize(w, h)
        }
        window.addEventListener('resize', onResize)

        // cleanup
        return () => {
          cancelled = true
          if (rafId) cancelAnimationFrame(rafId)
          window.removeEventListener('resize', onResize)
          try { renderer.dispose && renderer.dispose() } catch (e) {}
          try { canvasHolder.removeChild(renderer.domElement) } catch (e) {}
        }
      } catch (e) {
        // ignore load errors - background is decorative
        console.warn('three/anime load failed', e)
      }
    }
    const maybeCleanupPromise = initThree()
    return () => {
      cancelled = true
      Promise.resolve(maybeCleanupPromise).then(clean => { if (typeof clean === 'function') clean() }).catch(()=>{})
    }
  }, [])

  // Post-process AI body: remove duplicate title, ensure emoji/tag presence, and format into paragraphs.
  // This will minimally inject one emoji or a #JHU tag if missing, but will not rewrite content.
  const ensureEmojiTagAndFormat = (raw, providedTitle) => {
    try {
      let text = (raw || '').trim()
      if (!text) return text

      // Remove leading explicit title markers like "标题:" or "TITLE:"
      text = text.replace(/^\s*(标题[:：]\s*|TITLE[:：]\s*)/i, '')

      // If a title is provided and body starts with that title, remove the duplicate leading title text
      if (providedTitle) {
        const escaped = providedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const dupRe = new RegExp('^\\s*' + escaped + '\\s*\\n', 'i')
        text = text.replace(dupRe, '')
      } else {
        // If no providedTitle, try to detect a short first-line repeated as both title and body.
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
        if (lines.length > 1 && lines[0].length < 60 && lines[1].length > 0 && lines[1].startsWith(lines[0])) {
          // remove first line if it's duplicated
          lines.shift()
          text = lines.join('\n')
        }
      }

      // Split into sentences early so we can inject emojis inline per-sentence
      const sentenceSplitRe = /[^。！？.!?]+[。！？.!?]?/g
      let parts1 = text.match(sentenceSplitRe)
      if (!parts1 || parts1.length === 0) {
        parts1 = text.match(/.{1,40}(?:\s|$)/g) || [text]
      }

      // emoji mapping by keyword to produce contextual inline emojis
      const keywordEmoji = [
        {k: /拍照|照片|出片|拍照/g, e: '📸'},
        {k: /牛肉|红烧肉|肉/g, e: '🥩'},
        {k: /麻|麻将|牌/g, e: '🀄️'},
        {k: /辛辣|辣|麻/g, e: '🌶️'},
        {k: /好吃|美味|赞|满足/g, e: '😋'},
        {k: /学生|上班|打工/g, e: '👭'},
        {k: /位置|地址|JHU|Baltimore/g, e: '📍'},
        {k: /推荐|必点|强烈推荐/g, e: '✅'},
      ]

      // ensure at least one emoji per sentence when possible by keyword, else random
      const emojiPool = ['📸','🍖','🌶️','🥬','😍','💥','🏃‍♀️','🀄️','😋','💚','🤍','🍚','👭','✨','✅','📍','🎉','😮']
      const newParts = parts1.map(p => {
        const hasEmoji = /[\p{Emoji}\u{2600}-\u{27BF}]/u.test(p)
        if (hasEmoji) return p.trim()
        // find matching keyword
        for (const m of keywordEmoji) {
          if (m.k.test(p)) {
            // insert emoji at random position inside the sentence
            const trimmed = p.trim()
            const len = trimmed.length
            if (/\s/.test(trimmed)) {
              // English-like: insert after a random word
              const words = trimmed.split(/\s+/)
              const idx = Math.max(0, Math.min(words.length - 1, Math.floor(Math.random() * words.length)))
              words[idx] = words[idx] + ' ' + m.e
              return words.join(' ')
            } else {
              // Chinese: insert at a random char position (not at ends)
              const pos = Math.max(1, Math.min(len - 1, Math.floor(Math.random() * len)))
              return trimmed.slice(0, pos) + m.e + trimmed.slice(pos)
            }
          }
        }
        // else insert a random mild emoji at a random position
        const randEmoji = emojiPool[Math.floor(Math.random() * emojiPool.length)]
        const trimmed = p.trim()
        if (/\s/.test(trimmed)) {
          const words = trimmed.split(/\s+/)
          const idx = Math.max(0, Math.min(words.length - 1, Math.floor(Math.random() * words.length)))
          words[idx] = words[idx] + ' ' + randEmoji
          return words.join(' ')
        } else {
          const len = trimmed.length
          const pos = Math.max(1, Math.min(len - 1, Math.floor(Math.random() * len)))
          return trimmed.slice(0, pos) + randEmoji + trimmed.slice(pos)
        }
      })
      // recombine
      text = newParts.join(' ')

      // collect existing tags and append more up to 8, but only for Xiaohongshu
      if (platform === 'xiaohongshu') {
        const tagPool = ['#JHU','#Baltimore','#Foodie','#探店','#小碗菜','#宝藏小店','#周末去哪儿','#打卡','#学生党','#午餐推荐','#打工人','#宝藏']
        const hashtagRe = /#([^\s#，。,。!！?？]+)/g
        const foundTags = new Set()
        let hm
        while ((hm = hashtagRe.exec(text))) {
          foundTags.add('#' + hm[1])
        }
        for (const candidate of tagPool) {
          if (foundTags.size >= 8) break
          if (![...foundTags].map(s=>s.toLowerCase()).includes(candidate.toLowerCase())) {
            foundTags.add(candidate)
          }
        }
        // remove inline tags and append cleaned block
        const cleanBody = text.replace(hashtagRe, '').replace(/\s{2,}/g,' ').trim()
        const tagsArr = Array.from(foundTags).slice(0,8)
        text = cleanBody + (tagsArr.length ? (' ' + tagsArr.join(' ')) : '')
      }

      // Paragraphing: split by sentence-ending punctuation; produce smaller paragraphs (1 sentence each preferably)
      const sentenceRe = /[^。！？.!?]+[。！？.!?]?/g
      let parts = text.match(sentenceRe)
      if (!parts || parts.length === 0) {
        // fallback: split every ~40 chars for denser paragraphs
        parts = text.match(/.{1,40}(?:\s|$)/g) || [text]
      }
      const paras = []
      for (let i = 0; i < parts.length; i += 1) {
        const grp = parts[i].trim()
        if (grp) paras.push(grp)
      }
      const final = paras.join('\n\n').trim()
      return final || text
    } catch (e) {
      return raw
    }
  }

  // Helper to apply final post-processing and ensure title fallback is set
  const applyPostProcessing = (rawBody, providedTitle, platform = 'xiaohongshu') => {
    // produce formatted text (may inject emojis/tags only for xiaohongshu)
    const formatted = ensureEmojiTagAndFormat(rawBody, providedTitle, platform)

    // Remove any leading duplicate title-ish text from formatted
    let cleaned = formatted
    try {
      if (providedTitle && providedTitle.trim()) {
        const normalize = s => (s || '').replace(/[\s\p{P}\p{S}]+/gu, '').toLowerCase()
        const nTitle = normalize(providedTitle)
        const firstLine = (cleaned.split(/\r?\n/)[0] || '').trim()
        const nFirst = normalize(firstLine)
        if (nTitle && nFirst && (nFirst.startsWith(nTitle) || nTitle.startsWith(nFirst))) {
          const lines = cleaned.split(/\r?\n/)
          lines.shift()
          cleaned = lines.join('\n').trim()
        } else {
          const esc = providedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const leadingRe = new RegExp('^\\s*' + esc + '(\\s*[:：，,\\-\\u2014–—]*)?\\s*(\\n\\s*)?', 'i')
          cleaned = cleaned.replace(leadingRe, '').trim()
        }
      } else {
        // remove exact duplicate first-line if present
        const lines = cleaned.split(/\r?\n/).map(l=>l.trim()).filter(Boolean)
        if (lines.length > 1 && lines[1] && lines[0] && lines[1].startsWith(lines[0])) {
          lines.shift()
          cleaned = lines.join('\n').trim()
        }
      }
    } catch (e) {}

    setAiResult(cleaned)

    // set title: prefer providedTitle, else derive from cleaned first line/sentence; truncate to 20 chars
    let finalTitle = ''
    if (providedTitle && providedTitle.trim()) finalTitle = providedTitle.trim()
    else {
      const firstLine = (cleaned.split(/\r?\n/)[0] || '').trim()
      const firstSentence = (firstLine.match(/[^。！？.!?]+[。！？.!?]?/) || [firstLine])[0] || firstLine
      finalTitle = firstSentence || ''
    }
    if (finalTitle) {
      if (finalTitle.length > 20) {
        finalTitle = finalTitle.slice(0, 20) + '…'
      }
      setAiTitle(finalTitle)
    }
  }

  // anime.js CTA pulse and progress particles
  useEffect(() => {
    if (typeof window === 'undefined') return
    const setupCTA = async () => {
      try {
        if (!window.anime) {
          // ensure anime is loaded (may have been loaded by three init, but load if missing)
          await new Promise((res, rej) => {
            const s = document.createElement('script')
            s.src = 'https://unpkg.com/animejs@3.2.1/lib/anime.min.js'
            s.onload = res
            s.onerror = rej
            document.body.appendChild(s)
          })
        }
      } catch (e) {
        return
      }

    const pulse = (el) => {
      try {
        window.anime.remove(el)
        window.anime.timeline().add({
          targets: el,
          scale: [1, 1.06, 1],
          duration: 520,
          easing: 'easeOutCubic'
        })
      } catch(e){}
    }

    const spawnParticles = (container, color = '#66b0ff') => {
      const count = 8
      const parts = []
      for (let i = 0; i < count; i++) {
        const p = document.createElement('div')
        p.className = 'ephemeral-particle'
        p.style.background = color
        p.style.left = (Math.random() * 60 + 20) + '%'
        p.style.top = '50%'
        container.appendChild(p)
        parts.push(p)
      }
      window.anime({
        targets: parts,
        translateY: (el, i) => (Math.random() - 0.5) * 120,
        translateX: (el, i) => (Math.random() - 0.5) * 160,
        opacity: [1, 0],
        scale: [0.6, 1.2],
        duration: 900,
        easing: 'cubicBezier(.2,.9,.2,1)',
        delay: window.anime.stagger(40),
        complete: () => parts.forEach(pp => pp.remove())
      })
    }

    const onClick = (e) => {
      const btn = e.target.closest('.full-cta')
      if (!btn) return
      pulse(btn)
      // spawn particles around button container
      const holder = btn.closest('.nfc-card') || document.body
      spawnParticles(holder, 'rgba(166,214,255,0.9)')
    }
    document.addEventListener('click', onClick)
    // create progress particles when aiLoading toggles
    let progressParticlesCtx = null
    const observeProgress = () => {
      const container = document.querySelector('.ai-progress')
      if (!container) return
      progressParticlesCtx = { container }
    }
    const mo = new MutationObserver(observeProgress)
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      document.removeEventListener('click', onClick)
      mo.disconnect()
    }
    }
    setupCTA()
  }, [])

  // Animate platform chips entrance using anime.js when step 1 is shown
  useEffect(() => {
    if (typeof window === 'undefined' || !window.anime) return
    if (step === 1) {
      try {
        const chips = Array.from(document.querySelectorAll('.platform-chip'))
        window.anime.remove(chips)
        window.anime({
          targets: chips,
          translateY: [18, 0],
          opacity: [0,1],
          delay: window.anime.stagger(120),
          easing: 'cubicBezier(.2,.9,.2,1)',
          duration: 650
        })
      } catch(e) {}
    }
  }, [step])

  const platforms = [
    {
      id: 'google',
      label: t('platform_google') || 'Google',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <circle cx="12" cy="12" r="10" fill="#4285F4"></circle>
        </svg>
      ),
      deepLink: 'https://maps.google.com',
      webFallback: 'https://maps.google.com'
    },
    {
      id: 'xiaohongshu',
      label: t('platform_xiaohongshu'),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <rect rx="5" width="24" height="24" fill="url(#r1)"></rect>
          <defs>
            <linearGradient id="r1" x1="0" x2="1">
              <stop offset="0" stopColor="#ff6b9b"></stop>
              <stop offset="1" stopColor="#ff3b6b"></stop>
            </linearGradient>
          </defs>
        </svg>
      ),
      deepLink: 'xiaohongshu://post',
      webFallback: 'https://www.xiaohongshu.com'
    },
    {
      id: 'douyin',
      label: t('platform_douyin'),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <circle cx="12" cy="12" r="11" fill="#121212" stroke="none" />
          <path d="M9 8v8a3 3 0 003 3V8h3V5h-6z" fill="#ff5a00" />
        </svg>
      ),
      deepLink: 'snssdk1128://publish',
      webFallback: 'https://www.douyin.com'
    },
    {
      id: 'facebook',
      label: t('platform_facebook'),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <rect rx="4" width="24" height="24" fill="#1877F2"></rect>
          <path d="M15.5 8.5h-1.4c-.3 0-.6.3-.6.6v1.1h2l-.3 2.3h-1.7V20h-2.2v-6.5H9.6v-2.3h1.6V9.6c0-1.6.9-2.5 2.4-2.5.7 0 1.3.1 1.9.3v1.1z" fill="#fff"/>
        </svg>
      ),
      deepLink: 'fb://profile',
      webFallback: 'https://www.facebook.com'
    },
    {
      id: 'instagram',
      label: t('platform_instagram'),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <rect rx="5" width="24" height="24" fill="url(#ig)"></rect>
          <defs>
            <linearGradient id="ig" x1="0" x2="1">
              <stop offset="0" stopColor="#f09433"></stop>
              <stop offset="0.5" stopColor="#e6683c"></stop>
              <stop offset="1" stopColor="#cc2a9b"></stop>
            </linearGradient>
          </defs>
        </svg>
      ),
      deepLink: 'instagram://camera',
      webFallback: 'https://www.instagram.com'
    },
  ]

  const onAi = async () => {
    // Use Silra chat completions API to generate the review.
    // This function builds platform-specific prompts and calls the endpoint.
    const MIN_VISIBLE_MS = 900
    setAiLoading(true)
    try {
      // Get API key from localStorage or fallback to provided key
      const apiKey = (typeof window !== 'undefined' && (localStorage.getItem('SILRA_API_KEY') || localStorage.getItem('silra_api_key') || localStorage.getItem('sz_api_key'))) || 'sk-6LwLY8DFdKF7uYwUm0l37bCPAPeCY62Zaynj8OnfMAGQa0V7'

      if (!apiKey) {
        message.error('Missing API key')
        setAiLoading(false)
        return
      }

      // concise per-platform templates; language enforcement and truthfulness handled in system message
      const platformTemplates = {
        xiaohongshu: {
          en: 'Write a warm, natural Rednote review (casual personal voice). Use emojis, short anecdotes, and sensory words. Length: medium-long (2-3 short sentences). Use only visible items from the photo or facts given; avoid inventing dishes.',
          zh: '为小红书写一条贴近生活、口语化的评价，带 emoji 和简短小故事/感受。长度：中偏长（2-3 句）。仅使用图片或信息中可见的菜品/事实，避免杜撰。'
        },
        douyin: {
          en: 'Short punchy Douyin caption, energetic and casual. Max ~40 words. Use visible items only; avoid exaggeration.',
          zh: '简短有力的抖音文案，轻快口吻，约 40 字内。仅使用可见菜品信息，避免夸张。'
        },
        facebook: {
          en: 'Short friendly Facebook review. Concise, factual, avoid marketing language. Use visible items only.',
          zh: '简短友好的 Facebook 点评，事实为主，避免商业化用语，仅使用可见菜品信息。'
        },
        instagram: {
          en: 'Instagram-style caption: concise, visual, include light emoji and one hashtag. Keep natural and truthful; use visible items only.',
          zh: 'Instagram 风格短文案，视觉化、可带少量 emoji 和一个话题标签，真实简洁，仅使用可见菜品信息。'
        },
        google: {
          en: 'Very short factual Google Maps review. 1–2 short sentences. No marketing or exaggeration. Use visible items only.',
          zh: '非常简短、客观的 Google 地图点评。1-2 个短句，真实、不夸张。仅使用可见菜品信息。'
        }
      }

      const buildMessages = (platformId, language, userPrompt, photo) => {
        // restaurant brief and layout info for context
        const briefEN = 'Mahjong is a small-bowl restaurant. Near the entrance on the right is a milk-tea counter; further ahead is the food serving counter where staff serve small bowls. Only state facts; do not invent dishes.'
        const briefZH = 'Mahjong 为小碗菜餐馆。门口右侧为奶茶柜台，前方是打饭台，顾客按点单由前台打成小碗上菜。仅陈述事实，不要杜撰菜品。'

        const isZh = (language && (String(language).toLowerCase().includes('zh') || language === 'Chinese'))
        // Force Google reviews to be in English regardless of selected UI language
        const langDirective = platformId === 'google' ? 'Respond in English.' : (isZh ? '请用中文回复。' : 'Respond in English.')

        const platformPreamble = platformId === 'google'
          ? 'Write a very short factual Google Maps review; 1-2 short sentences. No exaggeration or marketing.'
          : (isZh ? '你是文案写手，生成自然、真实且不过度夸张的用户评价。不要披露 AI 身份；不要杜撰菜品。' : 'You are a copywriter producing natural, realistic user reviews. Do not reveal you are AI; do not invent dishes that are not present.')

        const system = {
          role: 'system',
          content: `${platformPreamble} ${langDirective} ${isZh ? briefZH : briefEN}`
        }

        // enhanced personas and length variability for stronger diversity
        const personas = isZh
          ? ['一位满意的顾客', '学生', '上班族', '美食爱好者', '路过试菜的顾客', '常客']
          : ['a satisfied customer', 'a student', 'a working professional', 'a foodie', 'a passerby who tried it', 'a regular']
        const persona = personas[Math.floor(Math.random() * personas.length)]

        // decide lengths per platform (xiaohongshu can be longer)
        const lengthPool = platformId === 'xiaohongshu' ? ['medium','long','long'] : ['short','short','medium']
        const lengthChoice = lengthPool[Math.floor(Math.random() * lengthPool.length)]

        const platformKey = platformId || 'instagram'
        // force English template for Google regardless of UI language
        const tmplLang = (platformKey === 'google') ? 'en' : (isZh ? 'zh' : 'en')
        const tmpl = (platformTemplates[platformKey] && platformTemplates[platformKey][tmplLang]) || (isZh ? '写一条简短评价。' : 'Write a short review.')
        const userText = (userPrompt && String(userPrompt).trim()) || tmpl.replace('{persona}', persona)

        // attach only first photo to reduce payload; instruct model to use visible info only
        const photoToUse = Array.isArray(photo) ? photo[0] : photo
        if (photoToUse) {
          const baseInstruction = isZh
            ? `角色：${persona}。长度：${lengthChoice}。请仅使用图片和上述信息中可见的菜名与事实，保持真实、避免夸张。`
            : `Persona: ${persona}. Length: ${lengthChoice}. Use only visible dishes and facts from the image or brief. Keep it truthful and avoid exaggeration.`
          const contentArray = [
            { type: 'text', text: `${userText}` },
            { type: 'image_url', image_url: { url: photoToUse } },
            { type: 'text', text: baseInstruction }
          ]

          // If Xiaohongshu, append an explicit instruction + example to force TITLE/BODY and emojis
          if (platformId === 'xiaohongshu') {
            // looser, more natural instruction for Xiaohongshu when images are present
            const xhsInsEn = `Write a Rednote-style shop recommendation for Mahjong (TITLE + BODY).
OUTPUT: one TITLE line prefixed by "TITLE:" (short; avoid hashtags in title), one blank line, then BODY.
Do not restrict length — let the model choose. Each generation MUST be different in persona and wording; vary narrative style. Emojis and tags optional; no photo-suggestion text. Do not invent dishes beyond visible items.`
            const xhsInsZh = `请写一条小红书探店/推荐（标题 + 正文）。
输出：单行标题，前缀为 "标题:"（简短，标题中尽量不要带话题标签），空一行，然后正文。
不要限制长度，让模型决定每条篇幅。每次生成必须不同（变换角色和叙事方式）。emoji 与话题可选。不要写拍照建议，不要杜撰图片中没有的菜品。`
            contentArray.push({ type: 'text', text: isZh ? xhsInsZh : xhsInsEn })
          }

          return [system, { role: 'user', content: contentArray }]
        }

        // For Google, ignore any Chinese userPrompt and always use English short template
        let userMsg
        if (platformId === 'google') {
          // force English user message for Google
          userMsg = 'Write a short, factual Google Maps review in English. Use 1-3 short sentences. Do NOT include emojis or hashtags. Keep it concise and objective.'
        } else if (platformId === 'xiaohongshu') {
          // Xiaohongshu: strongly request TITLE + BODY with emojis and casual voice.
          // Force examples and explicit emoji counts to encourage emoji usage.
          const locationHint = Math.random() < 0.35 ? (isZh ? '店铺位于 Baltimore，靠近 JHU。' : 'The shop is located in Baltimore near JHU.') : ''
          const exampleEn = `EXAMPLES:
TITLE: I declare 📣 this is the "雀神" of small-bowl dishes! 🀄️💥

BODY: 家人们！今天挖到宝了～這家店的麻将盒子太好拍照了📸，味道也在线，鸿运当头红烧肉超下饭😍。#小碗菜探店`
          const exampleZh = `示例：
标题: 我宣布📣这就是小碗菜界的“雀神”🀄️！

正文: 家人们～今天挖到宝了！麻将饭盒超出片📸，红烧肉又香又软，性价比超高💰。#宝藏小店`

          const promptXhsEn = `${platformTemplates.xiaohongshu.en} ${locationHint} Write a Rednote-style shop recommendation for Mahjong (TITLE + BODY).
OUTPUT: one TITLE line prefixed by "TITLE:" (short; avoid hashtags in title), one blank line, then BODY.
Do not restrict length — let the model decide. Each generation MUST be different in persona and wording; vary narrative style. Emojis and tags optional; do not include any photo-suggestion text. Do not invent dishes beyond visible items. ${exampleEn}`

          const promptXhsZh = `${platformTemplates.xiaohongshu.zh} ${locationHint} 请写一条小红书探店/推荐（标题 + 正文）。
输出：单行标题，前缀为 "标题:"（简短，标题中尽量不要带话题标签），空一行，然后正文。
不要限制长度，让模型决定每条篇幅。每次生成必须不同（变换角色和叙事方式）。Emoji 与话题可选。不要写拍照建议，不要杜撰图片中没有的菜品。${exampleZh}`

          userMsg = isZh ? promptXhsZh : promptXhsEn
        } else {
          if (platformId === 'facebook') {
            // Facebook: pick one of three casual styles
            const fbStylesEn = [
              `Caption: Finally a decent spot right by campus! Tried Mahjong today—I'm usually picky about Asian food here but this hit the spot. Short paragraphs, casual tone. No emojis required.`,
              `Caption: Solid 5 stars for Mahjong. It's right next to JHU and great for quick meals. Brief, local-neighbor tone, simple sentences.`,
              `Caption: Best new bowl spot in Baltimore! Honest short review, practical and direct.`
            ]
            const fbStylesZh = [
              `标题式：终于在校园旁发现一家靠谱的店！随手写的随性点评，口语化，不用太正式。`,
              `邻里口吻：评分简单直接，强调效率与性价比，适合忙碌的上班/学生。`,
              `短评式：一句话直观推荐，真实随意，像是临时写的。`
            ]
            const pick = Math.floor(Math.random() * (isZh ? fbStylesZh.length : fbStylesEn.length))
            userMsg = isZh ? fbStylesZh[pick] : fbStylesEn[pick]
          } else if (platformId === 'instagram') {
            userMsg = isZh ? `${userText} 角色：${persona}。短句、视觉化，有少量 emoji 和一个 hashtag。` : `${userText} Persona: ${persona}. Instagram-style caption: concise, visual, light emoji, one hashtag.`
          } else {
            userMsg = isZh ? `${userText} 角色：${persona}。长度：${lengthChoice}。请保持真实、不要杜撰菜品。` : `${userText} Persona: ${persona}. Length: ${lengthChoice}. Keep it truthful and do not invent dishes.`
          }
        }
        return [system, { role: 'user', content: userMsg }]
      }

      const platformId = (selected && selected[0]) || (platforms[0] && platforms[0].id) || 'instagram'
      const language = (localStorage.getItem('sz_lang') || 'en') === 'zh' ? 'Chinese' : 'English'
      const messages = buildMessages(platformId, language, prompt || (content && content.title) || t('ai_prompt_default'), (photos && photos.length) ? photos : photoUrl)

      // Debug: log messages payload to help diagnose language issues
      try { console.debug('AI messages payload:', JSON.parse(JSON.stringify(messages))) } catch(e) {}

      const body = {
        model: 'qwen3-vl-plus',
        messages,
        stream: false,
        temperature: 0.7
      }

      // Prefer streaming if available
      body.stream = true
      const resp = await fetch('https://api.silra.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body),
      })
      if (!resp.ok) {
        const txt = await resp.text().catch(()=>null)
        console.error('Silra error', resp.status, txt)
        message.error(`${t('ai_failed')}: ${resp.status}`)
        setAiLoading(false)
        return
      }

        // If response is streaming, read incrementally
      if (resp.body && resp.body.getReader) {
        const reader = resp.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let done = false
        let buffer = ''
        let streamText = '' // accumulate server stream reliably
        setAiResult('') // reset
        setAiTitle(null)
        while (!done) {
          const { value, done: d } = await reader.read()
          done = d
          if (value) {
            buffer += decoder.decode(value, { stream: !done })
            // split by newline
            const parts = buffer.split(/\r?\n/)
            buffer = parts.pop() || ''
            for (const p of parts) {
              const line = p.trim()
              if (!line) continue
              const payload = line.startsWith('data: ') ? line.slice(6) : line
              if (payload === '[DONE]') {
                done = true
                break
              }
              try {
                const obj = JSON.parse(payload)
                const choices = obj.choices || []
                if (choices.length > 0) {
                  const c = choices[0]
                  const token = (c.delta && c.delta.content) || (c.message && c.message.content) || ''
                  if (token) {
                    // update local accumulator and state together
                    streamText += token
                    setAiResult(streamText)
                  }
                }
              } catch (e) {
                // ignore non-json lines
              }
            }
          }
        }
        // finished - parse using the accumulated streamText (not state)
        await new Promise(res => setTimeout(res, 120))
        try {
          const txt = streamText || aiResult || ''
          const titleMatchEn = txt.match(/TITLE:\s*(.+?)\s*\n\s*BODY:\s*([\s\S]+)/i)
          const titleMatchZh = txt.match(/标题[:：]\s*(.+?)\s*\n\s*正文[:：]?\s*([\s\S]+)/i)
          let title = null
          let body = txt
          if (titleMatchEn) {
            title = titleMatchEn[1].trim()
            body = titleMatchEn[2].trim()
          } else if (titleMatchZh) {
            title = titleMatchZh[1].trim()
            body = titleMatchZh[2].trim()
          }

          const extractAndNormalize = (rawTitle, rawBody) => {
            const hashtagRe = /#([^\s#，。,。!！?？]+)/g
            const found = new Set()
            const collect = (s) => {
              if (!s) return
              let m
              while ((m = hashtagRe.exec(s))) {
                found.add('#' + m[1])
              }
            }
            collect(rawTitle)
            collect(rawBody)
            const stripHashtags = (s) => (s || '').replace(hashtagRe, '').replace(/\s{2,}/g, ' ').trim()
            const cleanTitle = stripHashtags(rawTitle || '')
            const cleanBody = stripHashtags(rawBody || '')
            const tagsArr = Array.from(found)
            const tagsToAppend = tagsArr.slice(0, 4).join(' ')
            const finalBody = tagsToAppend ? `${cleanBody} ${tagsToAppend}`.trim() : cleanBody
            return { title: cleanTitle, body: finalBody }
          }

          if (title || body) {
            const normalized = extractAndNormalize(title, body)
            if (normalized.title) setAiTitle(normalized.title)
            applyPostProcessing(normalized.body, normalized.title, platformId)
          }
        } catch (e) {}
        message.success(t('ai_generated'))
      } else {
        // fallback to full json
        const data = await resp.json()
        let text = ''
        try {
          if (data.choices && data.choices.length > 0) {
            const choice = data.choices[0]
            text = (choice.message && (choice.message.content || choice.message)) || ''
          } else {
            text = JSON.stringify(data)
          }
        } catch (e) {
          text = JSON.stringify(data)
        }
        // parse title/body if present
        try {
          const titleMatchEn = text.match(/TITLE:\s*(.+?)\s*\n\s*BODY:\s*([\s\S]+)/i)
          const titleMatchZh = text.match(/标题[:：]\s*(.+?)\s*\n\s*正文[:：]?\s*([\s\S]+)/i)
          if (titleMatchEn || titleMatchZh) {
            let title = null
            let body = text
            if (titleMatchEn) {
              title = titleMatchEn[1].trim()
              body = titleMatchEn[2].trim()
            } else if (titleMatchZh) {
              title = titleMatchZh[1].trim()
              body = titleMatchZh[2].trim()
            }
            const normalize = (rawTitle, rawBody) => {
              const hashtagRe = /#([^\s#，。,。!！?？]+)/g
              const found = new Set()
              let m
              const collect = (s) => {
                if (!s) return
                while ((m = hashtagRe.exec(s))) found.add('#' + m[1])
              }
              collect(rawTitle); collect(rawBody)
              const strip = (s) => (s || '').replace(hashtagRe, '').replace(/\s{2,}/g, ' ').trim()
              const cleanTitle = strip(rawTitle || '')
              const cleanBody = strip(rawBody || '')
              const tags = Array.from(found).slice(0,4).join(' ')
              const finalBody = tags ? `${cleanBody} ${tags}`.trim() : cleanBody
              return { title: cleanTitle, body: finalBody }
            }
            const normalized = normalize(title, body)
            if (normalized.title) setAiTitle(normalized.title)
            applyPostProcessing(normalized.body, normalized.title, platformId)
          } else {
            applyPostProcessing(text, null, platformId)
          }
        } catch(e){ applyPostProcessing(text, null, platformId) }
        message.success(t('ai_generated'))
      }
    } catch (e) {
      console.error(e)
      message.error(t('ai_failed'))
    } finally {
      setAiLoading(false)
    }
  }

  // simulate progress while aiLoading is true
  useEffect(() => {
    let iv = null
    if (aiLoading) {
      setAiProgress(6)
      iv = setInterval(() => {
        setAiProgress(p => {
          const next = p + Math.floor(Math.random() * 8) + 4
          return next >= 96 ? 96 : next
        })
      }, 400)
    } else {
      // finish progress
      setAiProgress(100)
      const t = setTimeout(() => setAiProgress(0), 600)
      return () => clearTimeout(t)
    }
    return () => { if (iv) clearInterval(iv) }
  }, [aiLoading])

  const navigate = useNavigate()

  const onPublish = async (platform) => {
    setPubLoading(true)
    try {
      // save content first (if not already saved)
      let saved = { id: savedId }
      if (!savedId) {
        saved = await saveContent(token, (aiResult || prompt).slice(0, 80), aiResult || prompt, 'anonymous')
        setSavedId(saved.id)
      }
      const payload = { content_id: saved.id, token, photo: photoUrl ? 'data:image/base64' : null }
      const resp = await socialPublish(platform, payload)
      setPublishResult(resp)
      message.success(t('saved_and_published_prefix') + platform)
    } catch (e) {
      console.error(e)
      message.error(t('publish_failed'))
    } finally {
      setPubLoading(false)
    }
  }

  const onSaveDraft = async () => {
    try {
      const saved = await saveContent(token, (aiResult || prompt).slice(0, 80), aiResult || prompt, 'anonymous')
      setSavedId(saved.id)
      message.success(t('saved_draft'))
    } catch (e) {
      console.error(e)
      message.error(t('save_failed'))
    }
  }

  // rating state for AI preview
  const [rating, setRating] = useState(5)

  return (
    <div className="nfc-page" style={{ padding: 12 }}>
      {!(step === 1 && needLangSelect) && <TopControls />}
      <PrismHeader />
      <div className="nfc-hero" style={{ marginBottom: 12 }}>
        <div className="nfc-particles" aria-hidden>
          {Array.from({ length: 10 }).map((_, i) => <span key={i} className="particle" />)}
        </div>
        <Card className="nfc-card">
          {loading ? <Spin/> : (
            <>
              <div className="nfc-inner" style={{ textAlign: 'center', paddingTop: 6 }}>
                {step === 0 ? (
                  <ComplexSVGLogo text={'Take Photo'} startDelay={1} />
                ) : step === 1 && !needLangSelect ? (
                  <ComplexSVGLogo text={'Choose Platform'} startDelay={1} />
                ) : step === 2 ? (
                  <ComplexSVGLogo text={t('ai_generated')} startDelay={3} />
                ) : (
                  <h2 style={{ marginBottom: 6 }}>{content?.shop?.name || t('welcome')}</h2>
                )}
                {/*
                  Do not show the top content body when it's demo/sample text.
                  The user requested removing the "这是模拟生成的文案..." text.
                */}
                {content?.body && !String(content?.body).toLowerCase().includes('demo') && !String(content?.body).includes('模拟') && (
                  <p style={{ color: 'var(--muted)', margin: '0 auto 8px', maxWidth: 520 }}>{content?.body}</p>
                )}
                {/* Google Map iframe (simple embed using shop name) */}
                {content && content.shop && content.shop.name && (
                  <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: '100%', maxWidth: 520, borderRadius: 8, overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.02)' }}>
                      <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.25)', color: 'var(--muted)' }}>
                        {t('map_title') || 'Location'}
                      </div>
                      <iframe
                        title="shop-map"
                        src={`https://www.google.com/maps?q=${encodeURIComponent(content.shop.name + ' Mahjong')}&output=embed`}
                        width="100%"
                        height="220"
                        style={{ border: 0, display: 'block' }}
                        loading="lazy"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Step 0: Take Photo */}
              {step === 0 && (
                <div className="step step-0" style={{ marginTop: 8 }}>
                  <div style={{ padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8, minHeight: 140, color: 'var(--text)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
                      <p style={{ margin: 0, opacity: 0.9 }}>{t('take_photo_prompt')}</p>
                    </div>
                  </div>
                  <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center' }}>
                    {/* Hidden file input to trigger camera on mobile */}
                    <input id="take-photo-input" type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                      onChange={async (e) => {
                        const f = e.target.files && e.target.files[0]
                        if (!f) return
                        const reader = new FileReader()
                        reader.onload = () => {
                          try {
                            const data = reader.result
                            setPhotos(prev => {
                              const next = [...(prev||[]), data].slice(0,3)
                              if (next.length >= 3) {
                                setPhotoUrl(next[0])
                                setStep(2)
                              } else {
                                message.info(t('photos_needed_notify') || `Please take ${3 - next.length} more photos`)
                              }
                              return next
                            })
                          } catch(e) {}
                        }
                        reader.readAsDataURL(f)
                      }}
                    />
                    <a
                      role="button"
                      className="neon-btn"
                      onClick={() => {
                        const inp = document.getElementById('take-photo-input')
                        if (inp) inp.click()
                      }}
                    >
                      <span></span><span></span><span></span><span></span>
                      {t('take_photo_btn')}
                    </a>
                    <div style={{ marginLeft: 12, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                      <div style={{ color: 'var(--muted)', fontSize: 13 }}>{t('photos_needed_label') || 'Photos' }: {photos.length}/3</div>
                      <div>
                        <Button className="ui-btn" onClick={() => setStep(1)}>{t('previous_step')}</Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: choose platform */}
              {step === 1 && (
                <div className="step step-1">
                  {needLangSelect ? (
                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
                      <a
                        role="button"
                        className="neon-btn"
                        onClick={() => {
                          try { localStorage.setItem('sz_lang', 'en') } catch(e){}
                          try { window.dispatchEvent(new Event('langchange')) } catch(e){}
                          setNeedLangSelect(false)
                        }}
                        style={{ marginRight: 12 }}
                      >
                        <span></span><span></span><span></span><span></span>
                        English
                      </a>
                      <a
                        role="button"
                        className="neon-btn"
                        onClick={() => {
                          try { localStorage.setItem('sz_lang', 'zh') } catch(e){}
                          try { window.dispatchEvent(new Event('langchange')) } catch(e){}
                          setNeedLangSelect(false)
                        }}
                      >
                        <span></span><span></span><span></span><span></span>
                        中文
                      </a>
                    </div>
                  ) : (
                    <>
                      <div className="platform-grid" role="list" style={{ marginTop: 8 }}>
                        {platforms.map(p => {
                          const active = selected.includes(p.id)
                          return (
                            <div key={p.id} role="listitem" onClick={() => {
                              setSelected(active ? selected.filter(s=>s!==p.id) : [...selected, p.id])
                            }} className={`platform-chip ${active ? 'selected' : ''}`} aria-pressed={active}>
                              <div className="chip-inner">
                                <span className="chip-icon" aria-hidden>{p.icon}</span>
                                <span className="chip-label">{p.label}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center' }}>
                        <a
                          role="button"
                          className="neon-btn"
                          onClick={async () => {
                            if (selected.length === 0) { message.info(t('please_select_platform')); return }
                            // go to Take Photo step before AI generation
                            setStep(0)
                          }}
                        >
                          <span></span><span></span><span></span><span></span>
                          {t('generate')}
                        </a>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Step 2: AI generate */}
              {step === 2 && (
                <div className="step step-2" style={{ marginTop: 8 }}>
                  <div style={{ padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8, minHeight: 140, color: 'var(--text)' }}>
                    <>
                      {/* Title preview moved to publish page - do not show title box here */}

                      {aiLoading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center', padding: 12 }}>
                          <div className="ai-progress" style={{ width: '100%', maxWidth: 520 }}>
                            <div className="ai-progress-track">
                              <div className="ai-progress-fill" style={{ width: `${aiProgress}%` }} />
                            </div>
                            <div className="ai-progress-meta">
                              <div className="ai-progress-percent">{Math.min(100, Math.floor(aiProgress))}%</div>
                              <div className="ai-progress-note">{t('ai_generating')}</div>
                            </div>
                          </div>
                        </div>
                      ) : (aiResult && !String(aiResult).toLowerCase().includes('simul') && !String(aiResult).includes('模拟') && !String(aiResult).includes('SILRA_API_KEY')) ? (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{aiResult}</div>
                      ) : (
                        // placeholder prompting user to click generate
                        <div style={{ height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                          {t('click_generate_review') || '点击生成评价'}
                        </div>
                      )}
                    </>
                    {/* Single copy button below results */}
                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
                      <Button onClick={() => {
                        try {
                          navigator.clipboard.writeText(aiResult || '')
                          message.success(t('copied'))
                          // after copying navigate to publish for first selected platform
                          const first = selected[0] || (platforms[0] && platforms[0].id)
                          if (first) {
                            const cleanedBody = ensureEmojiTagAndFormat(aiResult || '', aiTitle || '', first)
                            let finalTitle = aiTitle || ''
                            if (!finalTitle) {
                              const firstLine = (cleanedBody.split(/\r?\n/)[0] || '').trim()
                              finalTitle = firstLine
                            }
                            if (finalTitle && finalTitle.length > 20) finalTitle = finalTitle.slice(0,20) + '…'
                            setTimeout(() => navigate(`/t/${token}/publish/${first}`, { state: { title: finalTitle, body: cleanedBody, photo: photoUrl, photos } }), 350)
                          }
                        } catch (e) {
                          message.error(t('copy_failed'))
                        }
                      }}>{t('copy')}</Button>
                    </div>
                  </div>
                            <div className="step-actions" style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                              <a
                                role="button"
                                className={`neon-btn ${aiLoading ? 'loading' : ''}`}
                                onClick={async () => {
                                  if (aiLoading) return
                                  await onAi()
                                }}
                              >
                                <span></span><span></span><span></span><span></span>
                                {aiLoading ? t('generating') : t('generate')}
                              </a>
                              <Button className="ui-btn" onClick={() => setStep(0)}>{t('previous_step')}</Button>
                            </div>
                </div>
              )}

              {/* Step 3: redirect/publish */}
              {step === 3 && (
                <div className="step step-3" style={{ marginTop: 8 }}>
                  <div style={{ padding: 12 }}>
                    <p style={{ marginBottom: 8 }}>{t('ready_to_publish')}</p>
                    <div style={{ padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 8, minHeight: 120 }}>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{aiResult || prompt || ''}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <Button className="ui-btn ui-btn-primary full-cta" onClick={() => {
                      const first = selected[0] || (platforms[0] && platforms[0].id)
                      if (!first) { message.info(t('no_platform_selected')); return }
                      navigate(`/t/${token}/publish/${first}`, { state: { title: aiTitle, body: aiResult, photo: photoUrl, photos } })
                    }} style={{ minWidth: 220 }}>{t('next_open_platform')}</Button>
                  </div>
                </div>
              )}

            </>
          )}
        </Card>
      </div>
    </div>
  )
}


