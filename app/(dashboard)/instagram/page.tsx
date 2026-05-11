'use client'
import { useState, useEffect, useRef } from 'react'

const IG_COLOR = '#E1306C'
const IG_GRAD = 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)'

const DEMO_MESSAGES = [
  { id: 1, from: 'Instagram', text: 'Your Instagram confirmation code is 847291. Don\'t share it.', time: '3m ago', otp: '847291', type: 'otp' },
  { id: 2, from: 'Instagram Security', text: 'We noticed a login attempt. Your code: 334756', time: '22m ago', otp: '334756', type: 'security' },
  { id: 3, from: 'Meta (Instagram)', text: 'Your reset code is 991234. Expires in 10 minutes.', time: '1h ago', otp: '991234', type: 'reset' },
  { id: 4, from: 'Instagram', text: 'Use 553271 to confirm your number on Instagram.', time: '2h ago', otp: '553271', type: 'otp' },
  { id: 5, from: 'Instagram', text: 'Hi! Your verification code is 112847.', time: '3h ago', otp: '112847', type: 'otp' },
]

const AUTO_STEPS = [
  'Initializing Instagram account creation…',
  'Generating profile: female, age 22-28, US locale…',
  'Selecting proxy: Chicago IL residential…',
  'Launching stealth mobile session (iOS 17 UA)…',
  'Opening instagram.com/accounts/emailsignup…',
  'Filling name, email, username, password…',
  'Bypassing bot detection (mouse emulation)…',
  'Requesting phone verification…',
  'Querying iVASMS for US number…',
  'OTP received: 293847 — submitting…',
  'Phone verified ✓',
  'Uploading AI-generated profile photo…',
  'Following seed accounts for legitimacy…',
  'Account ready! ✓',
]

