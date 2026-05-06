'use client'
import { useState, useEffect } from 'react'

export default function APIKeysPage() {
  const [apiKey,    setApiKey]    = useState('')
  const [copied,    setCopied]    = useState(false)
  const [regen,     setRegen]     = useState(false)
  const [msg,       setMsg]       = useState<{type:'success'|'error';text:string}|null>(null)

  useEffect(() => {
    fetch('/api/apikeys').then(r => r.json()).then(d => setApiKey(d.key || ''))
  }, [])

  const copy = () => {
    navigator.clipboard.writeText(apiKey).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const regenerate = async () => {
    if (!confirm('Regenerate API key? Existing integrations will break.')) return
    setRegen(true)
    try {
      const r = await fetch('/api/apikeys/regenerate', { method: 'POST' })
      const d = await r.json()
      if (d.key) {
        setApiKey(d.key)
        setMsg({ type: 'success', text: 'API key regenerated successfully' })
      }
    } catch { setMsg({ type: 'error', text: 'Failed to regenerate' }) }
    setRegen(false)
    setTimeout(() => setMsg(null), 4000)
  }

  const endpoints = [
    { method: 'GET',  path: '/api/ivasms/numbers',     desc: 'List all phone numbers' },
    { method: 'GET',  path: '/api/ivasms/sms',         desc: 'List SMS messages (paginated)' },
    { method: 'POST', path: '/api/ivasms/sync',        desc: 'Trigger iVASMS sync' },
    { method: 'GET',  path: '/api/otp/latest',         desc: 'Get latest OTP codes' },
    { method: 'GET',  path: '/api/otp/watch',          desc: 'Watch for new OTPs (since param)' },
    { method: 'GET',  path: '/api/analytics',          desc: 'Get analytics data' },
    { method: 'GET',  path: '/api/export/sms',         desc: 'Export SMS (JSON or CSV)' },
    { method: 'GET',  path: '/api/export/numbers',     desc: 'Export numbers (JSON or CSV)' },
    { method: 'GET',  path: '/api/lookup?phone=…',     desc: 'Lookup phone number info' },
    { method: 'GET',  path: '/api/search?q=…',         desc: 'Global search across SMS and numbers' },
    { method: 'GET',  path: '/api/status',             desc: 'System health status' },
    { method: 'POST', path: '/api/bulk/send',          desc: 'Send bulk messages' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800 }}>

      <div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="bi bi-code-slash" style={{ color: 'var(--accent)', fontSize: 20 }} />
          API Keys & Docs
        </h2>
        <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>Integrate DL SMS Client with your apps via REST API</p>
      </div>

      {/* API Key card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(229,9,20,.1)', border: '1px solid rgba(229,9,20,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="bi bi-key-fill" style={{ fontSize: 17, color: 'var(--accent)' }} />
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Your API Key</h3>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.6 }}>
          Use this key in the <code style={{ background: 'var(--bg2)', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>X-API-Key</code> header to authenticate API requests from external applications.
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
          <div style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {apiKey || 'Loading…'}
          </div>
          <button onClick={copy} className={copied ? 'btn-success btn-sm' : 'btn-secondary btn-sm'} style={{ flexShrink: 0 }}>
            <i className={`bi ${copied ? 'bi-clipboard-check-fill' : 'bi-clipboard-fill'}`} style={{ fontSize: 13 }} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={regenerate} disabled={regen} className="btn-danger btn-sm" style={{ flexShrink: 0 }}>
            <i className="bi bi-arrow-repeat" style={{ fontSize: 13, animation: regen ? 'spin 1s linear infinite' : 'none', display: 'inline-block' }} />
            Regenerate
          </button>
        </div>
        {msg && (
          <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            <i className={`bi ${msg.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`} />
            {msg.text}
          </div>
        )}
      </div>

      {/* Usage example */}
      <div className="card">
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="bi bi-terminal-fill" style={{ color: 'var(--green)', fontSize: 14 }} />
          Usage Example
        </h3>
        <div className="code-block" style={{ marginBottom: 12 }}>
          <div style={{ color: 'var(--text3)', marginBottom: 6 }}># cURL example</div>
          <div style={{ color: '#7ec8e3' }}>curl</div>{' '}
          <div style={{ display: 'inline', color: '#a8ff78' }}>https://dl-sms-client.pages.dev/api/ivasms/sms</div>
          {' \\\n  '}<div style={{ display: 'inline', color: '#ffc66d' }}>-H</div>{' '}
          <div style={{ display: 'inline', color: '#a8ff78' }}>"X-API-Key: {apiKey || 'YOUR_KEY_HERE'}"</div>
        </div>
        <div className="code-block">
          <div style={{ color: 'var(--text3)', marginBottom: 6 }}>// JavaScript fetch</div>
          <span style={{ color: '#cc99cd' }}>const</span>{' '}
          <span style={{ color: '#7ec8e3' }}>resp</span>{' = await '}<span style={{ color: '#f8c555' }}>fetch</span>{'(\n  '}<span style={{ color: '#a8ff78' }}>'https://dl-sms-client.pages.dev/api/ivasms/sms'</span>{',\n  {'}<span style={{ color: '#ffc66d' }}>headers</span>:{' {'}
          <span style={{ color: '#a8ff78' }}>'X-API-Key'</span>{': '}<span style={{ color: '#a8ff78' }}>'{apiKey || 'YOUR_KEY_HERE'}'</span>{'}\n})'}
        </div>
      </div>

      {/* Endpoints table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="bi bi-list-ul" style={{ color: 'var(--blue)', fontSize: 15 }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Available Endpoints</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th>Endpoint</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map((ep, i) => (
              <tr key={i}>
                <td>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
                    background: ep.method === 'GET' ? 'rgba(41,121,255,.15)' : ep.method === 'POST' ? 'rgba(0,230,118,.15)' : 'rgba(229,9,20,.15)',
                    color: ep.method === 'GET' ? 'var(--blue)' : ep.method === 'POST' ? 'var(--green)' : 'var(--accent)',
                  }}>{ep.method}</span>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text2)' }}>{ep.path}</td>
                <td style={{ fontSize: 12, color: 'var(--text3)' }}>{ep.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
