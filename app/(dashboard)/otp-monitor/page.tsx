'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

const G = {
  bg:'#0a0a0f', card:'#111118', card2:'#16161f', card3:'#1a1a24',
  border:'rgba(255,255,255,0.07)', border2:'rgba(255,255,255,0.12)',
  text1:'#f0f0f8', text2:'#a0a0b8', text3:'#60607a',
  accent:'#7c3aed', accentHover:'#8b5cf6', accentDim:'rgba(124,58,237,0.15)',
  green:'#10b981', greenDim:'rgba(16,185,129,0.12)',
  red:'#ef4444', redDim:'rgba(239,68,68,0.1)',
  yellow:'#f59e0b', yellowDim:'rgba(245,158,11,0.1)',
  blue:'#3b82f6', blueDim:'rgba(59,130,246,0.1)',
  pink:'#ec4899',
}
const SVC_COLORS: Record<string,string> = {
  Google:'#4285f4',WhatsApp:'#25d366',Telegram:'#229ed9',Facebook:'#1877f2',
  Amazon:'#ff9900',Microsoft:'#00a4ef',Apple:'#a8a8a8',Twitter:'#1da1f2',
  Netflix:'#e50914',TikTok:'#ff0050',Discord:'#5865f2',LinkedIn:'#0a66c2',
  Binance:'#f3ba2f',PayPal:'#003087',Coinbase:'#0052ff',Instagram:'#e1306c',
}

function beep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3)
  } catch {}
}