export default function InstagramPage() {
  const [tab, setTab] = useState<'messages'|'accounts'|'create'|'reels'>('messages')
  const [creating, setCreating] = useState(false)
  const [createStep, setCreateStep] = useState(-1)
  const [createLog, setCreateLog] = useState<string[]>([])
  const [accounts, setAccounts] = useState([
    { id: 1, handle: '@dl_otp_main', followers: 124, posts: 12, status: 'active', otp: 38 },
    { id: 2, handle: '@verify_us_01', followers: 56, posts: 7, status: 'active', otp: 19 },
    { id: 3, handle: '@reserve_ig_x', followers: 0, posts: 0, status: 'new', otp: 0 },
  ])
  const [copied, setCopied] = useState<string|null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const copyOtp = (otp: string) => {
    navigator.clipboard.writeText(otp).catch(()=>{})
    setCopied(otp)
    setTimeout(() => setCopied(null), 2000)
  }

  const startCreate = async () => {
    setCreating(true); setCreateStep(0); setCreateLog([])
    for (let i = 0; i < AUTO_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, 650 + Math.random()*550))
      setCreateStep(i)
      setCreateLog(prev => [...prev, AUTO_STEPS[i]])
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
    }
    await new Promise(r => setTimeout(r, 800))
    const n = accounts.length + 1
    setAccounts(prev => [...prev, { id: Date.now(), handle: `@auto_ig_${n}`, followers: 0, posts: 0, status: 'active', otp: 0 }])
    setCreating(false); setTab('accounts')
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: IG_GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="bi bi-instagram" style={{ color: '#fff', fontSize: '1.5rem' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>Instagram</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>{accounts.filter(a=>a.status==='active').length} active · {DEMO_MESSAGES.length} messages · OTP auto-capture enabled</p>
          </div>
        </div>
        <button onClick={() => setTab('create')} style={{ background: IG_COLOR, color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="bi bi-plus-lg" /> Create Account
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Accounts', value: accounts.length, icon: 'bi-people-fill', color: IG_COLOR },
          { label: 'Messages', value: DEMO_MESSAGES.length, icon: 'bi-chat-fill', color: '#f59e0b' },
          { label: 'OTPs Captured', value: accounts.reduce((s,a)=>s+a.otp,0), icon: 'bi-shield-check', color: '#10b981' },
          { label: 'Total Followers', value: accounts.reduce((s,a)=>s+a.followers,0), icon: 'bi-heart-fill', color: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '36px', height: '36px', borderRadius: '8px', background: s.color+'20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className={`bi ${s.icon}`} style={{ color: s.color }} />
            </span>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '10px', padding: '4px', marginBottom: '20px', width: 'fit-content' }}>
        {(['messages','accounts','create','reels'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 16px', borderRadius: '7px', border: 'none', fontWeight: 500, fontSize: '0.85rem', cursor: 'pointer',
            background: tab===t ? '#fff' : 'transparent', color: tab===t ? IG_COLOR : '#64748b', boxShadow: tab===t?'0 1px 4px rgba(0,0,0,0.08)':'none' }}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'messages' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {DEMO_MESSAGES.map(m => (
            <div key={m.id} style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: IG_GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="bi bi-instagram" style={{ color: '#fff', fontSize: '1rem' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1e293b' }}>{m.from}</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{m.time}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.5 }}>{m.text}</div>
                {m.otp && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                    <span style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px', padding: '4px 14px', fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1rem', color: '#92400e', letterSpacing: '3px' }}>{m.otp}</span>
                    <button onClick={() => copyOtp(m.otp!)} style={{ background: copied===m.otp?'#dcfce7':'#f1f5f9', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '0.78rem', cursor: 'pointer', color: copied===m.otp?'#16a34a':'#475569', fontWeight: 500 }}>
                      <i className={`bi ${copied===m.otp?'bi-check-lg':'bi-clipboard'}`} /> {copied===m.otp?'Copied!':'Copy'}
                    </button>
                    <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', background: '#fce7f3', color: IG_COLOR, fontWeight: 600 }}>{m.type.toUpperCase()}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'accounts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {accounts.map(a => (
            <div key={a.id} style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: IG_GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                {a.handle.slice(1,3).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{a.handle}</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{a.followers} followers · {a.posts} posts</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, color: '#f59e0b' }}>{a.otp}</div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>OTPs</div>
              </div>
              <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600,
                background: a.status==='active'?'#dcfce7':a.status==='new'?'#dbeafe':'#f1f5f9',
                color: a.status==='active'?'#16a34a':a.status==='new'?'#1d4ed8':'#94a3b8' }}>
                {a.status==='active'?'● Active':a.status==='new'?'◆ New':'○ Inactive'}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'create' && (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '28px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 8px', color: '#1e293b', fontWeight: 700 }}>
            <i className="bi bi-robot" style={{ marginRight: '8px', color: IG_COLOR }} />
            Autonomous Instagram Account Creation
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '20px' }}>AI-powered creation with profile photo, bio, and initial follows for organic appearance.</p>
          {!creating ? (
            <button onClick={startCreate} style={{ background: IG_COLOR, color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 28px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="bi bi-play-fill" /> Start Autonomous Creation
            </button>
          ) : (
            <div>
              <div style={{ marginBottom: '10px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="bi bi-cpu spin" style={{ color: IG_COLOR }} /> Step {createStep+1}/{AUTO_STEPS.length}
              </div>
              <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '99px', marginBottom: '14px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${((createStep+1)/AUTO_STEPS.length)*100}%`, background: IG_COLOR, borderRadius: '99px', transition: 'width .5s' }} />
              </div>
              <div ref={logRef} style={{ background: '#0f172a', borderRadius: '10px', padding: '16px', maxHeight: '200px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.7 }}>
                {createLog.map((l,i) => <div key={i}><span style={{ color: '#ec4899' }}>{'>'}</span> {l}{i===createLog.length-1&&<span className="spin" style={{ display:'inline-block',marginLeft:'4px' }}>▋</span>}</div>)}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'reels' && (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontWeight: 700, color: '#1e293b' }}>Reels & Content Stats</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '12px' }}>
            {[
              { label: 'Total Reels', value: 19, color: IG_COLOR },
              { label: 'Total Views', value: '48.2K', color: '#f59e0b' },
              { label: 'Avg. Reach', value: '2,538', color: '#10b981' },
              { label: 'Engagement', value: '4.2%', color: '#6366f1' },
            ].map(s => (
              <div key={s.label} style={{ background: '#f8fafc', borderRadius: '10px', padding: '16px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
