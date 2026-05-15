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
  const [ivasCreds,      setIvasCreds]      = useState({ email: 'ohlivvy53@gmail.com', password: '' })
  const [ivasTestResult, setIvasTestResult] = useState<{loginSuccess?:boolean; success?:boolean; message?:string; steps?:any[]} | null>(null)
  const [ivasTesting,    setIvasTesting]    = useState(false)
  const [ivasSaving,     setIvasSaving]     = useState(false)
  const [ivasForgotMsg,  setIvasForgotMsg]  = useState<string>('')
  const [ivasForgotLoad, setIvasForgotLoad] = useState(false)

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

  const forgotIvas = async () => {
    setIvasForgotLoad(true); setIvasForgotMsg('')
    try {
      const r = await fetch('/api/ivasms/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ivasCreds.email }),
      })
      const d = await r.json()
      setIvasForgotMsg(d.message || d.error || 'Request sent')
    } catch (e: any) { setIvasForgotMsg('Network error: ' + e.message) }
    setIvasForgotLoad(false)
  }

  const testIvas = async () => {
    if (!ivasCreds.password) { setIvasTestResult({ success: false, message: '❌ Enter password first' }); return }
    setIvasTesting(true); setIvasTestResult(null)
    try {
      const r = await fetch('/api/ivasms/test-creds', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ivasCreds.email, password: ivasCreds.password, save: false }),
      })
      const d = await r.json()
      setIvasTestResult(d)
    } catch (e: any) { setIvasTestResult({ success: false, message: '❌ Network error: ' + e.message }) }
    setIvasTesting(false)
  }

  const saveIvas = async () => {
    if (!ivasCreds.password) { setMsg('ivas', 'error', 'Enter password first'); return }
    setIvasSaving(true)
    try {
      const r = await fetch('/api/ivasms/test-creds', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ivasCreds.email, password: ivasCreds.password, save: true }),
      })
      const d = await r.json()
      if (d.loginSuccess) {
        setMsg('ivas', 'success', '✅ Credentials verified & saved! Go to Numbers page and click Sync.')
        setIvasTestResult(d)
      } else {
        setMsg('ivas', 'error', d.message || '❌ Login failed — wrong credentials')
        setIvasTestResult(d)
      }
    } catch (e: any) { setMsg('ivas', 'error', 'Network error: ' + (e as any).message) }
    setIvasSaving(false)
  }

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
          <Section icon="bi-phone-fill" title="iVASMS Integration" badge="Live Scraper">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Info banner */}
              <div style={{ padding: '12px 16px', background: 'rgba(99,179,237,.08)', border: '1px solid rgba(99,179,237,.25)', borderRadius: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <i className="bi bi-info-circle-fill" style={{ color: 'var(--blue)', fontSize: 16, flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
                  Enter your <strong style={{ color: 'var(--text)' }}>iVASMS account credentials</strong>. Click <strong style={{ color: 'var(--green)' }}>Test Login</strong> first to verify, then <strong style={{ color: 'var(--accent)' }}>Save & Apply</strong> to store them. After saving, go to <strong style={{ color: 'var(--text)' }}>Numbers</strong> page and click <strong style={{ color: 'var(--green)' }}>Sync Now</strong> to scrape all your numbers.
                </div>
              </div>

              {/* Credentials form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">iVASMS Email</label>
                  <div className="input-group">
                    <i className="bi bi-envelope-fill input-icon" />
                    <input className="form-control" type="email" placeholder="your@email.com"
                      value={ivasCreds.email}
                      onChange={e => setIvasCreds(p => ({ ...p, email: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">iVASMS Password</label>
                  <div className="input-group">
                    <i className="bi bi-lock-fill input-icon" />
                    <input className="form-control" type={showPwd ? 'text' : 'password'} placeholder="Enter your iVASMS password"
                      value={ivasCreds.password}
                      onChange={e => setIvasCreds(p => ({ ...p, password: e.target.value }))} />
                    <button type="button" className="btn-icon" onClick={() => setShowPwd(v => !v)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
                      <i className={`bi ${showPwd ? 'bi-eye-slash' : 'bi-eye'}`} />
                    </button>
                  </div>
                </div>

                {/* Test result */}
                {ivasTestResult && (
                  <div style={{
                    padding: '12px 14px', borderRadius: 10, fontSize: 12,
                    background: ivasTestResult.loginSuccess ? 'rgba(0,230,118,.08)' : 'rgba(255,82,82,.08)',
                    border: `1px solid ${ivasTestResult.loginSuccess ? 'rgba(0,230,118,.3)' : 'rgba(255,82,82,.3)'}`,
                    color: ivasTestResult.loginSuccess ? 'var(--green)' : '#ff5252',
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>{ivasTestResult.message}</div>
                    {ivasTestResult.steps?.map((s: any) => (
                      <div key={s.step} style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>
                        Step {s.step}: {s.label} → HTTP {s.status}
                        {s.step === 1 && ` | CSRF: ${s.csrfFound ? '✅' : '❌'} | Cookies: ${s.rawCookieCount} [${(s.cookieNames||[]).join(', ')}]`}
                        {s.step === 2 && ` | ${s.success ? '✅ SUCCESS → ' + s.location : '❌ FAIL → ' + s.location}`}
                      </div>
                    ))}
                  </div>
                )}

                <MsgBox msg={msgs['ivas'] || null} />

                {/* Forgot password message */}
                {ivasForgotMsg && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 12, background: 'rgba(255,193,7,.08)', border: '1px solid rgba(255,193,7,.3)', color: 'var(--yellow)' }}>
                    {ivasForgotMsg}
                  </div>
                )}

                {/* Buttons */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-outline" onClick={testIvas} disabled={ivasTesting}
                    style={{ flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <i className={`bi ${ivasTesting ? 'bi-arrow-clockwise' : 'bi-wifi'}`}
                      style={{ animation: ivasTesting ? 'spin 1s linear infinite' : undefined }} />
                    {ivasTesting ? 'Testing...' : 'Test Login'}
                  </button>
                  <button type="button" className="btn btn-primary" onClick={saveIvas} disabled={ivasSaving}
                    style={{ flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: ivasTestResult?.loginSuccess ? 'var(--green)' : undefined }}>
                    <i className={`bi ${ivasSaving ? 'bi-arrow-clockwise' : 'bi-floppy-fill'}`}
                      style={{ animation: ivasSaving ? 'spin 1s linear infinite' : undefined }} />
                    {ivasSaving ? 'Saving...' : 'Save & Apply'}
                  </button>
                  <button type="button" className="btn btn-outline" onClick={forgotIvas} disabled={ivasForgotLoad}
                    style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 6, borderColor: 'var(--yellow)', color: 'var(--yellow)' }}>
                    <i className={`bi ${ivasForgotLoad ? 'bi-arrow-clockwise' : 'bi-envelope-arrow-up'}`}
                      style={{ animation: ivasForgotLoad ? 'spin 1s linear infinite' : undefined }} />
                    {ivasForgotLoad ? '...' : 'Reset Pwd'}
                  </button>
                </div>
              </div>

              <div style={{ padding: '10px 0', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="bi bi-lightbulb-fill" style={{ color: 'var(--yellow)', fontSize: 13 }} />
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>After saving → Numbers page → Sync Now → all numbers scraped + auto-added to WhatsApp contacts</span>
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
