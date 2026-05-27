'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'

const G = {
  bg:'#0a0a0f', card:'#111118', card2:'#16161f', card3:'#1a1a24',
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
}

function Flag({ code }: { code: string }) {
  try { const c=(code||'US').toUpperCase().slice(0,2); return <span style={{fontSize:18}}>{c.split('').map(ch=>String.fromCodePoint(ch.charCodeAt(0)+127397)).join('')}</span> }
  catch { return <span style={{color:G.text3,fontSize:11}}>{code}</span> }
}

export default function NumbersPage() {
  const [nums,          setNums]          = useState<any[]>([])
  const [filtered,      setFiltered]      = useState<any[]>([])
  const [search,        setSearch]        = useState('')
  const [statusF,       setStatusF]       = useState('')
  const [countryF,      setCountryF]      = useState('')
  const [loading,       setLoading]       = useState(true)
  const [injecting,     setInjecting]     = useState(false)
  const [syncing,       setSyncing]       = useState(false)
  const [msg,           setMsg]           = useState<{ok:boolean,text:string}|null>(null)
  const [expandedId,    setExpandedId]    = useState<string|null>(null)
  const [smsMap,        setSmsMap]        = useState<Record<string,any[]>>({})
  const [smsLoading,    setSmsLoading]    = useState<Record<string,boolean>>({})
  const [view,          setView]          = useState<'table'|'grid'>('table')
  const [selected,      setSelected]      = useState<Set<string>>(new Set())
  const [starred,       setStarred]       = useState<Set<string>>(new Set())
  const [sortBy,        setSortBy]        = useState('created_at')
  const [sortDir,       setSortDir]       = useState<'asc'|'desc'>('desc')
  const [onlyStarred,   setOnlyStarred]   = useState(false)
  const [live,          setLive]          = useState(false)
  const [editNote,      setEditNote]      = useState<{id:string,val:string}|null>(null)
  const [copied,        setCopied]        = useState<string|null>(null)
  const [showImport,    setShowImport]    = useState(false)
  const [importCookies, setImportCookies] = useState('')
  const [importing,     setImporting]     = useState(false)
  const liveRef = useRef<any>(null)

  const showMsg = (ok:boolean,text:string,ms=6000)=>{setMsg({ok,text});setTimeout(()=>setMsg(null),ms)}

  const loadNums = useCallback(async(quiet=false)=>{
    if(!quiet) setLoading(true)
    try {
      const r=await fetch('/api/ivasms/numbers')
      if(r.ok){
        const d=await r.json()
        const arr=d.numbers||[]
        setNums(arr)
        setStarred(new Set(arr.filter((n:any)=>n.starred).map((n:any)=>n.id)))
      }
    } catch{}
    setLoading(false)
  },[])

  useEffect(()=>{loadNums()}, [loadNums])
  useEffect(()=>{
    if(live) liveRef.current=setInterval(()=>loadNums(true),5000)
    else clearInterval(liveRef.current)
    return ()=>clearInterval(liveRef.current)
  },[live,loadNums])

  useEffect(()=>{
    let f=[...nums]
    if(onlyStarred) f=f.filter(n=>starred.has(n.id))
    if(search){ const q=search.toLowerCase(); f=f.filter(n=>(n.phone||'').includes(q)||(n.country_name||'').toLowerCase().includes(q)||(n.note||'').toLowerCase().includes(q)) }
    if(statusF) f=f.filter(n=>(n.status||'active')===statusF)
    if(countryF) f=f.filter(n=>n.country===countryF)
    f.sort((a,b)=>{
      let va:any=a[sortBy]??0, vb:any=b[sortBy]??0
      if(typeof va==='string'){va=va.toLowerCase();vb=(vb||'').toLowerCase()}
      if(va<vb) return sortDir==='asc'?-1:1
      if(va>vb) return sortDir==='asc'?1:-1
      return 0
    })
    setFiltered(f)
  },[nums,search,statusF,countryF,sortBy,sortDir,onlyStarred,starred])

  const inject=async()=>{
    // Redirect to cookie import — fake inject removed
    setShowImport(true)
    showMsg(false,'⚠️ Fake data removed. Import real cookies from ivasms.com below ↓')
  }

  const sync=async()=>{
    setSyncing(true)
    try{
      const r=await fetch('/api/ivasms/sync',{method:'POST'})
      const d=await r.json()
      if(d.success!==false){showMsg(true,`✅ ${d.count||0} numbers, ${d.smsAdded||0} new SMS`);await loadNums()}
      else showMsg(false,d.error||'CF protection active')
    } catch(e:any){showMsg(false,e.message)}
    setSyncing(false)
  }

  const importCookiesHandler=async()=>{
    if(!importCookies.trim()) return
    setImporting(true)
    try{
      const r=await fetch('/api/ivasms/import-cookies',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cookies:importCookies})})
      const d=await r.json()
      if(d.ok){showMsg(true,d.message||`✅ Imported ${d.count} real numbers!`);setShowImport(false);setImportCookies('');await loadNums()}
      else showMsg(false,d.error||'Import failed')
    } catch(e:any){showMsg(false,e.message)}
    setImporting(false)
  }

  const toggleStar=async(id:string)=>{
    const val=!starred.has(id)
    setStarred(p=>{const n=new Set(p);val?n.add(id):n.delete(id);return n})
    await fetch(`/api/ivasms/numbers/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({starred:val})}).catch(()=>{})
  }

  const saveNote=async()=>{
    if(!editNote) return
    const snap=editNote
    setNums(p=>p.map(n=>n.id===snap.id?{...n,note:snap.val}:n))
    await fetch(`/api/ivasms/numbers/${snap.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({note:snap.val})}).catch(()=>{})
    setEditNote(null)
  }

  const loadSms=async(num:any)=>{
    if(expandedId===num.id){setExpandedId(null);return}
    setExpandedId(num.id)
    if(smsMap[num.id]) return
    setSmsLoading(p=>({...p,[num.id]:true}))
    try{
      const r=await fetch(`/api/ivasms/sms?numberId=${num.id}&limit=20`)
      const d=await r.json()
      setSmsMap(p=>({...p,[num.id]:d.messages||[]}))
    } catch{setSmsMap(p=>({...p,[num.id]:[]}))}
    setSmsLoading(p=>({...p,[num.id]:false}))
  }

  const copyText=(text:string,key:string)=>{
    navigator.clipboard.writeText(text).catch(()=>{})
    setCopied(key);setTimeout(()=>setCopied(null),2000)
  }

  const bulkDelete=async()=>{
    if(!selected.size||!confirm(`Delete ${selected.size} numbers?`)) return
    for(const id of selected) await fetch(`/api/ivasms/numbers/${id}`,{method:'DELETE'}).catch(()=>{})
    setSelected(new Set());await loadNums()
  }

  const exportCSV=()=>{
    const rows=[['Phone','Country','Status','SMS Count','Starred','Note','Created']]
    filtered.forEach(n=>rows.push([n.phone,n.country_name||n.country,n.status||'active',String(n.sms_count||0),String(starred.has(n.id)),n.note||'',n.created_at?new Date(n.created_at).toLocaleDateString():'']))
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv'})),download:'numbers.csv'})
    a.click()
  }

  const toggleSort=(field:string)=>{
    if(sortBy===field) setSortDir(d=>d==='asc'?'desc':'asc')
    else{setSortBy(field);setSortDir('desc')}
  }

  // Stats
  const active   = nums.filter(n=>(n.status||'active')==='active').length
  const inactive = nums.filter(n=>n.status&&n.status!=='active').length
  const countryDist: Record<string,number>={}
  nums.forEach(n=>{if(n.country) countryDist[n.country]=(countryDist[n.country]||0)+1})
  const topCountries=Object.entries(countryDist).sort((a,b)=>b[1]-a[1]).slice(0,10)
  const uniqueCountries=[...new Set(nums.map(n=>n.country).filter(Boolean))]

  const Btn=({onClick,disabled,icon,label,color,loading:ld,style:s={}}: any)=>(
    <button onClick={onClick} disabled={disabled||ld} style={{
      display:'flex',alignItems:'center',gap:7,padding:'9px 16px',borderRadius:9,
      background:color==='primary'?`linear-gradient(135deg,${G.accent},#a855f7)`:G.card2,
      border:color==='primary'?'none':`1px solid ${G.border2}`,
      color:'#fff',fontSize:12,fontWeight:700,cursor:(disabled||ld)?'not-allowed':'pointer',
      opacity:(disabled||ld)?0.7:1,transition:'all .2s ease',
      ...(color==='primary'?{boxShadow:'0 3px 12px rgba(124,58,237,0.4)'}:{}),
      ...s,
    }}>
      <i className={`bi ${ld?'bi-arrow-repeat':icon}`} style={{fontSize:13,animation:ld?'spin 0.8s linear infinite':undefined}}/>
      {label}
    </button>
  )

  return (
    <div style={{maxWidth:1400,margin:'0 auto'}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes glow{0%,100%{box-shadow:0 0 4px rgba(16,185,129,.6)}50%{box-shadow:0 0 12px rgba(16,185,129,.9)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .row-hover:hover{background:rgba(124,58,237,0.04)!important}
        .btn-hover:hover{opacity:0.85!important}
        thead tr th{border-bottom:1px solid ${G.border}!important}
      `}</style>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{margin:0,fontSize:24,fontWeight:800,color:G.text1,letterSpacing:'-0.5px',display:'flex',alignItems:'center',gap:10}}>
            <i className="bi bi-phone-fill" style={{color:G.accent,fontSize:20}}/>
            Numbers
          </h1>
          <p style={{margin:'4px 0 0',fontSize:12,color:G.text3}}>{nums.length} numbers across {uniqueCountries.length} countries</p>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          <button onClick={()=>setLive(l=>!l)} style={{
            display:'flex',alignItems:'center',gap:6,padding:'9px 14px',borderRadius:9,fontSize:12,fontWeight:700,
            background:live?G.greenDim:G.card2, border:`1px solid ${live?G.green:G.border2}`,
            color:live?G.green:G.text2,cursor:'pointer',transition:'all .2s',
          }}>
            <div style={{width:6,height:6,borderRadius:'50%',background:live?G.green:G.text3,animation:live?'glow 2s infinite':undefined}}/>
            {live?'Live ON':'Live'}
          </button>
          <Btn onClick={()=>setShowImport(v=>!v)} icon="bi-cookie" label="Import Cookies" color="default"/>
          <Btn onClick={()=>setShowImport(v=>!v)} icon="bi-cookie" label="Import Real Cookies" color="primary"/>
          <Btn onClick={sync} icon="bi-arrow-clockwise" label={syncing?'Syncing…':'Sync'} loading={syncing}/>
          <Btn onClick={exportCSV} icon="bi-download" label="CSV"/>
          <button onClick={()=>setView(v=>v==='table'?'grid':'table')} style={{
            padding:'9px 14px',borderRadius:9,background:G.card2,border:`1px solid ${G.border2}`,
            color:G.text2,cursor:'pointer',fontSize:13,
          }}>
            <i className={`bi ${view==='table'?'bi-grid-3x2-gap-fill':'bi-list-ul'}`}/>
          </button>
        </div>
      </div>

      {/* Alert */}
      {msg&&(
        <div style={{padding:'11px 16px',borderRadius:10,marginBottom:18,fontSize:13,fontWeight:600,animation:'slideIn .2s ease',
          background:msg.ok?G.greenDim:G.redDim,color:msg.ok?G.green:G.red,
          border:`1px solid ${msg.ok?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`}}>{msg.text}</div>
      )}

      {/* Cookie Import Panel */}
      {showImport&&(
        <div style={{background:G.card,border:`1px solid rgba(124,58,237,0.3)`,borderRadius:14,padding:'20px',marginBottom:20,animation:'slideIn .2s ease'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <i className="bi bi-shield-lock-fill" style={{fontSize:18,color:G.accent}}/>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:G.text1}}>Import Real Cookies from iVASMS</div>
                <div style={{fontSize:11,color:G.text3}}>Bypass Cloudflare by importing your browser session</div>
              </div>
            </div>
            <button onClick={()=>setShowImport(false)} style={{background:'none',border:'none',color:G.text3,cursor:'pointer',fontSize:18,padding:4}}>×</button>
          </div>
          <div style={{background:G.card2,borderRadius:10,padding:'14px 16px',marginBottom:16,border:`1px solid ${G.border}`}}>
            <div style={{fontSize:11,fontWeight:700,color:G.yellow,marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
              <i className="bi bi-info-circle-fill"/>
              How to get your cookies:
            </div>
            <ol style={{margin:0,paddingLeft:18,fontSize:12,color:G.text2,lineHeight:2}}>
              <li>Go to <strong style={{color:G.text1}}>ivasms.com</strong> in Chrome/Firefox and login</li>
              <li>Press <strong style={{color:G.accent}}>F12</strong> → Application → Cookies → www.ivasms.com</li>
              <li>Copy these cookies: <strong style={{color:G.text1}}>cf_clearance, ivas_sms_session, XSRF-TOKEN</strong></li>
              <li>Format: <code style={{background:G.card3,padding:'1px 6px',borderRadius:4,color:G.cyan,fontSize:11}}>cf_clearance=xxx; ivas_sms_session=yyy; XSRF-TOKEN=zzz</code></li>
            </ol>
          </div>
          <textarea
            value={importCookies}
            onChange={e=>setImportCookies(e.target.value)}
            placeholder="Paste cookies here: cf_clearance=...; ivas_sms_session=...; XSRF-TOKEN=..."
            rows={3}
            style={{
              width:'100%',padding:'12px 14px',borderRadius:10,fontSize:12,
              background:G.card3,border:`1px solid ${G.border2}`,color:G.text1,
              resize:'vertical',outline:'none',fontFamily:'monospace',boxSizing:'border-box',
              marginBottom:12,
            }}
          />
          <div style={{display:'flex',gap:10}}>
            <Btn onClick={importCookiesHandler} icon="bi-box-arrow-in-down" label={importing?'Importing…':'Import & Scrape Real Numbers'} color="primary" loading={importing}/>
            <Btn onClick={()=>{setShowImport(false);setImportCookies('')}} icon="bi-x" label="Cancel"/>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:12,marginBottom:20}}>
        {[
          {label:'Total',    value:nums.length,   color:G.accent, icon:'bi-phone-fill'},
          {label:'Active',   value:active,         color:G.green,  icon:'bi-circle-fill'},
          {label:'Inactive', value:inactive,       color:G.text3,  icon:'bi-circle'},
          {label:'Countries',value:uniqueCountries.length, color:G.blue, icon:'bi-globe2'},
          {label:'SMS Total',value:nums.reduce((s,n)=>s+(n.sms_count||0),0), color:G.yellow, icon:'bi-chat-dots-fill'},
          {label:'Starred',  value:starred.size,  color:G.pink,   icon:'bi-star-fill'},
        ].map(s=>(
          <div key={s.label} style={{
            background:G.card,border:`1px solid ${G.border}`,borderRadius:12,
            padding:'14px 16px',display:'flex',flexDirection:'column',gap:4,
          }}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
              <i className={`bi ${s.icon}`} style={{fontSize:11,color:s.color}}/>
              <span style={{fontSize:10,fontWeight:700,color:G.text3,textTransform:'uppercase',letterSpacing:'0.06em'}}>{s.label}</span>
            </div>
            <span style={{fontSize:24,fontWeight:800,color:G.text1,lineHeight:1}}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{position:'relative',flex:1,minWidth:200}}>
          <i className="bi bi-search" style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:G.text3,fontSize:13}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search numbers, countries…"
            style={{width:'100%',padding:'9px 12px 9px 36px',borderRadius:10,background:G.card,border:`1px solid ${G.border2}`,color:G.text1,fontSize:13,outline:'none',boxSizing:'border-box'}}/>
        </div>
        <select value={statusF} onChange={e=>setStatusF(e.target.value)} style={{padding:'9px 14px',borderRadius:10,background:G.card,border:`1px solid ${G.border2}`,color:G.text2,fontSize:13,outline:'none',cursor:'pointer'}}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="expired">Expired</option>
        </select>
        <select value={countryF} onChange={e=>setCountryF(e.target.value)} style={{padding:'9px 14px',borderRadius:10,background:G.card,border:`1px solid ${G.border2}`,color:G.text2,fontSize:13,outline:'none',cursor:'pointer'}}>
          <option value="">All Countries</option>
          {topCountries.map(([code])=><option key={code} value={code}>{code} ({countryDist[code]})</option>)}
        </select>
        <button onClick={()=>setOnlyStarred(v=>!v)} style={{
          padding:'9px 14px',borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer',transition:'all .2s',
          background:onlyStarred?G.pinkDim:G.card, border:`1px solid ${onlyStarred?G.pink:G.border2}`,
          color:onlyStarred?G.pink:G.text2,display:'flex',alignItems:'center',gap:6,
        }}>
          <i className={`bi ${onlyStarred?'bi-star-fill':'bi-star'}`}/>
          Starred
        </button>
        {selected.size>0&&(
          <button onClick={bulkDelete} style={{
            padding:'9px 14px',borderRadius:10,background:G.redDim,border:`1px solid rgba(239,68,68,0.3)`,
            color:G.red,fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6,
          }}>
            <i className="bi bi-trash3-fill"/>Delete {selected.size}
          </button>
        )}
        <span style={{fontSize:12,color:G.text3,marginLeft:'auto'}}>{filtered.length} of {nums.length}</span>
      </div>

      {/* Country pills */}
      {topCountries.length>0&&(
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
          {topCountries.map(([code,count])=>(
            <button key={code} onClick={()=>setCountryF(countryF===code?'':code)} style={{
              display:'flex',alignItems:'center',gap:6,padding:'4px 12px',borderRadius:20,
              background:countryF===code?G.accentDim:G.card,
              border:`1px solid ${countryF===code?G.accent:G.border}`,
              color:countryF===code?G.accentHover:G.text3,fontSize:12,fontWeight:600,cursor:'pointer',
            }}>
              <Flag code={code}/><span>{code}</span><span style={{opacity:.6}}>·{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading&&(
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:200,flexDirection:'column',gap:14}}>
          <div style={{width:36,height:36,borderRadius:'50%',border:`3px solid ${G.accentDim}`,borderTop:`3px solid ${G.accent}`,animation:'spin .8s linear infinite'}}/>
          <p style={{color:G.text3,fontSize:13}}>Loading numbers…</p>
        </div>
      )}

      {/* Empty state */}
      {!loading&&nums.length===0&&(
        <div style={{
          background:G.card,border:`1px dashed ${G.border2}`,borderRadius:16,
          padding:'60px 40px',textAlign:'center',
        }}>
          <i className="bi bi-phone-fill" style={{fontSize:48,color:G.text3,display:'block',marginBottom:16}}/>
          <h3 style={{margin:'0 0 8px',color:G.text1,fontSize:18,fontWeight:700}}>No Numbers Yet</h3>
          <p style={{color:G.text2,fontSize:13,marginBottom:24,lineHeight:1.6,maxWidth:400,margin:'0 auto 24px'}}>
            Import your real numbers from iVASMS.com using browser cookies, or run Sync if you have credentials saved.
          </p>
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
            <Btn onClick={()=>setShowImport(true)} icon="bi-cookie" label="Import Cookies from iVASMS" color="primary"/>
            <Btn onClick={sync} icon="bi-arrow-clockwise" label={syncing?'Syncing…':'Try Auto-Sync'} loading={syncing}/>
          </div>
        </div>
      )}

      {/* TABLE VIEW */}
      {!loading&&filtered.length>0&&view==='table'&&(
        <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:G.card2}}>
                <th style={{padding:'12px 16px',width:40}}>
                  <input type="checkbox" checked={selected.size===filtered.length&&filtered.length>0}
                    onChange={e=>setSelected(e.target.checked?new Set(filtered.map((n:any)=>n.id)):new Set())}
                    style={{accentColor:G.accent,cursor:'pointer'}}/>
                </th>
                {[
                  {label:'Number',  field:'phone'},
                  {label:'Country', field:'country_name'},
                  {label:'Status',  field:'status'},
                  {label:'SMS',     field:'sms_count'},
                  {label:'Created', field:'created_at'},
                  {label:'Note',    field:'note'},
                  {label:'',        field:null},
                ].map(h=>(
                  <th key={h.label} onClick={h.field?()=>toggleSort(h.field!):undefined} style={{
                    padding:'12px 14px',textAlign:'left',fontSize:10,fontWeight:700,
                    color:G.text3,textTransform:'uppercase',letterSpacing:'0.06em',
                    cursor:h.field?'pointer':'default',userSelect:'none',whiteSpace:'nowrap',
                  }}>
                    {h.label}
                    {h.field&&sortBy===h.field&&(
                      <i className={`bi bi-chevron-${sortDir==='asc'?'up':'down'}`} style={{fontSize:9,marginLeft:4,color:G.accent}}/>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(num=>{
                const isExp=expandedId===num.id
                const isActive=(num.status||'active')==='active'
                const isStarred=starred.has(num.id)
                const isSel=selected.has(num.id)
                return [
                  <tr key={num.id} className="row-hover" style={{
                    cursor:'pointer',borderTop:`1px solid ${G.border}`,
                    background:isSel?'rgba(124,58,237,0.06)':'transparent',
                    transition:'background .15s',
                  }}>
                    <td style={{padding:'13px 16px'}} onClick={e=>e.stopPropagation()}>
                      <input type="checkbox" checked={isSel}
                        onChange={e=>{setSelected(p=>{const n=new Set(p);e.target.checked?n.add(num.id):n.delete(num.id);return n})}}
                        style={{accentColor:G.accent,cursor:'pointer'}}/>
                    </td>
                    <td style={{padding:'13px 14px'}} onClick={()=>loadSms(num)}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{
                          width:34,height:34,borderRadius:10,
                          background:`${G.accent}15`,border:`1px solid ${G.accent}25`,
                          display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,
                        }}><Flag code={num.country||'US'}/></div>
                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:G.text1,fontFamily:'monospace',letterSpacing:'0.02em'}}>{num.phone}</div>
                          <div style={{fontSize:10,color:G.text3}}>ID: {num.ivasms_id||'—'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{padding:'13px 14px'}} onClick={()=>loadSms(num)}>
                      <span style={{fontSize:12,color:G.text2}}>{num.country_name||num.country||'—'}</span>
                    </td>
                    <td style={{padding:'13px 14px'}} onClick={()=>loadSms(num)}>
                      <span style={{
                        display:'inline-flex',alignItems:'center',gap:5,
                        padding:'3px 9px',borderRadius:20,fontSize:11,fontWeight:700,
                        background:isActive?G.greenDim:'rgba(107,114,128,0.1)',
                        color:isActive?G.green:'#6b7280',
                        border:`1px solid ${isActive?'rgba(16,185,129,0.3)':'rgba(107,114,128,0.2)'}`,
                      }}>
                        <span style={{width:5,height:5,borderRadius:'50%',background:isActive?G.green:'#6b7280',animation:isActive?'glow 2s infinite':undefined}}/>
                        {num.status||'active'}
                      </span>
                    </td>
                    <td style={{padding:'13px 14px'}} onClick={()=>loadSms(num)}>
                      <span style={{fontSize:13,fontWeight:700,color:num.sms_count>0?G.blue:G.text3}}>{num.sms_count||0}</span>
                    </td>
                    <td style={{padding:'13px 14px'}} onClick={()=>loadSms(num)}>
                      <span style={{fontSize:11,color:G.text3}}>{num.created_at?new Date(num.created_at).toLocaleDateString():'-'}</span>
                    </td>
                    <td style={{padding:'13px 14px'}}>
                      {editNote?.id===num.id ? (
                        <div style={{display:'flex',gap:6,alignItems:'center'}} onClick={e=>e.stopPropagation()}>
                          <input value={editNote?.val??''} onChange={e=>setEditNote({id:num.id,val:e.target.value})} onKeyDown={e=>{if(e.key==='Enter')saveNote();if(e.key==='Escape')setEditNote(null)}}
                            style={{padding:'4px 8px',borderRadius:6,background:G.card3,border:`1px solid ${G.border2}`,color:G.text1,fontSize:12,outline:'none',width:120}} autoFocus/>
                          <button onClick={saveNote} style={{padding:'4px 8px',borderRadius:6,background:G.greenDim,border:`1px solid ${G.green}40`,color:G.green,fontSize:11,cursor:'pointer',fontWeight:700}}>✓</button>
                          <button onClick={()=>setEditNote(null)} style={{padding:'4px 8px',borderRadius:6,background:G.redDim,border:`1px solid ${G.red}40`,color:G.red,fontSize:11,cursor:'pointer'}}>✗</button>
                        </div>
                      ) : (
                        <button onClick={e=>{e.stopPropagation();setEditNote({id:num.id,val:num.note||''})}} style={{
                          background:'none',border:'none',cursor:'pointer',color:num.note?G.text2:G.text3,
                          fontSize:12,padding:'2px 0',textAlign:'left',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
                        }} title={num.note||'Add note'}>
                          {num.note||<span style={{opacity:.4}}>+ note</span>}
                        </button>
                      )}
                    </td>
                    <td style={{padding:'13px 14px'}}>
                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <button onClick={e=>{e.stopPropagation();toggleStar(num.id)}} style={{background:'none',border:'none',cursor:'pointer',padding:2,color:isStarred?G.yellow:G.text3,fontSize:14,transition:'color .15s'}}>
                          <i className={`bi ${isStarred?'bi-star-fill':'bi-star'}`}/>
                        </button>
                        <button onClick={e=>{e.stopPropagation();copyText(num.phone,num.id)}} style={{background:'none',border:'none',cursor:'pointer',padding:2,color:copied===num.id?G.green:G.text3,fontSize:13,transition:'color .15s'}}>
                          <i className={`bi ${copied===num.id?'bi-check-circle-fill':'bi-copy'}`}/>
                        </button>
                        <button onClick={e=>{e.stopPropagation();loadSms(num)}} style={{background:'none',border:'none',cursor:'pointer',padding:2,color:isExp?G.accent:G.text3,fontSize:13,transition:'color .15s'}}>
                          <i className={`bi bi-chevron-${isExp?'up':'down'}`}/>
                        </button>
                      </div>
                    </td>
                  </tr>,
                  isExp && (
                    <tr key={`${num.id}-sms`}>
                      <td colSpan={8} style={{padding:0,borderTop:'none'}}>
                        <div style={{background:G.card2,borderTop:`1px solid ${G.border}`,padding:'16px 20px',animation:'fadeIn .2s ease'}}>
                          {smsLoading[num.id]?(
                            <div style={{display:'flex',alignItems:'center',gap:10,color:G.text3,fontSize:13}}>
                              <div style={{width:14,height:14,borderRadius:'50%',border:`2px solid ${G.accentDim}`,borderTop:`2px solid ${G.accent}`,animation:'spin .8s linear infinite'}}/>
                              Loading messages…
                            </div>
                          ) : smsMap[num.id]?.length===0 ? (
                            <span style={{color:G.text3,fontSize:13}}>No SMS for this number yet</span>
                          ) : (
                            <div>
                              <div style={{fontSize:11,fontWeight:700,color:G.text3,marginBottom:12,textTransform:'uppercase',letterSpacing:'0.06em'}}>
                                Recent Messages ({smsMap[num.id]?.length||0})
                              </div>
                              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                                {(smsMap[num.id]||[]).map((m:any)=>(
                                  <div key={m.id} style={{
                                    background:G.card,borderRadius:10,padding:'12px 14px',
                                    border:`1px solid ${G.border}`,display:'flex',gap:12,alignItems:'flex-start',
                                  }}>
                                    <div style={{
                                      width:32,height:32,borderRadius:8,flexShrink:0,
                                      background:`${SVC_COLORS[m.service]||G.text3}20`,
                                      display:'flex',alignItems:'center',justifyContent:'center',
                                      fontSize:10,fontWeight:800,color:SVC_COLORS[m.service]||G.text3,
                                    }}>{(m.service||'?').slice(0,2).toUpperCase()}</div>
                                    <div style={{flex:1,minWidth:0}}>
                                      <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:3}}>
                                        <span style={{fontSize:12,fontWeight:700,color:G.text1}}>{m.service||'Unknown'}</span>
                                        <span style={{fontSize:10,color:G.text3}}>from {m.sender}</span>
                                        {m.otp&&<span style={{fontSize:10,fontWeight:800,padding:'1px 6px',borderRadius:10,background:G.yellowDim,color:G.yellow,border:`1px solid ${G.yellow}30`}}>OTP</span>}
                                      </div>
                                      <div style={{fontSize:12,color:G.text2,lineHeight:1.5}}>{m.body}</div>
                                      {m.otp&&<div style={{marginTop:6,fontSize:18,fontWeight:800,color:G.yellow,letterSpacing:'0.15em'}}>{m.otp}</div>}
                                    </div>
                                    <span style={{fontSize:10,color:G.text3,whiteSpace:'nowrap',flexShrink:0}}>
                                      {m.received_at?new Date(m.received_at).toLocaleString():''}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                ].filter(Boolean)
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* GRID VIEW */}
      {!loading&&filtered.length>0&&view==='grid'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:14}}>
          {filtered.map(num=>{
            const isActive=(num.status||'active')==='active'
            const isStarred=starred.has(num.id)
            return (
              <div key={num.id} style={{
                background:G.card,border:`1px solid ${G.border}`,borderRadius:14,
                padding:'18px',cursor:'pointer',transition:'all .2s ease',position:'relative',
              }}
              onClick={()=>loadSms(num)}
              onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=G.accent;(e.currentTarget as HTMLDivElement).style.transform='translateY(-2px)'}}
              onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=G.border;(e.currentTarget as HTMLDivElement).style.transform='translateY(0)'}}
              >
                <div style={{position:'absolute',top:14,right:14,display:'flex',gap:8}}>
                  <button onClick={e=>{e.stopPropagation();toggleStar(num.id)}} style={{background:'none',border:'none',cursor:'pointer',padding:2,color:isStarred?G.yellow:G.text3,fontSize:14}}>
                    <i className={`bi ${isStarred?'bi-star-fill':'bi-star'}`}/>
                  </button>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                  <div style={{width:44,height:44,borderRadius:12,background:`${G.accent}15`,border:`1px solid ${G.accent}25`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>
                    <Flag code={num.country||'US'}/>
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:G.text1,fontFamily:'monospace'}}>{num.phone}</div>
                    <div style={{fontSize:11,color:G.text3}}>{num.country_name||num.country||'—'}</div>
                  </div>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <span style={{
                    display:'inline-flex',alignItems:'center',gap:4,
                    padding:'3px 8px',borderRadius:20,fontSize:10,fontWeight:700,
                    background:isActive?G.greenDim:'rgba(107,114,128,0.1)',
                    color:isActive?G.green:'#6b7280',
                    border:`1px solid ${isActive?'rgba(16,185,129,0.3)':'rgba(107,114,128,0.2)'}`,
                  }}>
                    <span style={{width:5,height:5,borderRadius:'50%',background:isActive?G.green:'#6b7280',animation:isActive?'glow 2s infinite':undefined}}/>
                    {num.status||'active'}
                  </span>
                  <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:G.blue,fontWeight:700}}>
                    <i className="bi bi-chat-dots-fill" style={{fontSize:11}}/>
                    {num.sms_count||0} SMS
                  </div>
                </div>
                {num.note&&<div style={{fontSize:11,color:G.text2,background:G.card2,borderRadius:7,padding:'6px 10px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{num.note}</div>}
                <div style={{marginTop:10,display:'flex',gap:8}}>
                  <button onClick={e=>{e.stopPropagation();copyText(num.phone,num.id)}} style={{
                    flex:1,padding:'7px',borderRadius:8,background:G.card2,border:`1px solid ${G.border}`,
                    color:copied===num.id?G.green:G.text3,fontSize:11,fontWeight:600,cursor:'pointer',
                    display:'flex',alignItems:'center',justifyContent:'center',gap:5,
                  }}>
                    <i className={`bi ${copied===num.id?'bi-check':'bi-copy'}`}/>{copied===num.id?'Copied':'Copy'}
                  </button>
                  <button onClick={e=>{e.stopPropagation();setEditNote({id:num.id,val:num.note||''})}} style={{
                    flex:1,padding:'7px',borderRadius:8,background:G.card2,border:`1px solid ${G.border}`,
                    color:G.text3,fontSize:11,fontWeight:600,cursor:'pointer',
                    display:'flex',alignItems:'center',justifyContent:'center',gap:5,
                  }}>
                    <i className="bi bi-pencil-fill"/>Note
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
