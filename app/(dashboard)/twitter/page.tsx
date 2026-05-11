'use client'
import { useState, useRef } from 'react'

const TW_COLOR = '#000000'

const DEMO_MESSAGES = [
  { id: 1, from: 'Twitter / X', text: 'Your X confirmation code is 118847. Don\'t share this code.', time: '5m ago', otp: '118847', type: 'otp' },
  { id: 2, from: 'X Security', text: 'Someone requested a password reset. Code: 772341', time: '34m ago', otp: '772341', type: 'reset' },
  { id: 3, from: 'X (Twitter)', text: 'Your login verification code is 334521', time: '1h ago', otp: '334521', type: 'login' },
  { id: 4, from: 'Twitter', text: 'Use 889014 to confirm your phone number on X.', time: '2h ago', otp: '889014', type: 'otp' },
]

const AUTO_STEPS = [
  'Initializing X account creation engine…',
  'Generating US identity (male, age 25-35)…',
  'Setting proxy: Seattle WA residential…',
  'Launching stealth browser (Chrome 120)…',
  'Navigating to x.com/i/flow/signup…',
  'Entering name, email, birthday…',
  'Solving CAPTCHA (Arkose Labs bypass)…',
  'Requesting phone SMS verification…',
  'Fetching OTP from iVASMS pool…',
  'OTP 483920 submitted successfully…',
  'Setting username and password…',
  'Uploading profile avatar (AI-generated)…',
  'Account created ✓',
]

export default function TwitterPage() {
  const [tab, setTab] = useState<'messages'|'accounts'|'create'>('messages')
  const [creating, setCreating] = useState(false)
  const [createStep, setCreateStep] = useState(-1)
  const [createLog, setCreateLog] = useState<string[]>([])
  const [accounts, setAccounts] = useState([
    { id: 1, handle: '@dl_otp_x1', followers: 42, tweets: 18, status: 'active', otp: 22 },
    { id: 2, handle: '@verify_x_us', followers: 11, tweets: 6, status: 'active', otp: 9 },
  ])
  const [copied, setCopied] = useState<string|null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const copyOtp = (otp: string) => {
    navigator.clipboard.writeText(otp).catch(()=>{})
    setCopied(otp); setTimeout(() => setCopied(null), 2000)
  }

  const startCreate = async () => {
    setCreating(true); setCreateStep(0); setCreateLog([])
    for (let i = 0; i < AUTO_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, 700 + Math.random()*500))
      setCreateStep(i); setCreateLog(prev => [...prev, AUTO_STEPS[i]])
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
    }
    await new Promise(r => setTimeout(r, 600))
    setAccounts(prev => [...prev, { id: Date.now(), handle: `@auto_x_${prev.length+1}`, followers: 0, tweets: 0, status: 'active', otp: 0 }])
    setCreating(false); setTab('accounts')
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="bi bi-twitter-x" style={{ color: TW_COLOR, fontSize: '1.5rem' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>Twitter / X</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>{accounts.filter(a=>a.status==='active').length} active accounts · {DEMO_MESSAGES.length} messages</p>
          </div>
        </div>
        <button onClick={() => setTab('create')} style={{ background: TW_COLOR, color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="bi bi-plus-lg" /> Create Account
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Accounts', value: accounts.length, color: '#000' },
          { label: 'Messages', value: DEMO_MESSAGES.length, color: '#10b981' },
          { label: 'OTPs', value: accounts.reduce((s,a)=>s+a.otp,0), color: '#f59e0b' },
          { label: 'Followers', value: accounts.reduce((s,a)=>s+a.followers,0), color: '#6366f1' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: '12px', padding: '14px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '10px', padding: '4px', marginBottom: '20px', width: 'fit-content' }}>
        {(['messages','accounts','create'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 16px', borderRadius: '7px', border: 'none', fontWeight: 500, fontSize: '0.85rem', cursor: 'pointer', background: tab===t?'#fff':'transparent', color: tab===t?TW_COLOR:'#64748b', boxShadow: tab===t?'0 1px 4px rgba(0,0,0,0.08)':'none' }}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'messages' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {DEMO_MESSAGES.map(m => (
            <div key={m.id} style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', display: 'flex', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="bi bi-twitter-x" style={{ fontSize: '1rem' }} />
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
                    <button onClick={() => copyOtp(m.otp!)} style={{ background: copied===m.otp?'#dcfce7':'#f1f5f9', border: 'none', borderRadius: '6px', padding: '5px 10px', fontSize: '0.78rem', cursor: 'pointer', color: copied===m.otp?'#16a34a':'#475569', fontWeight: 500 }}>
                      <i className={`bi ${copied===m.otp?'bi-check-lg':'bi-clipboard'}`} /> {copied===m.otp?'Copied!':'Copy'}
                    </button>
                    <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>{m.type.toUpperCase()}</span>
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
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                {a.handle.slice(1,3).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{a.handle}</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{a.followers} followers · {a.tweets} tweets</div>
              </div>
              <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 700, color: '#f59e0b' }}>{a.otp}</div><div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>OTPs</div></div>
              <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600, background: '#dcfce7', color: '#16a34a' }}>● Active</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'create' && (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '28px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 8px', color: '#1e293b', fontWeight: 700 }}><i className="bi bi-robot" style={{ marginRight: '8px' }} />Autonomous X / Twitter Account Creation</h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '20px' }}>Bypasses Arkose Labs CAPTCHA with AI vision. Uses iVASMS number pool for SMS verification.</p>
          {!creating ? (
            <button onClick={startCreate} style={{ background: TW_COLOR, color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 28px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="bi bi-play-fill" /> Start Autonomous Creation
            </button>
          ) : (
            <div>
              <div style={{ marginBottom: '10px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="bi bi-cpu spin" /> Step {createStep+1}/{AUTO_STEPS.length}
              </div>
              <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '99px', marginBottom: '14px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${((createStep+1)/AUTO_STEPS.length)*100}%`, background: TW_COLOR, borderRadius: '99px', transition: 'width .5s' }} />
              </div>
              <div ref={logRef} style={{ background: '#0f172a', borderRadius: '10px', padding: '16px', maxHeight: '200px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.7 }}>
                {createLog.map((l,i) => <div key={i}><span style={{ color: '#94a3b8' }}>{'>'}</span> {l}{i===createLog.length-1&&<span className="spin" style={{ display:'inline-block',marginLeft:'4px' }}>▋</span>}</div>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
