'use client'
import { useState, useRef } from 'react'

const DC_COLOR = '#5865F2'
const DC_BG = '#EEEEFF'

const DEMO_MESSAGES = [
  { id: 1, from: 'Discord', text: 'Your Discord verification code is: 847-291', time: '2m ago', otp: '847291', type: 'otp' },
  { id: 2, from: 'Discord Security', text: 'Your login code: 334-756. This expires in 10 min.', time: '19m ago', otp: '334756', type: 'login' },
  { id: 3, from: 'Discord', text: 'Phone verification code: 991-023', time: '47m ago', otp: '991023', type: 'otp' },
  { id: 4, from: 'Discord', text: '556-712 is your Discord code. Never share it.', time: '1h ago', otp: '556712', type: 'otp' },
  { id: 5, from: 'Discord Nitro', text: 'Gift confirmation code: 228-841', time: '2h ago', otp: '228841', type: 'nitro' },
]

const DEMO_SERVERS = [
  { id: 1, name: 'Death Legion HQ', members: 2847, channels: 24, otp: 142, role: 'Owner', online: 834 },
  { id: 2, name: 'OTP Verification Hub', members: 1234, channels: 12, otp: 278, role: 'Admin', online: 312 },
  { id: 3, name: 'SMS Bypass Community', members: 567, channels: 8, otp: 89, role: 'Admin', online: 143 },
  { id: 4, name: 'Stealth Bots HQ', members: 389, channels: 16, otp: 61, role: 'Member', online: 78 },
]

const AUTO_STEPS = [
  'Initializing Discord account creator…',
  'Generating identity and email address…',
  'Setting proxy: residential US (random city)…',
  'Launching stealth Chrome session…',
  'Opening discord.com/register…',
  'Entering username, email, password, DOB…',
  'Bypassing hCaptcha (AI solver)…',
  'Requesting phone verification…',
  'OTP received: 738-291 from iVASMS…',
  'Phone number verified ✓',
  'Setting avatar (AI-generated)…',
  'Joining seed servers for activity…',
  'Bot token generated ✓',
  'Account fully operational ✓',
]

const BOT_COMMANDS = [
  { cmd: '!otp', desc: 'Get latest OTP from SMS feed', uses: 4821 },
  { cmd: '!verify <number>', desc: 'Verify phone number status', uses: 1293 },
  { cmd: '!numbers', desc: 'List available numbers', uses: 987 },
  { cmd: '!sync', desc: 'Force iVASMS sync', uses: 432 },
  { cmd: '!stats', desc: 'Show bot statistics', uses: 398 },
  { cmd: '!ping', desc: 'Check bot latency', uses: 312 },
]

