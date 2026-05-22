'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

const G = {
  bg:'#0a0a0f', card:'#111118', card2:'#16161f', card3:'#1a1a24',
  border:'rgba(255,255,255,0.07)', border2:'rgba(255,255,255,0.12)',
  text1:'#f0f0f8', text2:'#a0a0b8', text3:'#60607a',
  accent:'#7c3aed', accentDim:'rgba(124,58,237,0.15)',
  green:'#10b981', greenDim:'rgba(16,185,129,0.12)',
  red:'#ef4444', redDim:'rgba(239,68,68,0.1)',
  yellow:'#f59e0b', yellowDim:'rgba(245,158,11,0.1)',
  blue:'#3b82f6',
  waGreen:'#25d366', waPanel:'#111b21', waMsg:'#005c4b', waBg:'#0b141a',
}

interface Cfg { phoneId:string; wabaId:string; hasToken:boolean; tokenPreview:string; webhookVerify:string; phoneNumber:string; displayName:string; status:string; configuredAt:string|null; verified:boolean }
interface Contact { id:string; name:string; phone:string; avatar:string|null; addedAt:string; lastMessage:string|null; lastMessageAt:string|null; unread:number }
interface Msg { id:string; meta_id?:string; from:string; to:string; body:string; type?:string; sent_at:string; status:string; incoming?:boolean; via_cloud_api?:boolean }

