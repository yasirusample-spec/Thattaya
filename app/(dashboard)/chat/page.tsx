'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

interface ChatMessage {
  id: string
  roomId: string
  userId: string
  userName: string
  text: string
  type: string
  otp: string | null
  created_at: string
}

interface ChatRoom {
  id: string
  name: string
  description: string
  type: string
  created_by: string
  created_at: string
  lastMessage: ChatMessage | null
  messageCount: number
}

const GENERAL_ROOM: ChatRoom = {
  id: 'general',
  name: 'General',
  description: 'Team Death Legion main channel',
  type: 'group',
  created_by: 'system',
  created_at: '2025-01-01T00:00:00Z',
  lastMessage: null,
  messageCount: 0,
}

function fmtTime(t: string) {
  try {
    const d = new Date(t)
    const now = new Date()
    const diff = (now.getTime() - d.getTime()) / 1000
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch { return '' }
}

function fmtFull(t: string) {
  try { return new Date(t).toLocaleString() } catch { return t }
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const colors = ['#e50914', '#2979ff', '#00e676', '#ff9100', '#aa00ff', '#00bcd4']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${color}, ${color}88)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize: size * 0.35,
      border: `1.5px solid ${color}44`,
    }}>{initials}</div>
  )
}

export default function ChatPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([GENERAL_ROOM])
  const [activeRoom, setActiveRoom] = useState<ChatRoom>(GENERAL_ROOM)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [me, setMe] = useState<any>(null)
  const [showNewRoom, setShowNewRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomDesc, setNewRoomDesc] = useState('')
  const [creatingRoom, setCreatingRoom] = useState(false)
  const [lastSince, setLastSince] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load current user
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user) setMe(d.user)
    }).catch(() => {})
  }, [])

  // Load rooms
  const fetchRooms = useCallback(async () => {
    try {
      const r = await fetch('/api/chat/rooms')
      if (r.ok) {
        const d = await r.json()
        const fetched: ChatRoom[] = d.rooms || []
        // Always include General room
        const hasGeneral = fetched.some(r => r.id === 'general')
        setRooms(hasGeneral ? fetched : [GENERAL_ROOM, ...fetched])
      }
    } catch {}
  }, [])

  useEffect(() => { fetchRooms() }, [fetchRooms])

  // Load messages for active room
  const fetchMessages = useCallback(async (live = false) => {
    if (!live) setLoadingMsgs(true)
    try {
      const params = new URLSearchParams({ roomId: activeRoom.id, limit: '80' })
      if (live && lastSince) params.set('since', lastSince)
      const r = await fetch(`/api/chat/messages?${params}`)
      if (r.ok) {
        const d = await r.json()
        const msgs: ChatMessage[] = d.messages || []
        if (live && lastSince) {
          if (msgs.length > 0) {
            setMessages(prev => {
              const ids = new Set(prev.map(m => m.id))
              const newMsgs = msgs.filter(m => !ids.has(m.id))
              if (newMsgs.length > 0) {
                setTimeout(scrollToBottom, 50)
                return [...prev, ...newMsgs]
              }
              return prev
            })
            setLastSince(msgs[msgs.length - 1].created_at)
          }
        } else {
          setMessages(msgs)
          if (msgs.length > 0) setLastSince(msgs[msgs.length - 1].created_at)
          setTimeout(scrollToBottom, 100)
        }
      }
    } catch {}
    if (!live) setLoadingMsgs(false)
  }, [activeRoom.id, lastSince])

  useEffect(() => {
    setMessages([])
    setLastSince('')
    fetchMessages(false)
  }, [activeRoom.id])

  // Live polling every 3 seconds
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => fetchMessages(true), 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [activeRoom.id, lastSince])

  const sendMessage = async () => {
    const msg = text.trim()
    if (!msg || sending) return
    setSending(true)
    setText('')
    try {
      const r = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: activeRoom.id, text: msg }),
      })
      if (r.ok) {
        const d = await r.json()
        setMessages(prev => [...prev, d.message])
        if (d.message.created_at) setLastSince(d.message.created_at)
        setTimeout(scrollToBottom, 50)
      }
    } catch {}
    setSending(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const createRoom = async () => {
    if (!newRoomName.trim()) return
    setCreatingRoom(true)
    try {
      const r = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoomName.trim(), description: newRoomDesc.trim() }),
      })
      if (r.ok) {
        const d = await r.json()
        setRooms(prev => [...prev, { ...d.room, lastMessage: null, messageCount: 0 }])
        setActiveRoom({ ...d.room, lastMessage: null, messageCount: 0 })
        setShowNewRoom(false)
        setNewRoomName('')
        setNewRoomDesc('')
      }
    } catch {}
    setCreatingRoom(false)
  }

  const deleteMsg = async (msgId: string) => {
    try {
      await fetch('/api/chat/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: activeRoom.id, messageId: msgId }),
      })
      setMessages(prev => prev.filter(m => m.id !== msgId))
    } catch {}
  }

  const isMe = (msg: ChatMessage) => msg.userId === me?.id

  // Group messages by date
  const groupedMessages = messages.reduce<{ date: string; msgs: ChatMessage[] }[]>((acc, msg) => {
    const date = new Date(msg.created_at).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const last = acc[acc.length - 1]
    if (last && last.date === date) { last.msgs.push(msg) }
    else acc.push({ date, msgs: [msg] })
    return acc
  }, [])

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - var(--topbar-h) - 56px)', gap: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>

      {/* ── Rooms sidebar ── */}
      <div style={{
        width: 260, flexShrink: 0,
        background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="bi bi-chat-square-dots-fill" style={{ color: 'var(--accent)', fontSize: 16 }} />
              <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>DL Chat</span>
            </div>
            <button
              className="btn-icon btn-primary btn-xs"
              onClick={() => setShowNewRoom(true)}
              title="New Room"
              style={{ width: 28, height: 28, fontSize: 16, borderRadius: 7 }}
            >
              <i className="bi bi-plus" />
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
            <span className="live-badge" style={{ fontSize: 10 }}>
              <span className="live-dot" />Live · 3s refresh
            </span>
          </div>
        </div>

        {/* Room list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {rooms.map(room => {
            const isActive = room.id === activeRoom.id
            return (
              <div
                key={room.id}
                onClick={() => setActiveRoom(room)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  background: isActive ? 'rgba(229,9,20,.1)' : 'transparent',
                  borderLeft: `3px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                  transition: 'all .15s',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.03)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: isActive ? 'rgba(229,9,20,.2)' : 'var(--bg)',
                    border: `1px solid ${isActive ? 'rgba(229,9,20,.4)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <i
                      className={`bi ${room.type === 'group' ? 'bi-people-fill' : 'bi-person-fill'}`}
                      style={{ fontSize: 16, color: isActive ? 'var(--accent)' : 'var(--text3)' }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? 'var(--accent)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {room.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {room.lastMessage ? room.lastMessage.text : room.description || 'No messages yet'}
                    </div>
                  </div>
                  {(room.messageCount || 0) > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>{room.messageCount}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* New Room Modal */}
        {showNewRoom && (
          <div className="modal-overlay" onClick={() => setShowNewRoom(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>
                  <i className="bi bi-plus-circle-fill" style={{ marginRight: 8, color: 'var(--accent)' }} />
                  New Chat Room
                </h3>
                <button className="btn-icon btn-ghost btn-xs" onClick={() => setShowNewRoom(false)}>
                  <i className="bi bi-x" style={{ fontSize: 18 }} />
                </button>
              </div>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label">Room Name</label>
                <input
                  value={newRoomName}
                  onChange={e => setNewRoomName(e.target.value)}
                  placeholder="e.g. OTP Alerts, Team Chat"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && createRoom()}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Description (optional)</label>
                <input
                  value={newRoomDesc}
                  onChange={e => setNewRoomDesc(e.target.value)}
                  placeholder="What's this room for?"
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn-ghost btn-sm" onClick={() => setShowNewRoom(false)}>Cancel</button>
                <button
                  className="btn-primary btn-sm"
                  onClick={createRoom}
                  disabled={creatingRoom || !newRoomName.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <i className="bi bi-plus" />
                  {creatingRoom ? 'Creating…' : 'Create Room'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Chat area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)', minWidth: 0 }}>

        {/* Chat header */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 14,
          background: 'var(--bg2)',
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'rgba(229,9,20,.1)', border: '1px solid rgba(229,9,20,.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className={`bi ${activeRoom.type === 'group' ? 'bi-people-fill' : 'bi-person-fill'}`} style={{ fontSize: 17, color: 'var(--accent)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{activeRoom.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
              {activeRoom.description || 'Group chat'} · {messages.length} messages
            </div>
          </div>
          <span className="live-badge">
            <span className="live-dot" />LIVE
          </span>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {loadingMsgs ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
              <i className="bi bi-arrow-repeat animate-spin" style={{ fontSize: 28, display: 'block', marginBottom: 12 }} />
              Loading messages…
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
              <i className="bi bi-chat-square-dots-fill" style={{ fontSize: 48, display: 'block', marginBottom: 16, opacity: .2 }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>No messages yet</p>
              <p style={{ fontSize: 13 }}>Be the first to say something in {activeRoom.name}!</p>
            </div>
          ) : (
            <>
              {groupedMessages.map(({ date, msgs: dayMsgs }) => (
                <div key={date}>
                  {/* Date separator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0 12px' }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{date}</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  </div>
                  {dayMsgs.map((msg, i) => {
                    const isMine = isMe(msg)
                    const prevMsg = i > 0 ? dayMsgs[i - 1] : null
                    const showAvatar = !prevMsg || prevMsg.userId !== msg.userId

                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          flexDirection: isMine ? 'row-reverse' : 'row',
                          gap: 10,
                          marginBottom: showAvatar ? 12 : 3,
                          marginTop: showAvatar && i > 0 ? 10 : 0,
                          alignItems: 'flex-end',
                        }}
                        className="chat-msg-row"
                      >
                        {/* Avatar */}
                        <div style={{ width: 32, flexShrink: 0 }}>
                          {showAvatar ? <Avatar name={msg.userName} size={32} /> : null}
                        </div>

                        {/* Bubble */}
                        <div style={{ maxWidth: '68%', display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                          {showAvatar && (
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 4, paddingLeft: isMine ? 0 : 2, paddingRight: isMine ? 2 : 0 }}>
                              {isMine ? 'You' : msg.userName}
                            </div>
                          )}
                          <div
                            style={{
                              padding: '9px 14px',
                              borderRadius: isMine ? '14px 2px 14px 14px' : '2px 14px 14px 14px',
                              background: isMine
                                ? 'linear-gradient(135deg, var(--accent), #c40812)'
                                : 'var(--card)',
                              border: isMine ? 'none' : '1px solid var(--border)',
                              color: isMine ? '#fff' : 'var(--text)',
                              fontSize: 13.5,
                              lineHeight: 1.5,
                              position: 'relative',
                              cursor: 'default',
                              boxShadow: isMine ? '0 2px 12px rgba(229,9,20,.25)' : '0 1px 4px rgba(0,0,0,.2)',
                            }}
                          >
                            {msg.otp && (
                              <div style={{
                                background: 'rgba(255,255,255,.15)',
                                borderRadius: 6, padding: '2px 8px',
                                fontFamily: 'monospace', fontWeight: 900, fontSize: 16,
                                letterSpacing: 4, marginBottom: 6, textAlign: 'center',
                              }}>
                                <i className="bi bi-key-fill" style={{ marginRight: 6, fontSize: 12 }} />
                                {msg.otp}
                              </div>
                            )}
                            <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</span>
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, paddingLeft: isMine ? 0 : 2, paddingRight: isMine ? 2 : 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span title={fmtFull(msg.created_at)}>{fmtTime(msg.created_at)}</span>
                            {isMine && (
                              <button
                                onClick={() => deleteMsg(msg.id)}
                                style={{
                                  background: 'none', border: 'none',
                                  color: 'var(--text3)', cursor: 'pointer',
                                  padding: 0, fontSize: 11, opacity: 0,
                                  transition: 'opacity .15s',
                                }}
                                className="del-btn"
                                title="Delete"
                              >
                                <i className="bi bi-trash-fill" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg2)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            {me && <Avatar name={me.name || 'User'} size={34} />}
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${activeRoom.name}… (Enter to send, Shift+Enter for newline)`}
                rows={1}
                style={{
                  resize: 'none', paddingRight: 50,
                  borderRadius: 12, minHeight: 44, maxHeight: 120,
                  lineHeight: 1.5, overflowY: 'auto',
                  scrollbarWidth: 'none',
                }}
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement
                  t.style.height = 'auto'
                  t.style.height = Math.min(t.scrollHeight, 120) + 'px'
                }}
              />
            </div>
            <button
              className="btn-primary btn-icon"
              onClick={sendMessage}
              disabled={sending || !text.trim()}
              style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0 }}
              title="Send (Enter)"
            >
              {sending
                ? <i className="bi bi-arrow-repeat animate-spin" style={{ fontSize: 16 }} />
                : <i className="bi bi-send-fill" style={{ fontSize: 15 }} />
              }
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, marginLeft: 44, display: 'flex', gap: 16 }}>
            <span><i className="bi bi-key-fill" style={{ marginRight: 4, color: 'var(--orange)' }} />OTPs auto-detected and highlighted</span>
            <span><i className="bi bi-arrow-repeat" style={{ marginRight: 4, color: 'var(--green)' }} />Live · polling every 3s</span>
          </div>
        </div>
      </div>

      <style>{`
        .chat-msg-row:hover .del-btn { opacity: 1 !important; }
        .chat-msg-row textarea::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
