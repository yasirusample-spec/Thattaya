'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

const KNOWN_DEVICES = [
  { model: 'Samsung Galaxy S25 Ultra', brand: 'Samsung', os: 'Android 15', icon: '📱', color: '#1428a0' },
  { model: 'Samsung Galaxy S25+',      brand: 'Samsung', os: 'Android 15', icon: '📱', color: '#1428a0' },
  { model: 'Samsung Galaxy S24 Ultra', brand: 'Samsung', os: 'Android 14', icon: '📱', color: '#1428a0' },
  { model: 'Samsung Galaxy Z Fold 6',  brand: 'Samsung', os: 'Android 14', icon: '📱', color: '#1428a0' },
  { model: 'Samsung Galaxy A55',       brand: 'Samsung', os: 'Android 14', icon: '📱', color: '#1428a0' },
  { model: 'Google Pixel 9 Pro XL',   brand: 'Google',  os: 'Android 15', icon: '🔵', color: '#4285f4' },
  { model: 'Google Pixel 9 Pro',      brand: 'Google',  os: 'Android 15', icon: '🔵', color: '#4285f4' },
  { model: 'Google Pixel 9',          brand: 'Google',  os: 'Android 15', icon: '🔵', color: '#4285f4' },
  { model: 'Google Pixel 8a',         brand: 'Google',  os: 'Android 14', icon: '🔵', color: '#4285f4' },
  { model: 'iPhone 16 Pro Max',       brand: 'Apple',   os: 'iOS 18',     icon: '🍎', color: '#555' },
  { model: 'iPhone 16 Pro',           brand: 'Apple',   os: 'iOS 18',     icon: '🍎', color: '#555' },
  { model: 'iPhone 16',               brand: 'Apple',   os: 'iOS 18',     icon: '🍎', color: '#555' },
  { model: 'iPhone 15 Pro Max',       brand: 'Apple',   os: 'iOS 17',     icon: '🍎', color: '#555' },
  { model: 'OnePlus 13',              brand: 'OnePlus', os: 'Android 15', icon: '📲', color: '#f5010c' },
  { model: 'Xiaomi 15 Ultra',         brand: 'Xiaomi',  os: 'Android 15', icon: '📲', color: '#ff6900' },
  { model: 'Xiaomi Redmi Note 13',    brand: 'Xiaomi',  os: 'Android 13', icon: '📲', color: '#ff6900' },
  { model: 'OPPO Find X8 Pro',        brand: 'OPPO',    os: 'Android 15', icon: '📲', color: '#1d6fa4' },
  { model: 'Realme GT 7 Pro',         brand: 'Realme',  os: 'Android 15', icon: '📲', color: '#f5a623' },
  { model: 'Custom / Other',          brand: 'Other',   os: 'Android/iOS',icon: '📲', color: '#666' },
]