export default function OtpMonitor() {
  const [otps,       setOtps]       = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [watching,   setWatching]   = useState(false)
  const [serviceF,   setServiceF]   = useState('')
  const [services,   setServices]   = useState<string[]>([])
  const [newAlert,   setNewAlert]   = useState<any|null>(null)
  const [copied,     setCopied]     = useState<string|null>(null)
  const [msg,        setMsg]        = useState<{ok:boolean,text:string}|null>(null)
  const seenRef  = useRef<Set<string>>(new Set())
  const watchRef = useRef<any>(null)
  const now = Date.now()

  const load = useCallback(async (quiet=false) => {
    if (!quiet) setLoading(true)
    try {
      const r = await fetch('/api/ivasms/sms?hasOtp=true&limit=100')
      if (r.ok) {
        const d = await r.json()
        const arr: any[] = d.messages || []
        setOtps(arr)
        const svcs = [...new Set<string>(arr.map((o:any)=>String(o.service||'')))] as string[]
        setServices(svcs.filter(Boolean))
        if (watching) {
          const newOnes = arr.filter(o => !seenRef.current.has(String(o.id||'')))
          if (newOnes.length > 0) {
            newOnes.forEach(o => seenRef.current.add(String(o.id||'')))
            setNewAlert(newOnes[0])
            beep()
            setTimeout(() => setNewAlert(null), 8000)
          }
        } else {
          arr.forEach(o => seenRef.current.add(String(o.id||'')))
        }
      }
    } catch {}
    setLoading(false)
  }, [watching])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (watching) {
      watchRef.current = setInterval(() => load(true), 3000)
    } else {
      clearInterval(watchRef.current)
    }
    return () => clearInterval(watchRef.current)
  }, [watching, load])

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(key); setTimeout(() => setCopied(null), 2000)
  }

  const filtered = serviceF ? otps.filter(o => o.service === serviceF) : otps
  const recent   = filtered.filter(o => now - new Date(o.received_at).getTime() < 300000)
  const last5min = otps.filter(o => now - new Date(o.received_at).getTime() < 300000)
  const last1h   = otps.filter(o => now - new Date(o.received_at).getTime() < 3600000)

  const showMsg = (ok:boolean,text:string,ms=5000)=>{setMsg({ok,text});setTimeout(()=>setMsg(null),ms)}

  return (
    <div style={{maxWidth:1400,margin:'0 auto'}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes slideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{box-shadow:0 0 8px rgba(245,158,11,.5)}50%{box-shadow:0 0 20px rgba(245,158,11,.9)}}
        @keyframes newBadge{0%{transform:scale(1)}50%{transform:scale(1.1)}100%{transform:scale(1)}}
      `}</style>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{margin:0,fontSize:24,fontWeight:800,color:G.text1,letterSpacing:'-0.5px',display:'flex',alignItems:'center',gap:10}}>
            <i className="bi bi-key-fill" style={{color:G.yellow,fontSize:20}}/>
            OTP Monitor
          </h1>
          <p style={{margin:'4px 0 0',fontSize:12,color:G.text3}}>{otps.length} OTPs collected · {last5min.length} new in last 5 min</p>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          <button onClick={()=>setWatching(w=>!w)} style={{
            display:'flex',alignItems:'center',gap:8,padding:'10px 20px',borderRadius:10,
            background:watching?`linear-gradient(135deg,${G.green},#059669)`:G.card2,
            border:`1px solid ${watching?G.green:G.border2}`,
            color:watching?'#fff':G.text2,fontSize:13,fontWeight:700,cursor:'pointer',
            transition:'all .2s',
            ...(watching?{boxShadow:`0 4px 12px rgba(16,185,129,0.3)`}:{}),
          }}>
            <div style={{width:8,height:8,borderRadius:'50%',background:watching?'#fff':G.text3,animation:watching?'pulse 1s infinite':undefined}}/>
            {watching ? '⏹ Stop Watch' : '▶ Watch Mode'}
          </button>
          <button onClick={()=>load()} style={{
            display:'flex',alignItems:'center',gap:8,padding:'10px 16px',borderRadius:10,
            background:G.card2,border:`1px solid ${G.border2}`,color:G.text2,fontSize:12,fontWeight:600,cursor:'pointer',
          }}>
            <i className="bi bi-arrow-clockwise"/>Refresh
          </button>
        </div>
      </div>

      {/* New OTP Alert Banner */}
      {newAlert && (
        <div style={{
          padding:'16px 20px',borderRadius:12,marginBottom:20,
          background:`linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))`,
          border:`2px solid ${G.yellow}60`,animation:'slideIn .3s ease',
          display:'flex',alignItems:'center',gap:16,
        }}>
          <div style={{fontSize:28,animation:'glow 1s infinite'}}>🔔</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:800,color:G.yellow,marginBottom:4}}>New OTP Received!</div>
            <div style={{fontSize:13,color:G.text1}}><strong>{newAlert.service}</strong> · {newAlert.body?.slice(0,80)}</div>
          </div>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:28,fontWeight:900,color:G.yellow,letterSpacing:'0.2em',fontFamily:'monospace',textShadow:`0 0 20px ${G.yellow}`}}>{newAlert.otp}</div>
            <button onClick={()=>copyText(newAlert.otp,'alert')} style={{
              marginTop:6,padding:'6px 16px',borderRadius:8,background:G.yellow,border:'none',
              color:'#000',fontSize:11,fontWeight:800,cursor:'pointer',
            }}>{copied==='alert'?'✓ Copied':'Copy'}</button>
          </div>
          <button onClick={()=>setNewAlert(null)} style={{background:'none',border:'none',color:G.text3,cursor:'pointer',fontSize:18,padding:4}}>×</button>
        </div>
      )}

      {msg&&<div style={{padding:'11px 16px',borderRadius:10,marginBottom:18,fontSize:13,fontWeight:600,background:msg.ok?G.greenDim:G.redDim,color:msg.ok?G.green:G.red,border:`1px solid ${msg.ok?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`}}>{msg.text}</div>}

      {/* Stat cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12,marginBottom:20}}>
        {[
          {label:'Total OTPs',   value:otps.length,     color:G.yellow, icon:'bi-key-fill'},
          {label:'Last 5 min',   value:last5min.length, color:G.green,  icon:'bi-lightning-fill'},
          {label:'Last hour',    value:last1h.length,   color:G.blue,   icon:'bi-clock-fill'},
          {label:'Services',     value:services.length, color:G.accent, icon:'bi-grid-fill'},
        ].map(s=>(
          <div key={s.label} style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:12,padding:'14px 16px'}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
              <i className={`bi ${s.icon}`} style={{fontSize:11,color:s.color}}/>
              <span style={{fontSize:10,fontWeight:700,color:G.text3,textTransform:'uppercase',letterSpacing:'0.06em'}}>{s.label}</span>
            </div>
            <span style={{fontSize:24,fontWeight:800,color:G.text1}}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Service filter */}
      {services.length>0&&(
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
          <button onClick={()=>setServiceF('')} style={{
            padding:'4px 14px',borderRadius:20,fontSize:11,fontWeight:700,cursor:'pointer',
            background:!serviceF?G.yellowDim:G.card2,border:`1px solid ${!serviceF?G.yellow:G.border}`,
            color:!serviceF?G.yellow:G.text3,
          }}>All</button>
          {services.map(svc=>(
            <button key={svc} onClick={()=>setServiceF(serviceF===svc?'':svc)} style={{
              padding:'4px 14px',borderRadius:20,fontSize:11,fontWeight:700,cursor:'pointer',
              background:serviceF===svc?`${SVC_COLORS[svc]||G.yellow}20`:G.card2,
              border:`1px solid ${serviceF===svc?(SVC_COLORS[svc]||G.yellow):G.border}`,
              color:serviceF===svc?(SVC_COLORS[svc]||G.yellow):G.text3,
            }}>{svc}</button>
          ))}
        </div>
      )}

      {/* Watch mode notice */}
      {watching&&(
        <div style={{
          padding:'12px 16px',borderRadius:10,marginBottom:16,
          background:'rgba(16,185,129,0.06)',border:`1px solid rgba(16,185,129,0.2)`,
          display:'flex',alignItems:'center',gap:10,fontSize:13,color:G.green,
        }}>
          <div style={{width:8,height:8,borderRadius:'50%',background:G.green,animation:'pulse 1s infinite'}}/>
          Watch mode active — checking every 3 seconds. Audio alert will play on new OTPs.
        </div>
      )}

      {/* Loading */}
      {loading&&(
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:200,flexDirection:'column',gap:14}}>
          <div style={{width:36,height:36,borderRadius:'50%',border:`3px solid ${G.yellowDim}`,borderTop:`3px solid ${G.yellow}`,animation:'spin .8s linear infinite'}}/>
          <p style={{color:G.text3,fontSize:13}}>Loading OTPs…</p>
        </div>
      )}

      {/* Empty */}
      {!loading&&filtered.length===0&&(
        <div style={{background:G.card,border:`1px dashed ${G.border2}`,borderRadius:14,padding:'60px 40px',textAlign:'center'}}>
          <i className="bi bi-key" style={{fontSize:48,color:G.text3,display:'block',marginBottom:16}}/>
          <h3 style={{margin:'0 0 8px',color:G.text1,fontSize:17,fontWeight:700}}>No OTPs Yet</h3>
          <p style={{color:G.text2,fontSize:13}}>Load numbers to receive OTP codes.</p>
        </div>
      )}

      {/* OTP Grid */}
      {!loading&&filtered.length>0&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
          {filtered.map(otp=>{
            const svcColor = SVC_COLORS[otp.service]||G.text3
            const isNew = now - new Date(otp.received_at).getTime() < 300000
            const age = Math.round((now - new Date(otp.received_at).getTime())/60000)
            return (
              <div key={otp.id} style={{
                background:G.card, border:`1px solid ${isNew?`${G.yellow}60`:G.border}`,
                borderRadius:14, padding:'20px',
                transition:'all .2s ease',
                ...(isNew?{boxShadow:`0 0 20px rgba(245,158,11,0.1)`}:{}),
              }}>
                {/* Service + new badge */}
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{
                      width:38,height:38,borderRadius:10,
                      background:`${svcColor}20`,border:`1px solid ${svcColor}30`,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:12,fontWeight:800,color:svcColor,
                    }}>{(otp.service||'?').slice(0,2).toUpperCase()}</div>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:G.text1}}>{otp.service||'Unknown'}</div>
                      <div style={{fontSize:11,color:G.text3}}>{otp.phone_number||''}</div>
                    </div>
                  </div>
                  {isNew&&(
                    <span style={{
                      fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:10,
                      background:G.yellowDim,color:G.yellow,border:`1px solid ${G.yellow}40`,
                      textTransform:'uppercase',letterSpacing:'0.05em',animation:'newBadge 1s infinite',
                    }}>NEW</span>
                  )}
                </div>

                {/* OTP Code */}
                <div style={{
                  background:`linear-gradient(135deg,${G.yellowDim},rgba(245,158,11,0.03))`,
                  border:`1px solid ${G.yellow}30`,borderRadius:12,
                  padding:'16px',textAlign:'center',marginBottom:14,
                  position:'relative',overflow:'hidden',
                }}>
                  <div style={{fontSize:10,fontWeight:700,color:G.yellow,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>OTP Code</div>
                  <div style={{fontSize:34,fontWeight:900,color:G.yellow,letterSpacing:'0.25em',fontFamily:'monospace',
                    ...(isNew?{textShadow:`0 0 20px ${G.yellow}60`}:{}),
                  }}>{otp.otp}</div>
                  <div style={{position:'absolute',bottom:-8,right:-8,width:60,height:60,borderRadius:'50%',background:`radial-gradient(circle,${G.yellowDim} 0%,transparent 70%)`,pointerEvents:'none'}}/>
                </div>

                {/* Message */}
                <div style={{fontSize:12,color:G.text2,lineHeight:1.6,marginBottom:12,background:G.card2,borderRadius:8,padding:'10px 12px',border:`1px solid ${G.border}`}}>
                  {(otp.body||'').slice(0,120)}{(otp.body||'').length>120?'…':''}
                </div>

                {/* Footer */}
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{fontSize:11,color:G.text3}}>
                    {isNew?<span style={{color:G.green,fontWeight:700}}>{age}m ago</span>:(otp.received_at?new Date(otp.received_at).toLocaleString():'')}
                  </div>
                  <button onClick={()=>copyText(otp.otp,otp.id)} style={{
                    padding:'7px 16px',borderRadius:9,cursor:'pointer',
                    background:copied===otp.id?G.greenDim:G.yellowDim,
                    border:`1px solid ${copied===otp.id?G.green:G.yellow}40`,
                    color:copied===otp.id?G.green:G.yellow,
                    fontSize:12,fontWeight:700,transition:'all .2s',
                    display:'flex',alignItems:'center',gap:6,
                  }}>
                    <i className={`bi ${copied===otp.id?'bi-check-circle-fill':'bi-clipboard-fill'}`}/>
                    {copied===otp.id?'Copied!':'Copy OTP'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
