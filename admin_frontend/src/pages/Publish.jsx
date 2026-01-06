import React from 'react'
import PrismHeader from '../components/PrismHeader'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button } from 'antd'

const platformMeta = {
  xiaohongshu: { label: '小红书', deepLink: 'xiaohongshu://post', webFallback: 'https://www.xiaohongshu.com', color: '#ff3b6b' },
  douyin: { label: '抖音', deepLink: 'snssdk1128://publish', webFallback: 'https://www.douyin.com', color: '#ff5a00' },
  wechat: { label: '微信', deepLink: 'weixin://dl/officialaccounts', webFallback: 'https://weixin.qq.com', color: '#09bb07' },
  instagram: { label: 'Instagram', deepLink: 'instagram://camera', webFallback: 'https://www.instagram.com', color: '#d6249f' },
}

export default function PublishPage() {
  const { token, platform } = useParams()
  const navigate = useNavigate()
  const meta = platformMeta[platform] || { label: platform, deepLink: '', color: '#1890ff' }

  const openDeepLink = () => {
    const fallbackUrl = meta.webFallback || '/'
    if (meta.deepLink) {
      // Use iframe technique for some mobile browsers, then fallback
      try {
        const now = Date.now()
        // create iframe for deep link attempt
        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        iframe.src = meta.deepLink
        document.body.appendChild(iframe)
        const timeout = setTimeout(() => {
          // if after 900ms still here, open fallback
          if (Date.now() - now < 1500) {
            // open fallback in same tab for mobile browsers, but avoid navigating to root of SPA
            window.location.href = fallbackUrl
          }
          try { document.body.removeChild(iframe) } catch(e){}
          clearTimeout(timeout)
        }, 900)
      } catch (e) {
        window.open(fallbackUrl, '_blank')
      }
    } else {
      window.open(fallbackUrl, '_blank')
    }
  }

  return (
    <div className="publish-page" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <PrismHeader />
      <Card className="publish-hero minimal" style={{ textAlign: 'center', padding: 28, width: '92%', maxWidth: 640, minHeight: 420 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div>
            <a
              className="publish-neon"
              role="button"
              onClick={openDeepLink}
              aria-label={`打开 ${meta.label}`}
            >
              <span></span><span></span><span></span><span></span>
              Click
            </a>
          </div>
          <div className="publish-caption" aria-hidden>尝试打开 {meta.label} App，若未安装将打开网页</div>
          <div className="publish-fallback-link"><a href={meta.webFallback || '/'} target="_blank" rel="noopener noreferrer">打开 {meta.label} 网页版本</a></div>
        </div>
      </Card>
    </div>
  )
}


