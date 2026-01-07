import axios from 'axios'

// Resolve backend base URL with runtime fallback:
// 1. window.__BACKEND_URL (can be injected at runtime without rebuilding)
// 2. import.meta.env.VITE_BACKEND_URL (inlined at build time)
// 3. default to localhost for dev
const BACKEND_BASE = (typeof window !== 'undefined' && window.__BACKEND_URL) || import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001'
const USE_MOCK = import.meta.env.VITE_MOCK === 'true'

const apiClient = axios.create({
  baseURL: BACKEND_BASE,
  timeout: 10000,
})

// Attach token from localStorage to each request if present
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Basic response interceptor to catch 401 and remove token
apiClient.interceptors.response.use(
  (resp) => resp,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('access_token')
      // optional: redirect to login
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export async function loginWithEmail(email, password) {
  if (USE_MOCK) {
    // mock login: accept demo admin
    if (email === 'admin@example.com' && password === 'password123') {
      return { access_token: 'mock-token', token_type: 'bearer' }
    } else {
      throw new Error('Invalid credentials (mock)')
    }
  }
  const resp = await apiClient.post('/api/auth/token', { email, password })
  return resp.data
}

export async function batchEncodeTokens(shopId, count, prefix) {
  if (USE_MOCK) {
    const tokens = []
    for (let i = 0; i < count; i++) {
      tokens.push((prefix || '') + Math.random().toString(36).slice(2, 10))
    }
    return { tokens, count }
  }
  const resp = await apiClient.post(`/api/shops/${shopId}/tags/batch_encode`, { count, prefix })
  return resp.data
}

export async function getMerchants() {
  if (USE_MOCK) {
    return [
      { id: 'shop-a', name: '商家 A', visits: 128, reviews: 12 },
      { id: 'shop-b', name: '商家 B', visits: 42, reviews: 3 },
    ]
  }
  try {
    const resp = await apiClient.get('/api/shops')
    return resp.data
  } catch (e) {
    // fallback to mock
    return [
      { id: 'shop-a', name: '商家 A', visits: 128, reviews: 12 },
      { id: 'shop-b', name: '商家 B', visits: 42, reviews: 3 },
    ]
  }
}

export function setAccessToken(token) {
  if (token) {
    localStorage.setItem('access_token', token)
  } else {
    localStorage.removeItem('access_token')
  }
}

export function logout() {
  localStorage.removeItem('access_token')
  window.location.href = '/login'
}

export default apiClient

export async function getCurrentUser() {
  if (USE_MOCK) {
    return { email: 'admin@example.com', is_admin: 1, shop_id: null }
  }
  try {
    const resp = await apiClient.get('/api/me')
    return resp.data
  } catch (e) {
    console.error('getCurrentUser failed', e)
    return null
  }
}

export async function aiGenerate(payload) {
  if (USE_MOCK) {
    return { raw: { mock: true, text: '这是模拟 AI 文案' } }
  }
  const resp = await apiClient.post('/ai/generate', payload)
  return resp.data
}

export async function getTokenContent(token) {
  if (USE_MOCK) {
    return { title: 'Demo Shop', body: '欢迎使用 Songzike Tool 的 NFC 页面' }
  }
  const resp = await apiClient.get(`/t/${token}`)
  return resp.data
}

export async function saveContent(tokenOrShop, title, body, created_by = null) {
  if (USE_MOCK) {
    return { id: 'mock-content-' + Math.random().toString(36).slice(2,8), shop_id: tokenOrShop, title }
  }
  const payload = {}
  if (tokenOrShop && tokenOrShop.startsWith('demo-')) payload.token = tokenOrShop
  else payload.shop_id = tokenOrShop
  payload.title = title
  payload.body = body
  if (created_by) payload.created_by = created_by
  const resp = await apiClient.post('/content', payload)
  return resp.data
}

export async function socialPublish(platform, payload) {
  if (USE_MOCK) {
    return { status: 'mocked', platform }
  }
  const resp = await apiClient.post(`/api/social/${platform}/publish`, payload)
  return resp.data
}

export async function createMerchant() {
  if (USE_MOCK) {
    return {
      username: 'merchant_' + Math.random().toString(36).slice(2, 8),
      password: Math.random().toString(36).slice(2, 12),
      shop_id: 'shop_' + Math.random().toString(36).slice(2, 8)
    }
  }
  const resp = await apiClient.post('/admin/merchants')
  return resp.data
}

export async function getMerchantData(shopId) {
  if (USE_MOCK) {
    return {
      shop: { id: shopId, name: 'Mock Shop ' + shopId },
      visits: Math.floor(Math.random() * 100),
      reviews: Math.floor(Math.random() * 20),
      contents: [
        { id: '1', title: 'Sample Review', token: 'demo-token', platform: 'xiaohongshu', created_at: new Date().toISOString() }
      ]
    }
  }
  // Some browsers/extensions may alter XHR; include explicit Authorization header as a fallback
  const explicitHeaders = {}
  const localToken = (typeof window !== 'undefined') ? localStorage.getItem('access_token') : null
  if (localToken) explicitHeaders.Authorization = `Bearer ${localToken}`
  const resp = await apiClient.get(`/api/merchant/${shopId}`, { headers: explicitHeaders })
  return resp.data
}