export default function DiscordPage() {
  const [tab, setTab] = useState<'messages'|'servers'|'create'|'bot'>('messages')
  const [creating, setCreating] = useState(false)
  const [createStep, setCreateStep] = useState(-1)
  const [createLog, setCreateLog] = useState<string[]>([])
  const [accounts, setAccounts] = useState([
    { id: 1, handle: 'DL_OTP#7821', servers: 12, otp: 142, status: 'online', nitro: true },
    { id: 2, handle: 'DeathLegion#3847', servers: 8, otp: 89, status: 'online', nitro: true },
    { id: 3, handle: 'VerifyBot#0001', servers: 24, otp: 278, status: 'online', nitro: false },
    { id: 4, handle: 'Reserve#9912', servers: 2, otp: 14, status: 'idle', nitro: false },
  ])
  const [copied, setCopied] = useState<string|null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const copyOtp = (otp: string) => { navigator.clipboard.writeText(otp).catch(()=>{}); setCopied(otp); setTimeout(()=>setCopied(null),2000) }

  const startCreate = async () => {
    setCreating(true); setCreateStep(0); setCreateLog([])
    for (let i = 0; i < AUTO_STEPS.length; i++) {
      await new Promise(r=>setTimeout(r,650+Math.random()*500))
      setCreateStep(i); setCreateLog(prev=>[...prev,AUTO_STEPS[i]])
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
    }
    await new Promise(r=>setTimeout(r,600))
    const n = accounts.length+1
    setAccounts(prev=>[...prev,{id:Date.now(),handle:`AutoAcc#${String(Math.floor(Math.random()*9000)+1000)}`,servers:0,otp:0,status:'online',nitro:false}])
    setCreating(false); setTab('servers')
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: DC_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="bi bi-discord" style={{ color: DC_COLOR, fontSize: '1.6rem' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>Discord</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
              {accounts.filter(a=>a.status==='online').length} online · {DEMO_SERVERS.length} servers · {DEMO_MESSAGES.length} messages · Bot active
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={()=>setTab('bot')} style={{background:DC_BG,color:DC_COLOR,border:`1px solid ${DC_COLOR}40`,borderRadius:'8px',padding:'8px 14px',fontWeight:600,fontSize:'0.82rem',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}>
            <i className="bi bi-robot"/> Bot
          </button>
          <button onClick={()=>setTab('create')} style={{background:DC_COLOR,color:'#fff',border:'none',borderRadius:'8px',padding:'8px 16px',fontWeight:600,fontSize:'0.85rem',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}>
            <i className="bi bi-plus-lg"/> Create Account
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:'12px',marginBottom:'20px'}}>
        {[
          {label:'Accounts',value:accounts.length,color:DC_COLOR},
          {label:'Servers',value:DEMO_SERVERS.length,color:'#10b981'},
          {label:'OTPs Captured',value:DEMO_MESSAGES.length+accounts.reduce((s,a)=>s+a.otp,0),color:'#f59e0b'},
          {label:'Bot Commands',value:BOT_COMMANDS.reduce((s,c)=>s+c.uses,0).toLocaleString(),color:'#ef4444'},
          {label:'Total Members',value:DEMO_SERVERS.reduce((s,sv)=>s+sv.members,0).toLocaleString(),color:'#8b5cf6'},
          {label:'Online Now',value:DEMO_SERVERS.reduce((s,sv)=>s+sv.online,0),color:'#22c55e'},
        ].map(s=>(
          <div key={s.label} style={{background:'#fff',borderRadius:'12px',padding:'14px',border:'1px solid #e2e8f0',textAlign:'center'}}>
            <div style={{fontSize:'1.3rem',fontWeight:800,color:s.color}}>{s.value}</div>
            <div style={{fontSize:'0.7rem',color:'#94a3b8',marginTop:'2px'}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:'4px',background:'#f1f5f9',borderRadius:'10px',padding:'4px',marginBottom:'20px',width:'fit-content'}}>
        {(['messages','servers','create','bot'] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:'7px 16px',borderRadius:'7px',border:'none',fontWeight:500,fontSize:'0.85rem',cursor:'pointer',background:tab===t?'#fff':'transparent',color:tab===t?DC_COLOR:'#64748b',boxShadow:tab===t?'0 1px 4px rgba(0,0,0,0.08)':'none'}}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {/* Messages */}
      {tab==='messages'&&(
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          <div style={{background:'#36393f',borderRadius:'12px',padding:'12px 16px',display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
            <div style={{width:'10px',height:'10px',borderRadius:'50%',background:'#22c55e'}}/>
            <span style={{color:'#dcddde',fontSize:'0.85rem',fontWeight:500}}>Discord DM — OTP Messages Feed</span>
            <span style={{marginLeft:'auto',fontSize:'0.75rem',color:'#72767d'}}>Live · {DEMO_MESSAGES.length} messages</span>
          </div>
          {DEMO_MESSAGES.map(m=>(
            <div key={m.id} style={{background:'#36393f',borderRadius:'12px',padding:'14px 16px',border:'1px solid #202225',display:'flex',gap:'12px'}}>
              <div style={{width:'40px',height:'40px',borderRadius:'50%',background:DC_COLOR,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <i className="bi bi-discord" style={{color:'#fff',fontSize:'1rem'}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                  <span style={{fontWeight:700,fontSize:'0.88rem',color:'#fff'}}>{m.from}</span>
                  <span style={{fontSize:'0.72rem',color:'#72767d'}}>{m.time}</span>
                </div>
                <div style={{fontSize:'0.85rem',color:'#dcddde',lineHeight:1.5}}>{m.text}</div>
                {m.otp&&(
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'10px'}}>
                    <span style={{background:'#fef3c7',border:'1px solid #fbbf24',borderRadius:'8px',padding:'4px 14px',fontFamily:'monospace',fontWeight:700,fontSize:'1.1rem',color:'#92400e',letterSpacing:'3px'}}>{m.otp}</span>
                    <button onClick={()=>copyOtp(m.otp!)} style={{background:copied===m.otp?'#22c55e30':'#4f545c',border:'none',borderRadius:'6px',padding:'5px 10px',fontSize:'0.78rem',cursor:'pointer',color:copied===m.otp?'#22c55e':'#dcddde',fontWeight:500}}>
                      <i className={`bi ${copied===m.otp?'bi-check-lg':'bi-clipboard'}`}/> {copied===m.otp?'Copied!':'Copy'}
                    </button>
                    <span style={{fontSize:'0.72rem',padding:'3px 8px',borderRadius:'6px',background:DC_COLOR+'40',color:'#b9befe',fontWeight:600}}>{m.type.toUpperCase()}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Servers */}
      {tab==='servers'&&(
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {DEMO_SERVERS.map(sv=>(
            <div key={sv.id} style={{background:'#fff',borderRadius:'12px',padding:'18px',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:'16px',flexWrap:'wrap'}}>
              <div style={{width:'48px',height:'48px',borderRadius:'12px',background:DC_BG,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <i className="bi bi-discord" style={{color:DC_COLOR,fontSize:'1.4rem'}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,color:'#1e293b'}}>{sv.name}</div>
                <div style={{fontSize:'0.78rem',color:'#64748b'}}>{sv.channels} channels · Role: <strong>{sv.role}</strong></div>
              </div>
              <div style={{display:'flex',gap:'20px'}}>
                {[[sv.members.toLocaleString(),'Members','#6366f1'],[sv.online,'Online','#22c55e'],[sv.otp,'OTPs','#f59e0b']].map(([v,l,c])=>(
                  <div key={l as string} style={{textAlign:'center'}}>
                    <div style={{fontWeight:700,color:c as string}}>{v}</div>
                    <div style={{fontSize:'0.68rem',color:'#94a3b8'}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {accounts.map(a=>(
            <div key={a.id} style={{background:'#fff',borderRadius:'12px',padding:'16px',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:'14px',flexWrap:'wrap'}}>
              <div style={{width:'40px',height:'40px',borderRadius:'50%',background:DC_COLOR,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:'0.8rem',flexShrink:0}}>
                {a.handle.split('#')[0].slice(0,2).toUpperCase()}
              </div>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                  <span style={{fontWeight:600,color:'#1e293b'}}>{a.handle}</span>
                  {a.nitro&&<span style={{fontSize:'0.68rem',padding:'2px 6px',borderRadius:'4px',background:'#f0abfc',color:'#7e22ce',fontWeight:700}}>NITRO</span>}
                </div>
                <div style={{fontSize:'0.75rem',color:'#94a3b8'}}>{a.servers} servers · {a.otp} OTPs captured</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                <div style={{width:'8px',height:'8px',borderRadius:'50%',background:a.status==='online'?'#22c55e':a.status==='idle'?'#fbbf24':'#94a3b8'}}/>
                <span style={{fontSize:'0.78rem',color:'#64748b',fontWeight:500,textTransform:'capitalize'}}>{a.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create */}
      {tab==='create'&&(
        <div style={{background:'#fff',borderRadius:'14px',padding:'28px',border:'1px solid #e2e8f0'}}>
          <h3 style={{margin:'0 0 8px',color:'#1e293b',fontWeight:700}}><i className="bi bi-robot" style={{marginRight:'8px',color:DC_COLOR}}/> Autonomous Discord Account Creation</h3>
          <p style={{color:'#64748b',fontSize:'0.85rem',marginBottom:'20px'}}>Bypasses hCaptcha with AI. Creates accounts with valid phone verification via iVASMS pool.</p>
          {!creating?(
            <button onClick={startCreate} style={{background:DC_COLOR,color:'#fff',border:'none',borderRadius:'10px',padding:'12px 28px',fontWeight:700,fontSize:'0.95rem',cursor:'pointer',display:'flex',alignItems:'center',gap:'8px'}}>
              <i className="bi bi-play-fill"/> Start Autonomous Creation
            </button>
          ):(
            <div>
              <div style={{marginBottom:'10px',fontWeight:600,color:'#1e293b',display:'flex',alignItems:'center',gap:'8px'}}><i className="bi bi-cpu spin" style={{color:DC_COLOR}}/> Step {createStep+1}/{AUTO_STEPS.length}</div>
              <div style={{width:'100%',height:'6px',background:'#e2e8f0',borderRadius:'99px',marginBottom:'14px',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${((createStep+1)/AUTO_STEPS.length)*100}%`,background:DC_COLOR,borderRadius:'99px',transition:'width .5s'}}/>
              </div>
              <div ref={logRef} style={{background:'#1e2124',borderRadius:'10px',padding:'16px',maxHeight:'200px',overflowY:'auto',fontFamily:'monospace',fontSize:'0.8rem',color:'#dcddde',lineHeight:1.7}}>
                {createLog.map((l,i)=><div key={i}><span style={{color:DC_COLOR}}>{'>'}</span> {l}{i===createLog.length-1&&<span className="spin" style={{display:'inline-block',marginLeft:'4px'}}>▋</span>}</div>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bot */}
      {tab==='bot'&&(
        <div>
          <div style={{background:'#36393f',borderRadius:'14px',padding:'20px',marginBottom:'16px',border:'1px solid #202225'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'16px'}}>
              <div style={{width:'52px',height:'52px',borderRadius:'50%',background:DC_COLOR,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="bi bi-robot" style={{color:'#fff',fontSize:'1.4rem'}}/>
              </div>
              <div>
                <div style={{color:'#fff',fontWeight:700,fontSize:'1.05rem'}}>DL-OTP-Bot#0001</div>
                <div style={{display:'flex',alignItems:'center',gap:'6px',marginTop:'2px'}}>
                  <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#22c55e'}}/>
                  <span style={{color:'#22c55e',fontSize:'0.8rem',fontWeight:500}}>Online — Serving 24 servers</span>
                </div>
              </div>
              <div style={{marginLeft:'auto',background:'#5865F240',border:'1px solid #5865F2',borderRadius:'8px',padding:'6px 14px',color:'#b9befe',fontSize:'0.8rem',fontWeight:600}}>
                <i className="bi bi-key-fill" style={{marginRight:'6px'}}/>Bot Token Active
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:'10px'}}>
              {[['Servers',24,'#6366f1'],['Commands/day','2,847','#10b981'],['Uptime','99.9%','#22c55e'],['Latency','18ms','#f59e0b']].map(([l,v,c])=>(
                <div key={l as string} style={{background:'#2f3136',borderRadius:'8px',padding:'12px',textAlign:'center'}}>
                  <div style={{color:c as string,fontWeight:700,fontSize:'1.15rem'}}>{v}</div>
                  <div style={{color:'#72767d',fontSize:'0.7rem',marginTop:'2px'}}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:'#fff',borderRadius:'14px',padding:'20px',border:'1px solid #e2e8f0'}}>
            <h4 style={{margin:'0 0 14px',fontWeight:700,color:'#1e293b'}}>Bot Commands</h4>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {BOT_COMMANDS.map(c=>(
                <div key={c.cmd} style={{display:'flex',alignItems:'center',gap:'14px',padding:'10px 14px',borderRadius:'8px',background:'#f8fafc',border:'1px solid #e2e8f0'}}>
                  <span style={{fontFamily:'monospace',fontWeight:700,color:DC_COLOR,minWidth:'120px'}}>{c.cmd}</span>
                  <span style={{flex:1,fontSize:'0.85rem',color:'#475569'}}>{c.desc}</span>
                  <span style={{fontSize:'0.75rem',color:'#94a3b8'}}>{c.uses.toLocaleString()} uses</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