function fmtTime(ts: string) {
  try {
    const d = new Date(ts)
    const diff = Date.now() - d.getTime()
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`
    return d.toLocaleDateString()
  } catch { return ts }
}

function DeviceBrandIcon({ brand, size = 16 }: { brand: string; size?: number }) {
  const colors: Record<string, string> = {
    Samsung: '#1428a0', Google: '#4285f4', Apple: '#555',
    OnePlus: '#f5010c', Xiaomi: '#ff6900', OPPO: '#1d6fa4',
    Realme: '#f5a623', Other: '#666',
  }
  const icons: Record<string, string> = {
    Samsung: 'bi-phone-fill', Google: 'bi-phone-fill', Apple: 'bi-phone-fill',
    OnePlus: 'bi-phone-fill', Xiaomi: 'bi-phone-fill', Other: 'bi-phone-fill',
  }
  return <i className={`bi ${icons[brand] || 'bi-phone-fill'}`} style={{ fontSize: size, color: colors[brand] || '#666' }} />
}

export default function WhatsAppPage() {
  const [status,      setStatus]      = useState<any>(null)
  const [numbers,     setNumbers]     = useState<any[]>([])
  const [messages,    setMessages]    = useState<any[]>([])
  const [devices,     setDevices]     = useState<any[]>([])
  const [stats,       setStats]       = useState<any>(null)
  const [selNum,      setSelNum]      = useState('')
  const [linking,     setLinking]     = useState(false)
  const [unlinking,   setUnlinking]   = useState(false)
  const [sendTo,      setSendTo]      = useState('')
  const [sendMsg,     setSendMsg]     = useState('')
  const [sending,     setSending]     = useState(false)
  const [result,      setResult]      = useState<any>(null)
  const [tab,         setTab]         = useState<'status'|'devices'|'messages'|'send'|'broadcast'>('status')
  const [showAddDev,  setShowAddDev]  = useState(false)
  const [devModel,    setDevModel]    = useState('')
  const [devName,     setDevName]     = useState('')
  const [devPhone,    setDevPhone]    = useState('')
  const [addingDev,   setAddingDev]   = useState(false)
  const [broadTargets,setBroadTargets]= useState('')
  const [broadMsg,    setBroadMsg]    = useState('')
  const [broadcasting,setBroadcasting]= useState(false)
  const [broadHist,   setBroadHist]   = useState<any[]>([])
  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null)

  const load = useCallback(async () => {
    try {
      const [sr, nr, dr, stR, bh] = await Promise.all([
        fetch('/api/whatsapp/status').then(r=>r.json()),
        fetch('/api/ivasms/numbers').then(r=>r.json()),
        fetch('/api/whatsapp/devices').then(r=>r.json()),
        fetch('/api/whatsapp/stats').then(r=>r.json()),
        fetch('/api/whatsapp/broadcast').then(r=>r.json()),
      ])
      setStatus(sr)
      setNumbers((nr.numbers||[]).filter((n:any)=>n.status==='active'||n.status==='inactive'))
      setDevices(dr.devices||[])
      setStats(stR)
      setBroadHist(bh.history||[])
      if (sr.connected) {
        const mr = await fetch('/api/whatsapp/messages')
        if (mr.ok) { const d=await mr.json(); setMessages(d.messages||[]) }
      }
    } catch {}
  }, [])

  useEffect(() => {
    load()
    pollRef.current = setInterval(load, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [load])

  const linkNumber = async () => {
    if (!selNum) { setResult({error:'Select a number'}); return }
    const num = numbers.find((n:any)=>n.id===selNum)
    setLinking(true); setResult(null)
    try {
      const r = await fetch('/api/whatsapp/link',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({numberId:selNum, numberPhone:num?.phone}),
      })
      const d = await r.json()
      if (d.ok) { setResult({success:`WhatsApp linked to ${d.phone}`}); load() }
      else setResult({error:d.error||'Link failed'})
    } catch(e:any) { setResult({error:e.message}) }
    setLinking(false)
  }

  const unlinkNumber = async () => {
    if (!confirm('Unlink WhatsApp? All devices will be disconnected.')) return
    setUnlinking(true)
    try { await fetch('/api/whatsapp/unlink',{method:'POST'}); load() } catch {}
    setUnlinking(false)
  }

  const sendMessage = async () => {
    if (!sendTo||!sendMsg.trim()) return
    setSending(true); setResult(null)
    try {
      const r = await fetch('/api/whatsapp/send',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({to:sendTo, message:sendMsg}),
      })
      const d = await r.json()
      if (d.ok) { setResult({success:'Message sent!'}); setSendMsg('') }
      else setResult({error:d.error||'Send failed'})
    } catch {}
    setSending(false)
  }

  const addDevice = async () => {
    if (!devModel) { setResult({error:'Select a device model'}); return }
    const preset = KNOWN_DEVICES.find(d=>d.model===devModel)
    setAddingDev(true); setResult(null)
    try {
      const r = await fetch('/api/whatsapp/devices',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          name: devName || preset?.model,
          model: devModel,
          brand: preset?.brand || 'Other',
          os: preset?.os || 'Android',
          icon: preset?.icon || '📱',
          phone: devPhone || status?.number,
        }),
      })
      const d = await r.json()
      if (d.ok) { setResult({success:`Device "${d.device.name}" registered!`}); setShowAddDev(false); setDevModel(''); setDevName(''); setDevPhone(''); load() }
      else setResult({error:d.error||'Failed to add device'})
    } catch(e:any) { setResult({error:e.message}) }
    setAddingDev(false)
  }

  const removeDevice = async (id: string) => {
    if (!confirm('Remove this device?')) return
    await fetch(`/api/whatsapp/devices/${id}`,{method:'DELETE'})
    load()
  }

  const sendBroadcast = async () => {
    if (!broadTargets.trim()||!broadMsg.trim()) return
    const targets = broadTargets.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean)
    if (targets.length===0) return
    setBroadcasting(true); setResult(null)
    try {
      const r = await fetch('/api/whatsapp/broadcast',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({targets, message:broadMsg}),
      })
      const d = await r.json()
      if (d.ok) { setResult({success:`Broadcast sent to ${d.sent} recipients!`}); setBroadTargets(''); setBroadMsg(''); load() }
      else setResult({error:d.error||'Broadcast failed'})
    } catch(e:any) { setResult({error:e.message}) }
    setBroadcasting(false)
  }

  const connected = status?.connected

  const TABS = [
    { id:'status',    label:'Status & Setup',  icon:'bi-info-circle-fill' },
    { id:'devices',   label:`Devices${devices.length>0?` (${devices.length})`:''}`, icon:'bi-phone-fill' },
    { id:'messages',  label:`Messages${messages.length>0?` (${messages.length})`:''}`, icon:'bi-chat-dots-fill' },
    { id:'send',      label:'Send',             icon:'bi-send-fill' },
    { id:'broadcast', label:'Broadcast',        icon:'bi-broadcast-pin' },
  ]

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <h2 style={{fontSize:22,fontWeight:900,color:'var(--text)',display:'flex',alignItems:'center',gap:10,margin:0}}>
            <i className="bi bi-whatsapp" style={{color:'#25d366',fontSize:20}} />
            WhatsApp Integration
          </h2>
          <p style={{color:'var(--text3)',fontSize:13,marginTop:4,marginBottom:0}}>
            Link iVASMS numbers · Register devices · Broadcast messages
          </p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          {/* Stats row */}
          {stats && (
            <>
              <div style={{padding:'6px 12px',background:'rgba(37,211,102,.08)',border:'1px solid rgba(37,211,102,.2)',borderRadius:8,fontSize:11,fontWeight:700,color:'#25d366',display:'flex',alignItems:'center',gap:5}}>
                <i className="bi bi-phone-fill" style={{fontSize:11}} />{stats.devices||0} devices
              </div>
              <div style={{padding:'6px 12px',background:'rgba(59,130,246,.08)',border:'1px solid rgba(59,130,246,.2)',borderRadius:8,fontSize:11,fontWeight:700,color:'#3b82f6',display:'flex',alignItems:'center',gap:5}}>
                <i className="bi bi-chat-dots-fill" style={{fontSize:11}} />{stats.received||0} received
              </div>
              <div style={{padding:'6px 12px',background:'rgba(229,9,20,.08)',border:'1px solid rgba(229,9,20,.2)',borderRadius:8,fontSize:11,fontWeight:700,color:'var(--accent)',display:'flex',alignItems:'center',gap:5}}>
                <i className="bi bi-send-fill" style={{fontSize:11}} />{stats.sent||0} sent
              </div>
            </>
          )}
          {/* Connection badge */}
          <div style={{
            display:'flex',alignItems:'center',gap:8,padding:'8px 14px',
            background:connected?'rgba(37,211,102,.08)':'rgba(255,255,255,.04)',
            border:`1px solid ${connected?'rgba(37,211,102,.25)':'var(--border)'}`,
            borderRadius:20,fontSize:13,fontWeight:700,
            color:connected?'#25d366':'var(--text3)',
          }}>
            <span style={{width:8,height:8,borderRadius:'50%',background:connected?'#25d366':'var(--text3)',animation:connected?'livePulse 2s ease-in-out infinite':'none'}} />
            {connected?`Connected: ${status?.number}`:'Disconnected'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {TABS.map(t=>(
          <button key={t.id} className={`tab-item ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id as any)}>
            <i className={`bi ${t.icon}`} style={{marginRight:6,fontSize:12}} />{t.label}
          </button>
        ))}
      </div>

      {/* Global result alert */}
      {result && (
        <div className={`alert ${result.error?'alert-error':'alert-success'}`}>
          <i className={`bi ${result.error?'bi-exclamation-triangle-fill':'bi-check-circle-fill'}`} />
          {result.error||result.success}
          <button onClick={()=>setResult(null)} style={{marginLeft:'auto',background:'none',border:'none',color:'inherit',cursor:'pointer',padding:2}}><i className="bi bi-x" /></button>
        </div>
      )}

      {/* ── STATUS & SETUP ── */}
      {tab==='status' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {!connected ? (
            <div className="card">
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,paddingBottom:14,borderBottom:'1px solid var(--border)'}}>
                <div style={{width:36,height:36,borderRadius:9,background:'rgba(37,211,102,.1)',border:'1px solid rgba(37,211,102,.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <i className="bi bi-link-45deg" style={{fontSize:17,color:'#25d366'}} />
                </div>
                <div>
                  <h3 style={{fontSize:15,fontWeight:700,color:'var(--text)',margin:0}}>Link iVASMS Number</h3>
                  <p style={{fontSize:12,color:'var(--text3)',margin:'2px 0 0'}}>Connect a phone number to enable WhatsApp features</p>
                </div>
              </div>

              {/* Steps */}
              <div style={{display:'flex',alignItems:'center',gap:0,marginBottom:24}}>
                {['Sync Numbers','Select Number','Link WhatsApp'].map((step,i)=>(
                  <div key={step} style={{display:'flex',alignItems:'center',flex:i<2?1:'none'}}>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                      <div style={{
                        width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:12,fontWeight:800,
                        background:i===0&&numbers.length>0?'rgba(37,211,102,.15)':i===0?'rgba(37,211,102,.08)':'rgba(255,255,255,.05)',
                        border:`2px solid ${i===0&&numbers.length>0?'var(--green)':i===0?'rgba(37,211,102,.4)':'var(--border)'}`,
                        color:i===0&&numbers.length>0?'var(--green)':i===0?'rgba(37,211,102,.8)':'var(--text3)',
                      }}>
                        {i===0&&numbers.length>0?<i className="bi bi-check-lg" style={{fontSize:13}} />:i+1}
                      </div>
                      <div style={{fontSize:10,fontWeight:600,color:'var(--text3)',whiteSpace:'nowrap'}}>{step}</div>
                    </div>
                    {i<2&&<div style={{flex:1,height:2,background:i===0&&numbers.length>0?'var(--green)':'var(--border)',margin:'0 8px',marginBottom:18}} />}
                  </div>
                ))}
              </div>

              {numbers.length===0?(
                <div className="alert alert-warn" style={{marginBottom:16}}>
                  <i className="bi bi-exclamation-triangle-fill" />
                  <div>No active numbers found. Go to <a href="/numbers" style={{color:'var(--orange)',textDecoration:'underline'}}>Numbers</a> and sync your iVASMS account first.</div>
                </div>
              ):(
                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div className="form-group">
                    <label className="form-label">Select a number to link</label>
                    <select value={selNum} onChange={e=>setSelNum(e.target.value)}>
                      <option value="">— Choose a number —</option>
                      {numbers.map((n:any)=>(
                        <option key={n.id} value={n.id}>
                          {n.phone} ({n.country_name||n.country}) — {n.status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button onClick={linkNumber} disabled={linking||!selNum} className="btn-success" style={{gap:8}}>
                    <i className="bi bi-whatsapp" style={{fontSize:16}} />
                    {linking?'Linking…':'Link to WhatsApp'}
                  </button>
                </div>
              )}
            </div>
          ):(
            /* Connected card */
            <div className="card">
              <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20}}>
                <div style={{width:60,height:60,borderRadius:16,background:'rgba(37,211,102,.12)',border:'2px solid rgba(37,211,102,.3)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
                  <i className="bi bi-whatsapp" style={{fontSize:30,color:'#25d366'}} />
                  <span style={{position:'absolute',bottom:4,right:4,width:12,height:12,borderRadius:'50%',background:'#25d366',border:'2px solid var(--card)',boxShadow:'0 0 8px #25d366'}} />
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:17,fontWeight:900,color:'var(--text)'}}>WhatsApp Connected</div>
                  <div style={{fontSize:14,color:'#25d366',marginTop:3,fontFamily:'monospace',fontWeight:700}}>{status?.number}</div>
                  <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{devices.length} device{devices.length!==1?'s':''} registered</div>
                </div>
                <button onClick={unlinkNumber} disabled={unlinking} className="btn-danger btn-sm" style={{gap:6}}>
                  <i className="bi bi-x-circle-fill" style={{fontSize:13}} />
                  {unlinking?'Unlinking…':'Unlink'}
                </button>
              </div>

              {/* Quick stat grid */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
                {[
                  {label:'Devices',     val:stats?.devices||0,       icon:'bi-phone-fill',       color:'#25d366'},
                  {label:'Received',    val:stats?.received||0,      icon:'bi-chat-dots-fill',   color:'#3b82f6'},
                  {label:'Sent',        val:stats?.sent||0,          icon:'bi-send-fill',        color:'var(--accent)'},
                ].map(s=>(
                  <div key={s.label} style={{padding:'12px 14px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:10,textAlign:'center'}}>
                    <i className={`bi ${s.icon}`} style={{fontSize:18,color:s.color,marginBottom:4,display:'block'}} />
                    <div style={{fontSize:18,fontWeight:900,color:'var(--text)'}}>{s.val}</div>
                    <div style={{fontSize:10,color:'var(--text3)',fontWeight:600}}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                <button onClick={()=>setTab('devices')} className="btn-success btn-sm" style={{gap:6}}>
                  <i className="bi bi-phone-fill" style={{fontSize:12}} />Manage Devices
                </button>
                <button onClick={()=>setTab('messages')} className="btn-primary btn-sm" style={{gap:6}}>
                  <i className="bi bi-chat-dots-fill" style={{fontSize:12}} />Messages
                </button>
                <button onClick={()=>setTab('send')} className="btn-secondary btn-sm" style={{gap:6}}>
                  <i className="bi bi-send-fill" style={{fontSize:12}} />Send
                </button>
                <button onClick={()=>setTab('broadcast')} className="btn-secondary btn-sm" style={{gap:6}}>
                  <i className="bi bi-broadcast-pin" style={{fontSize:12}} />Broadcast
                </button>
              </div>
            </div>
          )}

          <div className="alert alert-info">
            <i className="bi bi-info-circle-fill" />
            <div>
              <strong>DL SMS Client WhatsApp Integration</strong> — link an iVASMS number, register your devices (Samsung Galaxy S25 Ultra, Pixel 9, iPhone 16, etc.) and monitor messages in real-time. Broadcast and send functionality works on Cloudflare edge.
            </div>
          </div>
        </div>
      )}

      {/* ── DEVICES ── */}
      {tab==='devices' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="card" style={{padding:0,overflow:'hidden'}}>
            <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
              <i className="bi bi-phone-fill" style={{color:'#25d366',fontSize:15}} />
              <span style={{fontSize:13,fontWeight:700,color:'var(--text)',flex:1}}>Registered Devices</span>
              <button onClick={load} className="btn-ghost btn-sm" style={{gap:5}}>
                <i className="bi bi-arrow-repeat" style={{fontSize:13}} />Refresh
              </button>
              {connected && (
                <button onClick={()=>setShowAddDev(v=>!v)} className="btn-success btn-sm" style={{gap:5}}>
                  <i className="bi bi-plus-circle-fill" style={{fontSize:12}} />Add Device
                </button>
              )}
            </div>

            {/* Add device form */}
            {showAddDev && (
              <div style={{padding:'16px 20px',borderBottom:'1px solid var(--border)',background:'rgba(37,211,102,.03)'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                  <div className="form-group" style={{margin:0}}>
                    <label className="form-label">Device Model</label>
                    <select value={devModel} onChange={e=>setDevModel(e.target.value)}>
                      <option value="">— Select model —</option>
                      {KNOWN_DEVICES.map(d=>(
                        <option key={d.model} value={d.model}>{d.icon} {d.model}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{margin:0}}>
                    <label className="form-label">Custom Name (optional)</label>
                    <input value={devName} onChange={e=>setDevName(e.target.value)} placeholder="e.g. My Work Phone" />
                  </div>
                </div>
                <div className="form-group" style={{margin:'0 0 12px'}}>
                  <label className="form-label">Phone Number (optional)</label>
                  <input value={devPhone} onChange={e=>setDevPhone(e.target.value)} placeholder={status?.number||'+1234567890'} />
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={addDevice} disabled={addingDev||!devModel} className="btn-success btn-sm" style={{gap:6}}>
                    <i className="bi bi-plus-circle-fill" style={{fontSize:12}} />
                    {addingDev?'Registering…':'Register Device'}
                  </button>
                  <button onClick={()=>setShowAddDev(false)} className="btn-ghost btn-sm">Cancel</button>
                </div>
              </div>
            )}

            {!connected ? (
              <div style={{padding:40,textAlign:'center',color:'var(--text3)'}}>
                <i className="bi bi-phone-fill" style={{fontSize:40,display:'block',marginBottom:12,opacity:.2}} />
                Link a WhatsApp number first to register devices.
              </div>
            ) : devices.length===0 ? (
              <div style={{padding:40,textAlign:'center',color:'var(--text3)'}}>
                <i className="bi bi-phone-fill" style={{fontSize:40,display:'block',marginBottom:12,opacity:.2}} />
                <div style={{fontSize:14,fontWeight:600,marginBottom:8}}>No devices registered</div>
                <div style={{fontSize:12}}>Click "Add Device" to register your Samsung, Pixel, iPhone, etc.</div>
              </div>
            ) : (
              <div style={{padding:16,display:'flex',flexDirection:'column',gap:10}}>
                {devices.map((dev:any)=>{
                  const preset = KNOWN_DEVICES.find(d=>d.model===dev.model)||KNOWN_DEVICES[KNOWN_DEVICES.length-1]
                  return (
                    <div key={dev.id} style={{
                      display:'flex',alignItems:'center',gap:14,padding:'14px 16px',
                      background:'var(--bg)',border:'1px solid var(--border)',borderRadius:12,
                      transition:'border-color .15s',
                    }}
                      onMouseEnter={e=>(e.currentTarget.style.borderColor='rgba(37,211,102,.25)')}
                      onMouseLeave={e=>(e.currentTarget.style.borderColor='var(--border)')}>
                      {/* Device icon */}
                      <div style={{
                        width:44,height:44,borderRadius:12,
                        background:`${preset.color}18`,
                        border:`1.5px solid ${preset.color}40`,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:22,flexShrink:0,
                      }}>
                        {dev.icon||preset.icon}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                          <span style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>{dev.name||dev.model}</span>
                          <span style={{
                            fontSize:9,fontWeight:800,padding:'2px 6px',borderRadius:5,
                            background:dev.status==='connected'?'rgba(37,211,102,.15)':'rgba(255,255,255,.06)',
                            color:dev.status==='connected'?'var(--green)':'var(--text3)',
                            textTransform:'uppercase',letterSpacing:.5,
                          }}>{dev.status||'connected'}</span>
                        </div>
                        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                          <span style={{fontSize:11,color:'var(--text3)',display:'flex',alignItems:'center',gap:4}}>
                            <DeviceBrandIcon brand={dev.brand} size={11} />{dev.brand} · {dev.os}
                          </span>
                          {dev.phone && (
                            <span style={{fontSize:11,color:'var(--text3)',display:'flex',alignItems:'center',gap:4}}>
                              <i className="bi bi-telephone-fill" style={{fontSize:10}} />{dev.phone}
                            </span>
                          )}
                          <span style={{fontSize:11,color:'var(--text3)',display:'flex',alignItems:'center',gap:4}}>
                            <i className="bi bi-clock-fill" style={{fontSize:10}} />{fmtTime(dev.lastSeen)}
                          </span>
                          {dev.ipAddress && dev.ipAddress!=='unknown' && (
                            <span style={{fontSize:11,color:'var(--text3)',display:'flex',alignItems:'center',gap:4}}>
                              <i className="bi bi-globe" style={{fontSize:10}} />{dev.ipAddress}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{display:'flex',gap:6,flexShrink:0}}>
                        {dev.batteryPct!==null&&dev.batteryPct!==undefined&&(
                          <span style={{fontSize:10,fontWeight:700,color:'var(--green)',padding:'3px 7px',background:'rgba(0,230,118,.1)',borderRadius:5,display:'flex',alignItems:'center',gap:3}}>
                            <i className="bi bi-battery-half" style={{fontSize:11}} />{dev.batteryPct}%
                          </span>
                        )}
                        <button onClick={()=>removeDevice(dev.id)} className="btn-danger btn-sm" title="Remove device" style={{padding:'4px 8px'}}>
                          <i className="bi bi-trash" style={{fontSize:12}} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Supported devices reference */}
          <div className="card">
            <h3 style={{fontSize:13,fontWeight:700,color:'var(--text)',marginBottom:14,display:'flex',alignItems:'center',gap:8}}>
              <i className="bi bi-phone-fill" style={{color:'#25d366',fontSize:13}} />
              Supported Device Models
            </h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:8}}>
              {KNOWN_DEVICES.filter(d=>d.model!=='Custom / Other').map(d=>(
                <div key={d.model} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:8}}>
                  <span style={{fontSize:16}}>{d.icon}</span>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--text)'}}>{d.model}</div>
                    <div style={{fontSize:10,color:'var(--text3)'}}>{d.os}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MESSAGES ── */}
      {tab==='messages' && (
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
            <i className="bi bi-chat-dots-fill" style={{color:'#25d366',fontSize:15}} />
            <span style={{fontSize:13,fontWeight:700,color:'var(--text)',flex:1}}>
              Messages {connected?`for ${status?.number}`:'— Not connected'}
            </span>
            <button onClick={load} className="btn-ghost btn-sm" style={{gap:5}}>
              <i className="bi bi-arrow-repeat" style={{fontSize:13}} />Refresh
            </button>
          </div>
          {!connected?(
            <div style={{padding:40,textAlign:'center',color:'var(--text3)'}}>
              <i className="bi bi-whatsapp" style={{fontSize:40,display:'block',marginBottom:12,opacity:.2}} />
              Link a WhatsApp number first to see messages.
            </div>
          ):messages.length===0?(
            <div style={{padding:40,textAlign:'center',color:'var(--text3)'}}>
              <i className="bi bi-chat-dots-fill" style={{fontSize:36,display:'block',marginBottom:12,opacity:.2}} />
              No messages yet. Sync iVASMS to load SMS for this number.
            </div>
          ):(
            <div style={{padding:16,display:'flex',flexDirection:'column',gap:10,maxHeight:500,overflowY:'auto'}}>
              {messages.map((m:any)=>(
                <div key={m.id} className="sms-item" style={{borderLeft:`3px solid #25d366`}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
                    <i className="bi bi-person-circle" style={{color:'#25d366',fontSize:14}} />
                    <span style={{fontSize:12,fontWeight:600,color:'var(--text2)'}}>{m.sender}</span>
                    {m.otp&&<span style={{background:'rgba(37,211,102,.12)',color:'#25d366',fontWeight:700,fontSize:12,padding:'2px 8px',borderRadius:5,fontFamily:'monospace',letterSpacing:2}}>{m.otp}</span>}
                    <span style={{marginLeft:'auto',fontSize:10,color:'var(--text3)'}}>{fmtTime(m.received_at)}</span>
                  </div>
                  <p style={{fontSize:12,color:'var(--text2)',lineHeight:1.5,margin:0}}>{m.body}</p>
                  {m.service&&m.service!=='Unknown'&&(
                    <div style={{marginTop:5}}>
                      <span style={{fontSize:10,color:'var(--text3)',background:'var(--bg)',padding:'2px 7px',borderRadius:5,border:'1px solid var(--border)'}}>{m.service}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SEND ── */}
      {tab==='send' && (
        <div className="card" style={{maxWidth:540}}>
          <h3 style={{fontSize:15,fontWeight:700,color:'var(--text)',marginBottom:18,display:'flex',alignItems:'center',gap:8}}>
            <i className="bi bi-send-fill" style={{color:'#25d366',fontSize:14}} />Send WhatsApp Message
          </h3>
          {!connected&&(
            <div className="alert alert-warn" style={{marginBottom:16}}>
              <i className="bi bi-exclamation-triangle-fill" />Link a WhatsApp number first before sending messages.
            </div>
          )}
          <div className="form-group" style={{marginBottom:14}}>
            <label className="form-label">To (phone number)</label>
            <div className="input-group">
              <i className="bi bi-telephone-fill input-icon" />
              <input value={sendTo} onChange={e=>setSendTo(e.target.value)} placeholder="+1234567890" />
            </div>
          </div>
          <div className="form-group" style={{marginBottom:16}}>
            <label className="form-label">Message</label>
            <textarea value={sendMsg} onChange={e=>setSendMsg(e.target.value)} placeholder="Type your message…" style={{minHeight:100}} />
          </div>
          <button onClick={sendMessage} disabled={sending||!connected||!sendTo||!sendMsg.trim()} className="btn-success" style={{gap:8}}>
            <i className="bi bi-send-fill" style={{fontSize:14}} />
            {sending?'Sending…':'Send Message'}
          </button>
        </div>
      )}

      {/* ── BROADCAST ── */}
      {tab==='broadcast' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div className="card" style={{maxWidth:600}}>
            <h3 style={{fontSize:15,fontWeight:700,color:'var(--text)',marginBottom:6,display:'flex',alignItems:'center',gap:8}}>
              <i className="bi bi-broadcast-pin" style={{color:'#25d366',fontSize:14}} />WhatsApp Broadcast
            </h3>
            <p style={{fontSize:12,color:'var(--text3)',marginBottom:18}}>Send a message to multiple recipients at once (max 100).</p>
            {!connected&&(
              <div className="alert alert-warn" style={{marginBottom:16}}>
                <i className="bi bi-exclamation-triangle-fill" />Link a WhatsApp number first.
              </div>
            )}
            <div className="form-group" style={{marginBottom:14}}>
              <label className="form-label">Recipients (one per line or comma-separated)</label>
              <textarea value={broadTargets} onChange={e=>setBroadTargets(e.target.value)} placeholder={"+1234567890\n+9876543210\n..."} style={{minHeight:100,fontFamily:'monospace',fontSize:12}} />
              {broadTargets.trim()&&(
                <div style={{fontSize:11,color:'var(--text3)',marginTop:4}}>
                  {broadTargets.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean).length} recipients
                </div>
              )}
            </div>
            <div className="form-group" style={{marginBottom:16}}>
              <label className="form-label">Message</label>
              <textarea value={broadMsg} onChange={e=>setBroadMsg(e.target.value)} placeholder="Your broadcast message…" style={{minHeight:80}} />
            </div>
            <button onClick={sendBroadcast} disabled={broadcasting||!connected||!broadTargets.trim()||!broadMsg.trim()} className="btn-success" style={{gap:8}}>
              <i className="bi bi-broadcast-pin" style={{fontSize:14}} />
              {broadcasting?'Broadcasting…':'Send Broadcast'}
            </button>
          </div>

          {/* Broadcast history */}
          {broadHist.length>0&&(
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',fontSize:12,fontWeight:700,color:'var(--text3)'}}>BROADCAST HISTORY</div>
              <div style={{padding:12,display:'flex',flexDirection:'column',gap:8,maxHeight:300,overflowY:'auto'}}>
                {broadHist.map((h:any)=>(
                  <div key={h.id} style={{padding:'10px 14px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:8}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <span style={{fontSize:11,fontWeight:700,color:'var(--text)'}}>{h.count} recipients</span>
                      <span style={{fontSize:10,color:'var(--text3)',marginLeft:'auto'}}>{fmtTime(h.ts)}</span>
                    </div>
                    <div style={{fontSize:11,color:'var(--text3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
