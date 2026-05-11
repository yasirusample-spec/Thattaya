'use client'
import { useState, useEffect, useRef } from 'react'

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', icon: 'bi-facebook', color: '#1877F2', bg: '#E7F0FD' },
  { id: 'instagram', name: 'Instagram', icon: 'bi-instagram', color: '#E1306C', bg: '#FDE8F0' },
  { id: 'twitter', name: 'Twitter / X', icon: 'bi-twitter-x', color: '#000', bg: '#F0F0F0' },
  { id: 'discord', name: 'Discord', icon: 'bi-discord', color: '#5865F2', bg: '#EEEEFF' },
  { id: 'whatsapp', name: 'WhatsApp', icon: 'bi-whatsapp', color: '#25D366', bg: '#E8FBF0' },
  { id: 'telegram-bot', name: 'Telegram', icon: 'bi-telegram', color: '#2AABEE', bg: '#E5F5FD' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'bi-linkedin', color: '#0A66C2', bg: '#E7F2FB' },
  { id: 'snapchat', name: 'Snapchat', icon: 'bi-snapchat', color: '#FFFC00', bg: '#FFFCE0' },
  { id: 'tiktok', name: 'TikTok', icon: 'bi-tiktok', color: '#fe2c55', bg: '#FFE8EE' },
  { id: 'youtube', name: 'YouTube', icon: 'bi-youtube', color: '#FF0000', bg: '#FFE8E8' },
  { id: 'reddit', name: 'Reddit', icon: 'bi-reddit', color: '#FF4500', bg: '#FFF0EA' },
  { id: 'chat', name: 'DL Chat', icon: 'bi-chat-dots-fill', color: '#6366f1', bg: '#EEEEFF' },
]

type Message = { id: number; text: string; from: 'user' | 'platform'; time: string; otp?: string }

const PLATFORM_BOTS: Record<string, Message[]> = {
  facebook: [
    { id: 1, from: 'platform', text: 'Welcome to Facebook Messenger. Your OTP for today: 847291', time: '10:23 AM', otp: '847291' },
    { id: 2, from: 'platform', text: 'Security alert: New login from Chrome/Windows. Code: 334756', time: '10:45 AM', otp: '334756' },
  ],
  instagram: [
    { id: 1, from: 'platform', text: 'Instagram DM: Your verification code is 991023', time: '09:12 AM', otp: '991023' },
  ],
  discord: [
    { id: 1, from: 'platform', text: '[Discord] Verification code: 556-712', time: '11:34 AM', otp: '556712' },
    { id: 2, from: 'platform', text: '[Discord] New login detected. Code: 228-841', time: '11:52 AM', otp: '228841' },
    { id: 3, from: 'platform', text: '[Discord Nitro] Your gift confirmation: 775-332', time: '12:08 PM', otp: '775332' },
  ],
  whatsapp: [
    { id: 1, from: 'platform', text: 'Your WhatsApp code: 738 291\nDon\'t share this code with others.', time: '08:55 AM', otp: '738291' },
    { id: 2, from: 'platform', text: 'Your WhatsApp code: 447 103', time: '09:44 AM', otp: '447103' },
  ],
  'telegram-bot': [
    { id: 1, from: 'platform', text: 'Login code: 98347\nDo not give this code to anyone.', time: '07:30 AM', otp: '98347' },
    { id: 2, from: 'platform', text: 'Confirmation code: 55891', time: '08:14 AM', otp: '55891' },
  ],
  twitter: [
    { id: 1, from: 'platform', text: '[X] Your confirmation code is: 118-847', time: '02:18 PM', otp: '118847' },
  ],
  linkedin: [],
  snapchat: [{ id: 1, from: 'platform', text: 'Your Snapchat code is: 293847', time: '01:02 PM', otp: '293847' }],
  tiktok: [{ id: 1, from: 'platform', text: '[TikTok] 847291 is your verification code, valid for 5 minutes.', time: '03:44 PM', otp: '847291' }],
  youtube: [{ id: 1, from: 'platform', text: 'Your Google verification code is 334756', time: '04:11 PM', otp: '334756' }],
  reddit: [],
  chat: [
    { id: 1, from: 'platform', text: 'Welcome to DL Chat! Your session is end-to-end encrypted.', time: '06:00 AM' },
    { id: 2, from: 'platform', text: 'New OTP received on device: 847291', time: '06:45 AM', otp: '847291' },
  ],
}

