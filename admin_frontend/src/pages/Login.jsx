import React, { useState } from 'react'
import { Card, Form, Input, Button, message } from 'antd'
import { loginWithEmail, setAccessToken } from '../api'
import { t } from '../i18n'
import { useNavigate } from 'react-router-dom'
import TopControls from '../components/TopControls'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [langState, setLangState] = useState(localStorage.getItem('sz_lang') || 'zh')
  React.useEffect(() => {
    const onLang = () => setLangState(localStorage.getItem('sz_lang') || 'zh')
    window.addEventListener('langchange', onLang)
    return () => window.removeEventListener('langchange', onLang)
  }, [])

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const data = await loginWithEmail(values.email, values.password)
      if (data && data.access_token) {
        // store token via api helper
        setAccessToken(data.access_token)
        message.success('登录成功')
        // fetch current user and redirect based on role
        try {
          const me = await (await import('../api')).getCurrentUser()
          if (me && me.is_admin) {
            navigate('/dashboard')
          } else if (me && me.shop_id) {
            navigate(`/merchant/${me.shop_id}`)
          } else {
            navigate('/dashboard')
          }
        } catch (e) {
          navigate('/dashboard')
        }
      } else {
        message.error('登录失败')
      }
    } catch (err) {
      console.error(err)
      const detail = err?.response?.data?.detail || err?.message || '登录出错'
      message.error(detail)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-hero" style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="bg-band" aria-hidden="true"></div>
      <TopControls />
      <Card style={{ width: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div className="brand-logo" style={{ margin: '0 auto 8px auto' }}>
            <div className="brand-initials">SZ</div>
          </div>
          <h2 style={{ margin: 0, color: 'var(--text)' }}>{t('brandTitleUpper')}</h2>
          <div className="muted">{t('brandSubtitle')}</div>
        </div>
        <Form name="login" onFinish={onFinish} className="page-fade-enter-active">
          <Form.Item name="email" rules={[{ required: true, message: '请输入邮箱' }]}>
            <Input aria-label="email" placeholder={t('emailPlaceholder')} />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password aria-label="password" placeholder={t('passwordPlaceholder')} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {t('login')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}


