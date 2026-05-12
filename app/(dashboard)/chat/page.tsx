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
}

export default function ChatPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [activeContact, setActiveContact] = useState<Contact | null>(null)
  const [thread, setThread] = useState<Message[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [msgInput, setMsgInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showAddContact, setShowAddContact] = useState(false)
  const [addName, setAddName] = useState('')
  const [addPhone, setAddPhone] = useState('')
  const [addingContact, setAddingContact] = useState(false)
  const [addError, setAddError] = useState('')
  const [search, setSearch] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadContacts = useCallback(async () => {
    try {
      const r = await fetch('/api/whatsapp/contacts')
      if (r.ok) {
        const d = await r.json()
        setContacts(Array.isArray(d.contacts) ? d.contacts : [])
      }
    } catch {}
    setLoading(false)
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

  useEffect(() => { loadContacts() }, [loadContacts])

  // Poll thread every 3s
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (activeContact) {
      pollRef.current = setInterval(() => loadThread(activeContact.phone), 3000)
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
    setContacts(prev => prev.map(x => x.id === c.id ? { ...x, unread: 0 } : x))
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const sendMessage = async () => {
    if (!msgInput.trim() || !activeContact || sending) return
    setSending(true)
    const body = msgInput.trim()
    setMsgInput('')
    const optimistic: Message = {
      id: 'opt-' + Date.now(),
      from: 'me',
      to: activeContact.phone,
      body,
      sent_at: new Date().toISOString(),
      status: 'sending',
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
          setThread(prev => prev.map(m => m.id === optimistic.id ? d.message : m))
        }
        setContacts(prev => prev.map(x =>
          x.id === activeContact!.id
            ? { ...x, lastMessage: body.slice(0, 80), lastMessageAt: new Date().toISOString() }
            : x
        ))
      }
    } catch {
      setThread(prev => prev.filter(m => m.id !== optimistic.id))
    }
    setSending(false)
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
        openContact(d.contact)
      } else {
        setAddError(d.error || 'Failed to add contact')
      }
    } catch {
      setAddError('Network error')
    }
    setAddingContact(false)
  }

  const deleteContact = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Remove this contact?')) return
    await fetch(`/api/whatsapp/contacts/${id}`, { method: 'DELETE' })
    setContacts(prev => prev.filter(c => c.id !== id))
    if (activeContact?.id === id) setActiveContact(null)
  }

  const fmtTime = (iso: string | null | undefined) => {
    if (!iso) return ''
    const d = new Date(iso)
    const diff = Date.now() - d.getTime()
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const fmtFull = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const colorFor = (name: string) => {
    const colors = ['#7C3AED','#2563EB','#059669','#DC2626','#D97706','#0891B2','#BE185D','#4F46E5']
    let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % colors.length
    return colors[h]
  }

  const filtered = contacts.filter(c =>
    search === '' ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  // Group messages by date
  const groupedThread = thread.reduce<{ date: string; messages: Message[] }[]>((acc, msg) => {
    const date = new Date(msg.sent_at).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
    const last = acc[acc.length - 1]
    if (last && last.date === date) { last.messages.push(msg) }
    else acc.push({ date, messages: [msg] })
    return acc
  }, [])

  return (
    <div style={{
      display: 'flex', height: '100%', background: '#0f172a', color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* ── LEFT SIDEBAR ── */}
      <div style={{
        width: 320, display: 'flex', flexDirection: 'column',
        background: '#1e293b', borderRight: '1px solid #334155',
      }}>
        {/* Header */}
        <div style={{ padding: '16px', background: '#1e293b', borderBottom: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>💬</span>
              <span style={{ fontWeight: 700, fontSize: 17 }}>DL Chat</span>
            </div>
            <button onClick={() => setShowAddContact(true)} style={{
              background: '#6366f1', color: '#fff', border: 'none', borderRadius: 20,
              padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 12,
            }}>+ New Chat</button>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search contacts…"
            style={{
              width: '100%', background: '#0f172a', border: '1px solid #334155',
              borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 13,
              boxSizing: 'border-box', outline: 'none',
            }}
          />
        </div>

        {/* Contact list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
              {contacts.length === 0 ? (
                <>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>💬</div>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>No conversations</div>
                  <div style={{ fontSize: 12 }}>Start a new chat by adding a contact</div>
                  <button onClick={() => setShowAddContact(true)} style={{
                    marginTop: 14, background: '#6366f1', color: '#fff', border: 'none',
                    borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                  }}>+ Start Chat</button>
                </>
              ) : (
                <div>No contacts match "{search}"</div>
              )}
            </div>
          ) : (
            filtered.map(c => (
              <div key={c.id} onClick={() => openContact(c)} style={{
                display: 'flex', alignItems: 'center', padding: '11px 14px',
                cursor: 'pointer', borderBottom: '1px solid #1e293b',
                background: activeContact?.id === c.id ? '#334155' : 'transparent',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => { if (activeContact?.id !== c.id) (e.currentTarget as HTMLDivElement).style.background = '#263548' }}
                onMouseLeave={e => { if (activeContact?.id !== c.id) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
              >
                {/* Avatar */}
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0, marginRight: 11,
                  background: colorFor(c.name), display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontWeight: 700, fontSize: 15, color: '#fff',
                }}>{initials(c.name)}</div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    <span style={{ fontSize: 11, color: '#64748b', flexShrink: 0, marginLeft: 8 }}>{fmtTime(c.lastMessageAt)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.lastMessage || c.phone}
                    </span>
                    {c.unread > 0 && (
                      <span style={{
                        background: '#6366f1', color: '#fff', borderRadius: 10,
                        padding: '1px 6px', fontSize: 11, fontWeight: 700, flexShrink: 0, marginLeft: 4,
                      }}>{c.unread}</span>
                    )}
                  </div>
                </div>

                <button onClick={e => deleteContact(c.id, e)} style={{
                  background: 'transparent', border: 'none', color: '#475569',
                  cursor: 'pointer', padding: '4px 6px', fontSize: 14, flexShrink: 0, marginLeft: 4,
                  opacity: 0.6,
                }} title="Remove">✕</button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT CHAT PANEL ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0f172a', position: 'relative' }}>
        {!activeContact ? (
          /* Empty state */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <div style={{ fontSize: 80, marginBottom: 20, filter: 'grayscale(0.3)' }}>💬</div>
            <h2 style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 700, color: '#94a3b8' }}>DL Chat</h2>
            <p style={{ margin: '0 0 24px', fontSize: 14, textAlign: 'center', maxWidth: 320, lineHeight: 1.7 }}>
              Select a conversation from the left,<br />or start a new chat.
            </p>
            <button onClick={() => setShowAddContact(true)} style={{
              background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10,
              padding: '12px 24px', cursor: 'pointer', fontWeight: 700, fontSize: 15,
            }}>+ Start New Chat</button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={{
              padding: '12px 20px', background: '#1e293b', borderBottom: '1px solid #334155',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: colorFor(activeContact.name),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>{initials(activeContact.name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{activeContact.name}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{activeContact.phone}</div>
              </div>
              <button onClick={() => setActiveContact(null)} style={{
                background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20,
              }}>✕</button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 48px', display: 'flex', flexDirection: 'column' }}>
              {loadingThread ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: 60 }}>Loading messages…</div>
              ) : thread.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', marginTop: 80 }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>No messages yet</div>
                  <div style={{ fontSize: 13 }}>Send the first message to start the conversation</div>
                </div>
              ) : (
                groupedThread.map(group => (
                  <div key={group.date}>
                    {/* Date separator */}
                    <div style={{ textAlign: 'center', margin: '16px 0 12px', position: 'relative' }}>
                      <span style={{
                        background: '#1e293b', padding: '4px 14px', borderRadius: 20,
                        fontSize: 11, color: '#64748b', border: '1px solid #334155',
                      }}>{group.date}</span>
                    </div>

                    {group.messages.map(msg => {
                      const isMe = msg.from === 'me'
                      const sending = msg.status === 'sending'
                      return (
                        <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 4 }}>
                          {!isMe && (
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', background: colorFor(activeContact.name),
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0, marginRight: 8, alignSelf: 'flex-end',
                            }}>{initials(activeContact.name)}</div>
                          )}
                          <div style={{ maxWidth: '62%' }}>
                            <div style={{
                              padding: '10px 14px',
                              background: isMe ? '#4f46e5' : '#1e293b',
                              borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                              color: '#f1f5f9', fontSize: 14, lineHeight: 1.5,
                              opacity: sending ? 0.6 : 1,
                              border: isMe ? 'none' : '1px solid #334155',
                            }}>
                              <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{msg.body}</div>
                            </div>
                            <div style={{ fontSize: 10, color: '#475569', textAlign: isMe ? 'right' : 'left', marginTop: 3, paddingInline: 2 }}>
                              {sending ? 'Sending…' : fmtFull(msg.sent_at)}
                              {isMe && !sending && (
                                <span style={{ marginLeft: 4, color: msg.status === 'read' ? '#818cf8' : '#64748b' }}>
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

            {/* Input bar */}
            <div style={{
              padding: '12px 20px', background: '#1e293b', borderTop: '1px solid #334155',
              display: 'flex', gap: 10, alignItems: 'flex-end',
            }}>
              <input
                ref={inputRef}
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder={`Message ${activeContact.name}…`}
                style={{
                  flex: 1, background: '#0f172a', border: '1px solid #334155', borderRadius: 12,
                  padding: '10px 16px', color: '#e2e8f0', fontSize: 14, outline: 'none',
                  resize: 'none',
                }}
              />
              <button
                onClick={sendMessage}
                disabled={sending || !msgInput.trim()}
                style={{
                  background: msgInput.trim() ? '#6366f1' : '#334155',
                  border: 'none', borderRadius: 12, width: 44, height: 44,
                  cursor: msgInput.trim() ? 'pointer' : 'default',
                  fontSize: 18, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s', flexShrink: 0,
                }}
              >➤</button>
            </div>
          </>
        )}
      </div>

      {/* ── ADD CONTACT MODAL ── */}
      {showAddContact && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }} onClick={e => { if (e.target === e.currentTarget) { setShowAddContact(false); setAddError('') } }}>
          <div style={{
            background: '#1e293b', borderRadius: 14, padding: 28, width: 380,
            border: '1px solid #334155', boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
          }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>💬 New Chat</h3>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94a3b8' }}>Contact Name (optional)</label>
              <input
                value={addName} onChange={e => setAddName(e.target.value)}
                placeholder="e.g. John Smith"
                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#94a3b8' }}>Phone Number *</label>
              <input
                value={addPhone} onChange={e => setAddPhone(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addContact() }}
                placeholder="+1234567890 (with country code)"
                autoFocus
                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            {addError && (
              <div style={{ marginBottom: 14, color: '#f87171', fontSize: 13, background: '#f8717122', padding: '8px 12px', borderRadius: 6 }}>
                {addError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowAddContact(false); setAddError('') }} style={{
                flex: 1, background: '#334155', color: '#e2e8f0', border: 'none',
                borderRadius: 8, padding: 11, cursor: 'pointer', fontWeight: 600,
              }}>Cancel</button>
              <button onClick={addContact} disabled={addingContact} style={{
                flex: 1, background: '#6366f1', color: '#fff', border: 'none',
                borderRadius: 8, padding: 11, cursor: 'pointer', fontWeight: 700,
                opacity: addingContact ? 0.7 : 1,
              }}>{addingContact ? 'Adding…' : 'Start Chat'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
