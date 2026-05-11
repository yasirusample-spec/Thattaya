'use client'
import { useState, useRef } from 'react'

const RD_COLOR = '#FF4500'
const RD_BG = '#FFF0EA'

const DEMO_MESSAGES = [
  { id: 1, from: 'Reddit', text: 'Your Reddit verification code is: 847291', time: '14m ago', otp: '847291', type: 'otp' },
  { id: 2, from: 'Reddit Security', text: 'Use code 334756 to verify your account.', time: '58m ago', otp: '334756', type: 'login' },
  { id: 3, from: 'Reddit', text: 'Your one-time code is 991023. It expires in 10 minutes.', time: '2h ago', otp: '991023', type: 'otp' },
]

const AUTO_STEPS = [
  'Initializing Reddit account creator…',
  'Generating username (random_word + numbers)…',
  'Setting proxy: San Francisco CA residential…',
  'Launching stealth Chrome session…',
  'Opening www.reddit.com/register…',
  'Entering email, username, password…',
  'Solving reCAPTCHA (AI vision)…',
  'Requesting email verification…',
  'Simulating email click confirmation…',
  'Account created ✓',
  'Joining seed subreddits…',
  'Posting first comment for karma…',
  'Account warmed up ✓',
]

export default function RedditPage() {
  const [tab, setTab] = useState<'messages'|'accounts'|'create'|'subreddits'>('messages')
  const [creating, setCreating] = useState(false)
  const [createStep, setCreateStep] = useState(-1)
  const [createLog, setCreateLog] = useState<string[]>([])
  const [accounts, setAccounts] = useState([
    { id: 1, handle: 'u/dl_verify_bot', karma: 142, posts: 8, status: 'inactive', otp: 0 },
    { id: 2, handle: 'u/sms_otp_us', karma: 47, posts: 3, status: 'inactive', otp: 0 },
  ])
  const [copied, setCopied] = useState<string|null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const copyOtp = (otp: string) => { navigator.clipboard.writeText(otp).catch(()=>{}); setCopied(otp); setTimeout(()=>setCopied(null),2000) }

  const startCreate = async () => {
    setCreating(true); setCreateStep(0); setCreateLog([])
    for (let i = 0; i < AUTO_STEPS.length; i++) {
      await new Promise(r=>setTimeout(r,650+Math.random()*480))
      setCreateStep(i); setCreateLog(prev=>[...prev,AUTO_STEPS[i]])
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
    }
    await new Promise(r=>setTimeout(r,600))
    const id = accounts.length+1
    setAccounts(prev=>[...prev,{id:Date.now(),handle:`u/auto_redditor_${id}`,karma:0,posts:0,status:'active',otp:0}])
    setCreating(false); setTab('accounts')
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: RD_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="bi bi-reddit" style={{ color: RD_COLOR, fontSize: '1.6rem' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>Reddit</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>{accounts.length} accounts · {DEMO_MESSAGES.length} messages</p>
          </div>
        </div>
        <button onClick={()=>setTab('create')} style={{background:RD_COLOR,color:'#fff',border:'none',borderRadius:'8px',padding:'8px 16px',fontWeight:600,fontSize:'0.85rem',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}>
          <i className="bi bi-plus-lg"/> Create Account
        </button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:'12px',marginBottom:'20px'}}>
        {[
          {label:'Accounts',value:accounts.length,color:RD_COLOR},
          {label:'Messages',value:DEMO_MESSAGES.length,color:'#10b981'},
          {label:'Total Karma',value:accounts.reduce((s,a)=>s+a.karma,0),color:'#f59e0b'},
          {label:'Total Posts',value:accounts.reduce((s,a)=>s+a.posts,0),color:'#6366f1'},
        ].map(s=>(
          <div key={s.label} style={{background:'#fff',borderRadius:'12px',padding:'14px',border:'1px solid #e2e8f0',textAlign:'center'}}>
            <div style={{fontSize:'1.4rem',fontWeight:800,color:s.color}}>{s.value}</div>
            <div style={{fontSize:'0.72rem',color:'#94a3b8',marginTop:'2px'}}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:'4px',background:'#f1f5f9',borderRadius:'10px',padding:'4px',marginBottom:'20px',width:'fit-content'}}>
        {(['messages','accounts','create','subreddits'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:'7px 16px',borderRadius:'7px',border:'none',fontWeight:500,fontSize:'0.85rem',cursor:'pointer',background:tab===t?'#fff':'transparent',color:tab===t?RD_COLOR:'#64748b',boxShadow:tab===t?'0 1px 4px rgba(0,0,0,0.08)':'none'}}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {tab==='messages'&&(
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {DEMO_MESSAGES.map(m=>(
            <div key={m.id} style={{background:'#fff',borderRadius:'12px',padding:'16px',border:'1px solid #e2e8f0',display:'flex',gap:'12px'}}>
              <div style={{width:'40px',height:'40px',borderRadius:'50%',background:RD_BG,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <i className="bi bi-reddit" style={{color:RD_COLOR,fontSize:'1rem'}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                  <span style={{fontWeight:600,fontSize:'0.88rem',color:'#1e293b'}}>{m.from}</span>
                  <span style={{fontSize:'0.75rem',color:'#94a3b8'}}>{m.time}</span>
                </div>
                <div style={{fontSize:'0.85rem',color:'#374151',lineHeight:1.5}}>{m.text}</div>
                {m.otp&&(
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'10px'}}>
                    <span style={{background:'#fef3c7',border:'1px solid #fbbf24',borderRadius:'8px',padding:'4px 14px',fontFamily:'monospace',fontWeight:700,fontSize:'1.1rem',color:'#92400e',letterSpacing:'3px'}}>{m.otp}</span>
                    <button onClick={()=>copyOtp(m.otp!)} style={{background:copied===m.otp?'#dcfce7':'#f1f5f9',border:'none',borderRadius:'6px',padding:'5px 10px',fontSize:'0.78rem',cursor:'pointer',color:copied===m.otp?'#16a34a':'#475569',fontWeight:500}}>
                      <i className={`bi ${copied===m.otp?'bi-check-lg':'bi-clipboard'}`}/> {copied===m.otp?'Copied!':'Copy'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==='accounts'&&(
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {accounts.map(a=>(
            <div key={a.id} style={{background:'#fff',borderRadius:'12px',padding:'16px',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:'16px',flexWrap:'wrap'}}>
              <div style={{width:'44px',height:'44px',borderRadius:'50%',background:RD_BG,display:'flex',alignItems:'center',justifyContent:'center',color:RD_COLOR,fontWeight:700,fontSize:'0.85rem',flexShrink:0}}>RD</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,color:'#1e293b'}}>{a.handle}</div>
                <div style={{fontSize:'0.78rem',color:'#94a3b8'}}>{a.karma} karma · {a.posts} posts</div>
              </div>
              <span style={{padding:'4px 12px',borderRadius:'20px',fontSize:'0.72rem',fontWeight:600,
                background:a.status==='active'?'#dcfce7':'#f1f5f9',color:a.status==='active'?'#16a34a':'#94a3b8'}}>
                {a.status==='active'?'● Active':'○ Inactive'}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab==='create'&&(
        <div style={{background:'#fff',borderRadius:'14px',padding:'28px',border:'1px solid #e2e8f0'}}>
          <h3 style={{margin:'0 0 8px',color:'#1e293b',fontWeight:700}}><i className="bi bi-robot" style={{marginRight:'8px',color:RD_COLOR}}/> Autonomous Reddit Account Creation</h3>
          <p style={{color:'#64748b',fontSize:'0.85rem',marginBottom:'20px'}}>Creates aged-looking accounts with initial karma from subreddit activity.</p>
          {!creating?(
            <button onClick={startCreate} style={{background:RD_COLOR,color:'#fff',border:'none',borderRadius:'10px',padding:'12px 28px',fontWeight:700,fontSize:'0.95rem',cursor:'pointer',display:'flex',alignItems:'center',gap:'8px'}}>
              <i className="bi bi-play-fill"/> Start Autonomous Creation
            </button>
          ):(
            <div>
              <div style={{marginBottom:'10px',fontWeight:600,color:'#1e293b',display:'flex',alignItems:'center',gap:'8px'}}><i className="bi bi-cpu spin" style={{color:RD_COLOR}}/> Step {createStep+1}/{AUTO_STEPS.length}</div>
              <div style={{width:'100%',height:'6px',background:'#e2e8f0',borderRadius:'99px',marginBottom:'14px',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${((createStep+1)/AUTO_STEPS.length)*100}%`,background:RD_COLOR,borderRadius:'99px',transition:'width .5s'}}/>
              </div>
              <div ref={logRef} style={{background:'#0f172a',borderRadius:'10px',padding:'16px',maxHeight:'200px',overflowY:'auto',fontFamily:'monospace',fontSize:'0.8rem',color:'#94a3b8',lineHeight:1.7}}>
                {createLog.map((l,i)=><div key={i}><span style={{color:RD_COLOR}}>{'>'}</span> {l}{i===createLog.length-1&&<span className="spin" style={{display:'inline-block',marginLeft:'4px'}}>▋</span>}</div>)}
              </div>
            </div>
          )}
        </div>
      )}

      {tab==='subreddits'&&(
        <div style={{background:'#fff',borderRadius:'14px',padding:'24px',border:'1px solid #e2e8f0'}}>
          <h3 style={{margin:'0 0 16px',fontWeight:700,color:'#1e293b'}}>Monitored Subreddits</h3>
          {['r/PhoneVerification','r/SMSBypass','r/privacy','r/OPSEC','r/cybersecurity'].map((sr,i)=>(
            <div key={i} style={{padding:'12px 16px',borderRadius:'10px',border:'1px solid #e2e8f0',marginBottom:'8px',display:'flex',alignItems:'center',gap:'12px'}}>
              <i className="bi bi-reddit" style={{color:RD_COLOR,fontSize:'1.1rem'}}/>
              <span style={{fontWeight:500,color:'#1e293b',flex:1}}>{sr}</span>
              <span style={{fontSize:'0.75rem',color:'#94a3b8'}}>{Math.floor(Math.random()*50000+5000).toLocaleString()} members</span>
              <span style={{fontSize:'0.72rem',padding:'3px 8px',borderRadius:'6px',background:'#dcfce7',color:'#16a34a',fontWeight:600}}>Monitoring</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