function formatTime() {
  const d = new Date()
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export default function PlatformChatPage() {
  const [activePlatform, setActivePlatform] = useState<string>('discord')
  const [conversations, setConversations] = useState<Record<string, Message[]>>(PLATFORM_BOTS)
  const [input, setInput] = useState('')
  const [copied, setCopied] = useState<string|null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const msgRef = useRef<HTMLDivElement>(null)

  const platform = PLATFORMS.find(p => p.id === activePlatform)!
  const msgs = conversations[activePlatform] || []

  useEffect(() => {
    if (msgRef.current) msgRef.current.scrollTop = msgRef.current.scrollHeight
  }, [activePlatform, msgs.length])

  const sendMessage = () => {
    if (!input.trim()) return
    const newMsg: Message = { id: Date.now(), from: 'user', text: input.trim(), time: formatTime() }
    setConversations(prev => ({ ...prev, [activePlatform]: [...(prev[activePlatform]||[]), newMsg] }))
    setInput('')
    // Simulate auto-reply
    setTimeout(() => {
      const replies: Record<string, string> = {
        facebook: 'Your message was delivered. OTP: 993812',
        discord: 'Bot received your message. Running command…',
        whatsapp: 'WhatsApp Business: Message acknowledged.',
        'telegram-bot': 'Telegram bot: command processed.',
        chat: 'DL Chat: Message received ✓',
      }
      const reply = replies[activePlatform] || 'Message delivered to platform.'
      const otp = /OTP|code/i.test(reply) ? String(Math.floor(Math.random()*900000+100000)) : undefined
      setConversations(prev => ({
        ...prev,
        [activePlatform]: [...(prev[activePlatform]||[]), { id: Date.now()+1, from: 'platform', text: reply, time: formatTime(), otp }]
      }))
    }, 1200)
  }

  const copyOtp = (otp: string) => { navigator.clipboard.writeText(otp).catch(()=>{}); setCopied(otp); setTimeout(()=>setCopied(null),2000) }

  const filteredPlatforms = PLATFORMS.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const totalUnread = Object.values(conversations).reduce((s, msgs) => s + msgs.filter(m=>m.from==='platform'&&m.otp).length, 0)

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', background: '#f8fafc', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
      {/* Sidebar */}
      <div style={{ width: '280px', background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Sidebar Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Platform Chats</h2>
            <span style={{ background: '#ef4444', color: '#fff', borderRadius: '99px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>{totalUnread} OTPs</span>
          </div>
          <div style={{ position: 'relative' }}>
            <i className="bi bi-search" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem' }} />
            <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search platforms…"
              style={{ width: '100%', padding: '8px 8px 8px 32px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }} />
          </div>
        </div>
        {/* Platform List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredPlatforms.map(p => {
            const pMsgs = conversations[p.id] || []
            const lastMsg = pMsgs[pMsgs.length - 1]
            const unread = pMsgs.filter(m=>m.from==='platform'&&m.otp).length
            return (
              <div key={p.id} onClick={() => setActivePlatform(p.id)}
                style={{ padding: '12px 16px', cursor: 'pointer', transition: 'background .15s', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #f8fafc',
                  background: activePlatform===p.id ? p.bg : 'transparent' }}
                onMouseEnter={e=>{if(activePlatform!==p.id)(e.currentTarget as HTMLDivElement).style.background='#f8fafc'}}
                onMouseLeave={e=>{if(activePlatform!==p.id)(e.currentTarget as HTMLDivElement).style.background='transparent'}}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`bi ${p.icon}`} style={{ color: p.color, fontSize: '1.1rem' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: activePlatform===p.id ? 700 : 500, color: '#1e293b', fontSize: '0.88rem' }}>{p.name}</span>
                    {unread > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: '99px', padding: '1px 6px', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>{unread}</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {lastMsg ? (lastMsg.otp ? `🔑 OTP: ${lastMsg.otp}` : lastMsg.text.slice(0,32)+'…') : 'No messages yet'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Chat Header */}
        <div style={{ padding: '14px 20px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: platform.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className={`bi ${platform.icon}`} style={{ color: platform.color, fontSize: '1.2rem' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>{platform.name}</div>
            <div style={{ fontSize: '0.75rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} /> Connected · Auto-OTP capture ON
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', color: '#475569', fontSize: '0.8rem' }}>
              <i className="bi bi-search" />
            </button>
            <button style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', color: '#475569', fontSize: '0.8rem' }}>
              <i className="bi bi-three-dots" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={msgRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {msgs.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '40px' }}>
              <i className={`bi ${platform.icon}`} style={{ fontSize: '3rem', color: platform.color, display: 'block', marginBottom: '12px' }} />
              <div style={{ fontWeight: 500, marginBottom: '4px' }}>No messages yet from {platform.name}</div>
              <div style={{ fontSize: '0.82rem' }}>Messages and OTPs from this platform will appear here.</div>
            </div>
          ) : msgs.map(m => (
            <div key={m.id} style={{ display: 'flex', justifyContent: m.from==='user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '8px' }}>
              {m.from==='platform' && (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: platform.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`bi ${platform.icon}`} style={{ color: platform.color, fontSize: '0.85rem' }} />
                </div>
              )}
              <div style={{ maxWidth: '65%' }}>
                <div style={{ padding: '10px 14px', borderRadius: m.from==='user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: m.from==='user' ? '#6366f1' : '#fff',
                  color: m.from==='user' ? '#fff' : '#1e293b',
                  border: m.from==='platform' ? '1px solid #e2e8f0' : 'none',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)', fontSize: '0.88rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {m.text}
                </div>
                {m.otp && m.from==='platform' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', padding: '8px 12px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '10px' }}>
                    <i className="bi bi-shield-check-fill" style={{ color: '#f59e0b' }} />
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1rem', color: '#92400e', letterSpacing: '3px' }}>{m.otp}</span>
                    <button onClick={() => copyOtp(m.otp!)}
                      style={{ marginLeft: 'auto', background: copied===m.otp?'#dcfce7':'#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer', color: copied===m.otp?'#16a34a':'#475569', fontWeight: 500 }}>
                      <i className={`bi ${copied===m.otp?'bi-check-lg':'bi-clipboard'}`} /> {copied===m.otp?'Copied!':'Copy OTP'}
                    </button>
                  </div>
                )}
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px', textAlign: m.from==='user'?'right':'left' }}>{m.time}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: '14px 20px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '9px 12px', cursor: 'pointer', color: '#475569' }}>
            <i className="bi bi-paperclip" />
          </button>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}}}
            placeholder={`Message ${platform.name}…`}
            style={{ flex: 1, padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.88rem', outline: 'none', background: '#f8fafc' }} />
          <button style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '9px 12px', cursor: 'pointer', color: '#475569' }}>
            <i className="bi bi-emoji-smile" />
          </button>
          <button onClick={sendMessage} disabled={!input.trim()}
            style={{ background: input.trim() ? '#6366f1' : '#e2e8f0', border: 'none', borderRadius: '10px', padding: '10px 18px', cursor: input.trim()?'pointer':'default', color: input.trim()?'#fff':'#94a3b8', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background .2s' }}>
            <i className="bi bi-send-fill" /> Send
          </button>
        </div>
      </div>
    </div>
  )
}
