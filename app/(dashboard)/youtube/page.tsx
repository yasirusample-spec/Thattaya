'use client'
import { useState, useRef } from 'react'

const YT_COLOR = '#FF0000'
const YT_BG = '#FFE8E8'

const DEMO_MESSAGES = [
  { id: 1, from: 'YouTube / Google', text: 'Your Google verification code is 847291. Don\'t share it with anyone.', time: '9m ago', otp: '847291', type: 'otp' },
  { id: 2, from: 'Google Security', text: 'G-334756 is your Google verification code.', time: '47m ago', otp: '334756', type: 'login' },
  { id: 3, from: 'YouTube', text: 'Your YouTube channel verification code: 991023', time: '2h ago', otp: '991023', type: 'otp' },
  { id: 4, from: 'Google', text: 'G-556712 - your account recovery code.', time: '3h ago', otp: '556712', type: 'recovery' },
]

const AUTO_STEPS = [
  'Initializing Google/YouTube account creator…',
  'Generating US identity with DOB 1990-2000…',
  'Setting proxy: New York NY residential…',
  'Launching Chrome with stealth profile…',
  'Opening accounts.google.com/signup…',
  'Filling first name, last name, username…',
  'Creating strong password…',
  'Adding birthday and gender…',
  'Requesting phone verification…',
  'OTP received: 738291 from iVASMS…',
  'Google account verified ✓',
  'Creating YouTube channel…',
  'Setting channel name and description…',
  'Channel ID generated ✓',
  'Account fully operational ✓',
]

