'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const G = {
  bg: '#0a0a0f',
  card: '#111118',
  card2: '#16161f',
  border: 'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.12)',
  text1: '#f0f0f8',
  text2: '#a0a0b8',
  text3: '#60607a',
  accent: '#7c3aed',
  accentHover: '#8b5cf6',
  accentDim: 'rgba(124,58,237,0.15)',
  green: '#10b981',
  greenDim: 'rgba(16,185,129,0.12)',
  red: '#ef4444',
  redDim: 'rgba(239,68,68,0.1)',
  yellow: '#f59e0b',
  yellowDim: 'rgba(245,158,11,0.1)',
  blue: '#3b82f6',
  blueDim: 'rgba(59,130,246,0.1)',
  pink: '#ec4899',
  pinkDim: 'rgba(236,72,153,0.1)',
  cyan: '#06b6d4',
  cyanDim: 'rgba(6,182,212,0.1)',
}

const SVC_COLORS: Record<string,string> = {
  Google:'#4285f4',WhatsApp:'#25d366',Telegram:'#229ed9',Facebook:'#1877f2',
  Amazon:'#ff9900',Microsoft:'#00a4ef',Apple:'#a8a8a8',Twitter:'#1da1f2',
  Netflix:'#e50914',TikTok:'#ff0050',Discord:'#5865f2',LinkedIn:'#0a66c2',
  Binance:'#f3ba2f',PayPal:'#003087',Coinbase:'#0052ff',Instagram:'#e1306c',
  Snapchat:'#fffc00',Uber:'#000000',Airbnb:'#ff5a5f',Shopify:'#96bf48',
}

function Flag({ code }: { code: string }) {
  try {
    const c = (code||'US').toUpperCase().slice(0,2)
    return <span style={{fontSize:16}}>{c.split('').map(ch=>String.fromCodePoint(ch.charCodeAt(0)+127397)).join('')}</span>
  } catch { return <span style={{fontSize:11,color:G.text3}}>{code}</span> }
}

function StatCard({ icon, label, value, sub, color, dim, href, delta }: any) {
  const content = (
    <div style={{
      background: G.card, border: `1px solid ${G.border}`,
      borderRadius: 16, padding: '20px 22px',
      display: 'flex', alignItems: 'center', gap: 16,
      cursor: href ? 'pointer' : 'default',
      transition: 'all .2s ease',
      position: 'relative', overflow: 'hidden',
    }}
    onMouseEnter={e => { if(href) { (e.currentTarget as HTMLDivElement).style.borderColor = color; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}}
    onMouseLeave={e => { if(href) { (e.currentTarget as HTMLDivElement).style.borderColor = G.border; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}}
    >
      <div style={{
        width: 50, height: 50, borderRadius: 14, flexShrink: 0,
        background: dim, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${color}22`,
      }}>
        <i className={`bi ${icon}`} style={{fontSize: 22, color}} />
      </div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontSize:11,fontWeight:600,color:G.text3,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>{label}</div>
        <div style={{fontSize:28,fontWeight:800,color:G.text1,lineHeight:1,letterSpacing:'-0.5px'}}>{value}</div>
        {sub && <div style={{fontSize:11,color:G.text3,marginTop:4}}>{sub}</div>}
      </div>
      {delta !== undefined && (
        <div style={{
          fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20,
          background: delta >= 0 ? G.greenDim : G.redDim,
          color: delta >= 0 ? G.green : G.red,
          border: `1px solid ${delta >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
        }}>
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}
        </div>
      )}
      <div style={{
        position:'absolute', top:-20, right:-20, width:80, height:80,
        borderRadius:'50%', background: `radial-gradient(circle, ${dim} 0%, transparent 70%)`,
        pointerEvents:'none',
      }}/>
    </div>
  )
  if (href) return <Link href={href} style={{textDecoration:'none'}}>{content}</Link>
  return content
}

