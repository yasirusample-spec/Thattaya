'use client'
import { useState, useEffect, useRef } from 'react'

const FB_BLUE = '#1877F2'
const FB_BG = '#E7F0FD'

const DEMO_ACCOUNTS = [
  { id: 1, name: 'Death Legion OTP #1', phone: '+1 (555) 234-5678', status: 'active', msgs: 312, otp: 47, avatar: 'DL', verified: true },
  { id: 2, name: 'Death Legion OTP #2', phone: '+1 (555) 876-5432', status: 'active', msgs: 198, otp: 31, avatar: 'D2', verified: true },
  { id: 3, name: 'Reserve Account', phone: '+44 7700 900123', status: 'cooldown', msgs: 54, otp: 8, avatar: 'RA', verified: false },
]

const DEMO_MESSAGES = [
  { id: 1, from: 'Facebook Security', text: 'Your Facebook confirmation code is: 847291. Don\'t share this with anyone.', time: '2m ago', otp: '847291', type: 'otp' },
  { id: 2, from: 'Meta Platforms', text: 'Your login code is 293847. This code expires in 10 minutes.', time: '18m ago', otp: '293847', type: 'otp' },
  { id: 3, from: 'Facebook', text: 'Someone tried to log in to your account from a new device. Use code 118473.', time: '45m ago', otp: '118473', type: 'security' },
  { id: 4, from: 'Meta AI', text: 'Welcome to Meta AI! Your verification code is 556321.', time: '1h ago', otp: '556321', type: 'otp' },
  { id: 5, from: 'Instagram (Meta)', text: 'Your Instagram confirmation code is 772890.', time: '2h ago', otp: '772890', type: 'otp' },
  { id: 6, from: 'Facebook Ads', text: 'Your ad account verification code: 334512. Valid for 30 mins.', time: '3h ago', otp: '334512', type: 'ads' },
]

const AUTO_STEPS = [
  'Initializing autonomous account creation engine…',
  'Generating realistic profile identity…',
  'Setting up residential proxy (US-NY)…',
  'Launching stealth browser session…',
  'Navigating to facebook.com/r/signup…',
  'Filling registration form with generated data…',
  'Solving CAPTCHA challenge (AI vision)…',
  'Requesting phone verification SMS…',
  'Waiting for OTP from iVASMS pool…',
  'OTP received: 483920 — submitting…',
  'Verification successful ✓',
  'Completing profile setup…',
  'Account created successfully! ✓',
]

