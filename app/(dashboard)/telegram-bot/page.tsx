'use client'
import { useState, useEffect } from 'react'

export default function TelegramBotPage() {
  const [botToken, setBotToken] = useState('')
  const [chatId, setChatId] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [botActive, setBotActive] = useState(false)
  const [botUsername, setBotUsername] = useState('')
  const [recentLogs] = useState([
    { time: new Date(Date.now() - 60000).toLocaleTimeString(), dir: '→', text: '🔑 New OTP from iVASMS — Number: +1555847xxxx — Code: 847291' },
    { time: new Date(Date.now() - 120000).toLocaleTimeString(), dir: '←', text: '/numbers' },
    { time: new Date(Date.now() - 180000).toLocaleTimeString(), dir: '→', text: '📱 Active Numbers (3)\n🇺🇸 +15558472910\n🇬🇧 +44201234567\n🇩🇪 +491761234567' },
    { time: new Date(Date.now() - 300000).toLocaleTimeString(), dir: '←', text: '/start' },
    { time: new Date(Date.now() - 360000).toLocaleTimeString(), dir: '→', text: '💀 DL SMS Client — Team Death Legion\nWelcome to your SMS monitoring bot!' },
  ])

  useEffect(() => {
    fetch('/api/telegram/setup').then(r => r.json()).then(d => {
      setBotActive(d.configured)
    }).catch(() => {})

    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user?.telegram_bot_token) {
        setBotToken(d.user.telegram_bot_token)
        setBotActive(true)
      }
      if (d.user?.telegram_chat_id) setChatId(d.user.telegram_chat_id)
    }).catch(() => {})
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const r = await fetch('/api/telegram/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken, chatId }),
      })
      const d = await r.json()
      if (r.ok) {
        setMsg({ type: 'success', text: `✓ Bot activated! @${d.username || 'yourbot'}` })
        setBotActive(true)
        setBotUsername(d.username || '')
      } else {
        setMsg({ type: 'error', text: d.error || 'Setup failed' })
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error' })
    }
    setSaving(false)
  }

  const handleTest = async () => {
    setTesting(true)
    setMsg(null)
    try {
      const r = await fetch('/api/telegram/test', { method: 'POST' })
      const d = await r.json()
      setMsg({ type: d.ok ? 'success' : 'error', text: d.ok ? '✓ Test message sent!' : d.error || 'Failed to send' })
    } catch {
      setMsg({ type: 'error', text: 'Network error' })
    }
    setTesting(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>✈️ Telegram Bot</h2>
        <p style={{ color: 'var(--text3)', fontSize: 13 }}>Receive OTP notifications and control your numbers from Telegram</p>
      </div>

      {/* Status banner */}
      {botActive && (
        <div style={{
          padding: '12px 18px', background: 'rgba(0,200,83,.08)', border: '1px solid rgba(0,200,83,.25)',
          borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span className="dot dot-green" style={{ animation: 'pulse 2s infinite' }} />
          <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: 13 }}>
            Bot Active {botUsername && `· @${botUsername}`}
          </span>
        </div>
      )}

      {/* Alert */}
      {msg && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, fontSize: 13,
          background: msg.type === 'error' ? 'rgba(229,9,20,.1)' : 'rgba(0,200,83,.1)',
          border: `1px solid ${msg.type === 'error' ? 'rgba(229,9,20,.3)' : 'rgba(0,200,83,.3)'}`,
          color: msg.type === 'error' ? 'var(--accent)' : 'var(--green)',
        }}>{msg.text}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Setup Card */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 18 }}>
            🤖 Bot Setup
          </h3>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>BOT TOKEN</label>
              <input type="text" value={botToken} placeholder="1234567890:ABCDefGHIjklMNOpqrSTUvwxyz..."
                onChange={e => setBotToken(e.target.value)} required style={{ fontFamily: 'monospace', fontSize: 12 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>YOUR TELEGRAM CHAT ID</label>
              <input type="text" value={chatId} placeholder="123456789"
                onChange={e => setChatId(e.target.value)} required style={{ fontFamily: 'monospace' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 1 }}>
                {saving ? '⟳ Saving...' : '💾 Save & Activate'}
              </button>
              {botActive && (
                <button type="button" onClick={handleTest} disabled={testing}
                  style={{
                    padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: 'rgba(33,150,243,.1)', border: '1px solid rgba(33,150,243,.3)',
                    color: 'var(--blue)', cursor: testing ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}>
                  {testing ? '⟳' : '📤 Test'}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* How-to Card */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>📖 Setup Guide</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 6 }}>Get Bot Token:</div>
              {[
                '1. Open @BotFather on Telegram',
                '2. Send /newbot and follow instructions',
                '3. Choose name & username for your bot',
                '4. Copy the token and paste above',
              ].map((s, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text2)', padding: '4px 0', borderBottom: i < 3 ? '1px solid rgba(30,30,46,.5)' : 'none' }}>{s}</div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', marginBottom: 6 }}>Get Chat ID:</div>
              {[
                '1. Open @userinfobot on Telegram',
                '2. Send any message',
                '3. Copy the "Id" from the response',
              ].map((s, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text2)', padding: '4px 0', borderBottom: i < 2 ? '1px solid rgba(30,30,46,.5)' : 'none' }}>{s}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Available Commands */}
      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>⌨️ Available Commands</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {[
            { cmd: '/start', desc: 'Welcome message', color: 'var(--accent)' },
            { cmd: '/numbers', desc: 'List all active numbers', color: 'var(--blue)' },
            { cmd: '/otp', desc: 'Get latest OTPs', color: '#ff9800' },
            { cmd: '/status', desc: 'System health check', color: 'var(--green)' },
            { cmd: '/help', desc: 'Show all commands', color: 'var(--text2)' },
          ].map(c => (
            <div key={c.cmd} style={{
              padding: '10px 14px', background: 'var(--bg2)', borderRadius: 8,
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: c.color }}>{c.cmd}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Auto-notification format */}
      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>🔔 Auto OTP Notification Format</h3>
        <div style={{
          padding: '16px', background: '#1a1a2e', borderRadius: 10, fontFamily: 'monospace',
          fontSize: 13, color: 'var(--text2)', lineHeight: 1.8, border: '1px solid var(--border)',
        }}>
          <div style={{ color: '#229ed9' }}>🔑 <strong>New OTP from iVASMS</strong></div>
          <div>📱 Number: <span style={{ color: 'var(--text)' }}>+1 555 847 2910</span></div>
          <div>🌐 Service: <span style={{ color: '#25d366' }}>Google</span></div>
          <div>📨 Code: <span style={{ color: 'var(--accent)', fontWeight: 900, fontSize: 16 }}>847291</span></div>
          <div>⏰ <span style={{ color: 'var(--text3)' }}>2 minutes ago</span></div>
        </div>
      </div>

      {/* Recent Logs */}
      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>📋 Recent Bot Messages</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {recentLogs.map((log, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, padding: '8px 12px', borderRadius: 6,
              background: 'var(--bg2)', border: '1px solid var(--border)', alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap', minWidth: 70 }}>{log.time}</span>
              <span style={{
                fontSize: 12, fontWeight: 700, minWidth: 20,
                color: log.dir === '→' ? 'var(--green)' : 'var(--blue)',
              }}>{log.dir}</span>
              <span style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'pre-line' }}>{log.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
