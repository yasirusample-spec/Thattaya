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
  Snapchat:'#fffc00',Uber:'#222',Airbnb:'#ff5a5f',Shopify:'#96bf48',
}

export default function SmsHistoryPage() {
  const [msgs,       setMsgs]       = useState<any[]>([])
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(1)
  const [pages,      setPages]      = useState(1)
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [serviceF,   setServiceF]   = useState('')
  const [otpOnly,    setOtpOnly]    = useState(false)
  const [sortDir,    setSortDir]    = useState<'asc'|'desc'>('desc')
  const [live,       setLive]       = useState(false)
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [expanded,   setExpanded]   = useState<string|null>(null)
  const [msg,        setMsg]        = useState<{ok:boolean,text:string}|null>(null)
  const [services,   setServices]   = useState<string[]>([])
  const [copied,     setCopied]     = useState<string|null>(null)
  const liveRef = useRef<any>(null)
  const limit = 50

  const showMsg=(ok:boolean,text:string,ms=5000)=>{setMsg({ok,text});setTimeout(()=>setMsg(null),ms)}

  const load=useCallback(async(quiet=false)=>{
    if(!quiet) setLoading(true)
    try {
      const params=new URLSearchParams({
        page:String(page), limit:String(limit),
        ...(search?{search}:{}),
        ...(serviceF?{service:serviceF}:{}),
        ...(otpOnly?{hasOtp:'true'}:{}),
      })
      const r=await fetch(`/api/ivasms/sms?${params}`)
      if(r.ok){
        const d=await r.json()
        const arr=d.messages||[]
        if(sortDir==='asc') arr.reverse()
        setMsgs(arr)
        setTotal(d.total||0)
        setPages(d.pages||1)
        const svcs=[...new Set(arr.map((m:any)=>m.service).filter(Boolean))] as string[]
        setServices(p=>[...new Set([...p,...svcs])])
      }
    } catch{}
    setLoading(false)
  },[page,search,serviceF,otpOnly,sortDir])

  useEffect(()=>{load()},[load])
  useEffect(()=>{
    if(live) liveRef.current=setInterval(()=>load(true),5000)
    else clearInterval(liveRef.current)
    return()=>clearInterval(liveRef.current)
  },[live,load])

  const deleteMsg=async(id:string)=>{
    await fetch('/api/ivasms/sms',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})
    setMsgs(p=>p.filter(m=>m.id!==id)); setTotal(t=>t-1)
  }

  const bulkDelete=async()=>{
    if(!selected.size||!confirm(`Delete ${selected.size} messages?`)) return
    await fetch('/api/ivasms/sms',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:[...selected]})})
    setSelected(new Set()); await load()
    showMsg(true,`Deleted ${selected.size} messages`)
  }

  const copyText=(text:string,key:string)=>{navigator.clipboard.writeText(text).catch(()=>{});setCopied(key);setTimeout(()=>setCopied(null),2000)}

  const otps    = msgs.filter(m=>m.otp)
  const newOtps = msgs.filter(m=>m.otp&&Date.now()-new Date(m.received_at).getTime()<300000)

  return (
    <div style={{maxWidth:1400,margin:'0 auto'}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .row-hover:hover{background:rgba(124,58,237,0.04)!important}
      `}</style>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{margin:0,fontSize:24,fontWeight:800,color:G.text1,letterSpacing:'-0.5px',display:'flex',alignItems:'center',gap:10}}>
            <i className="bi bi-chat-dots-fill" style={{color:G.blue,fontSize:20}}/>
            SMS History
          </h1>
          <p style={{margin:'4px 0 0',fontSize:12,color:G.text3}}>{total} messages total</p>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          <button onClick={()=>setLive(l=>!l)} style={{
            display:'flex',alignItems:'center',gap:6,padding:'9px 14px',borderRadius:9,fontSize:12,fontWeight:700,
            background:live?G.greenDim:G.card2, border:`1px solid ${live?G.green:G.border2}`,
            color:live?G.green:G.text2, cursor:'pointer', transition:'all .2s',
          }}>
            <div style={{width:6,height:6,borderRadius:'50%',background:live?G.green:G.text3,animation:live?'pulse 1s infinite':'none'}}/>
            {live?'Live ON':'Live 5s'}
          </button>
          <button onClick={()=>setSortDir(d=>d==='desc'?'asc':'desc')} style={{
            display:'flex',alignItems:'center',gap:6,padding:'9px 14px',borderRadius:9,
            background:G.card2,border:`1px solid ${G.border2}`,color:G.text2,fontSize:12,fontWeight:600,cursor:'pointer',
          }}>
            <i className={`bi bi-sort-${sortDir==='desc'?'down':'up'}`}/>
            {sortDir==='desc'?'Newest':'Oldest'}
          </button>
          {selected.size>0&&(
            <button onClick={bulkDelete} style={{
              display:'flex',alignItems:'center',gap:6,padding:'9px 14px',borderRadius:9,
              background:G.redDim,border:`1px solid rgba(239,68,68,0.3)`,
              color:G.red,fontSize:12,fontWeight:700,cursor:'pointer',
            }}>
              <i className="bi bi-trash3-fill"/>Delete {selected.size}
            </button>
          )}
        </div>
      </div>

      {msg&&<div style={{padding:'11px 16px',borderRadius:10,marginBottom:18,fontSize:13,fontWeight:600,animation:'slideIn .2s ease',background:msg.ok?G.greenDim:G.redDim,color:msg.ok?G.green:G.red,border:`1px solid ${msg.ok?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`}}>{msg.text}</div>}

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:12,marginBottom:20}}>
        {[
          {label:'Total SMS',  value:total,          color:G.blue,   icon:'bi-chat-dots-fill'},
          {label:'OTPs',       value:otps.length,    color:G.yellow, icon:'bi-key-fill'},
          {label:'New OTPs',   value:newOtps.length, color:G.green,  icon:'bi-lightning-fill'},
          {label:'Services',   value:services.length,color:G.accent, icon:'bi-grid-fill'},
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

      {/* Filters */}
      <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:12,padding:'14px 16px',marginBottom:16}}>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          <div style={{position:'relative',flex:1,minWidth:200}}>
            <i className="bi bi-search" style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:G.text3,fontSize:13}}/>
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Search messages, senders…"
              style={{width:'100%',padding:'9px 12px 9px 36px',borderRadius:9,background:G.card2,border:`1px solid ${G.border2}`,color:G.text1,fontSize:13,outline:'none',boxSizing:'border-box'}}/>
          </div>
          <button onClick={()=>{setOtpOnly(v=>!v);setPage(1)}} style={{
            display:'flex',alignItems:'center',gap:6,padding:'9px 14px',borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',transition:'all .2s',
            background:otpOnly?G.yellowDim:G.card2, border:`1px solid ${otpOnly?G.yellow:G.border2}`,
            color:otpOnly?G.yellow:G.text2,
          }}>
            <i className="bi bi-key-fill"/>OTP Only
          </button>
        </div>
        {/* Service chips */}
        {services.length>0&&(
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:10}}>
            <button onClick={()=>{setServiceF('');setPage(1)}} style={{
              padding:'3px 12px',borderRadius:20,fontSize:11,fontWeight:700,cursor:'pointer',
              background:!serviceF?G.accentDim:G.card2,border:`1px solid ${!serviceF?G.accent:G.border}`,
              color:!serviceF?G.accentHover:G.text3,
            }}>All</button>
            {services.slice(0,15).map(svc=>(
              <button key={svc} onClick={()=>{setServiceF(serviceF===svc?'':svc);setPage(1)}} style={{
                padding:'3px 12px',borderRadius:20,fontSize:11,fontWeight:700,cursor:'pointer',
                background:serviceF===svc?`${SVC_COLORS[svc]||G.accent}20`:G.card2,
                border:`1px solid ${serviceF===svc?(SVC_COLORS[svc]||G.accent):G.border}`,
                color:serviceF===svc?(SVC_COLORS[svc]||G.accentHover):G.text3,
              }}>{svc}</button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      {loading?(
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:200,flexDirection:'column',gap:14}}>
          <div style={{width:36,height:36,borderRadius:'50%',border:`3px solid ${G.accentDim}`,borderTop:`3px solid ${G.accent}`,animation:'spin .8s linear infinite'}}/>
          <p style={{color:G.text3,fontSize:13}}>Loading messages…</p>
        </div>
      ):msgs.length===0?(
        <div style={{background:G.card,border:`1px dashed ${G.border2}`,borderRadius:14,padding:'60px 40px',textAlign:'center'}}>
          <i className="bi bi-chat-dots" style={{fontSize:48,color:G.text3,display:'block',marginBottom:16}}/>
          <h3 style={{margin:'0 0 8px',color:G.text1,fontSize:17,fontWeight:700}}>No Messages Found</h3>
          <p style={{color:G.text2,fontSize:13}}>Load numbers first or adjust your filters.</p>
        </div>
      ):(
        <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:G.card2}}>
                <th style={{padding:'12px 16px',width:40}}>
                  <input type="checkbox" checked={selected.size===msgs.length&&msgs.length>0}
                    onChange={e=>setSelected(e.target.checked?new Set(msgs.map((m:any)=>m.id)):new Set())}
                    style={{accentColor:G.accent,cursor:'pointer'}}/>
                </th>
                {['Service','From','Number','Message','Time',''].map(h=>(
                  <th key={h} style={{padding:'12px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:G.text3,textTransform:'uppercase',letterSpacing:'0.06em',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {msgs.map(m=>{
                const isExp=expanded===m.id
                const svcColor=SVC_COLORS[m.service]||G.text3
                const isNew=Date.now()-new Date(m.received_at).getTime()<300000
                const isSel=selected.has(m.id)
                return [
                  <tr key={m.id} className="row-hover" style={{
                    borderTop:`1px solid ${G.border}`,cursor:'pointer',
                    background:isSel?'rgba(124,58,237,0.06)':'transparent',
                  }} onClick={()=>setExpanded(isExp?null:m.id)}>
                    <td style={{padding:'12px 16px'}} onClick={e=>e.stopPropagation()}>
                      <input type="checkbox" checked={isSel}
                        onChange={e=>{setSelected(p=>{const n=new Set(p);e.target.checked?n.add(m.id):n.delete(m.id);return n})}}
                        style={{accentColor:G.accent,cursor:'pointer'}}/>
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{
                          width:32,height:32,borderRadius:9,flexShrink:0,
                          background:`${svcColor}20`,border:`1px solid ${svcColor}25`,
                          display:'flex',alignItems:'center',justifyContent:'center',
                          fontSize:10,fontWeight:800,color:svcColor,
                        }}>{(m.service||'?').slice(0,2).toUpperCase()}</div>
                        <div>
                          <div style={{fontSize:12,fontWeight:700,color:G.text1,display:'flex',alignItems:'center',gap:5}}>
                            {m.service||'Unknown'}
                            {isNew&&<span style={{fontSize:8,fontWeight:800,padding:'1px 5px',borderRadius:10,background:G.accentDim,color:G.accentHover,border:`1px solid ${G.accent}40`}}>NEW</span>}
                          </div>
                          {m.otp&&<div style={{fontSize:11,fontWeight:800,color:G.yellow,letterSpacing:'0.1em'}}>{m.otp}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{padding:'12px 14px'}}><span style={{fontSize:12,color:G.text2}}>{m.sender||'—'}</span></td>
                    <td style={{padding:'12px 14px'}}><span style={{fontSize:11,color:G.text3,fontFamily:'monospace'}}>{m.phone_number||'—'}</span></td>
                    <td style={{padding:'12px 14px',maxWidth:300}}>
                      <div style={{fontSize:12,color:G.text2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.body||''}</div>
                    </td>
                    <td style={{padding:'12px 14px',whiteSpace:'nowrap'}}>
                      <span style={{fontSize:11,color:G.text3}}>{m.received_at?new Date(m.received_at).toLocaleString():''}</span>
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        {m.otp&&<button onClick={e=>{e.stopPropagation();copyText(m.otp,m.id+'-otp')}} style={{
                          background:G.yellowDim,border:`1px solid ${G.yellow}40`,color:G.yellow,
                          padding:'4px 10px',borderRadius:7,fontSize:11,fontWeight:700,cursor:'pointer',
                        }}>{copied===m.id+'-otp'?'✓':'Copy OTP'}</button>}
                        <button onClick={e=>{e.stopPropagation();deleteMsg(m.id)}} style={{background:'none',border:'none',cursor:'pointer',color:G.text3,fontSize:13,padding:2}}>
                          <i className="bi bi-trash3"/>
                        </button>
                        <i className={`bi bi-chevron-${isExp?'up':'down'}`} style={{fontSize:12,color:G.text3}}/>
                      </div>
                    </td>
                  </tr>,
                  isExp&&(
                    <tr key={`${m.id}-exp`}>
                      <td colSpan={7} style={{padding:0}}>
                        <div style={{background:G.card2,borderTop:`1px solid ${G.border}`,padding:'20px 24px',animation:'fadeIn .2s ease'}}>
                          <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:20,alignItems:'start'}}>
                            <div>
                              <div style={{fontSize:10,fontWeight:700,color:G.text3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>Full Message</div>
                              <div style={{fontSize:14,color:G.text1,lineHeight:1.7,background:G.card,borderRadius:10,padding:'14px 16px',border:`1px solid ${G.border}`}}>{m.body||''}</div>
                              <div style={{display:'flex',gap:16,marginTop:12,flexWrap:'wrap'}}>
                                <div><span style={{fontSize:10,color:G.text3}}>SERVICE</span><br/><span style={{fontSize:13,fontWeight:700,color:svcColor}}>{m.service||'—'}</span></div>
                                <div><span style={{fontSize:10,color:G.text3}}>FROM</span><br/><span style={{fontSize:13,fontWeight:700,color:G.text1}}>{m.sender||'—'}</span></div>
                                <div><span style={{fontSize:10,color:G.text3}}>NUMBER</span><br/><span style={{fontSize:13,fontWeight:700,color:G.text1,fontFamily:'monospace'}}>{m.phone_number||'—'}</span></div>
                                <div><span style={{fontSize:10,color:G.text3}}>RECEIVED</span><br/><span style={{fontSize:13,fontWeight:700,color:G.text1}}>{m.received_at?new Date(m.received_at).toLocaleString():''}</span></div>
                              </div>
                            </div>
                            {m.otp&&(
                              <div style={{
                                background:`linear-gradient(135deg,${G.yellowDim},rgba(245,158,11,0.05))`,
                                border:`2px solid ${G.yellow}50`,borderRadius:14,padding:'20px 24px',
                                textAlign:'center',minWidth:160,
                              }}>
                                <div style={{fontSize:10,fontWeight:800,color:G.yellow,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>OTP Code</div>
                                <div style={{fontSize:32,fontWeight:900,color:G.yellow,letterSpacing:'0.2em',fontFamily:'monospace'}}>{m.otp}</div>
                                <button onClick={()=>copyText(m.otp,m.id+'-big')} style={{
                                  marginTop:12,padding:'8px 20px',borderRadius:9,
                                  background:G.yellow,border:'none',color:'#000',
                                  fontSize:12,fontWeight:800,cursor:'pointer',width:'100%',
                                }}>{copied===m.id+'-big'?'✓ Copied!':'Copy OTP'}</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                ].filter(Boolean)
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {pages>1&&(
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'16px',borderTop:`1px solid ${G.border}`}}>
              <button onClick={()=>setPage(1)} disabled={page===1} style={{padding:'6px 10px',borderRadius:7,background:G.card2,border:`1px solid ${G.border}`,color:G.text2,cursor:page===1?'not-allowed':'pointer',opacity:page===1?0.5:1,fontSize:12}}>«</button>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{padding:'6px 10px',borderRadius:7,background:G.card2,border:`1px solid ${G.border}`,color:G.text2,cursor:page===1?'not-allowed':'pointer',opacity:page===1?0.5:1,fontSize:12}}>‹</button>
              <span style={{fontSize:12,color:G.text2,padding:'0 8px'}}>Page {page} of {pages} · {total} total</span>
              <button onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages} style={{padding:'6px 10px',borderRadius:7,background:G.card2,border:`1px solid ${G.border}`,color:G.text2,cursor:page===pages?'not-allowed':'pointer',opacity:page===pages?0.5:1,fontSize:12}}>›</button>
              <button onClick={()=>setPage(pages)} disabled={page===pages} style={{padding:'6px 10px',borderRadius:7,background:G.card2,border:`1px solid ${G.border}`,color:G.text2,cursor:page===pages?'not-allowed':'pointer',opacity:page===pages?0.5:1,fontSize:12}}>»</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
