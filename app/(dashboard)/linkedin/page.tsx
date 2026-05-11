'use client'
import { useState, useRef } from 'react'

const LI_COLOR = '#0A66C2'
const LI_BG = '#E7F2FB'

const DEMO_MESSAGES = [
  { id: 1, from: 'LinkedIn', text: 'Your LinkedIn verification code is 772341. This code expires in 10 minutes.', time: '6m ago', otp: '772341', type: 'otp' },
  { id: 2, from: 'LinkedIn Security', text: 'Use 334891 to sign in to LinkedIn.', time: '38m ago', otp: '334891', type: 'login' },
  { id: 3, from: 'LinkedIn', text: 'Your one-time password: 991023. Do not share this code.', time: '1h ago', otp: '991023', type: 'otp' },
  { id: 4, from: 'LinkedIn Jobs', text: 'Verification code for LinkedIn: 556712', time: '2h ago', otp: '556712', type: 'otp' },
]

const AUTO_STEPS = [
  'Initializing LinkedIn account creator…',
  'Generating professional identity (IT manager, US)…',
  'Setting residential proxy: New York NY…',
  'Launching stealth Chrome session…',
  'Navigating to linkedin.com/signup…',
  'Filling first name, last name, email…',
  'Setting professional password…',
  'Requesting phone verification…',
  'Fetching OTP via iVASMS pool…',
  'OTP 847291 submitted — verified ✓',
  'Adding work experience (AI-generated)…',
  'Setting profile photo (professional AI headshot)…',
  'Connecting to seed network…',
  'Account created ✓ — 1st connection sent',
]

