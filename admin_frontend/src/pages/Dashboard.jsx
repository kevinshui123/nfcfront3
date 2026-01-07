import React, { useEffect, useState } from 'react'
import { Card, Table, Button, Spin, Row, Col, Statistic, Space, Modal, message, Alert } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined, UserAddOutlined } from '@ant-design/icons'
import { getMerchants, createMerchant, getCurrentUser } from '../api'
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
  const [creatingMerchant, setCreatingMerchant] = useState(false)
  const [newMerchantCredentials, setNewMerchantCredentials] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    let mounted = true
    getMerchants()
      .then(data => { if (mounted) setMerchants(data) })
      .catch(() => {})
      .finally(()=> { if (mounted) setLoading(false) })
    return ()=> mounted = false
  }, [])

  useEffect(() => {
    let mounted = true
    getCurrentUser().then(u => { if (mounted) setCurrentUser(u) }).catch(()=>{})
    return () => mounted = false
  }, [])

  const handleCreateMerchant = async () => {
    setCreatingMerchant(true)
    try {
      const credentials = await createMerchant()
      setNewMerchantCredentials(credentials)
      message.success('商户账号创建成功')
      // Refresh merchants list
      const updatedMerchants = await getMerchants()
      setMerchants(updatedMerchants)
    } catch (error) {
      console.error('创建商户失败:', error)
      message.error('创建商户失败')
    } finally {
      setCreatingMerchant(false)
    }
  }

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
      {/* Modal for displaying new merchant credentials */}
      <Modal
        title="新商户账号创建成功"
        open={!!newMerchantCredentials}
        onCancel={() => setNewMerchantCredentials(null)}
        footer={[
          <Button key="close" onClick={() => setNewMerchantCredentials(null)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {newMerchantCredentials && (
          <div>
            <Alert
              message="重要提醒"
              description="请安全保存这些凭证信息。一旦关闭此窗口，将无法再次查看密码。"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
              <p><strong>用户名:</strong> {newMerchantCredentials.username}</p>
              <p><strong>密码:</strong> {newMerchantCredentials.password}</p>
              <p><strong>店铺ID:</strong> {newMerchantCredentials.shop_id}</p>
            </div>
          </div>
        )}
      </Modal>

      <div className="app-header">
        <div className="brand">
          <div className="brand-logo"><div className="brand-initials">SZ</div></div>
        </div>
        <div style={{ position: 'relative' }}>
          <div className="header-actions">
            <div className="muted">{(currentUser && currentUser.email) || '...'}</div>
            <Space>
              {currentUser && currentUser.is_admin ? (
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  loading={creatingMerchant}
                  onClick={handleCreateMerchant}
                >
                  创建商户账号
                </Button>
              ) : null}
              <Button onClick={() => { localStorage.removeItem('access_token'); window.location.href = '/' }}>登出</Button>
            </Space>
          </div>
          <div style={{ position: 'absolute', right: 0, top: -6 }}>
            <TopControls />
          </div>
        </div>
      </div>
      {/* Centered title (large, animated) */}
      <div className="center-page-title">SongZIke</div>

      {currentUser && currentUser.is_admin && (
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
      )}

      {currentUser && currentUser.is_admin && (
        <Card className="table-card">
          <Space direction="vertical" style={{ width: '100%' }}>
            <h3 style={{ margin: 0 }}>商家列表</h3>
            {loading ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div> : (
              <Table dataSource={dataSource} columns={columns} pagination={{ pageSize: 8 }} rowKey="id" />
            )}
          </Space>
        </Card>
      )}
    </div>
  )
}


