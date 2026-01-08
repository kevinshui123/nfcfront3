// Force rebuild - added comment 2
import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import 'antd/dist/reset.css'
import './styles.css'
import { ConfigProvider } from 'antd'
import LoginPage from './pages/Login'
import Dashboard from './pages/Dashboard'
import TagsPage from './pages/Tags'
import MerchantPage from './pages/Merchant'
import MerchantDashboard from './pages/MerchantDashboard'
import TokenView from './pages/TokenView'
import PublishPage from './pages/Publish'
import NeuralBackground from './components/NeuralBackground'

// set document title and favicon
try {
  document.title = 'SONGZIKE TOOL'
  // Backwards-compatible global token for older bundles that reference `token`
  try { var token = localStorage.getItem('access_token') } catch(e) { var token = null }
  const link = document.querySelector("link[rel~='icon']") || document.createElement('link')
  link.rel = 'icon'
  link.href = '/assets/logo.png'
  document.getElementsByTagName('head')[0].appendChild(link)
} catch (e) {}

function App() {
  const isAuth = () => !!localStorage.getItem('access_token')

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: 'var(--primary)',
        },
      }}
    >
    <NeuralBackground />
    <BrowserRouter>
      <BodyClassToggler />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={isAuth() ? <Dashboard /> : <Navigate to="/login" replace />} />
        <Route path="/merchant/:id" element={isAuth() ? <MerchantDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/t/:token" element={<TokenView />} />
        <Route path="/t/:token/publish/:platform" element={<PublishPage />} />
        <Route path="/tags" element={isAuth() ? <TagsPage /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to={isAuth() ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
    </ConfigProvider>
  )
}

createRoot(document.getElementById('root')).render(<App />)

function BodyClassToggler() {
  const location = useLocation()
  useEffect(() => {
    try {
      if (location && typeof location.pathname === 'string' && location.pathname.startsWith('/dashboard')) {
        document.body.classList.add('is-dashboard')
      } else {
        document.body.classList.remove('is-dashboard')
      }
    } catch (e) {}
  }, [location])
  return null
}


\//" Force "rebuild\  
