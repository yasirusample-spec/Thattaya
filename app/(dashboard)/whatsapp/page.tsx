'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

interface Contact {
  id: string
  name: string
  phone: string
  avatar: string | null
  addedAt: string
  lastMessage: string | null
  lastMessageAt: string | null
  unread: number
}

interface Message {
  id: string
  from: 'me' | string
  to: string
  body: string
  sent_at: string
  status: string
  deviceId?: string | null
}

interface Device {
  id: string
  name: string
  model: string
  brand: string
  os: string
  icon: string
  phone: string
  status: string
  batteryPct?: number
  lastSeen: string
  linkedAt: string
}

type Tab = 'contacts' | 'devices' | 'broadcast' | 'send'

export default function WhatsAppPage() {
  const [tab, setTab] = useState<Tab>('contacts')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [activeContact, setActiveContact] = useState<Contact | null>(null)
  const [thread, setThread] = useState<Message[]>([])
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [sendingMsg, setSendingMsg] = useState(false)
  const [msgInput, setMsgInput] = useState('')
  const [showAddContact, setShowAddContact] = useState(false)
  const [addName, setAddName] = useState('')
  const [addPhone, setAddPhone] = useState('')
  const [addingContact, setAddingContact] = useState(false)
  const [addError, setAddError] = useState('')
  const [loadingDevices, setLoadingDevices] = useState(false)
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [broadcastTargets, setBroadcastTargets] = useState('')
  const [broadcasting, setBroadcasting] = useState(false)
  const [broadcastResult, setBroadcastResult] = useState<any>(null)
  const [quickTo, setQuickTo] = useState('')
  const [quickMsg, setQuickMsg] = useState('')
  const [quickSending, setQuickSending] = useState(false)
  const [quickResult, setQuickResult] = useState<any>(null)
  const [showDeviceModal, setShowDeviceModal] = useState(false)
  const [devName, setDevName] = useState('')
  const [devModel, setDevModel] = useState('Samsung Galaxy S25 Ultra')
  const [devPhone, setDevPhone] = useState('')
  const [addingDevice, setAddingDevice] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const loadContacts = useCallback(async () => {
    try {
      const r = await fetch('/api/whatsapp/contacts')
      if (r.ok) {
        const d = await r.json()
        setContacts(Array.isArray(d.contacts) ? d.contacts : [])
      }
    } catch {}
    setLoadingContacts(false)
  }, [])

  const loadThread = useCallback(async (phone: string) => {
    setLoadingThread(true)
    try {
      const r = await fetch(`/api/whatsapp/thread?phone=${encodeURIComponent(phone)}`)
      if (r.ok) {
        const d = await r.json()
        setThread(Array.isArray(d.messages) ? d.messages : [])
      }
    } catch {}
    setLoadingThread(false)
  }, [])

  const loadDevices = useCallback(async () => {
    setLoadingDevices(true)
    try {
      const r = await fetch('/api/whatsapp/devices')
      if (r.ok) {
        const d = await r.json()
        setDevices(Array.isArray(d.devices) ? d.devices : [])
      }
    } catch {}
    setLoadingDevices(false)
  }, [])

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  useEffect(() => {
    if (tab === 'devices') loadDevices()
  }, [tab, loadDevices])

  // Poll thread every 3s when a contact is open
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (activeContact) {
      pollRef.current = setInterval(() => {
        loadThread(activeContact.phone)
      }, 3000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [activeContact, loadThread])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread])

  const openContact = async (c: Contact) => {
    setActiveContact(c)
    setThread([])
    await loadThread(c.phone)
    // Mark unread as 0 locally
    setContacts(prev => prev.map(x => x.id === c.id ? { ...x, unread: 0 } : x))
  }

  const sendMessage = async () => {
    if (!msgInput.trim() || !activeContact || sendingMsg) return
    setSendingMsg(true)
    const body = msgInput.trim()
    setMsgInput('')
    try {
      const r = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: activeContact.phone, message: body }),
      })
      if (r.ok) {
        const d = await r.json()
        if (d.message) setThread(prev => [...prev, d.message])
        setContacts(prev => prev.map(x =>
          x.id === activeContact.id
            ? { ...x, lastMessage: body.slice(0, 80), lastMessageAt: new Date().toISOString() }
            : x
        ))
      }
    } catch {}
    setSendingMsg(false)
  }

  const addContact = async () => {
    if (!addPhone.trim()) { setAddError('Phone number is required'); return }
    setAddingContact(true)
    setAddError('')
    try {
      const r = await fetch('/api/whatsapp/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addName.trim() || addPhone.trim(), phone: addPhone.trim() }),
      })
      const d = await r.json()
      if (r.ok && d.contact) {
        setContacts(prev => [d.contact, ...prev])
        setShowAddContact(false)
        setAddName('')
        setAddPhone('')
      } else {
        setAddError(d.error || 'Failed to add contact')
      }
    } catch {
      setAddError('Network error')
    }
    setAddingContact(false)
  }

  const deleteContact = async (id: string) => {
    if (!confirm('Remove this contact?')) return
    try {
      await fetch(`/api/whatsapp/contacts/${id}`, { method: 'DELETE' })
      setContacts(prev => prev.filter(c => c.id !== id))
      if (activeContact?.id === id) setActiveContact(null)
    } catch {}
  }

  const addDevice = async () => {
    setAddingDevice(true)
    try {
      const r = await fetch('/api/whatsapp/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: devName || devModel, model: devModel, phone: devPhone }),
      })
      if (r.ok) {
        setShowDeviceModal(false)
        setDevName(''); setDevModel('Samsung Galaxy S25 Ultra'); setDevPhone('')
        loadDevices()
      }
    } catch {}
    setAddingDevice(false)
  }

  const removeDevice = async (id: string) => {
    if (!confirm('Disconnect this device?')) return
    try {
      await fetch(`/api/whatsapp/devices/${id}`, { method: 'DELETE' })
      setDevices(prev => prev.filter(d => d.id !== id))
    } catch {}
  }

  const doBroadcast = async () => {
    const targets = broadcastTargets.split(/[\n,]+/).map(t => t.trim()).filter(Boolean)
    if (!targets.length || !broadcastMsg.trim()) return
    setBroadcasting(true)
    setBroadcastResult(null)
    try {
      const r = await fetch('/api/whatsapp/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets, message: broadcastMsg }),
      })
      const d = await r.json()
      setBroadcastResult(d)
    } catch {}
    setBroadcasting(false)
  }

  const doQuickSend = async () => {
    if (!quickTo.trim() || !quickMsg.trim()) return
    setQuickSending(true)
    setQuickResult(null)
    try {
      const r = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: quickTo.trim(), message: quickMsg.trim() }),
      })
      const d = await r.json()
      setQuickResult(d)
    } catch {}
    setQuickSending(false)
  }

  const fmtTime = (iso: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString()
  }

  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const colorFor = (name: string) => {
    const colors = ['#25D366','#128C7E','#075E54','#34B7F1','#00BFA5','#7C4DFF','#FF6D00','#E91E63']
    let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % colors.length
    return colors[h]
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#111b21', color: '#e9edef', fontFamily: 'system-ui, sans-serif' }}>

      {/* Top nav tabs */}
      <div style={{ display: 'flex', background: '#202c33', borderBottom: '1px solid #2a3942', padding: '0 16px' }}>
        {([
          { key: 'contacts', label: '💬 Contacts & Chat' },
          { key: 'devices', label: '📱 Devices' },
          { key: 'broadcast', label: '📢 Broadcast' },
          { key: 'send', label: '✉️ Quick Send' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '14px 18px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
            background: 'transparent',
            color: tab === t.key ? '#00a884' : '#aebac1',
            borderBottom: tab === t.key ? '2px solid #00a884' : '2px solid transparent',
            transition: 'all 0.2s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── CONTACTS & CHAT TAB ── */}
      {tab === 'contacts' && (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Left sidebar — contacts list */}
          <div style={{ width: 340, borderRight: '1px solid #2a3942', display: 'flex', flexDirection: 'column', background: '#111b21' }}>
            {/* Header */}
            <div style={{ padding: '12px 16px', background: '#202c33', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>WhatsApp</span>
              <button onClick={() => setShowAddContact(true)} style={{
                background: '#00a884', color: '#fff', border: 'none', borderRadius: 20,
                padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              }}>+ Add Contact</button>
            </div>

            {/* Search placeholder */}
            <div style={{ padding: '8px 12px', background: '#111b21', borderBottom: '1px solid #2a3942' }}>
              <input placeholder="🔍 Search contacts..." style={{
                width: '100%', background: '#202c33', border: 'none', borderRadius: 8,
                padding: '8px 12px', color: '#e9edef', fontSize: 14, boxSizing: 'border-box',
              }} />
            </div>

            {/* Contacts list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loadingContacts ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#8696a0' }}>Loading contacts…</div>
              ) : contacts.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#8696a0' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>No contacts yet</div>
                  <div style={{ fontSize: 13 }}>Click "Add Contact" to add a WhatsApp number</div>
                </div>
              ) : (
                contacts.map(c => (
                  <div key={c.id} onClick={() => openContact(c)} style={{
                    display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer',
                    background: activeContact?.id === c.id ? '#2a3942' : 'transparent',
                    borderBottom: '1px solid #1f2c34',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => { if (activeContact?.id !== c.id) (e.currentTarget as HTMLDivElement).style.background = '#1f2c34' }}
                    onMouseLeave={e => { if (activeContact?.id !== c.id) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 46, height: 46, borderRadius: '50%', flexShrink: 0, marginRight: 12,
                      background: colorFor(c.name), display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 16, color: '#fff',
                    }}>{initials(c.name)}</div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontWeight: 600, fontSize: 15, color: '#e9edef', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                        <span style={{ fontSize: 11, color: '#8696a0', flexShrink: 0, marginLeft: 8 }}>{fmtTime(c.lastMessageAt)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: '#8696a0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.lastMessage || c.phone}
                        </span>
                        {c.unread > 0 && (
                          <span style={{ background: '#00a884', color: '#111', borderRadius: 10, padding: '2px 7px', fontSize: 11, fontWeight: 700, flexShrink: 0, marginLeft: 6 }}>{c.unread}</span>
                        )}
                      </div>
                    </div>

                    {/* Delete btn */}
                    <button onClick={e => { e.stopPropagation(); deleteContact(c.id) }} style={{
                      background: 'transparent', border: 'none', color: '#8696a0', cursor: 'pointer',
                      fontSize: 16, padding: '4px 6px', marginLeft: 6, flexShrink: 0,
                      opacity: 0.6,
                    }} title="Remove contact">✕</button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right — Chat thread */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0b141a' }}>
            {!activeContact ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#8696a0' }}>
                <div style={{ fontSize: 72, marginBottom: 20 }}>💬</div>
                <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 10, color: '#e9edef' }}>DL Chat — WhatsApp</div>
                <div style={{ fontSize: 14, textAlign: 'center', maxWidth: 320, lineHeight: 1.6 }}>
                  Select a contact from the left to open a conversation.<br />
                  Add contacts by their WhatsApp phone number.
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div style={{ padding: '12px 20px', background: '#202c33', display: 'flex', alignItems: 'center', borderBottom: '1px solid #2a3942' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', background: colorFor(activeContact.name),
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', marginRight: 12,
                  }}>{initials(activeContact.name)}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{activeContact.name}</div>
                    <div style={{ fontSize: 12, color: '#8696a0' }}>{activeContact.phone}</div>
                  </div>
                  <button onClick={() => setActiveContact(null)} style={{
                    marginLeft: 'auto', background: 'transparent', border: 'none', color: '#8696a0',
                    cursor: 'pointer', fontSize: 20,
                  }}>✕</button>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 60px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {loadingThread ? (
                    <div style={{ textAlign: 'center', color: '#8696a0', marginTop: 40 }}>Loading messages…</div>
                  ) : thread.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#8696a0', marginTop: 60 }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
                      <div>No messages yet. Send the first message below.</div>
                    </div>
                  ) : (
                    thread.map(msg => {
                      const isMe = msg.from === 'me'
                      return (
                        <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                          <div style={{
                            maxWidth: '65%', padding: '8px 12px 4px',
                            background: isMe ? '#005c4b' : '#202c33',
                            borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                            color: '#e9edef', fontSize: 14, lineHeight: 1.5,
                          }}>
                            <div style={{ wordBreak: 'break-word' }}>{msg.body}</div>
                            <div style={{ fontSize: 11, color: '#8696a0', textAlign: 'right', marginTop: 4 }}>
                              {fmtTime(msg.sent_at)}
                              {isMe && <span style={{ marginLeft: 4 }}>
                                {msg.status === 'sent' ? ' ✓' : ' ✓✓'}
                              </span>}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Message input */}
                <div style={{ padding: '12px 20px', background: '#202c33', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    value={msgInput}
                    onChange={e => setMsgInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    placeholder="Type a message…"
                    style={{
                      flex: 1, background: '#2a3942', border: 'none', borderRadius: 20,
                      padding: '10px 16px', color: '#e9edef', fontSize: 15, outline: 'none',
                    }}
                  />
                  <button onClick={sendMessage} disabled={sendingMsg || !msgInput.trim()} style={{
                    background: '#00a884', border: 'none', borderRadius: '50%',
                    width: 44, height: 44, cursor: 'pointer', fontSize: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: msgInput.trim() ? 1 : 0.5,
                  }}>➤</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── DEVICES TAB ── */}
      {tab === 'devices' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>📱 Linked Devices</h2>
              <p style={{ margin: '4px 0 0', color: '#8696a0', fontSize: 13 }}>Real devices connected to your WhatsApp account</p>
            </div>
            <button onClick={() => setShowDeviceModal(true)} style={{
              background: '#00a884', color: '#fff', border: 'none', borderRadius: 8,
              padding: '10px 20px', cursor: 'pointer', fontWeight: 600,
            }}>+ Link Device</button>
          </div>

          {loadingDevices ? (
            <div style={{ textAlign: 'center', color: '#8696a0', padding: 60 }}>Loading devices…</div>
          ) : devices.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#8696a0', padding: 60 }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>📱</div>
              <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>No devices linked</div>
              <div style={{ fontSize: 14 }}>Link a real device to start receiving WhatsApp messages</div>
              <button onClick={() => setShowDeviceModal(true)} style={{
                marginTop: 16, background: '#00a884', color: '#fff', border: 'none',
                borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600,
              }}>+ Link First Device</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {devices.map(d => (
                <div key={d.id} style={{
                  background: '#202c33', borderRadius: 12, padding: 20,
                  border: `1px solid ${d.status === 'connected' ? '#00a884' : '#2a3942'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ fontSize: 32, marginRight: 12 }}>{d.icon || '📱'}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{d.name}</div>
                      <div style={{ fontSize: 12, color: '#8696a0' }}>{d.model}</div>
                    </div>
                    <span style={{
                      marginLeft: 'auto', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      background: d.status === 'connected' ? '#00a88422' : '#2a3942',
                      color: d.status === 'connected' ? '#00a884' : '#8696a0',
                    }}>{d.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#8696a0', lineHeight: 1.8 }}>
                    <div>📞 {d.phone || 'No phone set'}</div>
                    <div>💻 {d.os}</div>
                    <div>🕐 Last seen: {fmtTime(d.lastSeen)}</div>
                    {d.batteryPct != null && <div>🔋 Battery: {d.batteryPct}%</div>}
                  </div>
                  <button onClick={() => removeDevice(d.id)} style={{
                    marginTop: 14, background: '#ff4444', color: '#fff', border: 'none',
                    borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12, width: '100%',
                  }}>Disconnect</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── BROADCAST TAB ── */}
      {tab === 'broadcast' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, maxWidth: 700 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700 }}>📢 Broadcast Message</h2>
          <p style={{ margin: '0 0 24px', color: '#8696a0', fontSize: 13 }}>Send a message to multiple WhatsApp numbers at once</p>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>
              Recipients (one per line or comma-separated)
            </label>
            <textarea
              value={broadcastTargets}
              onChange={e => setBroadcastTargets(e.target.value)}
              rows={5}
              placeholder={'+1234567890\n+0987654321\n...'}
              style={{
                width: '100%', background: '#202c33', border: '1px solid #2a3942',
                borderRadius: 8, padding: 12, color: '#e9edef', fontSize: 14,
                resize: 'vertical', boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>Message</label>
            <textarea
              value={broadcastMsg}
              onChange={e => setBroadcastMsg(e.target.value)}
              rows={4}
              placeholder="Type your message here…"
              style={{
                width: '100%', background: '#202c33', border: '1px solid #2a3942',
                borderRadius: 8, padding: 12, color: '#e9edef', fontSize: 14,
                resize: 'vertical', boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

          <button onClick={doBroadcast} disabled={broadcasting} style={{
            background: '#00a884', color: '#fff', border: 'none', borderRadius: 8,
            padding: '12px 28px', cursor: 'pointer', fontWeight: 700, fontSize: 15,
            opacity: broadcasting ? 0.7 : 1,
          }}>{broadcasting ? 'Sending…' : '📢 Send Broadcast'}</button>

          {broadcastResult && (
            <div style={{
              marginTop: 20, background: '#202c33', borderRadius: 10, padding: 16,
              border: '1px solid #2a3942',
            }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                ✅ Broadcast sent — {broadcastResult.sent} recipients queued
              </div>
              {Array.isArray(broadcastResult.results) && broadcastResult.results.slice(0, 5).map((r: any, i: number) => (
                <div key={i} style={{ fontSize: 12, color: '#8696a0', padding: '2px 0' }}>
                  {r.to} → <span style={{ color: r.status === 'queued' ? '#00a884' : '#ff4444' }}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── QUICK SEND TAB ── */}
      {tab === 'send' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, maxWidth: 600 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700 }}>✉️ Quick Send</h2>
          <p style={{ margin: '0 0 24px', color: '#8696a0', fontSize: 13 }}>Send a single WhatsApp message to any number</p>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>To (phone number)</label>
            <input
              value={quickTo}
              onChange={e => setQuickTo(e.target.value)}
              placeholder="+1234567890"
              style={{
                width: '100%', background: '#202c33', border: '1px solid #2a3942',
                borderRadius: 8, padding: '10px 14px', color: '#e9edef', fontSize: 14,
                boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>Message</label>
            <textarea
              value={quickMsg}
              onChange={e => setQuickMsg(e.target.value)}
              rows={4}
              placeholder="Type your message…"
              style={{
                width: '100%', background: '#202c33', border: '1px solid #2a3942',
                borderRadius: 8, padding: 12, color: '#e9edef', fontSize: 14,
                resize: 'vertical', boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>

          <button onClick={doQuickSend} disabled={quickSending} style={{
            background: '#00a884', color: '#fff', border: 'none', borderRadius: 8,
            padding: '12px 28px', cursor: 'pointer', fontWeight: 700, fontSize: 15,
            opacity: quickSending ? 0.7 : 1,
          }}>{quickSending ? 'Sending…' : '✉️ Send Message'}</button>

          {quickResult && (
            <div style={{
              marginTop: 20, background: '#202c33', borderRadius: 10, padding: 16,
              border: `1px solid ${quickResult.ok ? '#00a884' : '#ff4444'}`,
            }}>
              {quickResult.ok
                ? <span style={{ color: '#00a884', fontWeight: 600 }}>✅ Message sent to {quickResult.message?.to}</span>
                : <span style={{ color: '#ff4444' }}>❌ {quickResult.error || 'Send failed'}</span>
              }
            </div>
          )}
        </div>
      )}

      {/* ── ADD CONTACT MODAL ── */}
      {showAddContact && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }} onClick={e => { if (e.target === e.currentTarget) setShowAddContact(false) }}>
          <div style={{ background: '#202c33', borderRadius: 14, padding: 28, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>Add WhatsApp Contact</h3>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#8696a0' }}>Name (optional)</label>
              <input
                value={addName}
                onChange={e => setAddName(e.target.value)}
                placeholder="e.g. John Doe"
                style={{
                  width: '100%', background: '#111b21', border: '1px solid #2a3942',
                  borderRadius: 8, padding: '10px 14px', color: '#e9edef', fontSize: 14,
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#8696a0' }}>Phone Number *</label>
              <input
                value={addPhone}
                onChange={e => setAddPhone(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addContact() }}
                placeholder="+1234567890 (with country code)"
                style={{
                  width: '100%', background: '#111b21', border: '1px solid #2a3942',
                  borderRadius: 8, padding: '10px 14px', color: '#e9edef', fontSize: 14,
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
            </div>

            {addError && (
              <div style={{ marginBottom: 14, color: '#ff4444', fontSize: 13, background: '#ff444411', padding: '8px 12px', borderRadius: 6 }}>
                {addError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowAddContact(false); setAddError('') }} style={{
                flex: 1, background: '#2a3942', color: '#e9edef', border: 'none',
                borderRadius: 8, padding: '11px', cursor: 'pointer', fontWeight: 600,
              }}>Cancel</button>
              <button onClick={addContact} disabled={addingContact} style={{
                flex: 1, background: '#00a884', color: '#fff', border: 'none',
                borderRadius: 8, padding: '11px', cursor: 'pointer', fontWeight: 700,
                opacity: addingContact ? 0.7 : 1,
              }}>{addingContact ? 'Adding…' : 'Add Contact'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── LINK DEVICE MODAL ── */}
      {showDeviceModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }} onClick={e => { if (e.target === e.currentTarget) setShowDeviceModal(false) }}>
          <div style={{ background: '#202c33', borderRadius: 14, padding: 28, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>📱 Link a Device</h3>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#8696a0' }}>Device Name</label>
              <input value={devName} onChange={e => setDevName(e.target.value)} placeholder="My Phone"
                style={{ width: '100%', background: '#111b21', border: '1px solid #2a3942', borderRadius: 8, padding: '10px 14px', color: '#e9edef', fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#8696a0' }}>Model</label>
              <select value={devModel} onChange={e => setDevModel(e.target.value)} style={{
                width: '100%', background: '#111b21', border: '1px solid #2a3942',
                borderRadius: 8, padding: '10px 14px', color: '#e9edef', fontSize: 14, boxSizing: 'border-box',
              }}>
                {['Samsung Galaxy S25 Ultra','Samsung Galaxy S25+','iPhone 16 Pro Max','iPhone 16 Pro','iPhone 16',
                  'Google Pixel 9 Pro XL','Google Pixel 9 Pro','Google Pixel 9','OnePlus 13','Xiaomi 15 Ultra','Custom / Other']
                  .map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#8696a0' }}>WhatsApp Phone Number</label>
              <input value={devPhone} onChange={e => setDevPhone(e.target.value)} placeholder="+1234567890"
                style={{ width: '100%', background: '#111b21', border: '1px solid #2a3942', borderRadius: 8, padding: '10px 14px', color: '#e9edef', fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDeviceModal(false)} style={{
                flex: 1, background: '#2a3942', color: '#e9edef', border: 'none', borderRadius: 8, padding: '11px', cursor: 'pointer', fontWeight: 600,
              }}>Cancel</button>
              <button onClick={addDevice} disabled={addingDevice} style={{
                flex: 1, background: '#00a884', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', cursor: 'pointer', fontWeight: 700,
                opacity: addingDevice ? 0.7 : 1,
              }}>{addingDevice ? 'Linking…' : 'Link Device'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
