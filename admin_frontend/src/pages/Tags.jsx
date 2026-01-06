import React, { useState, useEffect } from 'react'
import { Card, InputNumber, Input, Button, Table, Space, message, Row, Col, Typography, Tooltip } from 'antd'
import { CopyOutlined, DownloadOutlined } from '@ant-design/icons'
import { batchEncodeTokens, logout } from '../api'
import TopControls from '../components/TopControls'
import { t } from '../i18n'

export default function TagsPage() {
  const [count, setCount] = useState(10)
  const [prefix, setPrefix] = useState('')
  const [loading, setLoading] = useState(false)
  const [tokens, setTokens] = useState([])
  const [exporting, setExporting] = useState(false)

  const onGenerate = async () => {
    const accessToken = localStorage.getItem('access_token')
    if (!accessToken) {
      message.error(t('login') + ' required')
      return
    }
    setLoading(true)
    try {
      // For demo, using shop id 'shop-demo'
      const resp = await batchEncodeTokens('shop-demo', count, prefix)
      setTokens(resp.tokens || [])
      message.success(`${resp.count} tokens generated`)
    } catch (err) {
      console.error(err)
      message.error('generate failed')
    } finally {
      setLoading(false)
    }
  }

  const onExport = () => {
    if (!tokens.length) {
      message.warning('no tokens to export')
      return
    }
    // large export guard
    if (tokens.length > 2000) {
      if (!confirm(`About to export ${tokens.length} tokens, may be slow. Continue?`)) return
    }
    setExporting(true)
    try {
      const csv = tokens.join('\n')
      const blob = new Blob([csv], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'tokens.csv'
      a.click()
      URL.revokeObjectURL(url)
      message.success('CSV generated and download started')
    } finally {
      setExporting(false)
    }
  }

  const columns = [
    { title: 'Token', dataIndex: 'token', key: 'token', render: (text) => <Typography.Text copyable={{ text }}>{text}</Typography.Text> },
    {
      title: '操作',
      key: 'op',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="复制">
            <Button icon={<CopyOutlined />} onClick={() => { navigator.clipboard?.writeText(record.token); message.success('已复制') }} />
          </Tooltip>
        </Space>
      )
    }
  ]

  const dataSource = tokens.map((t, i) => ({ key: i, token: t }))

  return (
    <div style={{ padding: 24 }}>
      <TopControls />
      <Card title={t('token_batch_title') || 'Batch Encode Tokens'} bordered>
        <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
          <Col xs={24} sm={16}>
            <Space wrap>
              <InputNumber aria-label="count" min={1} max={10000} value={count} onChange={v => setCount(v)} />
              <Input aria-label="prefix" placeholder={t('prefix_placeholder') || 'Prefix (optional)'} value={prefix} onChange={e => setPrefix(e.target.value)} style={{ minWidth: 220 }} />
              <Button aria-label="generate" type="primary" onClick={onGenerate} loading={loading}>{t('generate') || 'Generate'}</Button>
              <Button aria-label="export" icon={<DownloadOutlined />} onClick={onExport} loading={exporting}>{t('export_csv') || 'Export CSV'}</Button>
            </Space>
            <div style={{ marginTop: 8 }}>
              <Typography.Text type="secondary">Tip: generated tokens will appear below for copy/export.</Typography.Text>
            </div>
          </Col>
          <Col>
            <Button danger onClick={() => logout()}>登出</Button>
          </Col>
        </Row>
        <Table columns={columns} dataSource={dataSource} pagination={{ pageSize: 10 }} rowKey="key" />
      </Card>
    </div>
  )
}


