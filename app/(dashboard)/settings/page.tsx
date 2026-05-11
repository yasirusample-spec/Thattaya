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
  const [user,        setUser]        = useState<any>(null)
  const [profile,     setProfile]     = useState({ name: '', email: '' })
  const [passwords,   setPasswords]   = useState({ old: '', new: '', confirm: '' })
  const [telegram,    setTelegram]    = useState({ botToken: '', chatId: '' })
  const [prefs,       setPrefs]       = useState({ auto_sync: false, auto_sync_interval: 300, notify_otp: true, notify_sms: false })
  const [token,       setToken]       = useState('')
  const [apiKey,      setApiKey]      = useState('')
  const [msgs,        setMsgs]        = useState<Record<string, { type: 'success' | 'error'; text: string } | null>>({})
  const [loading,     setLoading]     = useState<Record<string, boolean>>({})
  const [showPwd,     setShowPwd]     = useState(false)
  const [copied,      setCopied]      = useState<string | null>(null)
  const [testingTg,   setTestingTg]   = useState(false)
  const [tab,         setTab]         = useState<'account'|'integrations'|'preferences'|'token'>('account')

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          setUser(d.user)
          setProfile({ name: d.user.name || '', email: d.user.email || '' })
          setTelegram({ botToken: d.user.telegram_bot_token || '', chatId: d.user.telegram_chat_id || '' })
          setToken(d.user.mobile_token || '')
          setApiKey(d.user.api_key || '')
          setPrefs({
            auto_sync: d.user.auto_sync || false,
            auto_sync_interval: d.user.auto_sync_interval || 300,
            notify_otp: d.user.notify_otp !== false,
            notify_sms: d.user.notify_sms || false,
          })
        }
      }).catch(() => {})
  }, [])

  const setMsg  = (key: string, type: 'success' | 'error', text: string) => {
    setMsgs(p => ({ ...p, [key]: { type, text } }))
    setTimeout(() => setMsgs(p => ({ ...p, [key]: null })), 6000)
  }
  const setLoad = (key: string, v: boolean) => setLoading(p => ({ ...p, [key]: v }))

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setLoad('profile', true)
    try {
      const r = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'profile', name: profile.name, email: profile.email }) })
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
      const r = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'password', old: passwords.old, new: passwords.new }) })
      const d = await r.json()
      if (r.ok) { setMsg('password', 'success', 'Password changed'); setPasswords({ old: '', new: '', confirm: '' }) }
      else setMsg('password', 'error', d.error || 'Failed')
    } catch { setMsg('password', 'error', 'Network error') }
    setLoad('password', false)
  }

  const saveTelegram = async (e: React.FormEvent) => {
    e.preventDefault(); setLoad('telegram', true)
    try {
      const r = await fetch('/api/telegram/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ botToken: telegram.botToken, chatId: telegram.chatId }) })
      const d = await r.json()
      if (r.ok) setMsg('telegram', 'success', `Bot @${d.bot?.username || 'connected'} ready`)
      else setMsg('telegram', 'error', d.error || 'Invalid bot token')
    } catch { setMsg('telegram', 'error', 'Network error') }
    setLoad('telegram', false)
  }

  const testTelegram = async () => {
    setTestingTg(true)
    try {
      const r = await fetch('/api/telegram/test', { method: 'POST' })
      const d = await r.json()
      r.ok ? setMsg('telegram', 'success', '✅ Test message sent!') : setMsg('telegram', 'error', d.error || 'Send failed')
    } catch { setMsg('telegram', 'error', 'Network error') }
    setTestingTg(false)
  }

  const savePrefs = async (e: React.FormEvent) => {
    e.preventDefault(); setLoad('prefs', true)
    try {
      const r = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'preferences', ...prefs }) })
      const d = await r.json()
      r.ok ? setMsg('prefs', 'success', 'Preferences saved') : setMsg('prefs', 'error', d.error || 'Failed')
    } catch { setMsg('prefs', 'error', 'Network error') }
    setLoad('prefs', false)
  }

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const regenerateToken = async () => {
    if (!confirm('Regenerate mobile token? Existing DLChat connections will break.')) return
    try {
      const r = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'regenerate_token' }) })
      const d = await r.json()
      if (r.ok && d.user?.mobile_token) { setToken(d.user.mobile_token); setMsg('token', 'success', 'Token regenerated') }
    } catch {}
  }

  const regenerateApiKey = async () => {
    if (!confirm('Regenerate API key? Existing integrations will break.')) return
    try {
      const r = await fetch('/api/apikeys/regenerate', { method: 'POST' })
      const d = await r.json()
      if (d.key) { setApiKey(d.key); setMsg('token', 'success', 'API key regenerated') }
    } catch {}
  }

  const Section = ({ icon, title, badge, children }: any) => (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(229,9,20,.1)', border: '1px solid rgba(229,9,20,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className={`bi ${icon}`} style={{ fontSize: 17, color: 'var(--accent)' }} />
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', flex: 1 }}>{title}</h3>
        {badge && <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--green-dim)', color: 'var(--green)', border: '1px solid rgba(0,230,118,.2)', padding: '2px 8px', borderRadius: 10 }}>{badge}</span>}
      </div>
      {children}
    </div>
  )

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="bi bi-gear-fill" style={{ color: 'var(--accent)', fontSize: 20 }} />Settings
        </h2>
        <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>Configure your account, iVASMS, Telegram, and preferences</p>
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: 20 }}>
        {[
          { id: 'account',      icon: 'bi-person-fill',    label: 'Account'      },
          { id: 'integrations', icon: 'bi-plug-fill',      label: 'Integrations' },
          { id: 'preferences',  icon: 'bi-sliders',        label: 'Preferences'  },
          { id: 'token',        icon: 'bi-key-fill',       label: 'Keys & Tokens'},
        ].map(t => (
          <button key={t.id} className={`tab-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id as any)}>
            <i className={`bi ${t.icon}`} style={{ marginRight: 6, fontSize: 12 }} />{t.label}
          </button>
        ))}
      </div>

      {/* ── Account tab ── */}
      {tab === 'account' && (
        <>
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
              {user && (
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12, display: 'flex', gap: 16 }}>
                  <span><i className="bi bi-calendar3" style={{ marginRight: 5 }} />Joined {new Date(user.created_at || Date.now()).toLocaleDateString()}</span>
                  {user.last_sync && <span><i className="bi bi-arrow-repeat" style={{ marginRight: 5 }} />Last sync {new Date(user.last_sync).toLocaleString()}</span>}
                  {user.sync_count > 0 && <span><i className="bi bi-check2-all" style={{ marginRight: 5 }} />{user.sync_count} syncs total</span>}
                </div>
              )}
              <button type="submit" className="btn-primary btn-sm" disabled={loading.profile}>
                <i className="bi bi-save-fill" style={{ fontSize: 13 }} />
                {loading.profile ? 'Saving…' : 'Save Profile'}
              </button>
              <MsgBox msg={msgs.profile} />
            </form>
          </Section>

          <Section icon="bi-lock-fill" title="Change Password">
            <form onSubmit={savePassword}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <div className="input-group" style={{ position: 'relative' }}>
                    <i className="bi bi-lock-fill input-icon" />
                    <input type={showPwd ? 'text' : 'password'} value={passwords.old} onChange={e => setPasswords(p => ({ ...p, old: e.target.value }))} placeholder="Current password" />
                    <button type="button" onClick={() => setShowPwd(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', padding: 4, cursor: 'pointer', width: 'auto' }}>
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
              <button type="submit" className="btn-primary btn-sm" disabled={loading.password}>
                <i className="bi bi-lock-fill" style={{ fontSize: 13 }} />
                {loading.password ? 'Changing…' : 'Change Password'}
              </button>
              <MsgBox msg={msgs.password} />
            </form>
          </Section>
        </>
      )}

      {/* ── Integrations tab ── */}
      {tab === 'integrations' && (
        <>
          <Section icon="bi-phone-fill" title="iVASMS Integration" badge="System Configured">
            {/* iVASMS is locked — credentials are system-managed, not user-configurable */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                padding: '16px 20px',
                background: 'linear-gradient(135deg, rgba(0,230,118,.08), rgba(0,230,118,.04))',
                border: '1px solid rgba(0,230,118,.25)',
                borderRadius: 12,
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(0,230,118,.15)', border: '1px solid rgba(0,230,118,.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className="bi bi-shield-check-fill" style={{ fontSize: 20, color: 'var(--green)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)', marginBottom: 3 }}>
                    iVASMS — System Configured ✓
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                    iVASMS credentials are securely managed by the system administrator.
                    Numbers and SMS are synced automatically.
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { icon: 'bi-envelope-fill', label: 'Account', value: '●●●●●●●●@●●●●●●●.com', color: 'var(--blue)' },
                  { icon: 'bi-lock-fill',     label: 'Password', value: '●●●●●●●●●●●●', color: 'var(--accent)' },
                  { icon: 'bi-telephone-fill',label: 'Numbers Synced', value: '1,000+', color: 'var(--green)' },
                  { icon: 'bi-arrow-repeat',  label: 'Auto-Sync', value: 'Active', color: 'var(--yellow)' },
                ].map(row => (
                  <div key={row.label} style={{
                    padding: '10px 14px',
                    background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <i className={`bi ${row.icon}`} style={{ color: row.color, fontSize: 14, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1 }}>{row.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                <span className="dot dot-green dot-pulse" />
                <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>Connected & Syncing</span>
                <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>· Managed by Death Legion Admin</span>
              </div>
            </div>
          </Section>

          <Section icon="bi-telegram" title="Telegram Bot">
            <div className="alert alert-info" style={{ marginBottom: 16 }}>
              <i className="bi bi-info-circle-fill" />
              <div>Create a bot via <strong>@BotFather</strong> on Telegram. Get your Chat ID from <strong>@userinfobot</strong>.</div>
            </div>
            <form onSubmit={saveTelegram}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div className="form-group">
                  <label className="form-label">Bot Token</label>
                  <div className="input-group">
                    <i className="bi bi-key-fill input-icon" />
                    <input type="password" value={telegram.botToken} onChange={e => setTelegram(p => ({ ...p, botToken: e.target.value }))} placeholder="1234567890:ABCdef…" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Chat ID</label>
                  <div className="input-group">
                    <i className="bi bi-hash input-icon" />
                    <input value={telegram.chatId} onChange={e => setTelegram(p => ({ ...p, chatId: e.target.value }))} placeholder="-100123456789" />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="submit" className="btn-primary btn-sm" disabled={loading.telegram}>
                  <i className="bi bi-save-fill" style={{ fontSize: 13 }} />{loading.telegram ? 'Saving…' : 'Save Telegram'}
                </button>
                <button type="button" onClick={testTelegram} disabled={testingTg || !telegram.botToken} className="btn-secondary btn-sm">
                  <i className="bi bi-send-fill" style={{ fontSize: 12 }} />{testingTg ? 'Sending…' : 'Send Test Message'}
                </button>
              </div>
              <MsgBox msg={msgs.telegram} />
            </form>
          </Section>
        </>
      )}

      {/* ── Preferences tab ── */}
      {tab === 'preferences' && (
        <Section icon="bi-sliders" title="Preferences & Automation">
          <form onSubmit={savePrefs}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 20 }}>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
                    <i className="bi bi-arrow-repeat" style={{ marginRight: 8, color: 'var(--accent)' }} />
                    Auto Sync iVASMS
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>Automatically sync numbers and SMS on a schedule</div>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={prefs.auto_sync} onChange={e => setPrefs(p => ({ ...p, auto_sync: e.target.checked }))} />
                  <span className="switch-slider" />
                </label>
              </div>

              {prefs.auto_sync && (
                <div className="form-group">
                  <label className="form-label">Auto Sync Interval</label>
                  <select value={prefs.auto_sync_interval} onChange={e => setPrefs(p => ({ ...p, auto_sync_interval: Number(e.target.value) }))}>
                    <option value={60}>Every 1 minute</option>
                    <option value={180}>Every 3 minutes</option>
                    <option value={300}>Every 5 minutes</option>
                    <option value={600}>Every 10 minutes</option>
                    <option value={1800}>Every 30 minutes</option>
                    <option value={3600}>Every hour</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
                    <i className="bi bi-key-fill" style={{ marginRight: 8, color: 'var(--yellow)' }} />
                    Telegram OTP Notifications
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>Send OTP codes to Telegram when received</div>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={prefs.notify_otp} onChange={e => setPrefs(p => ({ ...p, notify_otp: e.target.checked }))} />
                  <span className="switch-slider" />
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
                    <i className="bi bi-chat-dots-fill" style={{ marginRight: 8, color: 'var(--blue)' }} />
                    All SMS Notifications
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>Forward every SMS to Telegram (can be noisy)</div>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={prefs.notify_sms} onChange={e => setPrefs(p => ({ ...p, notify_sms: e.target.checked }))} />
                  <span className="switch-slider" />
                </label>
              </div>
            </div>
            <button type="submit" className="btn-primary btn-sm" disabled={loading.prefs}>
              <i className="bi bi-save-fill" style={{ fontSize: 13 }} />
              {loading.prefs ? 'Saving…' : 'Save Preferences'}
            </button>
            <MsgBox msg={msgs.prefs} />
          </form>
        </Section>
      )}

      {/* ── Keys & Tokens tab ── */}
      {tab === 'token' && (
        <>
          <Section icon="bi-android2" title="DLChat Mobile Token">
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.6 }}>
              Use this token in the DLChat mobile app or PWA. Keep it secret.
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
              <div style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                {token || 'No token generated'}
              </div>
              <button onClick={() => copy(token, 'token')} className={copied === 'token' ? 'btn-success btn-sm' : 'btn-secondary btn-sm'} style={{ flexShrink: 0 }}>
                <i className={`bi ${copied === 'token' ? 'bi-clipboard-check-fill' : 'bi-clipboard-fill'}`} style={{ fontSize: 13 }} />
                {copied === 'token' ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={regenerateToken} className="btn-danger btn-sm" style={{ flexShrink: 0 }}>
                <i className="bi bi-arrow-repeat" style={{ fontSize: 13 }} />Regenerate
              </button>
            </div>
            <MsgBox msg={msgs.token} />
          </Section>

          <Section icon="bi-code-slash" title="REST API Key">
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.6 }}>
              Use this key in the <code style={{ background: 'var(--bg2)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>X-API-Key</code> header to authenticate external API requests.
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
              <div style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                {apiKey || 'Loading…'}
              </div>
              <button onClick={() => copy(apiKey, 'apikey')} className={copied === 'apikey' ? 'btn-success btn-sm' : 'btn-secondary btn-sm'} style={{ flexShrink: 0 }}>
                <i className={`bi ${copied === 'apikey' ? 'bi-clipboard-check-fill' : 'bi-clipboard-fill'}`} style={{ fontSize: 13 }} />
                {copied === 'apikey' ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={regenerateApiKey} className="btn-danger btn-sm" style={{ flexShrink: 0 }}>
                <i className="bi bi-arrow-repeat" style={{ fontSize: 13 }} />Regenerate
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
              <i className="bi bi-info-circle" style={{ marginRight: 5 }} />
              See <a href="/api-keys" style={{ color: 'var(--blue)', textDecoration: 'none' }}>API & Docs</a> for all available endpoints.
            </div>
          </Section>
        </>
      )}
    </div>
  )
}
