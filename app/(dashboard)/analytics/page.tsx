'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const G = {
  bg:'#0a0a0f', card:'#111118', card2:'#16161f',
  border:'rgba(255,255,255,0.07)', border2:'rgba(255,255,255,0.12)',
  text1:'#f0f0f8', text2:'#a0a0b8', text3:'#60607a',
  accent:'#7c3aed', accentHover:'#8b5cf6', accentDim:'rgba(124,58,237,0.15)',
  green:'#10b981', greenDim:'rgba(16,185,129,0.12)',
  red:'#ef4444', redDim:'rgba(239,68,68,0.1)',
  yellow:'#f59e0b', yellowDim:'rgba(245,158,11,0.1)',
  blue:'#3b82f6', blueDim:'rgba(59,130,246,0.1)',
  pink:'#ec4899', pinkDim:'rgba(236,72,153,0.1)',
  cyan:'#06b6d4', cyanDim:'rgba(6,182,212,0.1)',
}
const SVC_COLORS: Record<string,string> = {
  Google:'#4285f4',WhatsApp:'#25d366',Telegram:'#229ed9',Facebook:'#1877f2',
  Amazon:'#ff9900',Microsoft:'#00a4ef',Apple:'#a8a8a8',Twitter:'#1da1f2',
  Netflix:'#e50914',TikTok:'#ff0050',Discord:'#5865f2',LinkedIn:'#0a66c2',
  Binance:'#f3ba2f',PayPal:'#003087',Coinbase:'#0052ff',Instagram:'#e1306c',
}

function Flag({ code }: { code: string }) {
  try { const c=(code||'US').toUpperCase().slice(0,2); return <span style={{fontSize:16}}>{c.split('').map(ch=>String.fromCodePoint(ch.charCodeAt(0)+127397)).join('')}</span> }
  catch { return <span style={{fontSize:11,color:G.text3}}>{code}</span> }
}

