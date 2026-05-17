'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

interface WaConfig {
  phoneId: string; wabaId: string; hasToken: boolean; tokenPreview: string
  webhookVerify: string; phoneNumber: string; displayName: string
  status: string; configuredAt: string | null
}
interface Contact {
  id: string; name: string; phone: string; avatar: string | null
  addedAt: string; lastMessage: string | null; lastMessageAt: string | null; unread: number
}
interface Message {
  id: string; meta_id?: string; from: 'me' | string; to: string; body: string
  type?: string; sent_at: string; status: string; incoming?: boolean; via_cloud_api?: boolean
}

const WA_GREEN = '#25D366'
const WA_DARK  = '#111b21'
const WA_PANEL = '#202c33'
const WA_MSG   = '#005c4b'

export default function WhatsAppPage() {
  const [cfg,            setCfg]           = useState<WaConfig | null>(null)
  const [cfgLoading,     setCfgLoading]    = useState(true)
  const [tab,            setTab]           = useState<'chat'|'setup'|'broadcast'>('chat')
  const [contacts,       setContacts]      = useState<Contact[]>([])
  const [active,         setActive]        = useState<Contact | null>(null)
  const [thread,         setThread]        = useState<Message[]>([])
  const [msgInput,       setMsgInput]      = useState('')
  const [sending,        setSending]       = useState(false)
  const [sendError,      setSendError]     = useState('')
  const [search,         setSearch]        = useState('')
  // Setup form
  const [form,           setForm]          = useState({ phoneId: '', token: '', wabaId: '', webhookVerify: '' })
  const [setupResult,    setSetupResult]   = useState<any>(null)
  const [setupLoading,   setSetupLoading]  = useState(false)
  // Add contact
  const [showAddContact, setShowAddContact]= useState(false)
  const [newContact,     setNewContact]    = useState({ name: '', phone: '' })
  const [addingContact,  setAddingContact] = useState(false)
  // Broadcast
  const [bcTemplate,    setBcTemplate]    = useState('')
  const [bcNumbers,     setBcNumbers]     = useState('')
  const [bcSending,     setBcSending]     = useState(false)
  const [bcResult,      setBcResult]      = useState<any>(null)
  const [templates,     setTemplates]     = useState<any[]>([])
  const [waNumbers,     setWaNumbers]     = useState<any[]>([])

  const msgEndRef = useRef<HTMLDivElement>(null)
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  // ── Load WA config ────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/wa/config').then(r => r.json()).then(d => {
      setCfg(d)
      setCfgLoading(false)
      if (d.status === 'active') {
        setTab('chat')
        fetch('/api/wa/numbers').then(r=>r.json()).then(d=>setWaNumbers(d.numbers||[]))
        fetch('/api/wa/templates').then(r=>r.json()).then(d=>setTemplates(d.templates||[]))
      } else {
        setTab('setup')
      }
    }).catch(() => setCfgLoading(false))
  }, [])

  // ── Load contacts ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/whatsapp/contacts').then(r => r.json()).then(d => {
      setContacts(Array.isArray(d.contacts) ? d.contacts : [])
    }).catch(() => {})
  }, [])

  // ── Open contact → load thread + poll ────────────────────────────────────
  const openContact = useCallback((c: Contact) => {
    setActive(c)
    setSendError('')
    setMsgInput('')
    if (pollRef.current) clearInterval(pollRef.current)
    const load = () => {
      fetch(`/api/whatsapp/thread?phone=${encodeURIComponent(c.phone)}`).then(r=>r.json()).then(d=>{
        setThread(Array.isArray(d.messages) ? d.messages : [])
        setContacts(prev => prev.map(x => x.id === c.id ? { ...x, unread: 0 } : x))
      }).catch(()=>{})
    }
    load()
    pollRef.current = setInterval(load, 3000)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [thread])

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!msgInput.trim() || !active || sending) return
    const text = msgInput.trim()
    setMsgInput('')
    setSending(true)
    setSendError('')
    try {
      const r = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: active.phone, message: text }),
      })
      const d = await r.json()
      if (!r.ok) { setSendError(d.error || 'Send failed'); return }
      const msg: Message = d.message
      setThread(prev => [...prev, msg])
      setContacts(prev => prev.map(c => c.id === active.id
        ? { ...c, lastMessage: text.slice(0,80), lastMessageAt: msg.sent_at } : c))
    } catch (e: any) { setSendError(e.message) }
    setSending(false)
  }

  // ── Add contact ───────────────────────────────────────────────────────────
  const addContact = async () => {
    if (!newContact.phone) return
    setAddingContact(true)
    try {
      const r = await fetch('/api/whatsapp/contacts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact),
      })
      const d = await r.json()
      if (r.ok) {
        setContacts(prev => [d.contact, ...prev])
        setNewContact({ name: '', phone: '' })
        setShowAddContact(false)
      }
    } catch {}
    setAddingContact(false)
  }

  // ── Save WA Cloud API config ──────────────────────────────────────────────
  const saveConfig = async () => {
    if (!form.phoneId || !form.token) { setSetupResult({ error: 'Phone ID and Token are required' }); return }
    setSetupLoading(true); setSetupResult(null)
    try {
      const r = await fetch('/api/wa/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      setSetupResult(d)
      if (d.verified) {
        setCfg({ ...form, hasToken: true, tokenPreview: form.token.slice(0,12)+'…',
          phoneNumber: d.phoneNumber, displayName: d.displayName,
          status: 'active', configuredAt: new Date().toISOString(), webhookVerify: d.webhookVerify })
        fetch('/api/wa/numbers').then(r=>r.json()).then(d=>setWaNumbers(d.numbers||[]))
        fetch('/api/wa/templates').then(r=>r.json()).then(d=>setTemplates(d.templates||[]))
        setTimeout(() => setTab('chat'), 1500)
      }
    } catch (e: any) { setSetupResult({ error: e.message }) }
    setSetupLoading(false)
  }

  // ── Broadcast ─────────────────────────────────────────────────────────────
  const sendBroadcast = async () => {
    if (!bcTemplate || !bcNumbers.trim()) return
    setBcSending(true); setBcResult(null)
    const recipients = bcNumbers.split(/[\n,;]+/).map(s=>s.trim()).filter(Boolean)
    try {
      const r = await fetch('/api/wa/broadcast', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateName: bcTemplate, recipients }),
      })
      setBcResult(await r.json())
    } catch (e: any) { setBcResult({ error: e.message }) }
    setBcSending(false)
  }

  const filtered = contacts.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search))

  const fmt = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return 'Yesterday'
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const isConfigured = cfg?.status === 'active'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: 0 }}>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 0 16px 0', flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${WA_GREEN}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="bi bi-whatsapp" style={{ color: WA_GREEN, fontSize: 20 }} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>WhatsApp Cloud API</div>
          {cfg?.phoneNumber && <div style={{ fontSize: 12, color: WA_GREEN }}>{cfg.phoneNumber} · {cfg.displayName}</div>}
          {!isConfigured && !cfgLoading && <div style={{ fontSize: 12, color: 'var(--yellow)' }}>⚠ Not configured — see Setup tab</div>}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {(['chat','setup','broadcast'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: tab === t ? WA_GREEN : 'var(--bg2)', color: tab === t ? '#000' : 'var(--text2)' }}>
              {t === 'chat' ? '💬 Chat' : t === 'setup' ? '⚙️ Setup' : '📢 Broadcast'}
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════ SETUP TAB ═══════════════════════════════════════ */}
      {tab === 'setup' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', gap: 20, flexWrap: 'wrap', alignContent: 'flex-start' }}>

          {/* Config form */}
          <div style={{ flex: '1 1 380px', minWidth: 320, background: WA_PANEL, borderRadius: 16, padding: 24, border: `1px solid rgba(255,255,255,.06)` }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>
              <i className="bi bi-whatsapp" style={{ color: WA_GREEN }} /> Connect WhatsApp Cloud API
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20, lineHeight: 1.6 }}>
              Get your credentials from <strong style={{ color: 'var(--text)' }}>Meta for Developers</strong> → Your App → WhatsApp → API Setup
            </div>

            {/* Step-by-step guide */}
            <div style={{ marginBottom: 20, padding: '12px 14px', background: 'rgba(37,211,102,.06)', border: '1px solid rgba(37,211,102,.2)', borderRadius: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: WA_GREEN, marginBottom: 8 }}>📋 How to get credentials:</div>
              {[
                ['1.', 'Go to developers.facebook.com → My Apps → Create App → Business'],
                ['2.', 'Add WhatsApp product to your app'],
                ['3.', 'From WhatsApp → API Setup: copy Phone Number ID and Temporary Token'],
                ['4.', 'From WhatsApp → Configuration: copy WhatsApp Business Account ID'],
                ['5.', 'For permanent token: Meta Business Manager → System Users → Admin'],
              ].map(([n, t]) => (
                <div key={n} style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
                  <span style={{ color: WA_GREEN, fontWeight: 700, flexShrink: 0 }}>{n}</span><span>{t}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Phone Number ID *</label>
                <input style={{ width: '100%', background: WA_DARK, border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'monospace', boxSizing: 'border-box' }}
                  placeholder="e.g. 123456789012345"
                  value={form.phoneId} onChange={e => setForm(p => ({ ...p, phoneId: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Access Token *</label>
                <textarea style={{ width: '100%', background: WA_DARK, border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 12, fontFamily: 'monospace', resize: 'vertical', minHeight: 80, boxSizing: 'border-box' }}
                  placeholder="EAABsbCS... (permanent system user token recommended)"
                  value={form.token} onChange={e => setForm(p => ({ ...p, token: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>WABA ID (WhatsApp Business Account ID)</label>
                <input style={{ width: '100%', background: WA_DARK, border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'monospace', boxSizing: 'border-box' }}
                  placeholder="e.g. 987654321098765"
                  value={form.wabaId} onChange={e => setForm(p => ({ ...p, wabaId: e.target.value }))} />
              </div>

              <button onClick={saveConfig} disabled={setupLoading}
                style={{ padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 15,
                  background: WA_GREEN, color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <i className={`bi ${setupLoading ? 'bi-arrow-clockwise' : 'bi-plug-fill'}`}
                  style={{ animation: setupLoading ? 'spin 1s linear infinite' : undefined }} />
                {setupLoading ? 'Connecting…' : 'Connect to WhatsApp Cloud API'}
              </button>

              {setupResult && (
                <div style={{ padding: '12px 14px', borderRadius: 10, fontSize: 12,
                  background: setupResult.verified ? 'rgba(37,211,102,.08)' : 'rgba(255,82,82,.08)',
                  border: `1px solid ${setupResult.verified ? 'rgba(37,211,102,.3)' : 'rgba(255,82,82,.3)'}`,
                  color: setupResult.verified ? WA_GREEN : '#ff5252', lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{setupResult.message || setupResult.error}</div>
                  {setupResult.verified && (
                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                      <div>📱 Number: {setupResult.phoneNumber}</div>
                      <div>✅ Name: {setupResult.displayName}</div>
                      <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(0,0,0,.3)', borderRadius: 6 }}>
                        <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>🔗 Webhook URL (add to Meta):</div>
                        <code style={{ fontSize: 11, color: WA_GREEN, wordBreak: 'break-all' }}>
                          https://dl-sms-client.pages.dev/api/wa/webhook
                        </code>
                        <div style={{ marginTop: 4 }}>Verify Token: <code style={{ color: 'var(--yellow)' }}>{setupResult.webhookVerify}</code></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Current status */}
          {isConfigured && cfg && (
            <div style={{ flex: '1 1 280px', minWidth: 260 }}>
              <div style={{ background: WA_PANEL, borderRadius: 16, padding: 20, border: '1px solid rgba(37,211,102,.2)', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: WA_GREEN, boxShadow: `0 0 8px ${WA_GREEN}` }} />
                  <span style={{ fontWeight: 700, color: WA_GREEN }}>CONNECTED</span>
                </div>
                {[
                  ['Phone Number', cfg.phoneNumber],
                  ['Display Name', cfg.displayName],
                  ['Phone ID', cfg.phoneId],
                  ['WABA ID', cfg.wabaId || '—'],
                  ['Token', cfg.tokenPreview],
                  ['Webhook Verify', cfg.webhookVerify],
                  ['Connected', cfg.configuredAt ? new Date(cfg.configuredAt).toLocaleDateString() : '—'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.04)', fontSize: 12 }}>
                    <span style={{ color: 'var(--text3)' }}>{k}</span>
                    <span style={{ color: 'var(--text)', fontFamily: 'monospace', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Webhook setup reminder */}
              <div style={{ background: 'rgba(255,193,7,.06)', border: '1px solid rgba(255,193,7,.2)', borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--yellow)', marginBottom: 8 }}>📌 Set webhook in Meta Dashboard:</div>
                <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.7 }}>
                  <div>URL: <code style={{ color: WA_GREEN, fontSize: 10 }}>https://dl-sms-client.pages.dev/api/wa/webhook</code></div>
                  <div>Token: <code style={{ color: 'var(--yellow)', fontSize: 10 }}>{cfg.webhookVerify}</code></div>
                  <div style={{ marginTop: 6 }}>Subscribe to: <strong>messages</strong></div>
                </div>
              </div>

              {/* Phone numbers from Meta */}
              {waNumbers.length > 0 && (
                <div style={{ background: WA_PANEL, borderRadius: 12, padding: 14, marginTop: 16, border: '1px solid rgba(255,255,255,.06)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>📱 Your WA Numbers</div>
                  {waNumbers.map((n: any) => (
                    <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                      <span style={{ color: 'var(--text)' }}>{n.display_phone_number}</span>
                      <span style={{ color: n.status === 'CONNECTED' ? WA_GREEN : 'var(--yellow)', fontSize: 11 }}>{n.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════ CHAT TAB ════════════════════════════════════════ */}
      {tab === 'chat' && (
        <div style={{ flex: 1, display: 'flex', gap: 0, minHeight: 0, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,.06)' }}>

          {/* Left sidebar — contacts */}
          <div style={{ width: 320, flexShrink: 0, background: WA_PANEL, borderRight: '1px solid rgba(255,255,255,.06)', display: 'flex', flexDirection: 'column' }}>
            {/* Search + add */}
            <div style={{ padding: '12px 10px', display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <i className="bi bi-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 13 }} />
                <input style={{ width: '100%', paddingLeft: 32, paddingRight: 10, height: 36, borderRadius: 8, border: 'none', background: WA_DARK, color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }}
                  placeholder="Search contacts…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <button onClick={() => setShowAddContact(true)}
                style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: `${WA_GREEN}22`, color: WA_GREEN, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>

            {/* API status bar */}
            {!isConfigured && (
              <div style={{ margin: '0 10px 8px', padding: '8px 10px', background: 'rgba(255,193,7,.08)', border: '1px solid rgba(255,193,7,.2)', borderRadius: 8, fontSize: 11, color: 'var(--yellow)' }}>
                ⚠ WA Cloud API not set up — messages stored locally only.{' '}
                <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setTab('setup')}>Setup →</span>
              </div>
            )}

            {/* Contact list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filtered.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                  {search ? 'No contacts found' : 'No contacts yet'}<br />
                  <span style={{ fontSize: 11 }}>Sync numbers first or add manually</span>
                </div>
              )}
              {filtered.map(c => (
                <div key={c.id} onClick={() => openContact(c)}
                  style={{ display: 'flex', gap: 10, padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,.03)',
                    background: active?.id === c.id ? 'rgba(37,211,102,.08)' : 'transparent',
                    transition: 'background .15s' }}
                  onMouseEnter={e => { if (active?.id !== c.id)(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.04)' }}
                  onMouseLeave={e => { if (active?.id !== c.id)(e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                  {/* Avatar */}
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: `hsl(${Math.abs(c.name.charCodeAt(0)*37)%360},40%,35%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, color: '#fff' }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{c.lastMessageAt ? fmt(c.lastMessageAt) : ''}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {c.phone}
                      </span>
                      {c.unread > 0 && (
                        <span style={{ background: WA_GREEN, color: '#000', borderRadius: '50%', minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{c.unread}</span>
                      )}
                    </div>
                    {c.lastMessage && <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.lastMessage}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — chat panel */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: WA_DARK, minWidth: 0 }}>
            {!active ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', gap: 12 }}>
                <i className="bi bi-whatsapp" style={{ fontSize: 56, color: `${WA_GREEN}44` }} />
                <div style={{ fontSize: 16, fontWeight: 600 }}>Select a contact to start chatting</div>
                <div style={{ fontSize: 12 }}>
                  {isConfigured ? `Connected: ${cfg?.phoneNumber}` : 'Configure WhatsApp Cloud API in Setup tab to send real messages'}
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div style={{ padding: '12px 16px', background: WA_PANEL, display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: `hsl(${Math.abs(active.name.charCodeAt(0)*37)%360},40%,35%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff' }}>
                    {active.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{active.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{active.phone}</div>
                  </div>
                  {isConfigured && (
                    <div style={{ marginLeft: 'auto', fontSize: 11, color: WA_GREEN, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: WA_GREEN, display: 'inline-block' }} />
                      Real WA Cloud API
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {thread.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 12, margin: 'auto' }}>
                      No messages yet. Send a message to start the conversation.
                    </div>
                  )}
                  {thread.map(msg => {
                    const isMe = msg.from === 'me' || !msg.incoming
                    return (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '72%', padding: '8px 12px 4px', borderRadius: isMe ? '12px 12px 0 12px' : '12px 12px 12px 0',
                          background: isMe ? WA_MSG : WA_PANEL, position: 'relative',
                          border: `1px solid ${isMe ? 'rgba(0,92,75,.3)' : 'rgba(255,255,255,.04)'}`,
                        }}>
                          <div style={{ fontSize: 14, color: '#e9edef', wordBreak: 'break-word', lineHeight: 1.5 }}>{msg.body}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 2 }}>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>{new Date(msg.sent_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                            {isMe && (
                              <span style={{ fontSize: 12 }}>
                                {msg.via_cloud_api ? <span style={{ color: WA_GREEN }}>✓✓</span> : <span style={{ color: 'rgba(255,255,255,.4)' }}>✓</span>}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={msgEndRef} />
                </div>

                {/* Send error */}
                {sendError && (
                  <div style={{ padding: '8px 16px', background: 'rgba(255,82,82,.1)', color: '#ff5252', fontSize: 12, textAlign: 'center' }}>
                    ❌ {sendError}
                  </div>
                )}

                {/* Input bar */}
                <div style={{ padding: '10px 12px', background: WA_PANEL, display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <input ref={inputRef}
                    style={{ flex: 1, background: WA_DARK, border: 'none', borderRadius: 24, padding: '10px 16px', color: 'var(--text)', fontSize: 14, outline: 'none' }}
                    placeholder={isConfigured ? `Message ${active.name}…` : 'Type message (no WA API configured)…'}
                    value={msgInput}
                    onChange={e => setMsgInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }} />
                  <button onClick={sendMessage} disabled={sending || !msgInput.trim()}
                    style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer',
                      background: msgInput.trim() ? WA_GREEN : 'rgba(255,255,255,.1)',
                      color: msgInput.trim() ? '#000' : 'var(--text3)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}>
                    <i className={`bi ${sending ? 'bi-arrow-clockwise' : 'bi-send-fill'}`}
                      style={{ animation: sending ? 'spin 1s linear infinite' : undefined }} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ BROADCAST TAB ════════════════════════════════════ */}
      {tab === 'broadcast' && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', gap: 20, flexWrap: 'wrap', alignContent: 'flex-start' }}>
          <div style={{ flex: '1 1 380px', background: WA_PANEL, borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,.06)' }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', marginBottom: 16 }}>
              📢 Broadcast via WhatsApp Cloud API
            </div>
            {!isConfigured && (
              <div style={{ padding: '12px 14px', background: 'rgba(255,193,7,.06)', border: '1px solid rgba(255,193,7,.2)', borderRadius: 8, fontSize: 12, color: 'var(--yellow)', marginBottom: 16 }}>
                ⚠ Configure WhatsApp Cloud API in Setup tab first
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Template Name</label>
                <select style={{ width: '100%', background: WA_DARK, border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 13 }}
                  value={bcTemplate} onChange={e => setBcTemplate(e.target.value)}>
                  <option value="">Select template…</option>
                  {templates.map((t: any) => <option key={t.name || t} value={t.name || t}>{t.name || t} ({t.status || 'approved'})</option>)}
                  <option value="hello_world">hello_world (default test)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Recipients (one per line)</label>
                <textarea style={{ width: '100%', background: WA_DARK, border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 12, fontFamily: 'monospace', resize: 'vertical', minHeight: 100, boxSizing: 'border-box' }}
                  placeholder={"+1234567890\n+9876543210\n..."}
                  value={bcNumbers} onChange={e => setBcNumbers(e.target.value)} />
              </div>
              <button onClick={sendBroadcast} disabled={bcSending || !isConfigured}
                style={{ padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 15,
                  background: isConfigured ? WA_GREEN : 'var(--bg2)', color: isConfigured ? '#000' : 'var(--text3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <i className={`bi ${bcSending ? 'bi-arrow-clockwise' : 'bi-broadcast'}`}
                  style={{ animation: bcSending ? 'spin 1s linear infinite' : undefined }} />
                {bcSending ? 'Sending…' : 'Send Broadcast'}
              </button>
              {bcResult && (
                <div style={{ padding: '12px 14px', borderRadius: 8, fontSize: 12,
                  background: bcResult.error ? 'rgba(255,82,82,.08)' : 'rgba(37,211,102,.08)',
                  border: `1px solid ${bcResult.error ? 'rgba(255,82,82,.3)' : 'rgba(37,211,102,.3)'}`,
                  color: bcResult.error ? '#ff5252' : WA_GREEN }}>
                  {bcResult.error ? bcResult.error : `✅ Sent: ${bcResult.sent}/${bcResult.total} · Failed: ${bcResult.failed}`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Contact Modal ── */}
      {showAddContact && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: WA_PANEL, borderRadius: 16, padding: 24, width: 340, border: '1px solid rgba(255,255,255,.1)' }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', marginBottom: 16 }}>Add WhatsApp Contact</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input style={{ background: WA_DARK, border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 13 }}
                placeholder="Name (optional)" value={newContact.name} onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))} />
              <input style={{ background: WA_DARK, border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: 13 }}
                placeholder="Phone number e.g. +14155552671" value={newContact.phone}
                onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') addContact() }} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowAddContact(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}>Cancel</button>
                <button onClick={addContact} disabled={addingContact || !newContact.phone}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: WA_GREEN, color: '#000', fontWeight: 700, cursor: 'pointer' }}>
                  {addingContact ? 'Adding…' : 'Add Contact'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
