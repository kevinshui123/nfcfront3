import React, { useEffect, useState } from 'react'
import { Button, Tooltip } from 'antd'
import { SunOutlined, MoonOutlined, GlobalOutlined } from '@ant-design/icons'

export default function TopControls() {
  // Default theme: prefer saved theme or light (we want dark text on light blob background)
  const [theme] = useState(localStorage.getItem('sz_theme') || 'light')
  const [lang, setLang] = useState(localStorage.getItem('sz_lang') || 'en')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light')
    try { document.body.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light') } catch(e){}
    localStorage.setItem('sz_theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('sz_lang', lang)
    // simple i18n switch: update html lang attribute
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN'
    // notify app components to re-render translations
    try { window.dispatchEvent(new Event('langchange')) } catch(e){}
  }, [lang])
  // broadcast theme change for components that may listen
  useEffect(() => {
    try { window.dispatchEvent(new Event('themechange')) } catch(e){}
  }, [theme])

  return (
    <div className="top-controls" aria-hidden="false" style={{ display: 'flex', alignItems: 'center', marginTop: 0, height: 40 }}>
      {/* Theme toggle removed; app uses dark theme only */}
      <Tooltip title={lang === 'en' ? 'Switch to 中文' : '切换到 English'}>
        <Button
          shape="round"
          onClick={() => setLang(prev => prev === 'en' ? 'zh' : 'en')}
          style={{ marginLeft: 0, height: 40, lineHeight: '40px', padding: '0 14px', display: 'flex', alignItems: 'center' }}
          aria-label="lang-toggle"
        >
          <GlobalOutlined /> {lang === 'en' ? 'EN' : '中文'}
        </Button>
      </Tooltip>
      {/* API key is provided internally; no UI input per product decision */}
    </div>
  )
}


