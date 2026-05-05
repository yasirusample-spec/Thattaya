'use client'
import { useState, useEffect } from 'react'
import QRCode from 'qrcode'

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState({ name: '', email: '' })
  const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' })
  const [ivasms, setIvasms] = useState({ email: '', password: '' })
  const [telegram, setTelegram] = useState({ botToken: '', chatId: '' })
  const [token, setToken] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [msgs, setMsgs] = useState<Record<string, { type: 'success' | 'error'; text: string } | null>>({})
  const [testingIvas, setTestingIvas] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.user) {
        setUser(d.user)
        setProfile({ name: d.user.name || '', email: d.user.email || '' })
        setIvasms({ email: d.user.ivasms_email || '', password: '' })
        setTelegram({ botToken: d.user.telegram_bot_token || '', chatId: d.user.telegram_chat_id || '' })
        const t = d.user.mobile_token || ''
        setToken(t)
        if (t) {
          const qrContent = `dlchat://connect?token=${t}&url=${window.location.origin}`
          QRCode.toDataURL(qrContent, { color: { dark: '#e50914', light: '#14141e' }, width: 200, margin: 2 })
            .then(url => setQrDataUrl(url)).catch(() => {})
        }
      }
    }).catch(() => {})
  }, [])

  const setMsg = (key: string, type: 'success' | 'error', text: string) => {
    setMsgs(p => ({ ...p, [key]: { type, text } }))
    setTimeout(() => setMsgs(p => ({ ...p, [key]: null })), 4000)
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const r = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'profile', ...profile }) })
      const d = await r.json()
      r.ok ? setMsg('profile', 'success', '✓ Profile updated') : setMsg('profile', 'error', d.error)
    } catch { setMsg('profile', 'error', 'Network error') }
    setLoading(false)
  }

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwords.new !== passwords.confirm) { setMsg('password', 'error', 'Passwords do not match'); return }
    setLoading(true)
    try {
      const r = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'password', oldPassword: passwords.old, newPassword: passwords.new }) })
      const d = await r.json()
      if (r.ok) { setMsg('password', 'success', '✓ Password changed'); setPasswords({ old: '', new: '', confirm: '' }) }
      else setMsg('password', 'error', d.error)
    } catch { setMsg('password', 'error', 'Network error') }
    setLoading(false)
  }

  const testIvasms = async () => {
    setTestingIvas(true)
    try {
      const r = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ivasms.email, password: ivasms.password }) })
      const d = await r.json()
      setMsg('ivasms', d.ok ? 'success' : 'error', `${d.ok ? '✓' : '✗'} ${d.message}`)
    } catch { setMsg('ivasms', 'error', 'Network error') }
    setTestingIvas(false)
  }

  const saveIvasms = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const r = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'ivasms', ...ivasms }) })
      const d = await r.json()
      r.ok ? setMsg('ivasms', 'success', '✓ Credentials saved') : setMsg('ivasms', 'error', d.error)
    } catch { setMsg('ivasms', 'error', 'Network error') }
    setLoading(false)
  }

  const saveTelegram = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const r = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'telegram', ...telegram }) })
      const d = await r.json()
      r.ok ? setMsg('telegram', 'success', '✓ Telegram settings saved') : setMsg('telegram', 'error', d.error)
    } catch { setMsg('telegram', 'error', 'Network error') }
    setLoading(false)
  }

  const regenerateToken = async () => {
    if (!confirm('Regenerate token? Old connections will be invalidated.')) return
    try {
      const r = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'regenerate_token' }) })
      const d = await r.json()
      if (r.ok) {
        setToken(d.token)
        const qrContent = `dlchat://connect?token=${d.token}&url=${window.location.origin}`
        QRCode.toDataURL(qrContent, { color: { dark: '#e50914', light: '#14141e' }, width: 200, margin: 2 }).then(url => setQrDataUrl(url)).catch(() => {})
        setMsg('mobile', 'success', '✓ Token regenerated')
      }
    } catch {}
  }

  const copyToken = () => { navigator.clipboard.writeText(token); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  const deleteAllData = async () => {
    try {
      await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'delete_all' }) })
      setShowDeleteModal(false)
      setMsg('danger', 'success', '✓ All data deleted')
    } catch { setMsg('danger', 'error', 'Failed to delete data') }
  }

  const Alert = ({ k }: { k: string }) => msgs[k] ? (
    <div style={{ padding: '8px 14px', borderRadius: 6, fontSize: 12, marginTop: 8,
      background: msgs[k]!.type === 'error' ? 'rgba(229,9,20,.1)' : 'rgba(0,200,83,.1)',
      border: `1px solid ${msgs[k]!.type === 'error' ? 'rgba(229,9,20,.3)' : 'rgba(0,200,83,.3)'}`,
      color: msgs[k]!.type === 'error' ? 'var(--accent)' : 'var(--green)',
    }}>{msgs[k]!.text}</div>
  ) : null

  const cardStyle = { marginBottom: 20 }
  const labelStyle = { fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 5 }

  return (
    <div style={{ maxWidth: 700, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>⚙️ Settings</h2>
        <p style={{ color: 'var(--text3)', fontSize: 13 }}>Manage your account, integrations, and preferences</p>
      </div>

      {/* Profile */}
      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>👤 Profile</h3>
        <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label style={labelStyle}>DISPLAY NAME</label><input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Your Name" /></div>
          <div><label style={labelStyle}>EMAIL</label><input type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} placeholder="you@example.com" /></div>
          <Alert k="profile" />
          <button type="submit" disabled={loading} className="btn-primary" style={{ alignSelf: 'flex-start', padding: '10px 20px' }}>
            {loading ? '⟳ Saving...' : '💾 Save Profile'}
          </button>
        </form>

        <div style={{ borderTop: '1px solid var(--border)', marginTop: 20, paddingTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>🔒 Change Password</div>
          <form onSubmit={savePassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><label style={labelStyle}>CURRENT PASSWORD</label><input type="password" value={passwords.old} onChange={e => setPasswords(p => ({ ...p, old: e.target.value }))} placeholder="Current password" required /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={labelStyle}>NEW PASSWORD</label><input type="password" value={passwords.new} onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))} placeholder="New password" required /></div>
              <div><label style={labelStyle}>CONFIRM</label><input type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} placeholder="Confirm password" required /></div>
            </div>
            <Alert k="password" />
            <button type="submit" disabled={loading} style={{ alignSelf: 'flex-start', padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'rgba(33,150,243,.1)', border: '1px solid rgba(33,150,243,.3)', color: 'var(--blue)', cursor: 'pointer' }}>
              🔒 Change Password
            </button>
          </form>
        </div>
      </div>

      {/* iVASMS */}
      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>🔗 iVASMS Connection</h3>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>Your iVASMS credentials are stored encrypted and used to sync your numbers.</p>
        <form onSubmit={saveIvasms} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label style={labelStyle}>IVASMS EMAIL</label><input type="email" value={ivasms.email} onChange={e => setIvasms(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" /></div>
          <div><label style={labelStyle}>IVASMS PASSWORD</label><input type="password" value={ivasms.password} onChange={e => setIvasms(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" /></div>
          <Alert k="ivasms" />
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={testIvasms} disabled={testingIvas} style={{ padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'rgba(0,200,83,.1)', border: '1px solid rgba(0,200,83,.3)', color: 'var(--green)', cursor: testingIvas ? 'not-allowed' : 'pointer' }}>
              {testingIvas ? '⟳ Testing...' : '🔌 Test Connection'}
            </button>
            <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '10px 20px' }}>
              {loading ? '⟳ Saving...' : '💾 Save Credentials'}
            </button>
          </div>
        </form>
      </div>

      {/* Mobile DLChat */}
      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>📱 DLChat Mobile App</h3>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>Connect DLChat on your phone to send and receive WhatsApp messages.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, alignItems: 'start' }}>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code" style={{ width: 160, height: 160, borderRadius: 8, border: '2px solid var(--border)' }} />
          ) : (
            <div style={{ width: 160, height: 160, background: 'var(--bg2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 12 }}>
              No QR yet
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>YOUR TOKEN</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input readOnly value={token} style={{ fontFamily: 'monospace', fontSize: 11 }} />
                <button onClick={copyToken} style={{ padding: '8px 12px', borderRadius: 8, fontSize: 12, background: copied ? 'rgba(0,200,83,.15)' : 'rgba(229,9,20,.1)', border: `1px solid ${copied ? 'rgba(0,200,83,.4)' : 'rgba(229,9,20,.3)'}`, color: copied ? 'var(--green)' : 'var(--accent)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {copied ? '✓' : '📋 Copy'}
                </button>
                <button onClick={regenerateToken} style={{ padding: '8px 12px', borderRadius: 8, fontSize: 12, background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  🔄 Regen
                </button>
              </div>
            </div>
            <Alert k="mobile" />
            <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.8 }}>
              <div style={{ fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>How to connect:</div>
              <div>1. <a href="/mobile" style={{ color: 'var(--accent)' }}>Open DLChat app</a> on your phone</div>
              <div>2. Tap "Connect with token"</div>
              <div>3. Scan QR code or enter token manually</div>
            </div>
          </div>
        </div>
      </div>

      {/* Telegram */}
      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>✈️ Telegram Notifications</h3>
        <form onSubmit={saveTelegram} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label style={labelStyle}>BOT TOKEN</label><input value={telegram.botToken} onChange={e => setTelegram(p => ({ ...p, botToken: e.target.value }))} placeholder="1234567890:ABCDefGHI..." style={{ fontFamily: 'monospace', fontSize: 12 }} /></div>
          <div><label style={labelStyle}>CHAT ID</label><input value={telegram.chatId} onChange={e => setTelegram(p => ({ ...p, chatId: e.target.value }))} placeholder="123456789" style={{ fontFamily: 'monospace' }} /></div>
          <Alert k="telegram" />
          <button type="submit" disabled={loading} className="btn-primary" style={{ alignSelf: 'flex-start', padding: '10px 20px' }}>💾 Save</button>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="card" style={{ border: '1px solid rgba(229,9,20,.4)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>⚠️ Danger Zone</h3>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>These actions are irreversible. Please be careful.</p>
        <Alert k="danger" />
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={() => setShowDeleteModal(true)} style={{ padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'rgba(229,9,20,.1)', border: '1px solid rgba(229,9,20,.4)', color: 'var(--accent)', cursor: 'pointer' }}>
            🗑 Delete All Data
          </button>
          <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/login' }} style={{ padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer' }}>
            🚪 Logout All Devices
          </button>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowDeleteModal(false)}>
          <div className="card" style={{ maxWidth: 380, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,.6)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>⚠️</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', textAlign: 'center', marginBottom: 8 }}>Delete All Data?</h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', marginBottom: 20, lineHeight: 1.6 }}>This will permanently delete all your SMS messages, numbers, sessions, and WhatsApp account. This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDeleteModal(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button onClick={deleteAllData} style={{ flex: 1, padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}>Delete Everything</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
