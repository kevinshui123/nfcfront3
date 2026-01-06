import React, { useEffect, useState } from 'react'
import { Card, Table, Button, Spin, Row, Col, Statistic, Space } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import { getMerchants } from '../api'
import { useNavigate } from 'react-router-dom'
import TopControls from '../components/TopControls'
import { t } from '../i18n'

export default function Dashboard() {
  const [langState, setLangState] = useState(localStorage.getItem('sz_lang') || 'zh')
  useEffect(() => {
    const onLang = () => setLangState(localStorage.getItem('sz_lang') || 'zh')
    window.addEventListener('langchange', onLang)
    return () => window.removeEventListener('langchange', onLang)
  }, [])
  const navigate = useNavigate()
  const [merchants, setMerchants] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    getMerchants()
      .then(data => { if (mounted) setMerchants(data) })
      .catch(() => {})
      .finally(()=> { if (mounted) setLoading(false) })
    return ()=> mounted = false
  }, [])

  // derive top KPIs from merchants list
  const totalVisits = merchants.reduce((s, m) => s + (m.visits || 0), 0)
  const totalReviews = merchants.reduce((s, m) => s + (m.reviews || 0), 0)
  const avgPerShop = merchants.length ? Math.round(totalVisits / merchants.length) : 0

  const columns = [
    { title: '商家', dataIndex: 'name', key: 'name', responsive: ['xs','sm','md'] },
    { title: '今日访客', dataIndex: 'visits', key: 'visits', responsive: ['sm'] },
    { title: '今日评价', dataIndex: 'reviews', key: 'reviews', responsive: ['sm'] },
    {
      title: '操作',
      key: 'op',
      render: (_, record) => <Button type="link" onClick={() => navigate(`/merchant/${record.id}`)}>查看</Button>,
    },
  ]

  const dataSource = merchants.map(m => ({ key: m.id, id: m.id, name: m.name, visits: m.visits, reviews: m.reviews }))

  return (
    <div style={{ padding: 24 }}>
      <div className="app-header">
        <div className="brand">
          <div className="brand-logo"><div className="brand-initials">SZ</div></div>
          <div>
            <div className="brand-title">{t('brandTitleUpper')}</div>
            <div className="muted">{t('brandSubtitle')}</div>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <div className="header-actions">
            <div className="muted">admin@example.com</div>
            <Button onClick={() => { localStorage.removeItem('access_token'); window.location.href = '/' }}>登出</Button>
          </div>
          <div style={{ position: 'absolute', right: 0, top: -6 }}>
            <TopControls />
          </div>
        </div>
      </div>
      <Row gutter={[16,16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card className="kpi-card animated">
            <Statistic title="总访客 (今日)" value={totalVisits} prefix={<ArrowUpOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="kpi-card animated">
            <Statistic title="总评价 (今日)" value={totalReviews} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="kpi-card animated">
            <Statistic title="平均/店" value={avgPerShop} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="kpi-card animated">
            <Statistic title="商家数" value={merchants.length} suffix="家" />
          </Card>
        </Col>
      </Row>

      <Card className="table-card">
        <Space direction="vertical" style={{ width: '100%' }}>
          <h3 style={{ margin: 0 }}>商家列表</h3>
          {loading ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div> : (
            <Table dataSource={dataSource} columns={columns} pagination={{ pageSize: 8 }} rowKey="id" />
          )}
        </Space>
      </Card>
    </div>
  )
}


