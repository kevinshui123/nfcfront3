import React, { useEffect, useState } from 'react'
import { Card, Table, Button, Spin, Row, Col, Statistic, Space } from 'antd'
import { ArrowUpOutlined } from '@ant-design/icons'
import { getMerchantData } from '../api'
import { useNavigate, useParams } from 'react-router-dom'
import TopControls from '../components/TopControls'
import { t } from '../i18n'

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

  if (!data) {
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
      <div className="app-header">
        <div className="brand">
          <div className="brand-logo"><div className="brand-initials">SZ</div></div>
          <div>
            <div className="brand-title">{shop.name}</div>
            <div className="muted">商户控制台</div>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <div className="header-actions">
            <div className="muted">merchant@{shop.name}</div>
            <Button onClick={() => { localStorage.removeItem('access_token'); window.location.href = '/' }}>登出</Button>
          </div>
          <div style={{ position: 'absolute', right: 0, top: -6 }}>
            <TopControls />
          </div>
        </div>
      </div>
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
          <h3 style={{ margin: 0 }}>内容管理</h3>
          {loading ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div> : (
            <Table dataSource={dataSource} columns={columns} pagination={{ pageSize: 10 }} rowKey="id" />
          )}
        </Space>
      </Card>
    </div>
  )
}
