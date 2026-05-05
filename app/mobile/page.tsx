'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

type Screen = 'connect' | 'chats' | 'chat'

export default function MobilePage() {
  const [screen, setScreen] = useState<Screen>('connect')
  const [token, setToken] = useState('')
  const [user, setUser] = useState<any>(null)
  const [chats, setChats] = useState<any[]>([])
  const [activeChat, setActiveChat] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
    const saved = localStorage.getItem('dlchat_token')
    if (saved) {
      setToken(saved)
      connectWithToken(saved)
    }
  }, [])

  const connectWithToken = useCallback(async (t: string) => {
    setConnecting(true)
    setError('')
    try {
      const r = await fetch(`/api/mobile/token?token=${t}`)
      const d = await r.json()
      if (r.ok && d.ok) {
        setUser(d.user)
        localStorage.setItem('dlchat_token', t)
        setScreen('chats')
        fetchChats(t)
      } else {
        setError(d.error || 'Invalid token')
        localStorage.removeItem('dlchat_token')
      }
    } catch {
      setError('Connection failed. Check your network.')
    }
    setConnecting(false)
  }, [])

  const fetchChats = async (t: string) => {
    try {
      const r = await fetch(`/api/whatsapp/chats?token=${t}`)
      if (r.ok) {
        const d = await r.json()
        setChats(d.chats || [])
      }
    } catch {}
  }

  const fetchMessages = async (chatId: string) => {
    try {
      const t = localStorage.getItem('dlchat_token') || token
      const r = await fetch(`/api/whatsapp/messages?token=${t}&chatId=${chatId}`)
      if (r.ok) {
        const d = await r.json()
        setMessages(d.messages || [])
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
    } catch {}
  }

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault()
    if (token.trim()) connectWithToken(token.trim())
  }

  const openChat = (chat: any) => {
    setActiveChat(chat)
    setScreen('chat')
    fetchMessages(chat.id)
  }

  const sendMessage = async () => {
    if (!input.trim() || !activeChat) return
    const text = input.trim()
    setInput('')
    const t = localStorage.getItem('dlchat_token') || token
    setMessages(prev => [...prev, {
      id: `local_${Date.now()}`, body: text, sender: 'me',
      received_at: new Date().toISOString(), sent: true,
    }])
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    try {
      await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: activeChat.id, text, token: t }),
      })
    } catch {}
  }

  const disconnect = () => {
    localStorage.removeItem('dlchat_token')
    setUser(null); setChats([]); setMessages([]); setToken('')
    setScreen('connect')
  }

  const avatarColor = (name: string) => {
    const colors = ['#e50914', '#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4', '#795548']
    return colors[name.charCodeAt(0) % colors.length]
  }

  const formatTime = (t: string) => {
    try { return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
  }

  const filteredChats = chats.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  )

  // Screen 1: Connect
  if (screen === 'connect') {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{
              width: 72, height: 72, background: 'var(--accent)', borderRadius: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
              margin: '0 auto 16px', boxShadow: '0 0 24px rgba(229,9,20,.4)',
            }}>💀</div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', marginBottom: 6 }}>DLChat</h1>
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>Chat via your iVASMS WhatsApp</p>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13,
              background: 'rgba(229,9,20,.1)', border: '1px solid rgba(229,9,20,.3)', color: 'var(--accent)',
            }}>{error}</div>
          )}

          <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>ENTER TOKEN</label>
              <input
                type="text" value={token} placeholder="dl_xxxxxxxxxxxxxxxx"
                onChange={e => setToken(e.target.value)} required
                style={{ fontFamily: 'monospace', fontSize: 13, letterSpacing: 1 }}
              />
            </div>
            <button type="submit" disabled={connecting} style={{
              padding: '14px', borderRadius: 10, fontSize: 15, fontWeight: 700,
              background: 'var(--accent)', color: '#fff', border: 'none', cursor: connecting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(229,9,20,.4)', transition: 'all .2s',
            }}>
              {connecting ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Connecting...</> : '🔐 Connect'}
            </button>
          </form>

          <div style={{ marginTop: 24, padding: '14px', background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, marginBottom: 8 }}>📱 How to get your token:</div>
            <ol style={{ fontSize: 12, color: 'var(--text3)', paddingLeft: 16, lineHeight: 1.8 }}>
              <li>Open DL SMS dashboard</li>
              <li>Go to Settings → DLChat Mobile App</li>
              <li>Copy your token or scan the QR code</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  // Screen 2: Chat List
  if (screen === 'chats') {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column',
        fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 480, margin: '0 auto',
      }}>
        {/* Header */}
        <div style={{
          background: 'var(--card)', borderBottom: '1px solid var(--border)',
          padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💀</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>DLChat</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="dot dot-green" style={{ width: 6, height: 6, animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 10, color: 'var(--green)' }}>Online</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>{user?.name}</span>
            <button onClick={disconnect} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16 }}>🚪</button>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 16px', background: 'var(--bg2)' }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search conversations..."
            style={{ fontSize: 13 }}
          />
        </div>

        {/* Chat list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredChats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text3)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
              <p style={{ fontSize: 14 }}>No conversations yet</p>
              <p style={{ fontSize: 12, marginTop: 6 }}>SMS messages will appear here as chats</p>
              {!user?.has_whatsapp && (
                <p style={{ fontSize: 12, marginTop: 8, color: 'var(--accent)' }}>
                  Connect WhatsApp first at /whatsapp
                </p>
              )}
            </div>
          ) : (
            filteredChats.map(chat => (
              <div key={chat.id} onClick={() => openChat(chat)} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderBottom: '1px solid rgba(30,30,46,.5)',
                cursor: 'pointer', transition: 'background .15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: avatarColor(chat.name || '?'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 17,
                }}>
                  {(chat.name || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{chat.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{formatTime(chat.time)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 230 }}>
                      {chat.lastMessage}
                    </span>
                    {chat.unread > 0 && (
                      <span style={{
                        minWidth: 18, height: 18, borderRadius: '50%', background: 'var(--accent)',
                        color: '#fff', fontSize: 10, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0,
                      }}>{chat.unread}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom nav */}
        <div style={{
          display: 'flex', borderTop: '1px solid var(--border)',
          background: 'var(--card)', position: 'sticky', bottom: 0,
        }}>
          {[
            { icon: '💬', label: 'Chats', active: true },
            { icon: '📞', label: 'Calls', active: false },
            { icon: '●', label: 'Status', active: false },
            { icon: '⚙️', label: 'Settings', active: false },
          ].map(item => (
            <div key={item.label} style={{
              flex: 1, padding: '10px 0', textAlign: 'center', cursor: 'pointer',
              borderTop: item.active ? '2px solid var(--accent)' : '2px solid transparent',
            }}>
              <div style={{ fontSize: 18 }}>{item.icon}</div>
              <div style={{ fontSize: 10, color: item.active ? 'var(--accent)' : 'var(--text3)', marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Screen 3: Chat Window
  return (
    <div style={{
      height: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column',
      fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 480, margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--card)', borderBottom: '1px solid var(--border)',
        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
        position: 'sticky', top: 0,
      }}>
        <button onClick={() => setScreen('chats')} style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>
          ←
        </button>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: avatarColor(activeChat?.name || '?'),
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15,
        }}>
          {(activeChat?.name || '?')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{activeChat?.name}</div>
          <div style={{ fontSize: 11, color: activeChat?.online ? 'var(--green)' : 'var(--text3)' }}>
            {activeChat?.online ? '● online' : activeChat?.phone}
          </div>
        </div>
        <button style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18 }}>⋮</button>
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text3)', fontSize: 13 }}>
            No messages yet
          </div>
        ) : (
          messages.map((msg: any) => (
            <div key={msg.id} style={{
              display: 'flex',
              justifyContent: msg.sent ? 'flex-end' : 'flex-start',
            }}>
              <div className={msg.sent ? 'chat-bubble-sent' : 'chat-bubble-received'}>
                <div style={{ fontSize: 13, lineHeight: 1.4 }}>{msg.body}</div>
                <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                  {formatTime(msg.received_at)}
                  {msg.sent && <span style={{ fontSize: 11 }}>✓✓</span>}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div style={{
        padding: '8px 10px', background: 'var(--card)', borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8,
        position: 'sticky', bottom: 0,
      }}>
        <button style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 20, flexShrink: 0 }}>😊</button>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          placeholder="Message..." style={{ flex: 1, borderRadius: 20, padding: '10px 14px', fontSize: 13, margin: 0 }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
        />
        <button style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 20, flexShrink: 0 }}>📎</button>
        <button
          onClick={sendMessage} disabled={!input.trim()}
          style={{
            width: 40, height: 40, borderRadius: '50%', background: input.trim() ? 'var(--accent)' : 'var(--bg2)',
            border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            color: input.trim() ? '#fff' : 'var(--text3)', flexShrink: 0, transition: 'all .2s',
          }}>
          ➤
        </button>
      </div>
    </div>
  )
}