export default function AnalyticsPage() {
  const [nums,    setNums]    = useState<any[]>([])
  const [sms,     setSms]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [range,   setRange]   = useState<7|14|30>(7)
  const now = Date.now()

  useEffect(()=>{
    const load=async()=>{
      try {
        const [nr,sr]=await Promise.all([
          fetch('/api/ivasms/numbers').then(r=>r.json()).catch(()=>({numbers:[]})),
          fetch('/api/ivasms/sms?limit=500').then(r=>r.json()).catch(()=>({messages:[]})),
        ])
        setNums(nr.numbers||[])
        setSms(sr.messages||[])
      } catch{}
      setLoading(false)
    }
    load()
  },[])

  // Stats
  const active   = nums.filter(n=>(n.status||'active')==='active').length
  const otps     = sms.filter(m=>m.otp)
  const rangeMs  = range * 86400000
  const inRange  = sms.filter(m=>now-new Date(m.received_at).getTime()<rangeMs)
  const otpRate  = sms.length>0?Math.round(otps.length/sms.length*100):0

  // Daily chart
  const days = Array(range).fill(0)
  const dayLabels = Array(range).fill(0).map((_,i)=>{
    const d=new Date(now-(range-1-i)*86400000)
    return range<=7?['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]:`${d.getMonth()+1}/${d.getDate()}`
  })
  sms.forEach(m=>{
    const diff=Math.floor((now-new Date(m.received_at).getTime())/86400000)
    if(diff>=0&&diff<range) days[range-1-diff]++
  })
  const otpDays = Array(range).fill(0)
  otps.forEach(m=>{
    const diff=Math.floor((now-new Date(m.received_at).getTime())/86400000)
    if(diff>=0&&diff<range) otpDays[range-1-diff]++
  })
  const maxDay=Math.max(...days,1)

  // Service breakdown
  const svcMap: Record<string,number>={}
  sms.forEach(m=>{const s=m.service||'Unknown';svcMap[s]=(svcMap[s]||0)+1})
  const topServices=Object.entries(svcMap).sort((a,b)=>b[1]-a[1]).slice(0,12)
  const maxSvc=topServices[0]?.[1]||1

  // Country breakdown
  const cMap: Record<string,{name:string,count:number,sms:number,active:number}>={}
  nums.forEach(n=>{
    if(n.country){
      if(!cMap[n.country]) cMap[n.country]={name:n.country_name||n.country,count:0,sms:0,active:0}
      cMap[n.country].count++
      if((n.status||'active')==='active') cMap[n.country].active++
    }
  })
  sms.forEach(m=>{
    const num=nums.find(n=>n.id===m.number_id)
    if(num?.country&&cMap[num.country]) cMap[num.country].sms++
  })
  const topCountries=Object.entries(cMap).sort((a,b)=>b[1].count-a[1].count).slice(0,10)

  // Hourly distribution
  const hourly=Array(24).fill(0)
  inRange.forEach(m=>{const h=new Date(m.received_at).getHours();hourly[h]++})
  const maxHour=Math.max(...hourly,1)
  const peakHour=hourly.indexOf(Math.max(...hourly))

  if(loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',flexDirection:'column',gap:14}}>
      <div style={{width:36,height:36,borderRadius:'50%',border:`3px solid ${G.accentDim}`,borderTop:`3px solid ${G.accent}`,animation:'spin .8s linear infinite'}}/>
      <p style={{color:G.text3,fontSize:13}}>Loading analytics…</p>
    </div>
  )

  return (
    <div style={{maxWidth:1400,margin:'0 auto'}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes barGrow{from{height:0}to{height:var(--h)}}
      `}</style>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{margin:0,fontSize:24,fontWeight:800,color:G.text1,letterSpacing:'-0.5px',display:'flex',alignItems:'center',gap:10}}>
            <i className="bi bi-bar-chart-fill" style={{color:G.green,fontSize:20}}/>
            Analytics
          </h1>
          <p style={{margin:'4px 0 0',fontSize:12,color:G.text3}}>Insights across your SMS data</p>
        </div>
        <div style={{display:'flex',gap:6}}>
          {([7,14,30] as const).map(r=>(
            <button key={r} onClick={()=>setRange(r)} style={{
              padding:'8px 16px',borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',
              background:range===r?G.accentDim:G.card,
              border:`1px solid ${range===r?G.accent:G.border}`,
              color:range===r?G.accentHover:G.text3,transition:'all .2s',
            }}>{r}d</button>
          ))}
        </div>
      </div>

      {sms.length===0&&(
        <div style={{background:G.card,border:`1px dashed ${G.border2}`,borderRadius:14,padding:'50px 40px',textAlign:'center',marginBottom:24}}>
          <i className="bi bi-bar-chart" style={{fontSize:48,color:G.text3,display:'block',marginBottom:14}}/>
          <h3 style={{margin:'0 0 8px',color:G.text1,fontSize:17,fontWeight:700}}>No Data Yet</h3>
          <p style={{color:G.text2,fontSize:13,marginBottom:20}}>Load numbers first to see analytics.</p>
          <Link href="/numbers" style={{padding:'10px 20px',borderRadius:10,background:`linear-gradient(135deg,${G.accent},#a855f7)`,color:'#fff',fontSize:13,fontWeight:700,textDecoration:'none'}}>
            Go to Numbers →
          </Link>
        </div>
      )}

      {/* Top stat cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:14,marginBottom:24}}>
        {[
          {label:'Total Numbers',  value:nums.length,   color:G.accent, icon:'bi-phone-fill',  dim:G.accentDim},
          {label:'Active Numbers', value:active,         color:G.green,  icon:'bi-check-circle',dim:G.greenDim},
          {label:'Total SMS',      value:sms.length,    color:G.blue,   icon:'bi-chat-dots',   dim:G.blueDim},
          {label:'OTPs',           value:otps.length,   color:G.yellow, icon:'bi-key-fill',    dim:G.yellowDim},
          {label:'OTP Rate',       value:`${otpRate}%`, color:G.pink,   icon:'bi-percent',     dim:G.pinkDim},
          {label:`${range}d SMS`,  value:inRange.length,color:G.cyan,   icon:'bi-calendar3',   dim:G.cyanDim},
        ].map(s=>(
          <div key={s.label} style={{
            background:G.card,border:`1px solid ${G.border}`,borderRadius:13,padding:'16px 18px',
            position:'relative',overflow:'hidden',
          }}>
            <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:6}}>
              <i className={`bi ${s.icon}`} style={{fontSize:12,color:s.color}}/>
              <span style={{fontSize:10,fontWeight:700,color:G.text3,textTransform:'uppercase',letterSpacing:'0.06em'}}>{s.label}</span>
            </div>
            <div style={{fontSize:26,fontWeight:800,color:G.text1,lineHeight:1}}>{s.value}</div>
            <div style={{position:'absolute',bottom:-14,right:-14,width:50,height:50,borderRadius:'50%',background:`radial-gradient(circle,${s.dim} 0%,transparent 70%)`,pointerEvents:'none'}}/>
          </div>
        ))}
      </div>

      {/* Daily chart */}
      <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:'22px',marginBottom:20}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <div>
            <span style={{fontSize:14,fontWeight:700,color:G.text1}}>SMS Activity — Last {range} Days</span>
            <div style={{fontSize:11,color:G.text3,marginTop:3}}>{inRange.length} messages in period</div>
          </div>
          <div style={{display:'flex',gap:16}}>
            <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:G.text3}}>
              <div style={{width:10,height:10,borderRadius:2,background:G.accent}}/> SMS
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:G.text3}}>
              <div style={{width:10,height:10,borderRadius:2,background:G.yellow}}/> OTPs
            </div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'flex-end',gap:range<=14?6:3,height:120}}>
          {days.map((v,i)=>(
            <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
              <div style={{width:'100%',display:'flex',flexDirection:'column',alignItems:'center',gap:1,height:100}}>
                <div style={{
                  width:'100%',borderRadius:'3px 3px 0 0',marginTop:'auto',
                  background:`linear-gradient(to top,${G.accent},${G.accentHover}80)`,
                  height:`${Math.round((v/maxDay)*100)}%`,minHeight:v>0?3:0,
                  position:'relative',transition:'height .5s ease',
                }}>
                  {v>0&&v===Math.max(...days)&&<div style={{position:'absolute',top:-16,left:'50%',transform:'translateX(-50%)',fontSize:10,fontWeight:800,color:G.accent,whiteSpace:'nowrap'}}>{v}</div>}
                </div>
                {otpDays[i]>0&&<div style={{
                  width:'60%',borderRadius:'3px 3px 0 0',
                  background:G.yellow,
                  height:`${Math.round((otpDays[i]/maxDay)*100)}%`,minHeight:2,
                  marginTop:-Math.round((otpDays[i]/maxDay)*100)+'%',
                  opacity:0.7,
                }}/>}
              </div>
              {(range<=14||(i%2===0))&&<span style={{fontSize:8,color:G.text3,fontWeight:600,whiteSpace:'nowrap',transform:'rotate(-30deg)',transformOrigin:'top center',marginTop:3}}>{dayLabels[i]}</span>}
            </div>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
        {/* Top Services */}
        <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:'22px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
            <span style={{fontSize:14,fontWeight:700,color:G.text1}}>Top Services</span>
            <span style={{fontSize:11,color:G.text3}}>{Object.keys(svcMap).length} total</span>
          </div>
          {topServices.length===0?(
            <p style={{color:G.text3,fontSize:12,textAlign:'center',padding:'20px 0'}}>No data</p>
          ):topServices.map(([svc,count],i)=>(
            <div key={svc} style={{marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:11,color:G.text3,width:16,textAlign:'right'}}>{i+1}</span>
                  <div style={{width:26,height:26,borderRadius:7,background:`${SVC_COLORS[svc]||G.text3}20`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:800,color:SVC_COLORS[svc]||G.text3}}>{svc.slice(0,2).toUpperCase()}</div>
                  <span style={{fontSize:12,fontWeight:600,color:G.text1}}>{svc}</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:12,fontWeight:800,color:SVC_COLORS[svc]||G.text1}}>{count}</span>
                  <span style={{fontSize:10,color:G.text3}}>{sms.length>0?Math.round(count/sms.length*100):0}%</span>
                </div>
              </div>
              <div style={{height:4,borderRadius:2,background:G.border,overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:2,width:`${(count/maxSvc)*100}%`,background:`linear-gradient(to right,${SVC_COLORS[svc]||G.accent},${SVC_COLORS[svc]||G.accent}80)`,transition:'width .6s ease'}}/>
              </div>
            </div>
          ))}
        </div>

        {/* Country Breakdown */}
        <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:'22px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
            <span style={{fontSize:14,fontWeight:700,color:G.text1}}>Countries</span>
            <Link href="/countries" style={{fontSize:11,color:G.accent,textDecoration:'none'}}>View all →</Link>
          </div>
          {topCountries.length===0?(
            <p style={{color:G.text3,fontSize:12,textAlign:'center',padding:'20px 0'}}>No data</p>
          ):topCountries.map(([code,info])=>(
            <div key={code} style={{
              display:'flex',alignItems:'center',gap:12,padding:'10px 12px',borderRadius:10,
              marginBottom:8,background:G.card2,border:`1px solid ${G.border}`,
            }}>
              <Flag code={code}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:G.text1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{info.name}</div>
                <div style={{fontSize:10,color:G.text3}}>{info.active}/{info.count} active · {info.sms} SMS</div>
              </div>
              <div style={{display:'flex',flex:'column',alignItems:'center',gap:6}}>
                <div style={{fontSize:18,fontWeight:800,color:G.accent}}>{info.count}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hourly Heatmap */}
      <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:'22px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
          <div>
            <span style={{fontSize:14,fontWeight:700,color:G.text1}}>Hourly Distribution</span>
            <div style={{fontSize:11,color:G.text3,marginTop:3}}>Peak hour: {peakHour}:00 ({hourly[peakHour]} messages)</div>
          </div>
        </div>
        <div style={{display:'flex',gap:3,flexWrap:'nowrap',overflow:'hidden'}}>
          {hourly.map((v,h)=>{
            const intensity=Math.round((v/maxHour)*10)/10
            return (
              <div key={h} title={`${h}:00 — ${v} messages`} style={{
                flex:1,aspectRatio:'1',borderRadius:6,cursor:'default',
                background:v===0?G.border:`rgba(124,58,237,${0.15+intensity*0.85})`,
                transition:'all .3s',position:'relative',
              }}/>
            )
          })}
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:8}}>
          {[0,6,12,18,23].map(h=><span key={h} style={{fontSize:10,color:G.text3}}>{h}:00</span>)}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,marginTop:10}}>
          <span style={{fontSize:10,color:G.text3}}>Less</span>
          <div style={{display:'flex',gap:3}}>
            {[0.1,0.3,0.5,0.7,0.9].map(o=>(
              <div key={o} style={{width:14,height:14,borderRadius:3,background:`rgba(124,58,237,${o})`}}/>
            ))}
          </div>
          <span style={{fontSize:10,color:G.text3}}>More</span>
        </div>
      </div>
    </div>
  )
}