export default function YouTubePage() {
  const [tab, setTab] = useState<'messages'|'channels'|'create'|'analytics'>('messages')
  const [creating, setCreating] = useState(false)
  const [createStep, setCreateStep] = useState(-1)
  const [createLog, setCreateLog] = useState<string[]>([])
  const [channels, setChannels] = useState([
    { id: 1, name: 'DL Tech Channel', subs: 1240, views: 48200, videos: 22, status: 'active', otp: 18 },
    { id: 2, name: 'Verify US Now', subs: 340, views: 12800, videos: 9, status: 'active', otp: 7 },
  ])
  const [copied, setCopied] = useState<string|null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const copyOtp = (otp: string) => { navigator.clipboard.writeText(otp).catch(()=>{}); setCopied(otp); setTimeout(()=>setCopied(null),2000) }

  const startCreate = async () => {
    setCreating(true); setCreateStep(0); setCreateLog([])
    for (let i = 0; i < AUTO_STEPS.length; i++) {
      await new Promise(r=>setTimeout(r,600+Math.random()*500))
      setCreateStep(i); setCreateLog(prev=>[...prev,AUTO_STEPS[i]])
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
    }
    await new Promise(r=>setTimeout(r,700))
    setChannels(prev=>[...prev,{id:Date.now(),name:`Auto Channel #${prev.length+1}`,subs:0,views:0,videos:0,status:'active',otp:0}])
    setCreating(false); setTab('channels')
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: YT_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="bi bi-youtube" style={{ color: YT_COLOR, fontSize: '1.7rem' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>YouTube</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>{channels.length} channels · {channels.reduce((s,c)=>s+c.subs,0).toLocaleString()} total subs · {DEMO_MESSAGES.length} messages</p>
          </div>
        </div>
        <button onClick={()=>setTab('create')} style={{background:YT_COLOR,color:'#fff',border:'none',borderRadius:'8px',padding:'8px 16px',fontWeight:600,fontSize:'0.85rem',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}>
          <i className="bi bi-plus-lg"/> Create Channel
        </button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:'12px',marginBottom:'20px'}}>
        {[
          {label:'Channels',value:channels.length,color:YT_COLOR},
          {label:'Total Subs',value:channels.reduce((s,c)=>s+c.subs,0).toLocaleString(),color:'#10b981'},
          {label:'Total Views',value:channels.reduce((s,c)=>s+c.views,0).toLocaleString(),color:'#f59e0b'},
          {label:'OTPs',value:channels.reduce((s,c)=>s+c.otp,0),color:'#6366f1'},
        ].map(s=>(
          <div key={s.label} style={{background:'#fff',borderRadius:'12px',padding:'14px',border:'1px solid #e2e8f0',textAlign:'center'}}>
            <div style={{fontSize:'1.4rem',fontWeight:800,color:s.color}}>{s.value}</div>
            <div style={{fontSize:'0.72rem',color:'#94a3b8',marginTop:'2px'}}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:'4px',background:'#f1f5f9',borderRadius:'10px',padding:'4px',marginBottom:'20px',width:'fit-content'}}>
        {(['messages','channels','create','analytics'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:'7px 16px',borderRadius:'7px',border:'none',fontWeight:500,fontSize:'0.85rem',cursor:'pointer',background:tab===t?'#fff':'transparent',color:tab===t?YT_COLOR:'#64748b',boxShadow:tab===t?'0 1px 4px rgba(0,0,0,0.08)':'none'}}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {tab==='messages'&&(
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {DEMO_MESSAGES.map(m=>(
            <div key={m.id} style={{background:'#fff',borderRadius:'12px',padding:'16px',border:'1px solid #e2e8f0',display:'flex',gap:'12px'}}>
              <div style={{width:'40px',height:'40px',borderRadius:'50%',background:YT_BG,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <i className="bi bi-youtube" style={{color:YT_COLOR,fontSize:'1.1rem'}}/>
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
                    <span style={{fontSize:'0.72rem',padding:'3px 8px',borderRadius:'6px',background:'#fee2e2',color:YT_COLOR,fontWeight:600}}>{m.type.toUpperCase()}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==='channels'&&(
        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          {channels.map(c=>(
            <div key={c.id} style={{background:'#fff',borderRadius:'12px',padding:'18px',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:'16px',flexWrap:'wrap'}}>
              <div style={{width:'48px',height:'48px',borderRadius:'10px',background:YT_BG,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <i className="bi bi-youtube" style={{color:YT_COLOR,fontSize:'1.4rem'}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,color:'#1e293b'}}>{c.name}</div>
                <div style={{fontSize:'0.78rem',color:'#94a3b8'}}>{c.videos} videos uploaded</div>
              </div>
              <div style={{display:'flex',gap:'20px'}}>
                {[[c.subs.toLocaleString(),'Subs','#10b981'],[c.views.toLocaleString(),'Views','#f59e0b'],[c.otp,'OTPs','#6366f1']].map(([v,l,col])=>(
                  <div key={l as string} style={{textAlign:'center'}}>
                    <div style={{fontWeight:700,color:col as string,fontSize:'1.05rem'}}>{v}</div>
                    <div style={{fontSize:'0.68rem',color:'#94a3b8'}}>{l}</div>
                  </div>
                ))}
              </div>
              <span style={{padding:'4px 12px',borderRadius:'20px',fontSize:'0.72rem',fontWeight:600,background:'#dcfce7',color:'#16a34a'}}>● Active</span>
            </div>
          ))}
        </div>
      )}

      {tab==='create'&&(
        <div style={{background:'#fff',borderRadius:'14px',padding:'28px',border:'1px solid #e2e8f0'}}>
          <h3 style={{margin:'0 0 8px',color:'#1e293b',fontWeight:700}}><i className="bi bi-robot" style={{marginRight:'8px',color:YT_COLOR}}/> Autonomous Google/YouTube Account Creation</h3>
          <p style={{color:'#64748b',fontSize:'0.85rem',marginBottom:'20px'}}>Creates full Google account + YouTube channel with channel art and initial uploads.</p>
          {!creating?(
            <button onClick={startCreate} style={{background:YT_COLOR,color:'#fff',border:'none',borderRadius:'10px',padding:'12px 28px',fontWeight:700,fontSize:'0.95rem',cursor:'pointer',display:'flex',alignItems:'center',gap:'8px'}}>
              <i className="bi bi-play-fill"/> Start Autonomous Creation
            </button>
          ):(
            <div>
              <div style={{marginBottom:'10px',fontWeight:600,color:'#1e293b',display:'flex',alignItems:'center',gap:'8px'}}><i className="bi bi-cpu spin" style={{color:YT_COLOR}}/> Step {createStep+1}/{AUTO_STEPS.length}</div>
              <div style={{width:'100%',height:'6px',background:'#e2e8f0',borderRadius:'99px',marginBottom:'14px',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${((createStep+1)/AUTO_STEPS.length)*100}%`,background:YT_COLOR,borderRadius:'99px',transition:'width .5s'}}/>
              </div>
              <div ref={logRef} style={{background:'#0f172a',borderRadius:'10px',padding:'16px',maxHeight:'200px',overflowY:'auto',fontFamily:'monospace',fontSize:'0.8rem',color:'#94a3b8',lineHeight:1.7}}>
                {createLog.map((l,i)=><div key={i}><span style={{color:YT_COLOR}}>{'>'}</span> {l}{i===createLog.length-1&&<span className="spin" style={{display:'inline-block',marginLeft:'4px'}}>▋</span>}</div>)}
              </div>
            </div>
          )}
        </div>
      )}

      {tab==='analytics'&&(
        <div style={{background:'#fff',borderRadius:'14px',padding:'24px',border:'1px solid #e2e8f0'}}>
          <h3 style={{margin:'0 0 16px',fontWeight:700,color:'#1e293b'}}>Channel Analytics</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'12px',marginBottom:'20px'}}>
            {[
              {label:'Watch Time (hrs)',value:'1,284',color:YT_COLOR},
              {label:'Avg View Duration',value:'4m 32s',color:'#10b981'},
              {label:'CTR',value:'5.8%',color:'#f59e0b'},
              {label:'Revenue Est.',value:'$42.80',color:'#6366f1'},
            ].map(s=>(
              <div key={s.label} style={{background:'#f8fafc',borderRadius:'10px',padding:'16px',textAlign:'center',border:'1px solid #e2e8f0'}}>
                <div style={{fontSize:'1.5rem',fontWeight:800,color:s.color}}>{s.value}</div>
                <div style={{fontSize:'0.75rem',color:'#94a3b8',marginTop:'4px'}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