export default function Dashboard() {
  const router = useRouter()
  const [nums,    setNums]    = useState<any[]>([])
  const [sms,     setSms]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [msg,     setMsg]     = useState<{ok:boolean,text:string}|null>(null)
  const [now,     setNow]     = useState(Date.now())

  const showMsg = (ok: boolean, text: string, ms=6000) => {
    setMsg({ok,text}); setTimeout(()=>setMsg(null),ms)
  }

  const load = useCallback(async (quiet=false) => {
    if(!quiet) setLoading(true)
    try {
      const [nr, sr] = await Promise.all([
        fetch('/api/ivasms/numbers').then(r=>r.json()).catch(()=>({numbers:[]})),
        fetch('/api/ivasms/sms?limit=50').then(r=>r.json()).catch(()=>({messages:[]})),
      ])
      setNums(nr.numbers||[])
      setSms(sr.messages||[])
    } catch{}
    setLoading(false)
    setNow(Date.now())
  }, [])

  useEffect(() => { load(); const t=setInterval(()=>load(true),15000); return ()=>clearInterval(t) }, [load])

  const goImportCookies = () => router.push('/numbers')

  const sync = async () => {
    setSyncing(true)
    try {
      const r = await fetch('/api/ivasms/sync',{method:'POST'})
      const d = await r.json()
      if(d.success!==false){ showMsg(true,`✅ Synced: ${d.count||0} numbers, ${d.smsAdded||0} new SMS`); await load() }
      else showMsg(false, d.error||'CF protection active — use cookie import')
    } catch(e:any){ showMsg(false,e.message) }
    setSyncing(false)
  }

  // Stats
  const active   = nums.filter(n=>(n.status||'active')==='active').length
  const inactive = nums.filter(n=>n.status && n.status!=='active').length
  const countries= [...new Set(nums.map(n=>n.country).filter(Boolean))]
  const totalSms = sms.length
  const otps     = sms.filter(m=>m.otp)
  const newOtps  = otps.filter(m=>now-new Date(m.received_at).getTime()<300000)
  const recentSms= sms.filter(m=>now-new Date(m.received_at).getTime()<3600000)

  // Country breakdown
  const countryMap: Record<string,{count:number,name:string,sms:number}> = {}
  nums.forEach(n=>{ if(n.country){ if(!countryMap[n.country]) countryMap[n.country]={count:0,name:n.country_name||n.country,sms:0}; countryMap[n.country].count++ }})
  sms.forEach(m=>{ const num=nums.find(n=>n.id===m.number_id); if(num?.country && countryMap[num.country]) countryMap[num.country].sms++ })
  const topCountries = Object.entries(countryMap).sort((a,b)=>b[1].count-a[1].count).slice(0,8)

  // Service breakdown
  const svcMap: Record<string,number> = {}
  sms.forEach(m=>{ const s=m.service||'Unknown'; svcMap[s]=(svcMap[s]||0)+1 })
  const topServices = Object.entries(svcMap).sort((a,b)=>b[1]-a[1]).slice(0,8)
  const maxSvc = topServices[0]?.[1]||1

  // 7-day chart
  const days: number[] = Array(7).fill(0)
  const dayLabels = Array(7).fill(0).map((_,i)=>{
    const d=new Date(now-(6-i)*86400000)
    return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]
  })
  sms.forEach(m=>{
    const diff = Math.floor((now - new Date(m.received_at).getTime())/86400000)
    if(diff>=0 && diff<7) days[6-diff]++
  })
  const maxDay = Math.max(...days,1)

  if(loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',flexDirection:'column',gap:16}}>
      <div style={{width:40,height:40,borderRadius:'50%',border:`3px solid ${G.accentDim}`,borderTop:`3px solid ${G.accent}`,animation:'spin 0.8s linear infinite'}}/>
      <p style={{color:G.text3,fontSize:13}}>Loading dashboard…</p>
    </div>
  )

  return (
    <div style={{maxWidth:1400,margin:'0 auto',padding:'0 4px'}}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); }}
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes slideIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glow { 0%,100%{box-shadow:0 0 4px rgba(16,185,129,0.6)} 50%{box-shadow:0 0 10px rgba(16,185,129,0.9)} }
        .bar-fill { transition: width 0.6s cubic-bezier(0.4,0,0.2,1); }
        .day-bar { transition: height 0.5s cubic-bezier(0.4,0,0.2,1); }
      `}</style>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{margin:0,fontSize:26,fontWeight:800,color:G.text1,letterSpacing:'-0.5px'}}>
            Dashboard
          </h1>
          <p style={{margin:'4px 0 0',fontSize:13,color:G.text3}}>
            {new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
          </p>
        </div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          {nums.length===0 && (
            <button onClick={goImportCookies} style={{
              display:'flex',alignItems:'center',gap:8,padding:'10px 20px',borderRadius:10,
              background:`linear-gradient(135deg, ${G.accent}, #a855f7)`,
              border:'none',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',
              boxShadow:'0 4px 15px rgba(124,58,237,0.4)',
              transition:'all .2s ease',
            }}>
              <i className="bi bi-cookie" style={{fontSize:14}}/>
              Import Real Cookies
            </button>
          )}
          <button onClick={sync} disabled={syncing} style={{
            display:'flex',alignItems:'center',gap:8,padding:'10px 20px',borderRadius:10,
            background: G.card2, border:`1px solid ${G.border2}`,
            color:G.text1,fontSize:13,fontWeight:600,cursor:syncing?'not-allowed':'pointer',
            opacity:syncing?0.7:1, transition:'all .2s ease',
          }}>
            <i className={`bi bi-arrow-repeat`} style={{fontSize:14,animation:syncing?'spin 0.8s linear infinite':undefined}}/>
            {syncing?'Syncing…':'Sync iVASMS'}
          </button>
          <Link href="/numbers" style={{
            display:'flex',alignItems:'center',gap:8,padding:'10px 20px',borderRadius:10,
            background: G.card2, border:`1px solid ${G.border2}`,
            color:G.text1,fontSize:13,fontWeight:600,textDecoration:'none',
          }}>
            <i className="bi bi-phone-fill" style={{fontSize:14,color:G.accent}}/>
            Numbers
          </Link>
        </div>
      </div>

      {/* Alert */}
      {msg && (
        <div style={{
          padding:'12px 18px',borderRadius:10,marginBottom:20,fontSize:13,fontWeight:600,
          background: msg.ok ? G.greenDim : G.redDim,
          color: msg.ok ? G.green : G.red,
          border: `1px solid ${msg.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          animation:'slideIn .2s ease',
        }}>{msg.text}</div>
      )}

      {/* Stat Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:14,marginBottom:24}}>
        <StatCard icon="bi-phone-fill"     label="Total Numbers" value={nums.length}   sub={`${active} active, ${inactive} inactive`} color={G.accent} dim={G.accentDim} href="/numbers"/>
        <StatCard icon="bi-chat-dots-fill" label="Total SMS"     value={totalSms}      sub={`${recentSms.length} in last hour`}         color={G.blue}   dim={G.blueDim}   href="/sms-history"/>
        <StatCard icon="bi-key-fill"       label="OTPs"          value={otps.length}   sub={`${newOtps.length} new (<5min)`}             color={G.yellow} dim={G.yellowDim} href="/otp-monitor" delta={newOtps.length}/>
        <StatCard icon="bi-globe2"         label="Countries"     value={countries.length} sub="unique countries"                         color={G.green}  dim={G.greenDim}  href="/countries"/>
        <StatCard icon="bi-graph-up-arrow" label="Active"        value={active}        sub={`${nums.length>0?Math.round(active/nums.length*100):0}% of total`} color={G.cyan} dim={G.cyanDim}/>
        <StatCard icon="bi-star-fill"      label="Starred"       value={nums.filter(n=>n.starred).length} sub="starred numbers" color={G.pink} dim={G.pinkDim}/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24}}>
        {/* Live SMS Feed */}
        <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:`1px solid ${G.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:G.green,animation:'glow 2s infinite'}}/>
              <span style={{fontSize:13,fontWeight:700,color:G.text1}}>Live SMS Feed</span>
            </div>
            <Link href="/sms-history" style={{fontSize:11,color:G.accent,textDecoration:'none',fontWeight:600}}>
              View all →
            </Link>
          </div>
          <div style={{maxHeight:320,overflowY:'auto'}}>
            {sms.length===0 ? (
              <div style={{padding:40,textAlign:'center'}}>
                <i className="bi bi-chat-dots" style={{fontSize:32,color:G.text3}}/>
                <p style={{color:G.text3,fontSize:13,marginTop:12}}>No SMS yet — import real numbers first</p>
                {nums.length===0 && (
                  <button onClick={goImportCookies} style={{
                    marginTop:12,padding:'8px 20px',borderRadius:8,
                    background:`linear-gradient(135deg,${G.accent},#a855f7)`,
                    border:'none',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',
                  }}>Import Cookies from iVASMS</button>
                )}
              </div>
            ) : sms.slice(0,15).map(m=>{
              const isNew = now-new Date(m.received_at).getTime()<300000
              const svcColor = SVC_COLORS[m.service]||G.text3
              return (
                <div key={m.id} style={{
                  padding:'12px 20px',borderBottom:`1px solid ${G.border}`,
                  display:'flex',gap:12,alignItems:'flex-start',
                  background: isNew ? 'rgba(124,58,237,0.04)' : 'transparent',
                  transition:'background .2s',
                }}>
                  <div style={{
                    width:36,height:36,borderRadius:10,flexShrink:0,
                    background:`${svcColor}20`,border:`1px solid ${svcColor}30`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:11,fontWeight:800,color:svcColor,
                  }}>{(m.service||'?').slice(0,2).toUpperCase()}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                      <span style={{fontSize:12,fontWeight:700,color:G.text1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {m.service||'Unknown'}
                      </span>
                      {isNew && <span style={{fontSize:9,fontWeight:800,padding:'1px 6px',borderRadius:10,background:G.accentDim,color:G.accentHover,border:`1px solid ${G.accent}40`,textTransform:'uppercase',letterSpacing:'0.05em'}}>NEW</span>}
                      {m.otp && <span style={{fontSize:9,fontWeight:800,padding:'1px 6px',borderRadius:10,background:G.yellowDim,color:G.yellow,border:`1px solid ${G.yellow}40`,textTransform:'uppercase'}}>OTP</span>}
                    </div>
                    <div style={{fontSize:12,color:G.text2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.body||''}</div>
                    {m.otp && <div style={{marginTop:4,fontSize:14,fontWeight:800,color:G.yellow,letterSpacing:'0.1em'}}>{m.otp}</div>}
                    <div style={{fontSize:10,color:G.text3,marginTop:3}}>{m.phone_number||''} · {m.received_at?new Date(m.received_at).toLocaleTimeString():''}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right column */}
        <div style={{display:'flex',flexDirection:'column',gap:20}}>
          {/* 7-day chart */}
          <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:'20px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <span style={{fontSize:13,fontWeight:700,color:G.text1}}>7-Day SMS Activity</span>
              <span style={{fontSize:11,color:G.text3}}>{totalSms} total</span>
            </div>
            <div style={{display:'flex',alignItems:'flex-end',gap:8,height:80}}>
              {days.map((v,i)=>(
                <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                  <div style={{
                    width:'100%',borderRadius:'4px 4px 0 0',
                    background: i===6 ? `linear-gradient(to top, ${G.accent}, #a855f7)` : `${G.accent}40`,
                    height: `${Math.round((v/maxDay)*100)}%`,
                    minHeight: v>0?4:0,
                    transition:'height 0.5s ease',
                    position:'relative',
                  }}>
                    {v>0 && i===6 && <div style={{position:'absolute',top:-18,left:'50%',transform:'translateX(-50%)',fontSize:10,fontWeight:700,color:G.accent,whiteSpace:'nowrap'}}>{v}</div>}
                  </div>
                  <span style={{fontSize:9,color:G.text3,fontWeight:600}}>{dayLabels[i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Services */}
          <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:'20px',flex:1}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <span style={{fontSize:13,fontWeight:700,color:G.text1}}>Top Services</span>
              <Link href="/sms-history" style={{fontSize:11,color:G.accent,textDecoration:'none'}}>View all →</Link>
            </div>
            {topServices.length===0 ? (
              <p style={{color:G.text3,fontSize:12,textAlign:'center',padding:'20px 0'}}>No SMS data yet</p>
            ) : topServices.map(([svc,count])=>(
              <div key={svc} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:600,color:G.text2}}>{svc}</span>
                  <span style={{fontSize:12,fontWeight:700,color:SVC_COLORS[svc]||G.text1}}>{count}</span>
                </div>
                <div style={{height:4,borderRadius:2,background:G.border,overflow:'hidden'}}>
                  <div className="bar-fill" style={{height:'100%',borderRadius:2,width:`${(count/maxSvc)*100}%`,background:`linear-gradient(to right,${SVC_COLORS[svc]||G.accent},${SVC_COLORS[svc]||G.accentHover}80)`}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Country Grid + Quick Nav */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24}}>
        {/* Countries */}
        <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:'20px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <span style={{fontSize:13,fontWeight:700,color:G.text1}}>Countries</span>
            <Link href="/countries" style={{fontSize:11,color:G.accent,textDecoration:'none'}}>View all →</Link>
          </div>
          {topCountries.length===0 ? (
            <p style={{color:G.text3,fontSize:12,textAlign:'center',padding:'20px 0'}}>No numbers yet</p>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {topCountries.map(([code,info])=>(
                <div key={code} style={{
                  display:'flex',alignItems:'center',gap:10,
                  padding:'10px 12px',borderRadius:10,
                  background:G.card2,border:`1px solid ${G.border}`,
                }}>
                  <Flag code={code}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:G.text1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{info.name}</div>
                    <div style={{fontSize:10,color:G.text3}}>{info.count} number{info.count!==1?'s':''}</div>
                  </div>
                  <span style={{fontSize:13,fontWeight:800,color:G.accent}}>{info.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Navigation */}
        <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:16,padding:'20px'}}>
          <span style={{fontSize:13,fontWeight:700,color:G.text1,display:'block',marginBottom:16}}>Quick Navigation</span>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {[
              {href:'/numbers',      icon:'bi-phone-fill',          label:'Numbers',      color:G.accent},
              {href:'/sms-history',  icon:'bi-chat-dots-fill',      label:'SMS History',  color:G.blue},
              {href:'/otp-monitor',  icon:'bi-key-fill',            label:'OTP Monitor',  color:G.yellow},
              {href:'/analytics',    icon:'bi-bar-chart-fill',      label:'Analytics',    color:G.green},
              {href:'/whatsapp',     icon:'bi-whatsapp',            label:'WhatsApp',     color:'#25d366'},
              {href:'/telegram-bot', icon:'bi-telegram',            label:'Telegram',     color:'#229ed9'},
              {href:'/countries',    icon:'bi-globe2',              label:'Countries',    color:G.cyan},
              {href:'/settings',     icon:'bi-gear-fill',           label:'Settings',     color:G.text3},
              {href:'/pin-vault',    icon:'bi-safe-fill',           label:'PIN Vault',    color:G.pink},
              {href:'/scheduler',    icon:'bi-clock-fill',          label:'Scheduler',    color:'#f97316'},
            ].map(item=>(
              <Link key={item.href} href={item.href} style={{
                display:'flex',alignItems:'center',gap:10,
                padding:'10px 12px',borderRadius:10,
                background:G.card2,border:`1px solid ${G.border}`,
                textDecoration:'none',color:G.text2,fontSize:12,fontWeight:600,
                transition:'all .15s ease',
              }}
              onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.borderColor=item.color;(e.currentTarget as HTMLAnchorElement).style.color=G.text1}}
              onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.borderColor=G.border;(e.currentTarget as HTMLAnchorElement).style.color=G.text2}}
              >
                <i className={`bi ${item.icon}`} style={{fontSize:14,color:item.color,flexShrink:0}}/>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* iVASMS CF Notice */}
      <div style={{
        padding:'16px 20px',borderRadius:12,
        background:'rgba(245,158,11,0.06)',
        border:`1px solid rgba(245,158,11,0.2)`,
        display:'flex',alignItems:'flex-start',gap:14,
      }}>
        <i className="bi bi-shield-exclamation" style={{fontSize:18,color:G.yellow,flexShrink:0,marginTop:1}}/>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:G.yellow,marginBottom:4}}>iVASMS Cloudflare Protection</div>
          <div style={{fontSize:12,color:G.text2,lineHeight:1.6}}>
            iVASMS.com uses Cloudflare Managed Challenge — server-side login is blocked. 
            To get real numbers: <strong style={{color:G.text1}}>Login at ivasms.com in your browser</strong>, then go to <Link href="/numbers" style={{color:G.accent,textDecoration:'none',fontWeight:700}}>Numbers page</Link> and use <strong style={{color:G.text1}}>"Import Cookies"</strong> to paste your browser session.
          </div>
        </div>
      </div>
    </div>
  )
}
