import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Row, Col, Statistic, Table, Button } from 'antd'
import { ArrowUpOutlined } from '@ant-design/icons'
import { getMerchants } from '../api'
import TopControls from '../components/TopControls'
import { t } from '../i18n'

export default function MerchantPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [shop, setShop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [visits, setVisits] = useState([])

  useEffect(() => {
    let mounted = true
    getMerchants().then(list => {
      if (!mounted) return
      const s = (list || []).find(x => x.id === id) || null
      setShop(s)
      // generate sample recent visits if none
      const sample = []
      for (let i=0;i<8;i++){
        sample.push({ key: i, time: `${9+i}:0${i}`, device: i%2 ? 'iPhone' : 'Android', action: ['打开页面','生成评价','发布'][i%3] })
      }
      setVisits(sample)
    }).catch(()=>{}).finally(()=> mounted && setLoading(false))
    return ()=> mounted = false
  }, [id])

  const columns = [
    { title: '时间', dataIndex: 'time', key: 'time' },
    { title: '设备', dataIndex: 'device', key: 'device' },
    { title: '行为', dataIndex: 'action', key: 'action' },
  ]

  if (!shop && !loading) {
    return (
      <div style={{ padding: 24 }}>
        <Card>
          <h3>{t('shop_not_found') || 'Shop not found'}</h3>
          <Button onClick={()=>navigate('/dashboard')}>{t('back_to_dashboard') || 'Back to dashboard'}</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="merchant-page" style={{ padding: 24 }}>
      <TopControls />
      <Row gutter={[16,16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic title={t('shop_name') || 'Shop name'} value={shop?.name || (t('loading')||'Loading')} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic title={t('visits_today') || 'Visits (today)'} value={shop?.visits ?? 0} prefix={<ArrowUpOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic title={t('reviews_today') || 'Reviews (today)'} value={shop?.reviews ?? 0} />
          </Card>
        </Col>
      </Row>

      <Card title="最近访客">
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', right: 12, top: 8 }}><Button onClick={() => {
              const csv = visits.map(v => `${v.time},${v.device},${v.action}`).join('\\n')
              const blob = new Blob([csv], { type: 'text/plain;charset=utf-8' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `visits-${id}.csv`
              a.click()
              URL.revokeObjectURL(url)
            }}>{t('export_visits') || 'Export visits CSV'}</Button></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            {/* simple sparkline */}
            <svg width="100%" height="40" viewBox="0 0 200 40" preserveAspectRatio="none">
              {(() => {
                const vals = visits.map((v, i) => (i % 5) + (v.device === 'iPhone' ? 3 : 1))
                const max = Math.max(...vals, 1)
                return vals.map((val, i) => {
                  const x = (i / Math.max(1, vals.length - 1)) * 200
                  const y = 40 - (val / max) * 36
                  return <circle key={i} cx={x} cy={y} r="2" fill="#1890ff" />
                })
              })()}
            </svg>
          </div>
          <div style={{ minWidth: 120 }}>
            <Button onClick={() => {
              const csv = visits.map(v => `${v.time},${v.device},${v.action}`).join('\\n')
              const blob = new Blob([csv], { type: 'text/plain;charset=utf-8' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `visits-${id}.csv`
              a.click()
              URL.revokeObjectURL(url)
            }}>导出访客 CSV</Button>
          </div>
        </div>
        <Table columns={columns} dataSource={visits} pagination={{ pageSize: 6 }} />
      </Card>
    </div>
  )
}


