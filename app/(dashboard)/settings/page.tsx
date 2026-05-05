'use client'
import { useState, useEffect } from 'react'

function MsgBox({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) {
  if (!msg) return null
  return (
    <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginTop: 10 }}>
      <i className={`bi ${msg.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`} />
      {msg.text}
    </div>
  )
}

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState({ name: '', email: '' })
  const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' })
  const [ivasms, setIvasms] = useState({ email: '', password: '' })
  const [telegram, setTelegram] = useState({ botToken: '', chatId: '' })
  const [token, setToken] = useState('')
  const [msgs, setMsgs] = useState<Record<string, { type: 'success' | 'error'; text: string } | null>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [showPwd, setShowPwd] = useState(false)
  const [showIvasPwd, setShowIvasPwd] = useState(false)
  const [copied, setCopied] = useState(false)
  const [testingIvas, setTestingIvas] = useState(false)
  const [testingTg, setTestingTg] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.user) {
        setUser(d.user)
        setProfile({ name: d.user.name || '', email: d.user.email || '' })
        setIvasms({ email: d.user.ivasms_email || '', password: '' })
        setTelegram({ botToken: d.user.telegram_bot_token || '', chatId: d.user.telegram_chat_id || '' })
        setToken(d.user.mobile_token || '')
      }
    }).catch(() => {})
  }, [])

  const setMsg = (key: string, type: 'success' | 'error', text: string) => {
    setMsgs(p => ({ ...p, [key]: { type, text } }))
    setTimeout(() => setMsgs(p => ({ ...p, [key]: null })), 5000)
  }
  const setLoad = (key: string, v: boolean) => setLoading(p => ({ ...p, [key]: v }))

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setLoad('profile', true)
    try {
      const r = await fetch('/api/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'profile', name: profile.name, email: profile.email }),
      })
      const d = await r.json()
      r.ok ? setMsg('profile', 'success', 'Profile updated successfully') : setMsg('profile', 'error', d.error || 'Failed')
    } catch { setMsg('profile', 'error', 'Network error') }
    setLoad('profile', false)
  }

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwords.new !== passwords.confirm) { setMsg('password', 'error', 'New passwords do not match'); return }
    if (passwords.new.length < 6) { setMsg('password', 'error', 'Password must be at least 6 characters'); return }
    setLoad('password', true)
    try {
      const r = await fetch('/api/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'password', old: passwords.old, new: passwords.new }),
      })
      const d = await r.json()
      if (r.ok) { setMsg('password', 'success', 'Password changed successfully'); setPasswords({ old: '', new: '', confirm: '' }) }
      else setMsg('password', 'error', d.error || 'Failed')
    } catch { setMsg('password', 'error', 'Network error') }
    setLoad('password', false)
  }

  const saveIvasms = async (e: React.FormEvent) => {
    e.preventDefault(); setLoad('ivasms', true)
    try {
      const r = await fetch('/api/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ivasms', email: ivasms.email, password: ivasms.password }),
      })
      const d = await r.json()
      if (r.ok) { setMsg('ivasms', 'success', 'iVASMS credentials saved. Click "Sync iVASMS" in the topbar.') }
      else setMsg('ivasms', 'error', d.error || 'Failed to save')
    } catch { setMsg('ivasms', 'error', 'Network error') }
    setLoad('ivasms', false)
  }

  const testIvasms = async () => {
    if (!ivasms.email || !ivasms.password) { setMsg('ivasms', 'error', 'Enter credentials first'); return }
    setTestingIvas(true)
    // Save first then sync
    try {
      const saveR = await fetch('/api/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ivasms', email: ivasms.email, password: ivasms.password }),
      })
      if (!saveR.ok) { setMsg('ivasms', 'error', 'Failed to save credentials'); setTestingIvas(false); return }
      const syncR = await fetch('/api/ivasms/sync', { method: 'POST' })
      const syncD = await syncR.json()
      if (syncD.success) {
        setMsg('ivasms', 'success', `Connected! Found ${syncD.count} numbers, ${syncD.smsAdded ?? 0} SMS loaded.`)
      } else {
        setMsg('ivasms', 'error', syncD.error || 'Connection failed. Check credentials.')
      }
    } catch { setMsg('ivasms', 'error', 'Network error during test') }
    setTestingIvas(false)
  }

  const saveTelegram = async (e: React.FormEvent) => {
    e.preventDefault(); setLoad('telegram', true)
    try {
      const r = await fetch('/api/telegram/setup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: telegram.botToken, chatId: telegram.chatId }),
      })
      const d = await r.json()
      if (r.ok) { setMsg('telegram', 'success', `Bot @${d.bot?.username || ''} connected successfully`) }
      else setMsg('telegram', 'error', d.error || 'Invalid bot token')
    } catch { setMsg('telegram', 'error', 'Network error') }
    setLoad('telegram', false)
  }

  const testTelegram = async () => {
    setTestingTg(true)
    try {
      const r = await fetch('/api/telegram/test', { method: 'POST' })
      const d = await r.json()
      r.ok ? setMsg('telegram', 'success', 'Test message sent to Telegram!') : setMsg('telegram', 'error', d.error || 'Send failed')
    } catch { setMsg('telegram', 'error', 'Network error') }
    setTestingTg(false)
  }

  const copyToken = () => {
    navigator.clipboard.writeText(token).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const regenerateToken = async () => {
    if (!confirm('Regenerate mobile token? Existing DLChat connections will be invalidated.')) return
    try {
      const r = await fetch('/api/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'regenerate_token' }),
      })
      const d = await r.json()
      if (r.ok && d.user?.mobile_token) {
        setToken(d.user.mobile_token)
        setMsg('token', 'success', 'Token regenerated successfully')
      }
    } catch {}
  }

  const Section = ({ icon, title, children }: any) => (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(229,9,20,.1)', border: '1px solid rgba(229,9,20,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className={`bi ${icon}`} style={{ fontSize: 17, color: 'var(--accent)' }} />
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</h3>
      </div>
      {children}
    </div>
  )

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)' }}>Settings</h2>
        <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 2 }}>Configure your account, iVASMS, Telegram and mobile app</p>
      </div>

      {/* Profile */}
      <Section icon="bi-person-fill" title="Profile">
        <form onSubmit={saveProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <div className="input-group">
                <i className="bi bi-person-fill input-icon" />
                <input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Your name" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="input-group">
                <i className="bi bi-envelope-fill input-icon" />
                <input type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" />
              </div>
            </div>
          </div>
          <button type="submit" className="btn-primary btn-sm" disabled={loading.profile} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="bi bi-save-fill" style={{ fontSize: 13 }} />
            {loading.profile ? 'Saving…' : 'Save Profile'}
          </button>
          <MsgBox msg={msgs.profile} />
        </form>
      </Section>

      {/* Password */}
      <Section icon="bi-lock-fill" title="Change Password">
        <form onSubmit={savePassword}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <div className="input-group">
                <i className="bi bi-lock-fill input-icon" />
                <input type={showPwd ? 'text' : 'password'} value={passwords.old} onChange={e => setPasswords(p => ({ ...p, old: e.target.value }))} placeholder="Current password" />
                <button type="button" onClick={() => setShowPwd(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', padding: 4, cursor: 'pointer' }}>
                  <i className={`bi ${showPwd ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`} style={{ fontSize: 15 }} />
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type="password" value={passwords.new} onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))} placeholder="Min 6 characters" />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat new password" />
              </div>
            </div>
          </div>
          <button type="submit" className="btn-primary btn-sm" disabled={loading.password} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="bi bi-lock-fill" style={{ fontSize: 13 }} />
            {loading.password ? 'Changing…' : 'Change Password'}
          </button>
          <MsgBox msg={msgs.password} />
        </form>
      </Section>

      {/* iVASMS */}
      <Section icon="bi-phone-fill" title="iVASMS Credentials">
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          <i className="bi bi-info-circle-fill" />
          <div>
            <strong>How to add:</strong> Enter your iVASMS.com account email and password below, then click
            <strong> Save &amp; Test</strong> to verify the connection and load your numbers automatically.
          </div>
        </div>
        <form onSubmit={saveIvasms}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">iVASMS Email</label>
              <div className="input-group">
                <i className="bi bi-envelope-fill input-icon" />
                <input
                  type="email"
                  value={ivasms.email}
                  onChange={e => setIvasms(p => ({ ...p, email: e.target.value }))}
                  placeholder="ohlivvy53@gmail.com"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">iVASMS Password</label>
              <div className="input-group" style={{ position: 'relative' }}>
                <i className="bi bi-lock-fill input-icon" />
                <input
                  type={showIvasPwd ? 'text' : 'password'}
                  value={ivasms.password}
                  onChange={e => setIvasms(p => ({ ...p, password: e.target.value }))}
                  placeholder="Your iVASMS password"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowIvasPwd(p => !p)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', padding: 4, cursor: 'pointer' }}>
                  <i className={`bi ${showIvasPwd ? 'bi-eye-slash-fill' : 'bi-eye-fill'}`} style={{ fontSize: 15 }} />
                </button>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="submit" className="btn-primary btn-sm" disabled={loading.ivasms} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="bi bi-save-fill" style={{ fontSize: 13 }} />
              {loading.ivasms ? 'Saving…' : 'Save Credentials'}
            </button>
            <button
              type="button"
              onClick={testIvasms}
              disabled={testingIvas || !ivasms.email || !ivasms.password}
              className="btn-success btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <i className="bi bi-arrow-repeat" style={{ animation: testingIvas ? 'spin 1s linear infinite' : 'none', display: 'inline-block', fontSize: 13 }} />
              {testingIvas ? 'Testing & Syncing…' : 'Save & Test Connection'}
            </button>
          </div>
          <MsgBox msg={msgs.ivasms} />
        </form>
      </Section>

      {/* Telegram */}
      <Section icon="bi-telegram" title="Telegram Bot">
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          <i className="bi bi-info-circle-fill" />
          <div>Create a bot via <strong>@BotFather</strong> on Telegram, get the token, then send a message to your bot and get your Chat ID from <strong>@userinfobot</strong>.</div>
        </div>
        <form onSubmit={saveTelegram}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Bot Token</label>
              <div className="input-group">
                <i className="bi bi-key-fill input-icon" />
                <input
                  type="password"
                  value={telegram.botToken}
                  onChange={e => setTelegram(p => ({ ...p, botToken: e.target.value }))}
                  placeholder="1234567890:ABCdef…"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Chat ID</label>
              <div className="input-group">
                <i className="bi bi-hash input-icon" />
                <input
                  value={telegram.chatId}
                  onChange={e => setTelegram(p => ({ ...p, chatId: e.target.value }))}
                  placeholder="-100123456789"
                />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="submit" className="btn-primary btn-sm" disabled={loading.telegram} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="bi bi-save-fill" style={{ fontSize: 13 }} />
              {loading.telegram ? 'Saving…' : 'Save Telegram'}
            </button>
            <button type="button" onClick={testTelegram} disabled={testingTg || !telegram.botToken} className="btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="bi bi-send-fill" style={{ fontSize: 12 }} />
              {testingTg ? 'Sending…' : 'Send Test Message'}
            </button>
          </div>
          <MsgBox msg={msgs.telegram} />
        </form>
      </Section>

      {/* Mobile Token */}
      <Section icon="bi-android2" title="DLChat Mobile App Token">
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6 }}>
          Use this token in the DLChat mobile app or PWA to connect to your account. Keep it secret.
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{
            flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '10px 14px',
            fontFamily: 'monospace', fontSize: 13, color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{token || 'No token generated'}</div>
          <button onClick={copyToken} className="btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <i className={`bi ${copied ? 'bi-clipboard-check-fill' : 'bi-clipboard-fill'}`} style={{ fontSize: 13 }} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={regenerateToken} className="btn-danger btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <i className="bi bi-arrow-repeat" style={{ fontSize: 13 }} />
            Regenerate
          </button>
        </div>
        <MsgBox msg={msgs.token} />
      </Section>
    </div>
  )
}