export default function FacebookPage() {
  const [tab, setTab] = useState<'messages'|'accounts'|'create'|'campaigns'>('messages')
  const [messages, setMessages] = useState(DEMO_MESSAGES)
  const [accounts, setAccounts] = useState(DEMO_ACCOUNTS)
  const [creating, setCreating] = useState(false)
  const [createStep, setCreateStep] = useState(-1)
  const [createLog, setCreateLog] = useState<string[]>([])
  const [copied, setCopied] = useState<string|null>(null)
  const [autoOtp, setAutoOtp] = useState(true)
  const [newMsgCount, setNewMsgCount] = useState(0)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setInterval(() => {
      setNewMsgCount(n => n + 1)
    }, 15000)
    return () => clearInterval(t)
  }, [])

  const copyOtp = (otp: string) => {
    navigator.clipboard.writeText(otp).catch(() => {})
    setCopied(otp)
    setTimeout(() => setCopied(null), 2000)
  }

  const startCreate = async () => {
    setCreating(true)
    setCreateStep(0)
    setCreateLog([])
    for (let i = 0; i < AUTO_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, 700 + Math.random() * 600))
      setCreateStep(i)
      setCreateLog(prev => [...prev, AUTO_STEPS[i]])
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
    }
    await new Promise(r => setTimeout(r, 800))
    setAccounts(prev => [...prev, {
      id: Date.now(), name: `Auto Account #${prev.length + 1}`,
      phone: `+1 (${Math.floor(Math.random()*900)+100}) ${Math.floor(Math.random()*900)+100}-${Math.floor(Math.random()*9000)+1000}`,
      status: 'active', msgs: 0, otp: 0, avatar: 'A' + prev.length, verified: true
    }])
    setCreating(false)
    setTab('accounts')
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: FB_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="bi bi-facebook" style={{ color: FB_BLUE, fontSize: '1.6rem' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>Facebook / Meta</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>{accounts.filter(a=>a.status==='active').length} active accounts · {messages.length} messages · Auto-OTP {autoOtp ? 'ON' : 'OFF'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#64748b', cursor: 'pointer' }}>
            <input type="checkbox" checked={autoOtp} onChange={e => setAutoOtp(e.target.checked)} />
            Auto-capture OTP
          </label>
          <button onClick={() => setTab('create')} style={{ background: FB_BLUE, color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="bi bi-plus-lg" /> Create Account
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Accounts', value: accounts.length, icon: 'bi-people-fill', color: FB_BLUE },
          { label: 'Total Messages', value: messages.length + newMsgCount, icon: 'bi-chat-fill', color: '#10b981' },
          { label: 'OTPs Captured', value: accounts.reduce((s,a)=>s+a.otp,0), icon: 'bi-shield-check', color: '#f59e0b' },
          { label: 'Active Today', value: accounts.filter(a=>a.status==='active').length, icon: 'bi-circle-fill', color: '#22c55e' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ width: '38px', height: '38px', borderRadius: '9px', background: s.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`bi ${s.icon}`} style={{ color: s.color }} />
            </span>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>{s.value}</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '10px', padding: '4px', marginBottom: '20px', width: 'fit-content' }}>
        {(['messages','accounts','create','campaigns'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '7px 18px', borderRadius: '7px', border: 'none', fontWeight: 500, fontSize: '0.85rem', cursor: 'pointer', transition: 'all .2s',
              background: tab === t ? '#fff' : 'transparent',
              color: tab === t ? FB_BLUE : '#64748b',
              boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Messages Tab */}
      {tab === 'messages' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {newMsgCount > 0 && (
            <div style={{ background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '10px', padding: '10px 16px', color: '#1d4ed8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="bi bi-bell-fill" /> {newMsgCount} new message{newMsgCount>1?'s':''} received
              <button onClick={() => setNewMsgCount(0)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8', fontWeight: 600 }}>Dismiss</button>
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: FB_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="bi bi-facebook" style={{ color: FB_BLUE, fontSize: '1.1rem' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1e293b' }}>{m.from}</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{m.time}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.5 }}>{m.text}</div>
                {m.otp && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                    <span style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px', padding: '4px 14px', fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1rem', color: '#92400e', letterSpacing: '3px' }}>{m.otp}</span>
                    <button onClick={() => copyOtp(m.otp!)} style={{ background: copied===m.otp?'#dcfce7':'#f1f5f9', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '0.78rem', cursor: 'pointer', color: copied===m.otp?'#16a34a':'#475569', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className={`bi ${copied===m.otp?'bi-check-lg':'bi-clipboard'}`} />
                      {copied===m.otp?'Copied!':'Copy OTP'}
                    </button>
                    <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', background: m.type==='security'?'#fee2e2':'#dcfce7', color: m.type==='security'?'#dc2626':'#16a34a', fontWeight: 600 }}>
                      {m.type === 'security' ? 'SECURITY' : m.type === 'ads' ? 'ADS' : 'OTP'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Accounts Tab */}
      {tab === 'accounts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {accounts.map(a => (
            <div key={a.id} style={{ background: '#fff', borderRadius: '12px', padding: '18px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: FB_BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
                {a.avatar}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{a.name}</span>
                  {a.verified && <i className="bi bi-patch-check-fill" style={{ color: FB_BLUE, fontSize: '0.9rem' }} />}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>{a.phone}</div>
              </div>
              <div style={{ display: 'flex', gap: '20px', flexShrink: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>{a.msgs}</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Messages</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, color: '#f59e0b' }}>{a.otp}</div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>OTPs</div>
                </div>
              </div>
              <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                background: a.status==='active'?'#dcfce7':a.status==='cooldown'?'#fef9c3':'#f1f5f9',
                color: a.status==='active'?'#16a34a':a.status==='cooldown'?'#854d0e':'#94a3b8' }}>
                {a.status === 'active' ? '● Active' : a.status === 'cooldown' ? '◐ Cooldown' : '○ Inactive'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Create Tab */}
      {tab === 'create' && (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '28px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: '1.1rem', fontWeight: 700 }}>
            <i className="bi bi-robot" style={{ marginRight: '8px', color: FB_BLUE }} />
            Autonomous Facebook Account Creation
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '24px' }}>
            AI-powered account creation using real device fingerprints, residential proxies, and iVASMS OTP pool.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Identity', value: 'AI-generated (US)', icon: 'bi-person-badge' },
              { label: 'Proxy', value: 'US Residential', icon: 'bi-globe' },
              { label: 'OTP Source', value: 'iVASMS Pool', icon: 'bi-phone' },
              { label: 'Browser', value: 'Stealth Chrome 120', icon: 'bi-window' },
            ].map(c => (
              <div key={c.label} style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '4px' }}><i className={`bi ${c.icon}`} style={{ marginRight: '4px' }} />{c.label}</div>
                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{c.value}</div>
              </div>
            ))}
          </div>
          {!creating ? (
            <button onClick={startCreate} style={{ background: FB_BLUE, color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 28px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="bi bi-play-fill" /> Start Autonomous Creation
            </button>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#1e293b', fontWeight: 600 }}>
                <i className="bi bi-cpu spin" style={{ color: FB_BLUE }} /> Running… Step {createStep + 1} of {AUTO_STEPS.length}
              </div>
              <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '99px', marginBottom: '14px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${((createStep + 1) / AUTO_STEPS.length) * 100}%`, background: FB_BLUE, borderRadius: '99px', transition: 'width .5s' }} />
              </div>
              <div ref={logRef} style={{ background: '#0f172a', borderRadius: '10px', padding: '16px', maxHeight: '200px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.7 }}>
                {createLog.map((l, i) => (
                  <div key={i}>
                    <span style={{ color: '#22c55e' }}>{'>'}</span> {l}
                    {i === createLog.length - 1 && <span className="spin" style={{ display: 'inline-block', marginLeft: '4px' }}>▋</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Campaigns Tab */}
      {tab === 'campaigns' && (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', color: '#1e293b', fontWeight: 700 }}>Facebook Campaigns</h3>
          {[
            { name: 'OTP Verification Campaign', status: 'active', sent: 1240, delivered: 1198, read: 876, date: '2025-01-08' },
            { name: 'Account Recovery Broadcast', status: 'completed', sent: 560, delivered: 541, read: 423, date: '2025-01-07' },
            { name: 'Bulk Verify US Numbers', status: 'scheduled', sent: 0, delivered: 0, read: 0, date: '2025-01-10' },
          ].map((c, i) => (
            <div key={i} style={{ padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>{c.name}</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{c.date}</div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                {[['Sent', c.sent,'#6366f1'],['Delivered', c.delivered,'#10b981'],['Read', c.read,'#f59e0b']].map(([l,v,col]) => (
                  <div key={l as string} style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, color: col as string }}>{(v as number).toLocaleString()}</div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{l}</div>
                  </div>
                ))}
              </div>
              <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600,
                background: c.status==='active'?'#dcfce7':c.status==='completed'?'#f1f5f9':'#fef9c3',
                color: c.status==='active'?'#16a34a':c.status==='completed'?'#64748b':'#854d0e' }}>
                {c.status}
              </span>
            </div>
          ))}
          <button style={{ background: FB_BLUE, color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 600, cursor: 'pointer', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="bi bi-plus-lg" /> New Campaign
          </button>
        </div>
      )}
    </div>
  )
}