export default function WhatsAppPage() {
  const [cfg,           setCfg]          = useState<Cfg|null>(null)
  const [cfgLoading,    setCfgLoading]   = useState(true)
  const [tab,           setTab]          = useState<'chat'|'setup'|'broadcast'|'guide'>('setup')
  const [contacts,      setContacts]     = useState<Contact[]>([])
  const [active,        setActive]       = useState<Contact|null>(null)
  const [thread,        setThread]       = useState<Msg[]>([])
  const [msgInput,      setMsgInput]     = useState('')
  const [sending,       setSending]      = useState(false)
  const [sendErr,       setSendErr]      = useState('')
  const [search,        setSearch]       = useState('')
  const [form,          setForm]         = useState({phoneId:'',token:'',wabaId:'',webhookVerify:''})
  const [setupResult,   setSetupResult]  = useState<any>(null)
  const [setupLoading,  setSetupLoading] = useState(false)
  const [showAdd,       setShowAdd]      = useState(false)
  const [newC,          setNewC]         = useState({name:'',phone:''})
  const [addingC,       setAddingC]      = useState(false)
  const [bcMsg,         setBcMsg]        = useState('')
  const [bcNums,        setBcNums]       = useState('')
  const [bcSending,     setBcSending]    = useState(false)
  const [bcResult,      setBcResult]     = useState<any>(null)
  const [templates,     setTemplates]    = useState<any[]>([])
  const [waNumbers,     setWaNumbers]    = useState<any[]>([])
  const [msgAlert,      setMsgAlert]     = useState<{ok:boolean,text:string}|null>(null)
  const [copied,        setCopied]       = useState<string|null>(null)
  const msgEndRef = useRef<HTMLDivElement>(null)
  const pollRef   = useRef<any>(null)

  const showAlert=(ok:boolean,text:string,ms=6000)=>{setMsgAlert({ok,text});setTimeout(()=>setMsgAlert(null),ms)}
  const copyText=(text:string,k:string)=>{navigator.clipboard.writeText(text).catch(()=>{});setCopied(k);setTimeout(()=>setCopied(null),2000)}

  const loadCfg=useCallback(async()=>{
    try{
      const r=await fetch('/api/wa/config')
      if(r.ok){
        const d=await r.json()
        setCfg(d)
        if(d.status==='active'){
          setTab('chat')
          fetch('/api/wa/numbers').then(r=>r.json()).then(d=>setWaNumbers(d.numbers||[]))
          fetch('/api/wa/templates').then(r=>r.json()).then(d=>setTemplates(d.templates||[]))
        }
      }
    }catch{}
    setCfgLoading(false)
  },[])

  const loadContacts=useCallback(async()=>{
    try{
      const r=await fetch('/api/whatsapp/contacts')
      if(r.ok){const d=await r.json();setContacts(Array.isArray(d.contacts)?d.contacts:[])}
    }catch{}
  },[])

  const loadThread=useCallback(async(phone:string,quiet=false)=>{
    try{
      const r=await fetch(`/api/whatsapp/thread?phone=${encodeURIComponent(phone)}`)
      if(r.ok){const d=await r.json();setThread(Array.isArray(d.messages)?d.messages:[])}
    }catch{}
  },[])

  useEffect(()=>{loadCfg();loadContacts()},[loadCfg,loadContacts])

  useEffect(()=>{
    clearInterval(pollRef.current)
    if(active){
      loadThread(active.phone)
      pollRef.current=setInterval(()=>loadThread(active.phone,true),3000)
    }
    return ()=>clearInterval(pollRef.current)
  },[active,loadThread])

  useEffect(()=>{msgEndRef.current?.scrollIntoView({behavior:'smooth'})},[thread])

  const openContact=(c:Contact)=>{
    setActive(c);setSendErr('');setMsgInput('')
    setContacts(p=>p.map(x=>x.id===c.id?{...x,unread:0}:x))
  }

  const sendMsg=async()=>{
    if(!active||!msgInput.trim()) return
    setSending(true);setSendErr('')
    const text=msgInput.trim();setMsgInput('')
    try{
      const r=await fetch('/api/whatsapp/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:active.phone,message:text})})
      const d=await r.json()
      if(r.ok){
        setThread(p=>[...p,d.message])
        setContacts(p=>p.map(c=>c.id===active.id?{...c,lastMessage:text,lastMessageAt:new Date().toISOString()}:c))
        if(!d.sentViaCloudApi&&cfg?.status!=='active') setSendErr('Saved locally (WhatsApp Cloud API not configured)')
      } else setSendErr(d.error||'Send failed')
    }catch(e:any){setSendErr(e.message)}
    setSending(false)
  }

  const addContact=async()=>{
    if(!newC.phone.trim()) return
    setAddingC(true)
    try{
      const r=await fetch('/api/whatsapp/contacts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:newC.name||newC.phone,phone:newC.phone})})
      const d=await r.json()
      if(r.ok){setContacts(p=>[d.contact,...p]);setShowAdd(false);setNewC({name:'',phone:''});showAlert(true,'Contact added!')}
      else showAlert(false,d.error||'Failed')
    }catch(e:any){showAlert(false,(e as any).message)}
    setAddingC(false)
  }

  const setupWA=async()=>{
    setSetupLoading(true);setSetupResult(null)
    try{
      const r=await fetch('/api/wa/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
      const d=await r.json()
      setSetupResult(d)
      if(d.ok&&d.verified) loadCfg()
    }catch(e:any){setSetupResult({error:(e as any).message})}
    setSetupLoading(false)
  }

  const sendBroadcast=async()=>{
    if(!bcMsg.trim()||!bcNums.trim()) return
    setBcSending(true);setBcResult(null)
    const list=bcNums.split('\n').map(s=>s.trim()).filter(Boolean)
    try{
      const results=[]
      for(const phone of list.slice(0,50)){
        const r=await fetch('/api/whatsapp/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:phone,message:bcMsg})})
        const d=await r.json()
        results.push({phone,ok:r.ok,error:d.error})
      }
      setBcResult({sent:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,results})
    }catch(e:any){setBcResult({error:(e as any).message})}
    setBcSending(false)
  }

  const inp={width:'100%',padding:'10px 14px',borderRadius:10,background:G.card2,border:`1px solid ${G.border2}`,color:G.text1,fontSize:13,outline:'none',boxSizing:'border-box' as const}
  const Label=({c}:{c:string})=><div style={{fontSize:11,fontWeight:700,color:G.text3,textTransform:'uppercase' as const,letterSpacing:'0.07em',marginBottom:6}}>{c}</div>

  const TABS=[
    {id:'chat',    icon:'bi-chat-dots-fill',  label:'Chat'},
    {id:'setup',   icon:'bi-gear-fill',       label:'Setup'},
    {id:'broadcast',icon:'bi-send-fill',      label:'Broadcast'},
    {id:'guide',   icon:'bi-book-fill',       label:'Setup Guide'},
  ] as const

  return (
    <div style={{maxWidth:1400,margin:'0 auto'}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
      `}</style>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:44,height:44,borderRadius:12,background:'rgba(37,211,102,0.15)',border:'1px solid rgba(37,211,102,0.3)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <i className="bi bi-whatsapp" style={{fontSize:22,color:G.waGreen}}/>
          </div>
          <div>
            <h1 style={{margin:0,fontSize:22,fontWeight:800,color:G.text1,letterSpacing:'-0.5px'}}>WhatsApp</h1>
            <p style={{margin:0,fontSize:12,color:G.text3}}>
              {cfg?.status==='active'?<span style={{color:G.waGreen,fontWeight:600}}>● Connected · {cfg.phoneNumber}</span>:'Meta Cloud API — Real WhatsApp'}
            </p>
          </div>
        </div>
        <div style={{display:'flex',gap:4,background:G.card,borderRadius:10,padding:4,border:`1px solid ${G.border}`}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:8,
              fontSize:12,fontWeight:700,cursor:'pointer',transition:'all .2s',
              background:tab===t.id?G.accentDim:'none',
              border:tab===t.id?`1px solid ${G.accent}40`:'1px solid transparent',
              color:tab===t.id?'#8b5cf6':G.text3,
            }}>
              <i className={`bi ${t.icon}`} style={{fontSize:12}}/>{t.label}
            </button>
          ))}
        </div>
      </div>

      {msgAlert&&(
        <div style={{padding:'11px 16px',borderRadius:10,marginBottom:16,fontSize:13,fontWeight:600,animation:'slideIn .2s ease',
          background:msgAlert.ok?G.greenDim:G.redDim,color:msgAlert.ok?G.green:G.red,
          border:`1px solid ${msgAlert.ok?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`}}>{msgAlert.text}</div>
      )}

      {/* ─── CHAT TAB ─── */}
      {tab==='chat'&&(
        <div style={{display:'flex',height:'calc(100vh - 200px)',minHeight:500,border:`1px solid ${G.border}`,borderRadius:14,overflow:'hidden',background:G.waPanel}}>
          {/* Sidebar */}
          <div style={{width:340,flexShrink:0,borderRight:`1px solid rgba(255,255,255,0.05)`,display:'flex',flexDirection:'column',background:'#1f2c34'}}>
            {/* Search + Add */}
            <div style={{padding:'14px 12px 10px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
              <div style={{display:'flex',gap:8,marginBottom:10}}>
                <div style={{position:'relative',flex:1}}>
                  <i className="bi bi-search" style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:G.text3,fontSize:12}}/>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search contacts…"
                    style={{...inp,background:'rgba(255,255,255,0.05)',border:'none',paddingLeft:32,fontSize:12}}/>
                </div>
                <button onClick={()=>setShowAdd(v=>!v)} style={{width:38,height:38,borderRadius:9,background:G.waGreen,border:'none',color:'#fff',cursor:'pointer',fontSize:16,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <i className="bi bi-person-plus-fill"/>
                </button>
              </div>
              {showAdd&&(
                <div style={{background:'rgba(255,255,255,0.04)',borderRadius:10,padding:'12px',marginTop:4,animation:'slideIn .2s ease'}}>
                  <input value={newC.name} onChange={e=>setNewC(p=>({...p,name:e.target.value}))} placeholder="Name (optional)"
                    style={{...inp,background:'rgba(255,255,255,0.07)',border:'none',marginBottom:8,fontSize:12}}/>
                  <input value={newC.phone} onChange={e=>setNewC(p=>({...p,phone:e.target.value}))} placeholder="+1234567890"
                    style={{...inp,background:'rgba(255,255,255,0.07)',border:'none',marginBottom:8,fontFamily:'monospace',fontSize:12}}/>
                  <button onClick={addContact} disabled={addingC} style={{width:'100%',padding:'8px',borderRadius:8,background:G.waGreen,border:'none',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                    {addingC?'Adding…':'Add Contact'}
                  </button>
                </div>
              )}
            </div>
            {/* Contact list */}
            <div style={{flex:1,overflowY:'auto'}}>
              {contacts.filter(c=>!search||(c.name||'').toLowerCase().includes(search.toLowerCase())||(c.phone||'').includes(search)).length===0?(
                <div style={{padding:'40px 20px',textAlign:'center',color:G.text3,fontSize:13}}>
                  <i className="bi bi-people" style={{fontSize:32,display:'block',marginBottom:12}}/>
                  No contacts yet<br/>
                  <span style={{fontSize:11}}>Add a contact or load numbers from iVASMS</span>
                </div>
              ):contacts.filter(c=>!search||(c.name||'').toLowerCase().includes(search.toLowerCase())||(c.phone||'').includes(search)).map(c=>(
                <div key={c.id} onClick={()=>openContact(c)} style={{
                  display:'flex',alignItems:'center',gap:12,padding:'12px 16px',cursor:'pointer',
                  background:active?.id===c.id?'rgba(37,211,102,0.08)':'transparent',
                  borderBottom:'1px solid rgba(255,255,255,0.03)',transition:'background .15s',
                }}
                onMouseEnter={e=>{if(active?.id!==c.id)(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,0.03)'}}
                onMouseLeave={e=>{if(active?.id!==c.id)(e.currentTarget as HTMLDivElement).style.background='transparent'}}
                >
                  <div style={{
                    width:42,height:42,borderRadius:'50%',flexShrink:0,
                    background:`${G.waGreen}20`,border:`2px solid ${active?.id===c.id?G.waGreen:'transparent'}`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:14,fontWeight:800,color:G.waGreen,
                    transition:'border .2s',
                  }}>{(c.name||c.phone).slice(0,1).toUpperCase()}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2}}>
                      <span style={{fontSize:13,fontWeight:700,color:'#e9edef',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name||c.phone}</span>
                      {c.lastMessageAt&&<span style={{fontSize:10,color:G.text3,flexShrink:0}}>{new Date(c.lastMessageAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>}
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:11,color:G.text3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{c.lastMessage||c.phone}</span>
                      {c.unread>0&&<span style={{fontSize:10,fontWeight:800,minWidth:18,height:18,borderRadius:'50%',background:G.waGreen,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{c.unread}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat area */}
          {!active?(
            <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:G.waBg,gap:16}}>
              <div style={{width:80,height:80,borderRadius:'50%',background:'rgba(37,211,102,0.1)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="bi bi-whatsapp" style={{fontSize:40,color:G.waGreen}}/>
              </div>
              <div style={{textAlign:'center'}}>
                <h2 style={{margin:'0 0 8px',fontSize:20,fontWeight:700,color:'#e9edef'}}>DL WhatsApp</h2>
                <p style={{margin:0,fontSize:13,color:G.text3,maxWidth:300}}>Select a contact to start chatting. Messages sent via Meta Cloud API are real WhatsApp messages.</p>
              </div>
              {cfg?.status!=='active'&&(
                <div style={{padding:'12px 20px',borderRadius:10,background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',fontSize:12,color:G.yellow,maxWidth:360,textAlign:'center',lineHeight:1.6}}>
                  ⚠️ WhatsApp Cloud API not configured — messages will be saved locally only.<br/>
                  <button onClick={()=>setTab('setup')} style={{background:'none',border:'none',color:G.yellow,fontWeight:700,cursor:'pointer',textDecoration:'underline',fontSize:12}}>Configure now →</button>
                </div>
              )}
            </div>
          ):(
            <div style={{flex:1,display:'flex',flexDirection:'column',background:G.waBg}}>
              {/* Thread header */}
              <div style={{padding:'12px 20px',background:'#202c33',borderBottom:'1px solid rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:40,height:40,borderRadius:'50%',background:`${G.waGreen}20`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:G.waGreen}}>
                    {(active.name||active.phone).slice(0,1).toUpperCase()}
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:'#e9edef'}}>{active.name||active.phone}</div>
                    <div style={{fontSize:11,color:G.text3,fontFamily:'monospace'}}>{active.phone}</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>copyText(active.phone,'phone')} style={{background:'rgba(255,255,255,0.05)',border:'none',color:G.text3,cursor:'pointer',padding:'6px 10px',borderRadius:7,fontSize:12}}>
                    <i className={`bi ${copied==='phone'?'bi-check':'bi-copy'}`}/> {copied==='phone'?'Copied':'Copy #'}
                  </button>
                  {cfg?.status==='active'&&<span style={{fontSize:11,color:G.waGreen,fontWeight:600,padding:'4px 10px',borderRadius:20,background:'rgba(37,211,102,0.1)'}}>● Via Meta API</span>}
                </div>
              </div>
              {/* Messages */}
              <div style={{flex:1,overflowY:'auto',padding:'16px 20px',display:'flex',flexDirection:'column',gap:4}}>
                {thread.length===0&&(
                  <div style={{textAlign:'center',color:G.text3,fontSize:12,margin:'auto',padding:'40px'}}>
                    <i className="bi bi-lock" style={{fontSize:24,display:'block',marginBottom:8}}/>
                    Messages are end-to-end encrypted<br/>
                    <span style={{fontSize:11}}>Start the conversation</span>
                  </div>
                )}
                {thread.map((m,i)=>{
                  const isMe=m.from==='me'||!m.incoming
                  return (
                    <div key={m.id||i} style={{display:'flex',justifyContent:isMe?'flex-end':'flex-start'}}>
                      <div style={{
                        maxWidth:'70%',padding:'8px 12px',borderRadius:isMe?'12px 12px 4px 12px':'12px 12px 12px 4px',
                        background:isMe?G.waMsg:'#202c33',
                        boxShadow:'0 1px 2px rgba(0,0,0,0.3)',
                      }}>
                        <div style={{fontSize:13,color:'#e9edef',lineHeight:1.5,wordBreak:'break-word'}}>{m.body}</div>
                        <div style={{fontSize:10,color:'rgba(255,255,255,0.45)',marginTop:4,display:'flex',alignItems:'center',gap:4,justifyContent:'flex-end'}}>
                          {new Date(m.sent_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                          {isMe&&<i className={`bi ${m.status==='sent'?'bi-check2-all':'bi-check2'}`} style={{color:m.via_cloud_api?'#53bdeb':'rgba(255,255,255,0.45)',fontSize:10}}/>}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={msgEndRef}/>
              </div>
              {/* Input */}
              {sendErr&&<div style={{padding:'6px 16px',fontSize:11,color:G.yellow,background:'rgba(245,158,11,0.08)'}}>{sendErr}</div>}
              <div style={{padding:'10px 16px',background:'#202c33',display:'flex',gap:10,alignItems:'center'}}>
                <input
                  value={msgInput}
                  onChange={e=>setMsgInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg()}}}
                  placeholder="Type a message…"
                  style={{flex:1,padding:'10px 14px',borderRadius:24,background:'#2a3942',border:'none',color:'#e9edef',fontSize:13,outline:'none'}}
                />
                <button onClick={sendMsg} disabled={sending||!msgInput.trim()} style={{
                  width:42,height:42,borderRadius:'50%',border:'none',cursor:sending?'not-allowed':'pointer',
                  background:G.waGreen,color:'#fff',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',
                  opacity:sending||!msgInput.trim()?0.6:1,transition:'all .2s',flexShrink:0,
                }}>
                  <i className={`bi ${sending?'bi-hourglass-split':'bi-send-fill'}`} style={{animation:sending?'spin .8s linear infinite':undefined}}/>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── SETUP TAB ─── */}
      {tab==='setup'&&(
        <div style={{maxWidth:700}}>
          {cfg?.status==='active'&&(
            <div style={{padding:'14px 18px',borderRadius:12,marginBottom:20,background:G.greenDim,border:`1px solid rgba(37,211,102,0.3)`,display:'flex',alignItems:'center',gap:12}}>
              <i className="bi bi-check-circle-fill" style={{fontSize:18,color:G.waGreen}}/>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:G.waGreen}}>WhatsApp Connected!</div>
                <div style={{fontSize:12,color:G.text2}}>Number: <strong>{cfg.phoneNumber}</strong> · Display: <strong>{cfg.displayName}</strong></div>
              </div>
              <button onClick={()=>setTab('chat')} style={{marginLeft:'auto',padding:'8px 16px',borderRadius:9,background:G.waGreen,border:'none',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>Open Chat →</button>
            </div>
          )}

          <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:'22px',marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,paddingBottom:14,borderBottom:`1px solid ${G.border}`}}>
              <div style={{width:36,height:36,borderRadius:10,background:'rgba(37,211,102,0.12)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="bi bi-whatsapp" style={{fontSize:18,color:G.waGreen}}/>
              </div>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:G.text1}}>Meta WhatsApp Cloud API</div>
                <div style={{fontSize:11,color:G.text3}}>Connect your real WhatsApp Business account</div>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
              <div>
                <Label c="Phone Number ID"/>
                <input style={inp} value={form.phoneId} onChange={e=>setForm(p=>({...p,phoneId:e.target.value}))} placeholder="1234567890123456"/>
                <div style={{fontSize:10,color:G.text3,marginTop:4}}>From Meta Business → Phone Numbers</div>
              </div>
              <div>
                <Label c="WhatsApp Business Account ID"/>
                <input style={inp} value={form.wabaId} onChange={e=>setForm(p=>({...p,wabaId:e.target.value}))} placeholder="9876543210987654"/>
                <div style={{fontSize:10,color:G.text3,marginTop:4}}>From Meta Business Manager</div>
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <Label c="Permanent Access Token"/>
              <input style={{...inp,fontFamily:'monospace',fontSize:11}} value={form.token} onChange={e=>setForm(p=>({...p,token:e.target.value}))} type="password" placeholder="EAAxxxxxx... (System User token from Meta)"/>
              <div style={{fontSize:10,color:G.text3,marginTop:4}}>Create a System User in Meta Business → Assign assets → Generate token</div>
            </div>

            <button onClick={setupWA} disabled={setupLoading||!form.phoneId||!form.token} style={{
              display:'flex',alignItems:'center',gap:8,padding:'11px 22px',borderRadius:10,
              background:`linear-gradient(135deg, ${G.waGreen}, #1da851)`,
              border:'none',color:'#fff',fontSize:13,fontWeight:700,cursor:setupLoading?'not-allowed':'pointer',
              opacity:setupLoading||!form.phoneId||!form.token?0.7:1,
              boxShadow:'0 4px 14px rgba(37,211,102,0.3)',
            }}>
              <i className={`bi ${setupLoading?'bi-arrow-repeat':'bi-whatsapp'}`} style={{animation:setupLoading?'spin .8s linear infinite':undefined}}/>
              {setupLoading?'Verifying…':'Connect WhatsApp'}
            </button>

            {setupResult&&(
              <div style={{marginTop:14,padding:'14px 16px',borderRadius:10,animation:'slideIn .2s ease',
                background:setupResult.verified?G.greenDim:G.yellowDim,
                border:`1px solid ${setupResult.verified?'rgba(37,211,102,0.3)':'rgba(245,158,11,0.3)'}`}}>
                <div style={{fontSize:13,fontWeight:700,color:setupResult.verified?G.waGreen:G.yellow,marginBottom:6}}>
                  {setupResult.verified?'✅ Connected Successfully!':setupResult.error?'❌ Error':' ⚠️ Saved — Check Details'}
                </div>
                <div style={{fontSize:12,color:G.text2,lineHeight:1.7}}>{setupResult.message||setupResult.error||''}</div>
                {setupResult.verified&&(
                  <div style={{marginTop:10,padding:'10px 14px',borderRadius:9,background:'rgba(0,0,0,0.2)',fontSize:12}}>
                    <div style={{fontWeight:700,color:G.text1,marginBottom:6}}>📋 Configure Webhook in Meta:</div>
                    <div style={{marginBottom:4,color:G.text3}}>Webhook URL:</div>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <code style={{flex:1,fontSize:11,color:G.waGreen,fontFamily:'monospace',wordBreak:'break-all'}}>https://dl-sms-client.pages.dev/api/wa/webhook</code>
                      <button onClick={()=>copyText('https://dl-sms-client.pages.dev/api/wa/webhook','wh')} style={{padding:'4px 10px',borderRadius:6,background:G.card2,border:`1px solid ${G.border2}`,color:copied==='wh'?G.green:G.text3,fontSize:11,cursor:'pointer',flexShrink:0}}>
                        {copied==='wh'?'✓':'Copy'}
                      </button>
                    </div>
                    <div style={{marginTop:6,color:G.text3}}>Verify Token: <code style={{color:G.yellow,fontFamily:'monospace'}}>{setupResult.webhookVerify||cfg?.webhookVerify}</code></div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Webhook info */}
          {cfg?.webhookVerify&&(
            <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:'18px 22px'}}>
              <div style={{fontSize:13,fontWeight:700,color:G.text1,marginBottom:14}}>📡 Webhook Configuration</div>
              <div style={{display:'grid',gap:10}}>
                <div>
                  <Label c="Webhook URL (paste in Meta)"/>
                  <div style={{display:'flex',gap:8}}>
                    <input style={{...inp,fontFamily:'monospace',fontSize:11,color:G.waGreen}} value="https://dl-sms-client.pages.dev/api/wa/webhook" readOnly/>
                    <button onClick={()=>copyText('https://dl-sms-client.pages.dev/api/wa/webhook','wh2')} style={{padding:'10px 14px',borderRadius:10,background:G.card2,border:`1px solid ${G.border2}`,color:copied==='wh2'?G.green:G.text3,cursor:'pointer',fontSize:13,flexShrink:0}}>
                      <i className={`bi ${copied==='wh2'?'bi-check':'bi-copy'}`}/>
                    </button>
                  </div>
                </div>
                <div>
                  <Label c="Verify Token"/>
                  <div style={{display:'flex',gap:8}}>
                    <input style={{...inp,fontFamily:'monospace',fontSize:12,color:G.yellow}} value={cfg.webhookVerify} readOnly/>
                    <button onClick={()=>copyText(cfg.webhookVerify,'vt')} style={{padding:'10px 14px',borderRadius:10,background:G.card2,border:`1px solid ${G.border2}`,color:copied==='vt'?G.green:G.text3,cursor:'pointer',fontSize:13,flexShrink:0}}>
                      <i className={`bi ${copied==='vt'?'bi-check':'bi-copy'}`}/>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── BROADCAST TAB ─── */}
      {tab==='broadcast'&&(
        <div style={{maxWidth:700}}>
          {cfg?.status!=='active'&&(
            <div style={{padding:'12px 16px',borderRadius:10,marginBottom:16,background:G.yellowDim,border:`1px solid rgba(245,158,11,0.3)`,fontSize:12,color:G.yellow}}>
              ⚠️ WhatsApp Cloud API not configured — broadcast will be saved locally only.
              <button onClick={()=>setTab('setup')} style={{background:'none',border:'none',color:G.yellow,fontWeight:700,cursor:'pointer',textDecoration:'underline',marginLeft:6}}>Setup →</button>
            </div>
          )}
          <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:'22px'}}>
            <div style={{fontSize:14,fontWeight:700,color:G.text1,marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
              <i className="bi bi-send-fill" style={{color:G.waGreen}}/>
              Send Broadcast Message
            </div>
            <div style={{marginBottom:14}}>
              <Label c="Phone Numbers (one per line)"/>
              <textarea value={bcNums} onChange={e=>setBcNums(e.target.value)} rows={6}
                placeholder={"+1234567890\n+447700900123\n+4915112345678"}
                style={{...inp,resize:'vertical' as const,fontFamily:'monospace',fontSize:12}}/>
              <div style={{fontSize:10,color:G.text3,marginTop:4}}>{bcNums.split('\n').filter(s=>s.trim()).length} numbers · max 50</div>
            </div>
            <div style={{marginBottom:14}}>
              <Label c="Message"/>
              <textarea value={bcMsg} onChange={e=>setBcMsg(e.target.value)} rows={4}
                placeholder="Type your broadcast message…"
                style={{...inp,resize:'vertical' as const}}/>
              <div style={{fontSize:10,color:G.text3,marginTop:4}}>{bcMsg.length} characters</div>
            </div>
            <button onClick={sendBroadcast} disabled={bcSending||!bcMsg.trim()||!bcNums.trim()} style={{
              display:'flex',alignItems:'center',gap:8,padding:'11px 22px',borderRadius:10,
              background:`linear-gradient(135deg, ${G.waGreen}, #1da851)`,
              border:'none',color:'#fff',fontSize:13,fontWeight:700,cursor:bcSending?'not-allowed':'pointer',
              opacity:bcSending?0.7:1,boxShadow:'0 4px 14px rgba(37,211,102,0.25)',
            }}>
              <i className={`bi ${bcSending?'bi-arrow-repeat':'bi-send-fill'}`} style={{animation:bcSending?'spin .8s linear infinite':undefined}}/>
              {bcSending?'Sending…':`Send to ${bcNums.split('\n').filter(s=>s.trim()).length} numbers`}
            </button>
            {bcResult&&(
              <div style={{marginTop:14,padding:'14px',borderRadius:10,background:G.card2,border:`1px solid ${G.border}`,animation:'slideIn .2s ease'}}>
                {bcResult.error?<div style={{color:G.red,fontSize:13}}>{bcResult.error}</div>:(
                  <>
                    <div style={{fontSize:13,fontWeight:700,color:G.text1,marginBottom:10}}>
                      ✅ Sent: {bcResult.sent} · ❌ Failed: {bcResult.failed}
                    </div>
                    <div style={{maxHeight:200,overflowY:'auto',display:'flex',flexDirection:'column',gap:4}}>
                      {bcResult.results?.map((r:any,i:number)=>(
                        <div key={i} style={{fontSize:11,color:r.ok?G.green:G.red,fontFamily:'monospace'}}>{r.ok?'✓':'✗'} {r.phone} {r.error?`(${r.error})`:''}</div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── GUIDE TAB ─── */}
      {tab==='guide'&&(
        <div style={{maxWidth:720}}>
          <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:'24px',marginBottom:16}}>
            <div style={{fontSize:16,fontWeight:800,color:G.text1,marginBottom:4,display:'flex',alignItems:'center',gap:10}}>
              <i className="bi bi-whatsapp" style={{color:G.waGreen}}/>
              How to Connect Real WhatsApp
            </div>
            <div style={{fontSize:12,color:G.text3,marginBottom:24}}>Step-by-step guide to connect your WhatsApp Business number via Meta Cloud API</div>
            {[
              {n:'1', title:'Create Meta Business Account', icon:'bi-meta', color:'#1877f2', steps:[
                'Go to business.facebook.com and create/login to your account',
                'Complete business verification (name, address, etc.)',
                'Go to Settings → Business Settings',
              ]},
              {n:'2', title:'Create WhatsApp App', icon:'bi-code-square', color:'#e50914', steps:[
                'Go to developers.facebook.com → Create App',
                'Select "Business" app type',
                'Add "WhatsApp" product to your app',
                'This creates your WABA (WhatsApp Business Account)',
              ]},
              {n:'3', title:'Add Phone Number', icon:'bi-phone-fill', color:G.waGreen, steps:[
                'In Meta Developers → WhatsApp → Getting Started',
                'Add a phone number (can be any number that can receive SMS/calls)',
                'Verify the number via SMS or voice call',
                'Copy the Phone Number ID shown on screen',
              ]},
              {n:'4', title:'Generate Permanent Token', icon:'bi-key-fill', color:G.yellow, steps:[
                'Go to Business Settings → System Users → Add System User (Admin role)',
                'Click "Generate New Token" → Select your WhatsApp app',
                'Permissions needed: whatsapp_business_messaging, whatsapp_business_management',
                'Copy the token (save it — shown only once!)',
              ]},
              {n:'5', title:'Configure Here + Set Webhook', icon:'bi-gear-fill', color:G.accent, steps:[
                'Paste Phone Number ID, WABA ID, and token in the Setup tab',
                'Click "Connect WhatsApp" — you\'ll get your Webhook URL',
                'In Meta Developers → WhatsApp → Configuration → Set webhook URL',
                'Subscribe to: messages, message_deliveries, messaging_postbacks',
              ]},
            ].map(step=>(
              <div key={step.n} style={{display:'flex',gap:16,marginBottom:24}}>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                  <div style={{width:36,height:36,borderRadius:'50%',background:`${step.color}20`,border:`2px solid ${step.color}40`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <i className={`bi ${step.icon}`} style={{fontSize:14,color:step.color}}/>
                  </div>
                  <div style={{width:2,flex:1,background:`linear-gradient(${step.color}30, transparent)`}}/>
                </div>
                <div style={{flex:1,paddingBottom:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                    <span style={{fontSize:10,fontWeight:800,padding:'2px 8px',borderRadius:20,background:`${step.color}20`,color:step.color,border:`1px solid ${step.color}30`}}>Step {step.n}</span>
                    <span style={{fontSize:14,fontWeight:700,color:G.text1}}>{step.title}</span>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {step.steps.map((s,i)=>(
                      <div key={i} style={{display:'flex',gap:8,alignItems:'flex-start',fontSize:12,color:G.text2,lineHeight:1.6}}>
                        <span style={{color:step.color,flexShrink:0,marginTop:2}}>→</span>
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <div style={{padding:'14px 16px',borderRadius:10,background:'rgba(37,211,102,0.06)',border:'1px solid rgba(37,211,102,0.2)',fontSize:12,color:G.text2}}>
              <strong style={{color:G.waGreen}}>Free Tier:</strong> Meta gives 1,000 free conversations/month. After that, pay-per-conversation.
              Business Verification is required for more than 250 messages/day.
            </div>
          </div>
          <button onClick={()=>setTab('setup')} style={{
            padding:'11px 22px',borderRadius:10,background:`linear-gradient(135deg,${G.waGreen},#1da851)`,
            border:'none',color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',
            boxShadow:'0 4px 14px rgba(37,211,102,0.3)',display:'flex',alignItems:'center',gap:8,
          }}>
            <i className="bi bi-gear-fill"/>
            Go to Setup →
          </button>
        </div>
      )}
    </div>
  )
}
