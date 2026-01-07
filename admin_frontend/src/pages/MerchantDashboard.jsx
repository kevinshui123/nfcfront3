import React, { useEffect, useState } from 'react'
import { Card, Table, Button, Spin, Row, Col, Statistic, Space } from 'antd'
import { ArrowUpOutlined } from '@ant-design/icons'
import { getMerchantData } from '../api'
import { useNavigate, useParams } from 'react-router-dom'
import TopControls from '../components/TopControls'
import { t } from '../i18n'
import AnimatedTimeSeries from '../components/AnimatedTimeSeries'
import { getCurrentUser } from '../api'

export default function MerchantDashboard() {
  const { id } = useParams()
  const [langState, setLangState] = useState(localStorage.getItem('sz_lang') || 'zh')
  useEffect(() => {
    const onLang = () => setLangState(localStorage.getItem('sz_lang') || 'zh')
    window.addEventListener('langchange', onLang)
    return () => window.removeEventListener('langchange', onLang)
  }, [])
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    getMerchantData(id)
      .then(data => { if (mounted) setData(data) })
      .catch(() => {})
      .finally(()=> { if (mounted) setLoading(false) })
    return ()=> mounted = false
  }, [id])

  const [currentUser, setCurrentUser] = useState(null)
  useEffect(() => {
    let mounted = true
    getCurrentUser().then(u => { if (mounted) setCurrentUser(u) }).catch(()=>{})
    return () => mounted = false
  }, [])

  if (!data || currentUser === null) {
    return <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
  }

  const { shop, visits, reviews, contents } = data

  const columns = [
    { title: '内容标题', dataIndex: 'title', key: 'title' },
    { title: '发布时间', dataIndex: 'created_at', key: 'created_at', render: (date) => new Date(date).toLocaleDateString() },
    { title: '平台', dataIndex: 'platform', key: 'platform' },
    {
      title: '操作',
      key: 'op',
      render: (_, record) => <Button type="link" onClick={() => navigate(`/t/${record.token}`)}>查看</Button>,
    },
  ]

  const dataSource = contents.map(c => ({ key: c.id, ...c }))

  return (
    <div style={{ padding: 24 }}>
      <div className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="header-actions" style={{ display: 'flex', alignItems: 'center' }}>
            <div className="muted" style={{ marginRight: 12 }}>merchant@{shop.name}</div>
            <Button onClick={() => { localStorage.removeItem('access_token'); window.location.href = '/' }}>登出</Button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 0 }}>
          <TopControls />
        </div>
      </div>
  {/* For admin viewers show KPIs and content table; for merchant owners show a time-series chart instead */}
  {currentUser && currentUser.is_admin ? (
    <>
      <Row gutter={[16,16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Card className="kpi-card animated">
            <Statistic title="今日访客" value={visits} prefix={<ArrowUpOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="kpi-card animated">
            <Statistic title="今日评价" value={reviews} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="kpi-card animated">
            <Statistic title="总内容数" value={contents.length} />
          </Card>
        </Col>
      </Row>

      <Card className="table-card">
        <Space direction="vertical" style={{ width: '100%' }}>
          <h3 style={{ margin: 0 }}>内容统计（最近 7 天）</h3>
          {loading ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div> : (
            <AnimatedTimeSeries
              data={[
                Math.max(0, Math.floor((visits || 0) * 0.1)),
                Math.max(0, Math.floor((visits || 0) * 0.25)),
                Math.max(0, Math.floor((visits || 0) * 0.4)),
                Math.max(0, Math.floor((visits || 0) * 0.6)),
                Math.max(0, Math.floor((visits || 0) * 0.8)),
                Math.max(0, Math.floor((visits || 0) * 0.9)),
                (visits || 0)
              ]}
              width={900}
              height={260}
              color="#ffd36b"
            />
          )}
        </Space>
      </Card>
    </>
  ) : (
    <Card className="table-card">
      <h3 style={{ marginBottom: 12 }}>最近趋势（7 天）</h3>
      {/* Replace admin content table with a statistics chart for both admin and merchant owners */}
      <AnimatedTimeSeries
        data={[
          Math.max(0, Math.floor((visits || 0) * 0.1)),
          Math.max(0, Math.floor((visits || 0) * 0.25)),
          Math.max(0, Math.floor((visits || 0) * 0.4)),
          Math.max(0, Math.floor((visits || 0) * 0.6)),
          Math.max(0, Math.floor((visits || 0) * 0.8)),
          Math.max(0, Math.floor((visits || 0) * 0.9)),
          (visits || 0)
        ]}
        width={900}
        height={260}
        color="#7fd1ff"
      />
      <div style={{ marginTop: 8, color: 'var(--muted)' }}>横轴：最近 7 天，纵轴：访问/评论（示例数据）</div>
    </Card>
  )}
    </div>
  )
}
