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
  source?: string
}

interface Message {
  id: string
  from: 'me' | string
  to: string
  body: string
  sent_at: string
  status: string
  incoming?: boolean
}

const AVATAR_COLORS = [
  '#7C3AED','#2563EB','#059669','#DC2626','#D97706',
  '#0891B2','#BE185D','#4F46E5','#0D9488','#B45309',
]

function colorFor(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

function initials(name: string) {
  return name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '?'
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function fmtFull(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function dateLabel(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = today.getTime() - msgDay.getTime()
  if (diff === 0) return 'Today'
  if (diff === 86400000) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function DLChatPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [activeContact, setActiveContact] = useState<Contact | null>(null)
  const [thread, setThread] = useState<Message[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [msgInput, setMsgInput] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addPhone, setAddPhone] = useState('')
  const [addingContact, setAddingContact] = useState(false)
  const [addError, setAddError] = useState('')
  const [showContactInfo, setShowContactInfo] = useState(false)
  const [newMsgCount, setNewMsgCount] = useState(0)
  const prevThreadLen = useRef(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const contactPollRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Load contacts ──────────────────────────────────────────────────
  const loadContacts = useCallback(async (silent = false) => {
    try {
      const r = await fetch('/api/whatsapp/contacts')
      if (r.ok) {
        const d = await r.json()
        setContacts(Array.isArray(d.contacts) ? d.contacts : [])
      }
    } catch {}
    if (!silent) setLoading(false)
  }, [])

  // ── Load thread ────────────────────────────────────────────────────
  const loadThread = useCallback(async (phone: string, silent = false) => {
    if (!silent) setLoadingThread(true)
    try {
      const r = await fetch(`/api/whatsapp/thread?phone=${encodeURIComponent(phone)}`)
      if (r.ok) {
        const d = await r.json()
        const msgs: Message[] = Array.isArray(d.messages) ? d.messages : []
        setThread(prev => {
          const newOnes = msgs.length - prev.length
          if (newOnes > 0 && prev.length > 0) setNewMsgCount(c => c + newOnes)
          prevThreadLen.current = msgs.length
          return msgs
        })
      }
    } catch {}
    if (!silent) setLoadingThread(false)
  }, [])

  useEffect(() => { loadContacts() }, [loadContacts])

  // Poll contacts every 10s
  useEffect(() => {
    contactPollRef.current = setInterval(() => loadContacts(true), 10000)
    return () => { if (contactPollRef.current) clearInterval(contactPollRef.current) }
  }, [loadContacts])

  // Poll thread every 3s when active
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (activeContact) {
      pollRef.current = setInterval(() => loadThread(activeContact.phone, true), 3000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [activeContact, loadThread])

  // Auto-scroll to bottom when thread updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread])

  const openContact = async (c: Contact) => {
    setActiveContact(c)
    setThread([])
    setNewMsgCount(0)
    setShowContactInfo(false)
    prevThreadLen.current = 0
    await loadThread(c.phone)
    setContacts(prev => prev.map(x => x.id === c.id ? { ...x, unread: 0 } : x))
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const sendMessage = async () => {
    if (!msgInput.trim() || !activeContact || sending) return
    setSending(true)
    const body = msgInput.trim()
    setMsgInput('')
    const optimistic: Message = {
      id: 'opt-' + Date.now(), from: 'me', to: activeContact.phone,
      body, sent_at: new Date().toISOString(), status: 'sending',
    }
    setThread(prev => [...prev, optimistic])
    try {
      const r = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: activeContact.phone, message: body }),
      })
      if (r.ok) {
        const d = await r.json()
        if (d.message) {
          setThread(prev => prev.map(m => m.id === optimistic.id ? { ...d.message } : m))
        } else {
          setThread(prev => prev.map(m => m.id === optimistic.id ? { ...m, status: 'sent' } : m))
        }
        setContacts(prev => prev.map(x =>
          x.id === activeContact!.id
            ? { ...x, lastMessage: body.slice(0, 80), lastMessageAt: new Date().toISOString() }
            : x
        ))
      } else {
        setThread(prev => prev.map(m => m.id === optimistic.id ? { ...m, status: 'failed' } : m))
      }
    } catch {
      setThread(prev => prev.map(m => m.id === optimistic.id ? { ...m, status: 'failed' } : m))
    }
    setSending(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const addContact = async () => {
    if (!addPhone.trim()) { setAddError('Phone number is required'); return }
    setAddingContact(true); setAddError('')
    try {
      const r = await fetch('/api/whatsapp/contacts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addName.trim() || addPhone.trim(), phone: addPhone.trim() }),
      })
      const d = await r.json()
      if (r.ok && d.contact) {
        setContacts(prev => [d.contact, ...prev])
        setShowAdd(false); setAddName(''); setAddPhone('')
        openContact(d.contact)
      } else { setAddError(d.error || 'Failed to add contact') }
    } catch { setAddError('Network error') }
    setAddingContact(false)
  }

  const deleteContact = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Remove this contact and all their messages?')) return
    await fetch(`/api/whatsapp/contacts/${id}`, { method: 'DELETE' })
    setContacts(prev => prev.filter(c => c.id !== id))
    if (activeContact?.id === id) setActiveContact(null)
  }

  // Group messages by date
  const groupedThread = thread.reduce<{ date: string; msgs: Message[] }[]>((acc, msg) => {
    const d = dateLabel(msg.sent_at)
    const last = acc[acc.length - 1]
    if (last && last.date === d) { last.msgs.push(msg) }
    else acc.push({ date: d, msgs: [msg] })
    return acc
  }, [])

  const filtered = contacts.filter(c =>
    search === '' ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  const totalUnread = contacts.reduce((s, c) => s + (c.unread || 0), 0)

  // ── RENDER ──────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden',
      background: '#0d1117', color: '#e2e8f0',
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      borderRadius: 12, border: '1px solid #1e293b',
    }}>

      {/* ══ LEFT SIDEBAR ══════════════════════════════════════════════ */}
      <div style={{
        width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: '#111827', borderRight: '1px solid #1e293b',
      }}>
        {/* Sidebar header */}
        <div style={{
          padding: '14px 16px', background: '#111827', borderBottom: '1px solid #1e293b',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, flexShrink: 0,
            }}>💬</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#f1f5f9', lineHeight: 1 }}>DL Chat</div>
              {totalUnread > 0 && (
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{totalUnread} unread</div>
              )}
            </div>
          </div>
          <button onClick={() => setShowAdd(true)} style={{
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
            border: 'none', borderRadius: 8, padding: '7px 13px',
            cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{ fontSize: 14 }}>+</span> New Chat
          </button>
        </div>

        {/* Search bar */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: '#475569', fontSize: 13, pointerEvents: 'none',
            }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations…"
              style={{
                width: '100%', background: '#0d1117', border: '1px solid #1e293b',
                borderRadius: 8, padding: '8px 10px 8px 32px', color: '#e2e8f0',
                fontSize: 13, boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Contact list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1e293b' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 12, background: '#1e293b', borderRadius: 4, marginBottom: 6, width: '60%' }} />
                    <div style={{ height: 10, background: '#1e293b', borderRadius: 4, width: '40%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#475569' }}>
              {contacts.length === 0 ? (
                <>
                  <div style={{ fontSize: 44, marginBottom: 12 }}>💬</div>
                  <div style={{ fontWeight: 700, marginBottom: 6, color: '#64748b', fontSize: 14 }}>No conversations yet</div>
                  <div style={{ fontSize: 12, marginBottom: 16, lineHeight: 1.6, color: '#475569' }}>
                    Start a new chat by adding a contact
                  </div>
                  <button onClick={() => setShowAdd(true)} style={{
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
                    border: 'none', borderRadius: 8, padding: '9px 18px',
                    cursor: 'pointer', fontWeight: 700, fontSize: 13,
                  }}>+ Start New Chat</button>
                </>
              ) : (
                <div style={{ fontSize: 13, color: '#64748b' }}>No contacts match "{search}"</div>
              )}
            </div>
          ) : (
            filtered.map(c => {
              const isActive = activeContact?.id === c.id
              return (
                <div
                  key={c.id}
                  onClick={() => openContact(c)}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '10px 14px',
                    cursor: 'pointer', borderBottom: '1px solid #0d1117',
                    background: isActive
                      ? 'linear-gradient(90deg,rgba(99,102,241,.15),rgba(139,92,246,.05))'
                      : 'transparent',
                    borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
                    transition: 'background 0.15s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#1e293b22' }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0, marginRight: 11,
                    background: colorFor(c.name), display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 800, fontSize: 15, color: '#fff',
                    boxShadow: isActive ? `0 0 0 2px #6366f1` : 'none',
                    position: 'relative',
                  }}>
                    {initials(c.name)}
                    {(c.unread || 0) > 0 && (
                      <div style={{
                        position: 'absolute', top: -3, right: -3, width: 18, height: 18,
                        background: '#ef4444', borderRadius: '50%', fontSize: 9, fontWeight: 800,
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid #111827',
                      }}>{c.unread > 9 ? '9+' : c.unread}</div>
                    )}
                  </div>

                  {/* Contact info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                      <span style={{
                        fontWeight: isActive ? 700 : 600, fontSize: 13, color: '#f1f5f9',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{c.name}</span>
                      <span style={{ fontSize: 10, color: '#475569', flexShrink: 0, marginLeft: 6 }}>
                        {fmtTime(c.lastMessageAt)}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 11, color: '#64748b', overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {c.lastMessage || c.phone}
                    </div>
                  </div>

                  <button
                    onClick={e => deleteContact(c.id, e)}
                    style={{
                      background: 'transparent', border: 'none', color: '#334155',
                      cursor: 'pointer', padding: '3px 5px', fontSize: 13, flexShrink: 0,
                      marginLeft: 6, borderRadius: 4, lineHeight: 1,
                    }}
                    title="Remove contact"
                  >✕</button>
                </div>
              )
            })
          )}
        </div>

        {/* Sidebar footer */}
        <div style={{
          padding: '10px 14px', borderTop: '1px solid #1e293b',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, color: '#475569' }}>
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          </span>
          <button onClick={() => loadContacts()} style={{
            background: 'transparent', border: '1px solid #1e293b', color: '#64748b',
            borderRadius: 6, padding: '4px 9px', cursor: 'pointer', fontSize: 11,
          }}>⟳ Refresh</button>
        </div>
      </div>

      {/* ══ RIGHT PANEL ═══════════════════════════════════════════════ */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        background: '#0d1117', minWidth: 0, position: 'relative',
      }}>
        {!activeContact ? (
          /* ── Empty State ── */
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', color: '#475569',
            userSelect: 'none',
          }}>
            <div style={{
              width: 100, height: 100, borderRadius: '50%', marginBottom: 24,
              background: 'linear-gradient(135deg,rgba(99,102,241,.15),rgba(139,92,246,.1))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48,
              border: '2px solid rgba(99,102,241,.2)',
            }}>💬</div>
            <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 800, color: '#94a3b8' }}>DL Chat</h2>
            <p style={{ margin: '0 0 28px', fontSize: 14, textAlign: 'center', maxWidth: 320, lineHeight: 1.8, color: '#475569' }}>
              Select a conversation or start a new one<br />to begin messaging.
            </p>
            <button onClick={() => setShowAdd(true)} style={{
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
              border: 'none', borderRadius: 10, padding: '12px 28px',
              cursor: 'pointer', fontWeight: 700, fontSize: 14,
              boxShadow: '0 4px 20px rgba(99,102,241,.4)',
            }}>+ Start New Chat</button>
          </div>
        ) : (
          <>
            {/* ── Chat header ── */}
            <div style={{
              padding: '12px 18px', background: '#111827',
              borderBottom: '1px solid #1e293b',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: colorFor(activeContact.name),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, color: '#fff', fontSize: 14, flexShrink: 0,
              }}>{initials(activeContact.name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>{activeContact.name}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                  {activeContact.phone}
                  {activeContact.source && <span style={{ marginLeft: 8, color: '#475569' }}>· via {activeContact.source}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setShowContactInfo(s => !s)}
                  style={{
                    background: showContactInfo ? 'rgba(99,102,241,.15)' : 'transparent',
                    border: `1px solid ${showContactInfo ? '#6366f1' : '#1e293b'}`,
                    color: showContactInfo ? '#6366f1' : '#64748b',
                    borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 13,
                  }}
                  title="Contact info"
                >ℹ</button>
                <button
                  onClick={() => setActiveContact(null)}
                  style={{
                    background: 'transparent', border: '1px solid #1e293b',
                    color: '#64748b', borderRadius: 8, padding: '6px 10px',
                    cursor: 'pointer', fontSize: 13,
                  }}
                  title="Close"
                >✕</button>
              </div>
            </div>

            {/* ── Message area ── */}
            <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
              {/* Messages column */}
              <div style={{
                flex: 1, overflowY: 'auto', padding: '20px 32px',
                display: 'flex', flexDirection: 'column', gap: 2,
                backgroundImage: 'radial-gradient(circle at 1px 1px, #1e293b22 1px, transparent 0)',
                backgroundSize: '24px 24px',
              }}>
                {loadingThread ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', color: '#475569' }}>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>⟳</div>
                      <div>Loading messages…</div>
                    </div>
                  </div>
                ) : thread.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                    <div style={{ fontSize: 44, marginBottom: 12 }}>🔐</div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: '#64748b' }}>No messages yet</div>
                    <div style={{ fontSize: 13, lineHeight: 1.7, textAlign: 'center' }}>
                      Say hello to {activeContact.name}!<br />
                      <span style={{ fontSize: 11, color: '#334155' }}>Messages are stored securely in KV.</span>
                    </div>
                  </div>
                ) : (
                  groupedThread.map(group => (
                    <div key={group.date}>
                      {/* Date separator */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 12px' }}>
                        <div style={{ flex: 1, height: 1, background: '#1e293b' }} />
                        <span style={{
                          background: '#111827', border: '1px solid #1e293b',
                          padding: '3px 12px', borderRadius: 20,
                          fontSize: 11, color: '#475569', fontWeight: 600, flexShrink: 0,
                        }}>{group.date}</span>
                        <div style={{ flex: 1, height: 1, background: '#1e293b' }} />
                      </div>

                      {group.msgs.map(msg => {
                        const isMe = msg.from === 'me'
                        const isSending = msg.status === 'sending'
                        const isFailed = msg.status === 'failed'
                        return (
                          <div key={msg.id} style={{
                            display: 'flex',
                            justifyContent: isMe ? 'flex-end' : 'flex-start',
                            marginBottom: 4, alignItems: 'flex-end', gap: 6,
                          }}>
                            {!isMe && (
                              <div style={{
                                width: 26, height: 26, borderRadius: '50%',
                                background: colorFor(activeContact.name),
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0,
                              }}>{initials(activeContact.name)}</div>
                            )}
                            <div style={{ maxWidth: '65%' }}>
                              <div style={{
                                padding: '9px 13px',
                                background: isMe
                                  ? isFailed
                                    ? 'rgba(239,68,68,.3)'
                                    : 'linear-gradient(135deg,#4f46e5,#6366f1)'
                                  : '#1e293b',
                                borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                                color: '#f1f5f9', fontSize: 14, lineHeight: 1.55,
                                border: isFailed ? '1px solid #ef4444' : isMe ? 'none' : '1px solid #334155',
                                opacity: isSending ? 0.65 : 1,
                                boxShadow: isMe && !isSending ? '0 2px 8px rgba(79,70,229,.25)' : 'none',
                                transition: 'opacity .3s',
                              }}>
                                <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{msg.body}</div>
                              </div>
                              <div style={{
                                fontSize: 10, color: '#334155',
                                textAlign: isMe ? 'right' : 'left',
                                marginTop: 3, paddingInline: 2,
                                display: 'flex', alignItems: 'center',
                                justifyContent: isMe ? 'flex-end' : 'flex-start', gap: 4,
                              }}>
                                {isFailed && <span style={{ color: '#ef4444' }}>⚠ Failed</span>}
                                {!isFailed && <span>{isSending ? 'Sending…' : fmtFull(msg.sent_at)}</span>}
                                {isMe && !isSending && !isFailed && (
                                  <span style={{
                                    color: msg.status === 'read' ? '#818cf8' : msg.status === 'delivered' ? '#6366f1' : '#475569',
                                    fontSize: 11,
                                  }}>
                                    {msg.status === 'read' ? '✓✓' : '✓'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Contact Info Sidebar */}
              {showContactInfo && (
                <div style={{
                  width: 240, background: '#111827', borderLeft: '1px solid #1e293b',
                  padding: 20, display: 'flex', flexDirection: 'column', gap: 16,
                  overflowY: 'auto', flexShrink: 0,
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%',
                      background: colorFor(activeContact.name),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 24, color: '#fff',
                      margin: '0 auto 12px',
                    }}>{initials(activeContact.name)}</div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: '#f1f5f9' }}>{activeContact.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, fontFamily: 'monospace' }}>{activeContact.phone}</div>
                  </div>
                  <div style={{ borderTop: '1px solid #1e293b', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Added', value: activeContact.addedAt ? new Date(activeContact.addedAt).toLocaleDateString() : '—' },
                      { label: 'Source', value: activeContact.source || 'manual' },
                      { label: 'Messages', value: thread.length.toString() },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: '#475569' }}>{item.label}</span>
                        <span style={{ color: '#94a3b8', fontWeight: 600 }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => { if (confirm('Delete contact?')) { deleteContact(activeContact.id, { stopPropagation: () => {} } as any) } }}
                    style={{
                      background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
                      color: '#f87171', borderRadius: 8, padding: '8px 14px',
                      cursor: 'pointer', fontWeight: 600, fontSize: 12, marginTop: 'auto',
                    }}
                  >🗑 Delete Contact</button>
                </div>
              )}
            </div>

            {/* ── Input bar ── */}
            <div style={{
              padding: '10px 16px', background: '#111827',
              borderTop: '1px solid #1e293b',
              display: 'flex', gap: 10, alignItems: 'flex-end',
            }}>
              <div style={{
                flex: 1, background: '#0d1117', border: '1px solid #1e293b',
                borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'flex-end',
                minHeight: 44,
              }}>
                <input
                  ref={inputRef}
                  value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
                  }}
                  placeholder={`Message ${activeContact.name}…`}
                  style={{
                    flex: 1, background: 'transparent', border: 'none',
                    color: '#e2e8f0', fontSize: 14, outline: 'none',
                    fontFamily: '"Inter", system-ui, sans-serif',
                  }}
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={sending || !msgInput.trim()}
                style={{
                  width: 44, height: 44, borderRadius: 12, border: 'none',
                  background: msgInput.trim()
                    ? 'linear-gradient(135deg,#4f46e5,#7c3aed)'
                    : '#1e293b',
                  cursor: msgInput.trim() ? 'pointer' : 'default',
                  color: '#fff', fontSize: 17, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s', flexShrink: 0,
                  boxShadow: msgInput.trim() ? '0 4px 14px rgba(79,70,229,.4)' : 'none',
                  transform: msgInput.trim() ? 'scale(1)' : 'scale(0.95)',
                }}
                title="Send message (Enter)"
              >
                {sending ? '⟳' : '➤'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ══ ADD CONTACT MODAL ═════════════════════════════════════════ */}
      {showAdd && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, backdropFilter: 'blur(4px)',
          }}
          onClick={e => { if (e.target === e.currentTarget) { setShowAdd(false); setAddError('') } }}
        >
          <div style={{
            background: '#111827', borderRadius: 16, padding: 28, width: 400, maxWidth: '90vw',
            border: '1px solid #1e293b',
            boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>💬</div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>New Conversation</h3>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>Add a contact to start chatting</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
                  Contact Name <span style={{ color: '#475569', fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  placeholder="e.g. John Smith"
                  style={{
                    width: '100%', background: '#0d1117', border: '1px solid #1e293b',
                    borderRadius: 8, padding: '10px 14px', color: '#e2e8f0',
                    fontSize: 14, boxSizing: 'border-box', outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
                  Phone Number <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  value={addPhone}
                  onChange={e => setAddPhone(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addContact() }}
                  placeholder="+1 234 567 8900"
                  autoFocus
                  style={{
                    width: '100%', background: '#0d1117', border: '1px solid #1e293b',
                    borderRadius: 8, padding: '10px 14px', color: '#e2e8f0',
                    fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'monospace',
                  }}
                />
                <p style={{ margin: '5px 0 0', fontSize: 11, color: '#475569' }}>
                  Include country code (e.g. +1 for US, +44 for UK)
                </p>
              </div>

              {addError && (
                <div style={{
                  background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
                  color: '#f87171', padding: '9px 13px', borderRadius: 8, fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span>⚠</span> {addError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  onClick={() => { setShowAdd(false); setAddError('') }}
                  style={{
                    flex: 1, background: '#1e293b', color: '#94a3b8', border: '1px solid #334155',
                    borderRadius: 9, padding: 11, cursor: 'pointer', fontWeight: 600, fontSize: 14,
                  }}
                >Cancel</button>
                <button
                  onClick={addContact}
                  disabled={addingContact || !addPhone.trim()}
                  style={{
                    flex: 2, background: addPhone.trim()
                      ? 'linear-gradient(135deg,#4f46e5,#7c3aed)'
                      : '#1e293b',
                    color: '#fff', border: 'none', borderRadius: 9, padding: 11,
                    cursor: addPhone.trim() ? 'pointer' : 'default',
                    fontWeight: 700, fontSize: 14,
                    opacity: addingContact ? 0.7 : 1,
                    transition: 'all .2s',
                  }}
                >
                  {addingContact ? '⟳ Adding…' : '💬 Start Chat'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