export default function LinkedInPage() {
  const [tab, setTab] = useState<'messages'|'accounts'|'create'|'jobs'>('messages')
  const [creating, setCreating] = useState(false)
  const [createStep, setCreateStep] = useState(-1)
  const [createLog, setCreateLog] = useState<string[]>([])
  const [accounts, setAccounts] = useState([
    { id: 1, name: 'John D. (DL)', title: 'Sr. Software Engineer', connections: 187, status: 'active', otp: 28 },
    { id: 2, name: 'Sarah M. (DL)', title: 'IT Manager', connections: 94, status: 'active', otp: 12 },
  ])
  const [copied, setCopied] = useState<string|null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const copyOtp = (otp: string) => { navigator.clipboard.writeText(otp).catch(()=>{}); setCopied(otp); setTimeout(()=>setCopied(null),2000) }

  const startCreate = async () => {
    setCreating(true); setCreateStep(0); setCreateLog([])
    for (let i = 0; i < AUTO_STEPS.length; i++) {
      await new Promise(r=>setTimeout(r,720+Math.random()*480))
      setCreateStep(i); setCreateLog(prev=>[...prev,AUTO_STEPS[i]])
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
    }
    await new Promise(r=>setTimeout(r,700))
    const n = accounts.length+1
    setAccounts(prev=>[...prev,{id:Date.now(),name:`Auto Profile #${n}`,title:'Business Analyst',connections:0,status:'active',otp:0}])
    setCreating(false); setTab('accounts')
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: LI_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="bi bi-linkedin" style={{ color: LI_COLOR, fontSize: '1.6rem' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>LinkedIn</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>{accounts.filter(a=>a.status==='active').length} active profiles · {DEMO_MESSAGES.length} messages</p>
          </div>
        </div>
        <button onClick={()=>setTab('create')} style={{background:LI_COLOR,color:'#fff',border:'none',borderRadius:'8px',padding:'8px 16px',fontWeight:600,fontSize:'0.85rem',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}>
          <i className="bi bi-plus-lg"/> Create Profile
        </button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:'12px',marginBottom:'20px'}}>
        {[
          {label:'Profiles',value:accounts.length,color:LI_COLOR},
          {label:'Messages',value:DEMO_MESSAGES.length,color:'#10b981'},
          {label:'OTPs',value:accounts.reduce((s,a)=>s+a.otp,0),color:'#f59e0b'},
          {label:'Connections',value:accounts.reduce((s,a)=>s+a.connections,0),color:'#6366f1'},
        ].map(s=>(
          <div key={s.label} style={{background:'#fff',borderRadius:'12px',padding:'14px',border:'1px solid #e2e8f0',textAlign:'center'}}>
            <div style={{fontSize:'1.4rem',fontWeight:800,color:s.color}}>{s.value}</div>
            <div style={{fontSize:'0.72rem',color:'#94a3b8',marginTop:'2px'}}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:'4px',background:'#f1f5f9',borderRadius:'10px',padding:'4px',marginBottom:'20px',width:'fit-content'}}>
        {(['messages','accounts','create','jobs'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:'7px 16px',borderRadius:'7px',border:'none',fontWeight:500,fontSize:'0.85rem',cursor:'pointer',background:tab===t?'#fff':'transparent',color:tab===t?LI_COLOR:'#64748b',boxShadow:tab===t?'0 1px 4px rgba(0,0,0,0.08)':'none'}}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {tab==='messages'&&(
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {DEMO_MESSAGES.map(m=>(
            <div key={m.id} style={{background:'#fff',borderRadius:'12px',padding:'16px',border:'1px solid #e2e8f0',display:'flex',gap:'12px'}}>
              <div style={{width:'40px',height:'40px',borderRadius:'50%',background:LI_BG,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <i className="bi bi-linkedin" style={{color:LI_COLOR,fontSize:'1rem'}}/>
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
              <div style={{width:'44px',height:'44px',borderRadius:'50%',background:LI_COLOR,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:'0.85rem',flexShrink:0}}>
                {a.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,color:'#1e293b'}}>{a.name}</div>
                <div style={{fontSize:'0.78rem',color:'#64748b'}}>{a.title}</div>
                <div style={{fontSize:'0.72rem',color:'#94a3b8'}}>{a.connections} connections</div>
              </div>
              <div style={{textAlign:'center'}}><div style={{fontWeight:700,color:'#f59e0b'}}>{a.otp}</div><div style={{fontSize:'0.68rem',color:'#94a3b8'}}>OTPs</div></div>
              <span style={{padding:'4px 12px',borderRadius:'20px',fontSize:'0.72rem',fontWeight:600,background:'#dcfce7',color:'#16a34a'}}>● Active</span>
            </div>
          ))}
        </div>
      )}

      {tab==='create'&&(
        <div style={{background:'#fff',borderRadius:'14px',padding:'28px',border:'1px solid #e2e8f0'}}>
          <h3 style={{margin:'0 0 8px',color:'#1e293b',fontWeight:700}}><i className="bi bi-robot" style={{marginRight:'8px',color:LI_COLOR}}/> Autonomous LinkedIn Profile Creation</h3>
          <p style={{color:'#64748b',fontSize:'0.85rem',marginBottom:'20px'}}>Creates realistic professional profiles with work history, skills, AI headshots, and seed connections.</p>
          {!creating?(
            <button onClick={startCreate} style={{background:LI_COLOR,color:'#fff',border:'none',borderRadius:'10px',padding:'12px 28px',fontWeight:700,fontSize:'0.95rem',cursor:'pointer',display:'flex',alignItems:'center',gap:'8px'}}>
              <i className="bi bi-play-fill"/> Start Autonomous Creation
            </button>
          ):(
            <div>
              <div style={{marginBottom:'10px',fontWeight:600,color:'#1e293b',display:'flex',alignItems:'center',gap:'8px'}}><i className="bi bi-cpu spin" style={{color:LI_COLOR}}/> Step {createStep+1}/{AUTO_STEPS.length}</div>
              <div style={{width:'100%',height:'6px',background:'#e2e8f0',borderRadius:'99px',marginBottom:'14px',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${((createStep+1)/AUTO_STEPS.length)*100}%`,background:LI_COLOR,borderRadius:'99px',transition:'width .5s'}}/>
              </div>
              <div ref={logRef} style={{background:'#0f172a',borderRadius:'10px',padding:'16px',maxHeight:'200px',overflowY:'auto',fontFamily:'monospace',fontSize:'0.8rem',color:'#94a3b8',lineHeight:1.7}}>
                {createLog.map((l,i)=><div key={i}><span style={{color:LI_COLOR}}>{'>'}</span> {l}{i===createLog.length-1&&<span className="spin" style={{display:'inline-block',marginLeft:'4px'}}>▋</span>}</div>)}
              </div>
            </div>
          )}
        </div>
      )}

      {tab==='jobs'&&(
        <div style={{background:'#fff',borderRadius:'14px',padding:'24px',border:'1px solid #e2e8f0'}}>
          <h3 style={{margin:'0 0 16px',fontWeight:700,color:'#1e293b'}}>Job Applications Tracker</h3>
          {[
            {title:'Senior DevOps Engineer',company:'Meta',applied:'2025-01-07',status:'In Review'},
            {title:'Cloud Architect',company:'Google',applied:'2025-01-06',status:'Rejected'},
            {title:'Backend Engineer',company:'Stripe',applied:'2025-01-05',status:'Interview'},
          ].map((j,i)=>(
            <div key={i} style={{padding:'12px',borderRadius:'10px',border:'1px solid #e2e8f0',marginBottom:'8px',display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
              <div style={{flex:1}}><div style={{fontWeight:600,color:'#1e293b',fontSize:'0.9rem'}}>{j.title}</div><div style={{fontSize:'0.78rem',color:'#64748b'}}>{j.company} · {j.applied}</div></div>
              <span style={{padding:'4px 12px',borderRadius:'20px',fontSize:'0.72rem',fontWeight:600,
                background:j.status==='Interview'?'#dcfce7':j.status==='In Review'?'#dbeafe':'#fee2e2',
                color:j.status==='Interview'?'#16a34a':j.status==='In Review'?'#1d4ed8':'#dc2626'}}>
                {j.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
