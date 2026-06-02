import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://dzqciagcyekqxborbats.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6cWNpYWdjeWVrcXhib3JiYXRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MjUzNTIsImV4cCI6MjA5MjAwMTM1Mn0.MfOw6ci5lRgzMhXGLavztjrQHgP3GCLieYuvsuNDHoM";
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY;

const CATEGORIES = ["Fridge","Freezer","Pantry","Lazy Susan","Kids","Dogs","Cleaning","Bathroom","Medicine","Coffee","Other","Need Reorder"];
const CAT_EMOJI = { Fridge:"🍇",Freezer:"❄️",Pantry:"🥖","Lazy Susan":"🫙",Kids:"🧃",Dogs:"🐕",Cleaning:"🫧",Bathroom:"🚽",Medicine:"💊",Coffee:"☕",Other:"🍩","Need Reorder":"🔄" };
const RECIPE_TAGS = ["Quick","Dinner","Lunch","Breakfast","Crockpot","Dump & Go"];
const RECIPE_TAG_EMOJI = { Quick:"⚡",Dinner:"🌙",Lunch:"☀️",Breakfast:"🍳",Crockpot:"🫕","Dump & Go":"🪣" };
const EST_TIMES = ["5 min","10 min","15 min","30 min","45 min","1 hr","2 hr","3 hr","4 hr","5 hr","6 hr"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MEALS = ["Breakfast","Lunch","Dinner"];

// ─── DESIGN SYSTEM ───────────────────────────────────────────
// One brand color. Two semantic colors. Everything else is neutral.
const C = {
  // Base
  bg:          "#f6f4f0",   // warm off-white, like unbleached paper
  surface:     "#ffffff",
  surfaceAlt:  "#faf9f7",   // slightly warm, for nested areas
  border:      "#e6e0d8",
  borderLight: "#eeebe5",

  // Type — 3 levels only
  t1: "#18140f",   // primary — headings, item names
  t2: "#6b6055",   // secondary — supporting text
  t3: "#a8a099",   // tertiary — metadata, timestamps

  // Brand: one green
  brand:       "#2f7d52",
  brandMid:    "#3d9165",
  brandLight:  "#e8f5ee",
  brandBorder: "#a8d8bc",
  brandText:   "#1d5436",

  // Semantic: danger only (red replaces orange+red+yellow for simplicity)
  danger:      "#c0392b",
  dangerLight: "#fdf0ee",
  dangerBorder:"#e8b8b2",
  dangerText:  "#8b2419",

  // Warning (just for expiring soon)
  warn:        "#b8720a",
  warnLight:   "#fdf4e4",
  warnBorder:  "#e8cc88",

  // Neutral action
  muted:       "#f0ece6",
  mutedBorder: "#ddd8d0",

  // Shadows — subtle, warm-tinted
  sm: "0 1px 3px rgba(20,14,8,0.06), 0 2px 8px rgba(20,14,8,0.04)",
  md: "0 2px 8px rgba(20,14,8,0.07), 0 6px 20px rgba(20,14,8,0.05)",
  lg: "0 8px 24px rgba(20,14,8,0.10), 0 24px 48px rgba(20,14,8,0.07)",
  modal: "0 -2px 20px rgba(20,14,8,0.08), 0 -8px 40px rgba(20,14,8,0.06)",
};

const F = {
  ui:      "'Plus Jakarta Sans', system-ui, sans-serif",
  display: "'Fraunces', Georgia, serif",
};

// ─── UTILITIES ───────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split("T")[0];
const isExpired = (e) => !!e && e < todayStr();
const isExpiringSoon = (e) => { if(!e) return false; const d=new Date(); d.setDate(d.getDate()+7); return e>=todayStr()&&e<=d.toISOString().split("T")[0]; };
const itemNeedsReorder = (i) => (!i.has_half && i.full_count===0) || isExpired(i.expires_at);
const fmtDate = (d) => { if(!d) return null; const [y,m,day]=d.split("-"); return `${m}/${day}/${y.slice(2)}`; };

function getWeekStart() {
  const d = new Date(); d.setDate(d.getDate()-d.getDay());
  return d.toISOString().split("T")[0];
}

async function apiFetch(path, options={}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers:{ apikey:SUPABASE_KEY, Authorization:`Bearer ${SUPABASE_KEY}`, "Content-Type":"application/json", Prefer:options.prefer||"return=representation", ...options.headers },
  });
  if(!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function scanShelf(base64Image, mediaType) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{ "x-api-key":ANTHROPIC_KEY, "anthropic-version":"2023-06-01", "anthropic-dangerous-direct-browser-access":"true", "Content-Type":"application/json" },
    body: JSON.stringify({
      model:"claude-sonnet-4-5", max_tokens:1024,
      messages:[{ role:"user", content:[
        { type:"image", source:{ type:"base64", media_type:mediaType, data:base64Image } },
        { type:"text", text:`Analyze this image of a fridge, freezer, or pantry shelf. List every food or household item you can identify.\n\nFor each item:\n- name: common grocery name\n- level: "full", "half", or "low"\n- category: one of: Fridge, Freezer, Pantry, Lazy Susan, Kids, Dogs, Cleaning, Bathroom, Medicine, Coffee, Other\n\nReturn ONLY a JSON array, no markdown:\n[{"name":"Milk","level":"half","category":"Fridge"}]\n\nIf nothing visible: []` }
      ]}]
    })
  });
  if(!res.ok) throw new Error("Scan failed");
  const data = await res.json();
  return JSON.parse(data.content[0].text.trim().replace(/```json|```/g,"").trim());
}

// ─── BASE STYLES ─────────────────────────────────────────────
const inp = {
  background:C.surface, border:`1px solid ${C.border}`, borderRadius:10,
  padding:"11px 14px", color:C.t1, fontSize:15, fontFamily:F.ui,
  width:"100%", boxSizing:"border-box", outline:"none",
  transition:"border-color 0.15s",
};

const primaryBtn = (bg=C.brand, shadow=`0 2px 8px rgba(47,125,82,0.28)`) => ({
  background:bg, color:"#fff", border:"none", borderRadius:12,
  padding:"13px 20px", fontSize:14, fontWeight:700, cursor:"pointer",
  fontFamily:F.ui, boxShadow:shadow, width:"100%",
  transition:"opacity 0.15s",
});

// ─── ITEM CARD (controls hidden until tapped) ─────────────────
function ItemCard({ item, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false);
  const { name, has_half, full_count, expires_at } = item;
  const expired = isExpired(expires_at);
  const expiringSoon = isExpiringSoon(expires_at);
  const oos = !has_half && full_count===0;
  const low = !has_half && full_count===1 && !expired;

  // Status dot color
  const dotColor = expired ? C.warn : oos ? C.danger : low ? C.warn : C.brand;

  // Stock summary — compact, no labels
  const stockText = (() => {
    if(expired) return `Expired ${fmtDate(expires_at)}`;
    const parts=[];
    if(has_half) parts.push("1 opened");
    if(full_count>0) parts.push(`${full_count} new`);
    return parts.length ? parts.join(" · ") : "Out of stock";
  })();

  const cardBg = (oos||expired) ? (expired?C.warnLight:C.dangerLight) : C.surface;
  const cardBorder = (oos||expired) ? (expired?C.warnBorder:C.dangerBorder) : C.border;

  return (
    <div style={{ background:cardBg, border:`1px solid ${cardBorder}`, borderRadius:14, overflow:"hidden", boxShadow:C.sm }}>
      {/* Collapsed row — tap to expand */}
      <div onClick={()=>setOpen(o=>!o)} style={{ padding:"14px 16px", display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:dotColor, flexShrink:0, marginTop:1 }}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:F.ui, fontWeight:600, fontSize:15, color:C.t1, lineHeight:1.3 }}>{name}</div>
          <div style={{ fontFamily:F.ui, fontSize:12, color: (oos||expired) ? dotColor : C.t3, marginTop:2, fontWeight:(oos||expired)?600:400 }}>
            {stockText}
            {expiringSoon && !expired && <span style={{ color:C.warn, fontWeight:600 }}> · Exp {fmtDate(expires_at)}</span>}
          </div>
        </div>
        <div style={{ color:C.t3, fontSize:12, flexShrink:0, transform:open?"rotate(180deg)":"none", transition:"transform 0.2s" }}>▾</div>
      </div>

      {/* Expanded controls */}
      {open && (
        <div style={{ padding:"0 16px 14px", display:"flex", flexDirection:"column", gap:10, borderTop:`1px solid ${C.borderLight}`, paddingTop:12 }}>
          <div style={{ display:"flex", gap:8 }}>
            {/* Opened toggle */}
            <button
              onClick={()=>onUpdate(item.id,{has_half:!has_half})}
              style={{ padding:"7px 14px", borderRadius:8, border:`1.5px solid ${has_half?C.brandBorder:C.border}`, background:has_half?C.brandLight:"transparent", color:has_half?C.brandText:C.t2, fontSize:13, cursor:"pointer", fontFamily:F.ui, fontWeight:600, flex:1 }}
            >
              {has_half?"✓ Opened":"Opened?"}
            </button>

            {/* New count stepper */}
            <div style={{ display:"flex", alignItems:"center", gap:0, background:C.surfaceAlt, border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", flex:1 }}>
              <button onClick={()=>onUpdate(item.id,{full_count:Math.max(0,full_count-1)})} style={{ width:36, height:36, border:"none", background:"transparent", color:C.t2, fontSize:18, cursor:"pointer", fontFamily:F.ui, fontWeight:600, flexShrink:0 }}>−</button>
              <div style={{ flex:1, textAlign:"center" }}>
                <div style={{ fontSize:16, fontWeight:700, color:C.t1, fontFamily:F.ui, lineHeight:1 }}>{full_count}</div>
                <div style={{ fontSize:10, color:C.t3, fontFamily:F.ui }}>new</div>
              </div>
              <button onClick={()=>onUpdate(item.id,{full_count:full_count+1})} style={{ width:36, height:36, border:"none", background:"transparent", color:C.t2, fontSize:18, cursor:"pointer", fontFamily:F.ui, fontWeight:600, flexShrink:0 }}>+</button>
            </div>

            {/* Delete */}
            <button onClick={()=>onDelete(item.id)} style={{ width:36, height:36, border:`1px solid ${C.border}`, background:"transparent", color:C.t3, borderRadius:8, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ITEM LIST MODAL ─────────────────────────────────────────
function ItemListModal({ title, items, onUpdate, onDelete, onClose }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(18,12,6,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.bg,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:480,maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:C.modal }}>
        <div style={{ padding:"20px 20px 14px",borderBottom:`1px solid ${C.borderLight}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <span style={{ fontFamily:F.display,fontSize:20,fontWeight:700,color:C.t1 }}>{title}</span>
          <button onClick={onClose} style={{ width:30,height:30,border:`1px solid ${C.border}`,background:C.surface,color:C.t2,borderRadius:8,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
        </div>
        <div style={{ overflowY:"auto",padding:"14px 16px 32px",display:"flex",flexDirection:"column",gap:8 }}>
          {items.length===0
            ? <EmptyState icon="✓" text="Nothing here" sub="Everything's stocked up"/>
            : items.map(item=><ItemCard key={item.id} item={item} onUpdate={onUpdate} onDelete={onDelete}/>)}
        </div>
      </div>
    </div>
  );
}

// ─── EMPTY STATE ─────────────────────────────────────────────
function EmptyState({ icon, text, sub, action, onAction }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",padding:"48px 24px",gap:12,textAlign:"center" }}>
      <div style={{ fontSize:40 }}>{icon}</div>
      <div style={{ fontFamily:F.display,fontSize:20,fontWeight:600,color:C.t1 }}>{text}</div>
      {sub && <div style={{ fontFamily:F.ui,fontSize:14,color:C.t3,maxWidth:240,lineHeight:1.5 }}>{sub}</div>}
      {action && <button onClick={onAction} style={{ ...primaryBtn(),marginTop:8,width:"auto",padding:"10px 24px" }}>{action}</button>}
    </div>
  );
}

// ─── HOME DASHBOARD ──────────────────────────────────────────
function Dashboard({ items, onNavigate, onUpdate, onDelete }) {
  const [drill,setDrill]=useState(null);
  const oos=items.filter(i=>!i.has_half&&i.full_count===0);
  const exp=items.filter(i=>isExpired(i.expires_at));
  const catData=CATEGORIES.map(cat=>({ cat, count:items.filter(i=>i.category===cat).length, out:items.filter(i=>i.category===cat&&itemNeedsReorder(i)).length }));

  return (
    <div>
      {/* Stat cards */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:28 }}>
        {[
          { label:"Total",value:items.length,color:C.t1,bg:C.surface,drill:{title:"All Items",items} },
          { label:"Out of stock",value:oos.length,color:oos.length?C.danger:C.t3,bg:oos.length?C.dangerLight:C.surface,drill:{title:"Out of Stock",items:oos} },
          { label:"Expired",value:exp.length,color:exp.length?C.warn:C.t3,bg:exp.length?C.warnLight:C.surface,drill:{title:"Expired",items:exp} },
        ].map(({label,value,color,bg,drill:d})=>(
          <div key={label} onClick={()=>setDrill(d)} style={{ background:bg,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px 12px",cursor:"pointer",boxShadow:C.sm,textAlign:"center" }}>
            <div style={{ fontSize:28,fontWeight:800,color,fontFamily:F.ui,lineHeight:1 }}>{value}</div>
            <div style={{ fontSize:11,color:C.t3,marginTop:5,fontFamily:F.ui,lineHeight:1.2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Section label */}
      <div style={{ fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:12,fontFamily:F.ui }}>Categories</div>

      {/* Category grid — always shows all 12 */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10 }}>
        {catData.map(({cat,count,out})=>(
          <div key={cat} onClick={()=>onNavigate("pantry",cat)} style={{
            background:out>0?C.dangerLight:C.surface,
            border:`1px solid ${out>0?C.dangerBorder:C.border}`,
            borderRadius:14,padding:"14px 8px 12px",
            display:"flex",flexDirection:"column",alignItems:"center",gap:4,
            cursor:"pointer",boxShadow:C.sm,
          }}>
            <span style={{ fontSize:22,lineHeight:1 }}>{CAT_EMOJI[cat]}</span>
            <span style={{ fontSize:11,fontWeight:600,color:C.t1,fontFamily:F.ui,textAlign:"center",lineHeight:1.3,marginTop:2 }}>{cat}</span>
            <span style={{ fontSize:13,fontWeight:700,color:count?C.t2:C.t3,fontFamily:F.ui }}>{count}</span>
            {out>0 && <span style={{ fontSize:10,fontWeight:700,color:C.danger,fontFamily:F.ui }}>↓ {out} low</span>}
          </div>
        ))}
      </div>

      {drill && <ItemListModal title={drill.title} items={drill.items} onUpdate={onUpdate} onDelete={onDelete} onClose={()=>setDrill(null)}/>}
    </div>
  );
}

// ─── ADD ITEM MODAL ───────────────────────────────────────────
function AddItemModal({ onAdd, onClose, defaultCategory }) {
  const [name,setName]=useState(""); const [cat,setCat]=useState(defaultCategory||CATEGORIES[0]);
  const [opened,setOpened]=useState(false); const [qty,setQty]=useState(1);
  const [exp,setExp]=useState(""); const [saving,setSaving]=useState(false);
  const go=async()=>{ if(!name.trim()) return; setSaving(true); await onAdd({name:name.trim(),category:cat,has_half:opened,full_count:qty,expires_at:exp||null}); onClose(); };
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(18,12,6,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.surface,borderRadius:"20px 20px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:480,display:"flex",flexDirection:"column",gap:14,boxShadow:C.modal }}>
        <div style={{ fontFamily:F.display,fontSize:22,fontWeight:700,color:C.t1 }}>Add Item</div>
        <input autoFocus value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="Item name..." style={inp}/>
        <select value={cat} onChange={e=>setCat(e.target.value)} style={inp}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
        <div style={{ display:"flex",gap:10,alignItems:"center" }}>
          <label style={{ display:"flex",alignItems:"center",gap:8,color:C.t2,fontSize:14,cursor:"pointer",fontFamily:F.ui,flex:1 }}>
            <input type="checkbox" checked={opened} onChange={e=>setOpened(e.target.checked)} style={{ width:16,height:16,accentColor:C.brand }}/>
            Have an opened one
          </label>
          <div style={{ display:"flex",alignItems:"center",gap:0,background:C.surfaceAlt,border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden" }}>
            <button onClick={()=>setQty(Math.max(0,qty-1))} style={{ width:34,height:34,border:"none",background:"transparent",color:C.t2,fontSize:18,cursor:"pointer",fontWeight:700 }}>−</button>
            <div style={{ padding:"0 4px",textAlign:"center",minWidth:28 }}>
              <div style={{ fontSize:15,fontWeight:700,color:C.t1,fontFamily:F.ui }}>{qty}</div>
            </div>
            <button onClick={()=>setQty(qty+1)} style={{ width:34,height:34,border:"none",background:"transparent",color:C.t2,fontSize:18,cursor:"pointer",fontWeight:700 }}>+</button>
          </div>
          <span style={{ fontSize:12,color:C.t3,fontFamily:F.ui }}>new</span>
        </div>
        <div>
          <div style={{ fontSize:12,fontWeight:600,color:C.t2,marginBottom:6,fontFamily:F.ui }}>Expiration <span style={{ fontWeight:400,color:C.t3 }}>(optional)</span></div>
          <input type="date" value={exp} onChange={e=>setExp(e.target.value)} style={inp}/>
        </div>
        <button onClick={go} disabled={saving} style={{ ...primaryBtn(),opacity:saving?0.65:1,marginTop:4 }}>{saving?"Adding...":"Add to Pantry"}</button>
      </div>
    </div>
  );
}

// ─── RECIPE CARD ─────────────────────────────────────────────
function RecipeCard({ recipe, items, onDelete, onEdit }) {
  const [open,setOpen]=useState(false);
  const ings=recipe.ingredients||[]; const tags=recipe.tags||[];
  const getS=(ing)=>{ const m=items.find(i=>i.name.toLowerCase()===ing.toLowerCase()); if(!m) return "?"; return itemNeedsReorder(m)?"✗":"✓"; };
  const statuses=ings.map(ing=>getS(ing));
  const allGood=statuses.every(s=>s==="✓"); const anyBad=statuses.some(s=>s==="✗");
  const dot=allGood?C.brand:anyBad?C.danger:C.warn;

  return (
    <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden",boxShadow:C.sm }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ padding:"14px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer" }}>
        <div style={{ width:8,height:8,borderRadius:"50%",background:dot,flexShrink:0 }}/>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontFamily:F.ui,fontWeight:600,fontSize:15,color:C.t1 }}>{recipe.name}</div>
          <div style={{ display:"flex",gap:6,marginTop:4,flexWrap:"wrap",alignItems:"center" }}>
            {recipe.est_time && <span style={{ fontSize:11,color:C.t3,fontFamily:F.ui }}>⏱ {recipe.est_time}</span>}
            {tags.map(tag=><span key={tag} style={{ fontSize:10,fontWeight:700,color:C.brand,background:C.brandLight,padding:"1px 7px",borderRadius:20,fontFamily:F.ui }}>{RECIPE_TAG_EMOJI[tag]} {tag}</span>)}
          </div>
        </div>
        <span style={{ color:C.t3,fontSize:12,transform:open?"rotate(180deg)":"none",transition:"transform 0.2s" }}>▾</span>
      </div>
      {open&&(
        <div style={{ borderTop:`1px solid ${C.borderLight}`,padding:"12px 16px 14px",background:C.surfaceAlt,display:"flex",flexDirection:"column",gap:7 }}>
          {recipe.notes&&<div style={{ fontSize:13,color:C.t2,fontStyle:"italic",fontFamily:F.ui,paddingBottom:4 }}>{recipe.notes}</div>}
          {ings.map((ing,i)=>{ const s=getS(ing); return (
            <div key={i} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:8 }}>
              <span style={{ fontSize:14,fontFamily:F.ui,color:C.t1 }}>{ing}</span>
              <span style={{ fontSize:12,fontWeight:700,color:s==="✓"?C.brand:s==="✗"?C.danger:C.warn,fontFamily:F.ui }}>{s==="✓"?"✓ Have it":s==="✗"?"✗ Need it":"? Untracked"}</span>
            </div>
          );})}
          <div style={{ display:"flex",gap:8,marginTop:6,justifyContent:"flex-end" }}>
            <button onClick={()=>onEdit(recipe)} style={{ background:"transparent",border:`1px solid ${C.border}`,color:C.t2,borderRadius:8,padding:"5px 14px",fontSize:12,cursor:"pointer",fontFamily:F.ui,fontWeight:600 }}>Edit</button>
            <button onClick={()=>onDelete(recipe.id)} style={{ background:"transparent",border:`1px solid ${C.dangerBorder}`,color:C.danger,borderRadius:8,padding:"5px 14px",fontSize:12,cursor:"pointer",fontFamily:F.ui }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RECIPE MODAL ────────────────────────────────────────────
function RecipeModal({ recipe, onSave, onClose, existingItems }) {
  const [name,setName]=useState(recipe?.name||""); const [notes,setNotes]=useState(recipe?.notes||"");
  const [ings,setIngs]=useState(recipe?.ingredients?.length?recipe.ingredients:[""]);
  const [tags,setTags]=useState(recipe?.tags||[]); const [time,setTime]=useState(recipe?.est_time||"");
  const [saving,setSaving]=useState(false);
  const toggle=t=>setTags(p=>p.includes(t)?p.filter(x=>x!==t):[...p,t]);
  const go=async()=>{ if(!name.trim()) return; const c=ings.map(s=>s.trim()).filter(Boolean); if(!c.length) return; setSaving(true); await onSave({id:recipe?.id,name:name.trim(),notes:notes.trim()||null,ingredients:c,tags,est_time:time||null}); onClose(); };
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(18,12,6,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:100 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.surface,borderRadius:"20px 20px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:480,display:"flex",flexDirection:"column",gap:14,boxShadow:C.modal,maxHeight:"90vh",overflowY:"auto" }}>
        <div style={{ fontFamily:F.display,fontSize:22,fontWeight:700,color:C.t1 }}>{recipe?.id?"Edit Recipe":"New Recipe"}</div>
        <input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="Recipe name..." style={inp}/>
        <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes (optional)..." style={inp}/>
        <div>
          <div style={{ fontSize:12,fontWeight:600,color:C.t2,marginBottom:6,fontFamily:F.ui }}>Est. Time</div>
          <select value={time} onChange={e=>setTime(e.target.value)} style={inp}><option value="">Select...</option>{EST_TIMES.map(t=><option key={t}>{t}</option>)}</select>
        </div>
        <div>
          <div style={{ fontSize:12,fontWeight:600,color:C.t2,marginBottom:10,fontFamily:F.ui }}>Tags</div>
          <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
            {RECIPE_TAGS.map(tag=>(
              <button key={tag} onClick={()=>toggle(tag)} style={{ padding:"6px 13px",borderRadius:20,border:`1.5px solid ${tags.includes(tag)?C.brandBorder:C.border}`,background:tags.includes(tag)?C.brandLight:"transparent",color:tags.includes(tag)?C.brandText:C.t2,fontSize:13,cursor:"pointer",fontFamily:F.ui,fontWeight:tags.includes(tag)?700:500 }}>
                {RECIPE_TAG_EMOJI[tag]} {tag}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize:12,fontWeight:600,color:C.t2,marginBottom:8,fontFamily:F.ui }}>Ingredients <span style={{ fontWeight:400,color:C.t3 }}>(match pantry names exactly)</span></div>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {ings.map((ing,i)=>(
              <div key={i} style={{ display:"flex",gap:8 }}>
                <input value={ing} onChange={e=>setIngs(p=>p.map((x,idx)=>idx===i?e.target.value:x))} placeholder={`Ingredient ${i+1}...`} style={{ ...inp,flex:1 }} list="ing-list"/>
                {ings.length>1&&<button onClick={()=>setIngs(p=>p.filter((_,idx)=>idx!==i))} style={{ width:34,height:44,border:`1px solid ${C.border}`,background:C.surfaceAlt,color:C.t3,borderRadius:8,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>}
              </div>
            ))}
            <datalist id="ing-list">{existingItems.map(item=><option key={item.id} value={item.name}/>)}</datalist>
          </div>
          <button onClick={()=>setIngs(p=>[...p,""])} style={{ marginTop:8,background:C.brandLight,border:`1px solid ${C.brandBorder}`,color:C.brandText,borderRadius:8,padding:"7px 14px",fontSize:13,cursor:"pointer",fontFamily:F.ui,fontWeight:600 }}>+ Add ingredient</button>
        </div>
        <button onClick={go} disabled={saving} style={{ ...primaryBtn(),opacity:saving?0.65:1,marginTop:4 }}>{saving?"Saving...":(recipe?.id?"Save Changes":"Save Recipe")}</button>
      </div>
    </div>
  );
}

// ─── MEAL SLOT MODAL ─────────────────────────────────────────
function MealSlotModal({ day, meal, recipes, onScheduleRecipe, onEatOut, onClose }) {
  const [mode,setMode]=useState("recipe"); const [rest,setRest]=useState(""); const [q,setQ]=useState("");
  const filtered=recipes.filter(r=>r.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(18,12,6,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:150 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.surface,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:480,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:C.modal }}>
        <div style={{ padding:"20px 20px 14px",borderBottom:`1px solid ${C.borderLight}` }}>
          <div style={{ fontFamily:F.display,fontSize:19,fontWeight:700,color:C.t1,marginBottom:14 }}>{day} · {meal}</div>
          <div style={{ display:"flex",background:C.surfaceAlt,border:`1px solid ${C.border}`,borderRadius:10,padding:3 }}>
            {[["recipe","🍽️ Recipe"],["eatout","🍴 Eat Out"]].map(([m,l])=>(
              <button key={m} onClick={()=>setMode(m)} style={{ flex:1,padding:"8px",borderRadius:8,border:"none",background:mode===m?C.surface:"transparent",color:mode===m?C.t1:C.t2,fontFamily:F.ui,fontWeight:mode===m?700:500,fontSize:13,cursor:"pointer",boxShadow:mode===m?C.sm:"none",transition:"all 0.15s" }}>{l}</button>
            ))}
          </div>
        </div>
        {mode==="recipe"&&(
          <div style={{ display:"flex",flexDirection:"column",flex:1,minHeight:0 }}>
            <div style={{ padding:"12px 16px 8px" }}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search recipes..." style={inp}/></div>
            <div style={{ overflowY:"auto",padding:"0 16px 28px",display:"flex",flexDirection:"column",gap:8 }}>
              {filtered.length===0?<EmptyState icon="🍽️" text="No recipes yet" sub="Add recipes in the Meals tab first"/>
              :filtered.map(r=>(
                <div key={r.id} onClick={()=>onScheduleRecipe(r)} style={{ background:C.surfaceAlt,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10 }}>
                  <div>
                    <div style={{ fontFamily:F.ui,fontWeight:600,fontSize:14,color:C.t1,marginBottom:4 }}>{r.name}</div>
                    <div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>
                      {r.est_time&&<span style={{ fontSize:11,color:C.t3,fontFamily:F.ui }}>⏱ {r.est_time}</span>}
                      {(r.tags||[]).map(t=><span key={t} style={{ fontSize:10,fontWeight:700,color:C.brandText,background:C.brandLight,padding:"1px 7px",borderRadius:20,fontFamily:F.ui }}>{t}</span>)}
                    </div>
                  </div>
                  <span style={{ color:C.t3,fontSize:16 }}>→</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {mode==="eatout"&&(
          <div style={{ padding:"20px 20px 40px",display:"flex",flexDirection:"column",gap:14 }}>
            <div style={{ fontSize:14,color:C.t2,fontFamily:F.ui }}>Where are you eating?</div>
            <input autoFocus value={rest} onChange={e=>setRest(e.target.value)} onKeyDown={e=>e.key==="Enter"&&rest.trim()&&onEatOut(rest.trim())} placeholder="Restaurant name..." style={inp}/>
            <button onClick={()=>rest.trim()&&onEatOut(rest.trim())} disabled={!rest.trim()} style={{ ...primaryBtn(),opacity:rest.trim()?1:0.4 }}>Save</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── WEEK SCHEDULE ───────────────────────────────────────────
function WeekSchedule({ mealPlan, recipes, items, onOpenSlot, onRemoveSlot, onAddMissingToShoppingList }) {
  const todayDay=DAYS[new Date().getDay()];
  const missing=[];
  mealPlan.forEach(slot=>{ if(slot.eat_out) return; const r=recipes.find(x=>x.id===slot.recipe_id); if(!r) return; (r.ingredients||[]).forEach(ing=>{ const it=items.find(i=>i.name.toLowerCase()===ing.toLowerCase()); if(!it||itemNeedsReorder(it)) { if(!missing.find(m=>m.toLowerCase()===ing.toLowerCase())) missing.push(ing); } }); });
  const getSlot=(day,meal)=>mealPlan.find(s=>s.day===day&&s.meal===meal);
  const mealColor={ Breakfast:C.warn, Lunch:C.brand, Dinner:"#6b5aaa" };

  return (
    <div>
      {missing.length>0&&(
        <div style={{ background:C.warnLight,border:`1.5px solid ${C.warnBorder}`,borderRadius:14,padding:"14px 16px",marginBottom:18,boxShadow:C.sm }}>
          <div style={{ fontFamily:F.ui,fontWeight:700,fontSize:13,color:C.warn,marginBottom:5 }}>⚠️ {missing.length} missing ingredient{missing.length!==1?"s":""} this week</div>
          <div style={{ fontSize:12,color:C.t2,fontFamily:F.ui,marginBottom:12,lineHeight:1.5 }}>{missing.join(", ")}</div>
          <button onClick={()=>onAddMissingToShoppingList(missing)} style={{ background:C.warn,color:"#fff",border:"none",borderRadius:8,padding:"7px 16px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F.ui }}>Add all to list</button>
        </div>
      )}
      <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
        {DAYS.map(day=>(
          <div key={day} style={{ background:C.surface,border:`1.5px solid ${day===todayDay?C.brandBorder:C.border}`,borderRadius:16,overflow:"hidden",boxShadow:C.sm }}>
            <div style={{ padding:"9px 16px",background:day===todayDay?C.brandLight:C.surfaceAlt,borderBottom:`1px solid ${C.borderLight}`,display:"flex",alignItems:"center",gap:8 }}>
              <span style={{ fontFamily:F.ui,fontWeight:700,fontSize:13,color:day===todayDay?C.brandText:C.t2 }}>{day}</span>
              {day===todayDay&&<span style={{ fontSize:10,fontWeight:700,color:C.brand,background:C.brandLight,border:`1px solid ${C.brandBorder}`,padding:"1px 8px",borderRadius:20,fontFamily:F.ui }}>Today</span>}
            </div>
            {MEALS.map((meal,mi)=>{
              const slot=getSlot(day,meal);
              return (
                <div key={meal} style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 16px",borderTop:mi>0?`1px solid ${C.borderLight}`:"none" }}>
                  <div style={{ width:6,height:6,borderRadius:"50%",background:mealColor[meal],flexShrink:0 }}/>
                  <span style={{ fontSize:12,fontWeight:600,color:C.t3,fontFamily:F.ui,minWidth:64 }}>{meal}</span>
                  {slot?(
                    <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8 }}>
                      <span style={{ fontFamily:F.ui,fontSize:13,fontWeight:600,color:slot.eat_out?"#3a8c7e":C.t1 }}>{slot.eat_out?"🍴 ":""}{slot.recipe_name}</span>
                      <button onClick={()=>onRemoveSlot(slot.id)} style={{ width:22,height:22,border:`1px solid ${C.border}`,background:"transparent",color:C.t3,borderRadius:6,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
                    </div>
                  ):(
                    <button onClick={()=>onOpenSlot(day,meal)} style={{ flex:1,textAlign:"left",background:"transparent",border:`1.5px dashed ${C.border}`,borderRadius:8,padding:"5px 12px",fontSize:12,color:C.t3,cursor:"pointer",fontFamily:F.ui,transition:"border-color 0.15s" }}>+ Add</button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ORDER MODAL ─────────────────────────────────────────────
function OrderModal({ item, onConfirm, onClose }) {
  const [qty,setQty]=useState(1);
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(18,12,6,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:"0 20px" }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:"28px 24px",width:"100%",maxWidth:340,display:"flex",flexDirection:"column",gap:20,boxShadow:C.lg }}>
        <div>
          <div style={{ fontFamily:F.display,fontWeight:700,fontSize:21,color:C.t1,marginBottom:4 }}>How many?</div>
          <div style={{ fontFamily:F.ui,fontSize:14,color:C.t2 }}>{item.name}</div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:16,justifyContent:"center",background:C.surfaceAlt,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px" }}>
          <button onClick={()=>setQty(Math.max(1,qty-1))} style={{ width:40,height:40,border:`1px solid ${C.border}`,background:C.surface,color:C.t2,borderRadius:10,fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:600 }}>−</button>
          <span style={{ fontSize:36,fontWeight:800,color:C.t1,minWidth:48,textAlign:"center",fontFamily:F.ui,lineHeight:1 }}>{qty}</span>
          <button onClick={()=>setQty(qty+1)} style={{ width:40,height:40,border:`1px solid ${C.border}`,background:C.surface,color:C.t2,borderRadius:10,fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:600 }}>+</button>
        </div>
        <button onClick={()=>onConfirm(qty)} style={primaryBtn()}>Confirm</button>
        <button onClick={onClose} style={{ background:"transparent",border:`1px solid ${C.border}`,color:C.t2,borderRadius:12,padding:"11px",fontSize:14,cursor:"pointer",fontFamily:F.ui }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── SCAN CONFIRM MODAL ───────────────────────────────────────
function ScanConfirmModal({ detectedItems, existingItems, onConfirm, onClose }) {
  const [items,setItems]=useState(()=>detectedItems.map((d,i)=>({ ...d,id:i,selected:true,has_half:d.level==="half",full_count:d.level==="full"?1:0,exists:!!existingItems.find(e=>e.name.toLowerCase()===d.name.toLowerCase()) })));
  const toggle=id=>setItems(p=>p.map(i=>i.id===id?{...i,selected:!i.selected}:i));
  const upd=(id,f,v)=>setItems(p=>p.map(i=>i.id===id?{...i,[f]:v}:i));
  const sel=items.filter(i=>i.selected);
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(18,12,6,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200 }}>
      <div style={{ background:C.bg,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:480,maxHeight:"88vh",display:"flex",flexDirection:"column",boxShadow:C.modal }}>
        <div style={{ padding:"20px 20px 14px",borderBottom:`1px solid ${C.border}`,background:C.surface,borderRadius:"20px 20px 0 0" }}>
          <div style={{ fontFamily:F.display,fontWeight:700,fontSize:20,color:C.t1,marginBottom:4 }}>📸 Scan Results</div>
          <div style={{ fontSize:12,color:C.t2,fontFamily:F.ui }}>Found {detectedItems.length} item{detectedItems.length!==1?"s":""}. Uncheck anything wrong.</div>
        </div>
        <div style={{ overflowY:"auto",flex:1,padding:"12px 16px" }}>
          {items.map(item=>(
            <div key={item.id} style={{ background:item.selected?C.surface:C.surfaceAlt,border:`1px solid ${item.selected?C.border:C.borderLight}`,borderRadius:12,padding:"12px 14px",marginBottom:8,opacity:item.selected?1:0.5,boxShadow:item.selected?C.sm:"none" }}>
              <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:item.selected?10:0 }}>
                <input type="checkbox" checked={item.selected} onChange={()=>toggle(item.id)} style={{ width:18,height:18,cursor:"pointer",flexShrink:0,accentColor:C.brand }}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                    <span style={{ fontFamily:F.ui,fontWeight:600,fontSize:14,color:C.t1 }}>{item.name}</span>
                    {item.exists&&<span style={{ fontSize:10,fontWeight:700,color:C.brand,background:C.brandLight,padding:"1px 7px",borderRadius:20,fontFamily:F.ui }}>tracked</span>}
                  </div>
                  <div style={{ fontSize:11,color:C.t3,fontFamily:F.ui }}>{item.category} · {item.level}</div>
                </div>
              </div>
              {item.selected&&(
                <div style={{ display:"flex",gap:8,paddingLeft:28 }}>
                  <select value={item.category} onChange={e=>upd(item.id,"category",e.target.value)} style={{ ...inp,fontSize:12,padding:"6px 10px",flex:1 }}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
                  <select value={item.has_half?"half":item.full_count>0?"full":"low"} onChange={e=>{ const v=e.target.value; upd(item.id,"has_half",v==="half"); upd(item.id,"full_count",v==="full"?1:0); }} style={{ ...inp,fontSize:12,padding:"6px 10px",flex:1 }}>
                    <option value="full">Full</option><option value="half">Half open</option><option value="low">Out / Low</option>
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ padding:"12px 16px 32px",borderTop:`1px solid ${C.border}`,background:C.surface,display:"flex",gap:10 }}>
          <button onClick={onClose} style={{ flex:1,background:C.muted,border:`1px solid ${C.mutedBorder}`,color:C.t2,borderRadius:12,padding:"13px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:F.ui }}>Cancel</button>
          <button onClick={()=>onConfirm(sel)} disabled={sel.length===0} style={{ flex:2,...primaryBtn(),opacity:sel.length===0?0.4:1,padding:"13px" }}>Save {sel.length} item{sel.length!==1?"s":""}</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────
export default function App() {
  const [items,setItems]=useState([]); const [recipes,setRecipes]=useState([]); const [shopping,setShopping]=useState([]);
  const [mealPlan,setMealPlan]=useState([]);
  const [loading,setLoading]=useState(true); const [error,setError]=useState(null);
  const [search,setSearch]=useState(""); const [filterCat,setFilterCat]=useState("All"); const [filterStock,setFilterStock]=useState("all");
  const [showAdd,setShowAdd]=useState(false); const [showAddRecipe,setShowAddRecipe]=useState(false); const [editRecipe,setEditRecipe]=useState(null);
  const [orderItem,setOrderItem]=useState(null); const [tab,setTab]=useState("home"); const [synced,setSynced]=useState(null);
  const [showAddShop,setShowAddShop]=useState(false); const [shopName,setShopName]=useState(""); const [shopCat,setShopCat]=useState(CATEGORIES[0]);
  const [tagFilter,setTagFilter]=useState("All"); const [mealsSub,setMealsSub]=useState("schedule");
  const [openSlot,setOpenSlot]=useState(null); const [scanning,setScanning]=useState(false); const [scanResults,setScanResults]=useState(null);
  const weekStart=getWeekStart();

  const scanPhoto=e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=async ev=>{ setScanning(true); try{ setScanResults(await scanShelf(ev.target.result.split(",")[1],f.type||"image/jpeg")); }catch(err){ alert("Scan failed: "+err.message); }finally{ setScanning(false); e.target.value=""; } }; r.readAsDataURL(f); };
  const confirmScan=async(confirmed)=>{ for(const it of confirmed){ const ex=items.find(i=>i.name.toLowerCase()===it.name.toLowerCase()); if(ex) await updateItem(ex.id,{has_half:it.has_half,full_count:it.full_count}); else await addItem({name:it.name,category:it.category,has_half:it.has_half,full_count:it.full_count,expires_at:null}); } setScanResults(null); };

  const load=useCallback(async()=>{ try{ setError(null); const [a,b,c,d]=await Promise.all([apiFetch("wdwn_items?order=name.asc"),apiFetch("wdwn_recipes?order=name.asc"),apiFetch("wdwn_shopping?status=eq.pending&order=name.asc"),apiFetch(`wdwn_meal_plan?week_start=eq.${weekStart}&order=id.asc`)]); setItems(a||[]); setRecipes(b||[]); setShopping(c||[]); setMealPlan(d||[]); setSynced(new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})); }catch(e){ setError("Couldn't load. Check connection."); }finally{ setLoading(false); } },[weekStart]);
  useEffect(()=>{load();},[load]);

  const addItem=async i=>{ const d=await apiFetch("wdwn_items",{method:"POST",body:JSON.stringify(i)}); if(d?.[0]) setItems(p=>[...p,d[0]].sort((a,b)=>a.name.localeCompare(b.name))); };
  const updateItem=async(id,ch)=>{ setItems(p=>p.map(i=>i.id===id?{...i,...ch}:i)); await apiFetch(`wdwn_items?id=eq.${id}`,{method:"PATCH",body:JSON.stringify(ch),prefer:"return=minimal"}); };
  const deleteItem=async id=>{ setItems(p=>p.filter(i=>i.id!==id)); await apiFetch(`wdwn_items?id=eq.${id}`,{method:"DELETE",prefer:"return=minimal"}); };
  const saveRecipe=async r=>{ const p={name:r.name,notes:r.notes,ingredients:r.ingredients,tags:r.tags,est_time:r.est_time}; if(r.id){ await apiFetch(`wdwn_recipes?id=eq.${r.id}`,{method:"PATCH",body:JSON.stringify(p)}); setRecipes(p2=>p2.map(x=>x.id===r.id?{...x,...p}:x)); }else{ const d=await apiFetch("wdwn_recipes",{method:"POST",body:JSON.stringify(p)}); if(d?.[0]) setRecipes(p2=>[...p2,d[0]].sort((a,b)=>a.name.localeCompare(b.name))); } };
  const deleteRecipe=async id=>{ setRecipes(p=>p.filter(r=>r.id!==id)); await apiFetch(`wdwn_recipes?id=eq.${id}`,{method:"DELETE",prefer:"return=minimal"}); };
  const schedRecipe=async(day,meal,recipe)=>{ const d=await apiFetch("wdwn_meal_plan",{method:"POST",body:JSON.stringify({day,meal,recipe_id:recipe.id,recipe_name:recipe.name,week_start:weekStart,eat_out:false})}); if(d?.[0]) setMealPlan(p=>[...p,d[0]]); setOpenSlot(null); };
  const schedEatOut=async(day,meal,rest)=>{ const d=await apiFetch("wdwn_meal_plan",{method:"POST",body:JSON.stringify({day,meal,recipe_id:null,recipe_name:rest,week_start:weekStart,eat_out:true})}); if(d?.[0]) setMealPlan(p=>[...p,d[0]]); setOpenSlot(null); };
  const removeSlot=async id=>{ setMealPlan(p=>p.filter(s=>s.id!==id)); await apiFetch(`wdwn_meal_plan?id=eq.${id}`,{method:"DELETE",prefer:"return=minimal"}); };
  const addMissing=async names=>{ for(const name of names.filter(n=>!shopping.find(s=>s.name.toLowerCase()===n.toLowerCase()))){ const d=await apiFetch("wdwn_shopping",{method:"POST",body:JSON.stringify({name,category:"Other",status:"pending"})}); if(d?.[0]) setShopping(p=>[...p,d[0]]); } };
  const addShop=async()=>{ if(!shopName.trim()) return; const d=await apiFetch("wdwn_shopping",{method:"POST",body:JSON.stringify({name:shopName.trim(),category:shopCat,status:"pending"})}); if(d?.[0]) setShopping(p=>[...p,d[0]]); setShopName(""); setShowAddShop(false); };
  const ordered=async(s,qty)=>{ await apiFetch(`wdwn_shopping?id=eq.${s.id}`,{method:"PATCH",body:JSON.stringify({status:"ordered",quantity_ordered:qty}),prefer:"return=minimal"}); setShopping(p=>p.filter(x=>x.id!==s.id)); const ex=items.find(i=>i.name.toLowerCase()===s.name.toLowerCase()); if(ex) await updateItem(ex.id,{full_count:ex.full_count+qty,expires_at:null}); else await addItem({name:s.name,category:s.category,has_half:false,full_count:qty,expires_at:null}); setOrderItem(null); };
  const skipped=async id=>{ await apiFetch(`wdwn_shopping?id=eq.${id}`,{method:"PATCH",body:JSON.stringify({status:"skipped"}),prefer:"return=minimal"}); setShopping(p=>p.filter(s=>s.id!==id)); };
  const storeOOS=async id=>{ await apiFetch(`wdwn_shopping?id=eq.${id}`,{method:"PATCH",body:JSON.stringify({status:"out_of_stock"}),prefer:"return=minimal"}); setShopping(p=>p.filter(s=>s.id!==id)); };
  const rmShop=async id=>{ setShopping(p=>p.filter(s=>s.id!==id)); await apiFetch(`wdwn_shopping?id=eq.${id}`,{method:"DELETE",prefer:"return=minimal"}); };

  const needReorder=items.filter(i=>itemNeedsReorder(i));
  const outCount=needReorder.length+shopping.length;
  const filtered=items.filter(i=>{ const ms=i.name.toLowerCase().includes(search.toLowerCase()); const mc=filterCat==="All"||i.category===filterCat; const mst=filterStock==="all"||(filterStock==="out"&&itemNeedsReorder(i))||(filterStock==="in"&&!itemNeedsReorder(i)); return ms&&mc&&mst; });
  const grouped=CATEGORIES.reduce((acc,cat)=>{ const ci=filtered.filter(i=>i.category===cat); if(ci.length) acc[cat]=ci; return acc; },{});
  const fabCat=filterCat!=="All"?filterCat:CATEGORIES[0];
  const filteredRecipes=tagFilter==="All"?recipes:recipes.filter(r=>(r.tags||[]).includes(tagFilter));

  const NAV=[["home","🏠","Home"],["pantry","🍏","Pantry"],["need","🛒",outCount?`Need (${outCount})`:"Need"],["meals","🍽️","Meals"]];
  const PAGE={ home:["Home","Your household at a glance"], pantry:["Pantry","What's in the house"], need:["Shopping","What to pick up"], meals:["Meals","This week's plan"] };

  const shopActionStyle=(color,bg,border)=>({ flex:1,background:bg,border:`1.5px solid ${border}`,color,borderRadius:9,padding:"8px 0",fontSize:12,cursor:"pointer",fontFamily:F.ui,fontWeight:700 });

  return (
    <div style={{ minHeight:"100vh",background:C.bg,fontFamily:F.ui,color:C.t1,paddingBottom:80 }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{ padding:"18px 20px 14px",background:C.surface,borderBottom:`1px solid ${C.borderLight}`,position:"sticky",top:0,zIndex:10,boxShadow:"0 1px 0 rgba(20,14,8,0.05)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div>
            <h1 style={{ fontFamily:F.display,fontWeight:700,fontSize:26,color:C.t1,margin:0,letterSpacing:"-0.3px",lineHeight:1 }}>{PAGE[tab][0]}</h1>
            <p style={{ fontFamily:F.ui,fontSize:12,color:C.t3,margin:"4px 0 0",lineHeight:1 }}>
              {PAGE[tab][1]}
              {synced && <span style={{ marginLeft:6 }}>· synced {synced}</span>}
              {outCount>0 && <span style={{ color:C.danger,marginLeft:6,fontWeight:600 }}>· {outCount} to reorder</span>}
            </p>
          </div>
          <button onClick={load} style={{ width:34,height:34,background:C.muted,border:`1px solid ${C.mutedBorder}`,color:C.t2,borderRadius:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16 }}>↻</button>
        </div>
      </div>

      <div style={{ padding:"20px 16px 0" }}>
        {error&&<div style={{ color:C.danger,background:C.dangerLight,border:`1px solid ${C.dangerBorder}`,borderRadius:10,padding:"12px 16px",marginBottom:16,fontSize:13,fontFamily:F.ui }}>{error}</div>}

        {/* HOME */}
        {tab==="home"&&(loading?<div style={{ color:C.t3,textAlign:"center",paddingTop:60,fontFamily:F.ui }}>Loading...</div>:<Dashboard items={items} onNavigate={(t,cat)=>{setTab(t);setFilterCat(cat);}} onUpdate={updateItem} onDelete={deleteItem}/>)}

        {/* PANTRY */}
        {tab==="pantry"&&(
          <>
            <div style={{ display:"flex",gap:8,marginBottom:12 }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search pantry..." style={{ ...inp,flex:1 }}/>
              <label style={{ display:"flex",alignItems:"center",gap:5,background:scanning?C.muted:C.brand,border:"none",color:scanning?C.t2:"#fff",borderRadius:10,padding:"0 14px",fontSize:13,fontWeight:700,cursor:scanning?"wait":"pointer",fontFamily:F.ui,whiteSpace:"nowrap",flexShrink:0,boxShadow:scanning?"none":`0 2px 6px rgba(47,125,82,0.3)` }}>
                {scanning?"Scanning...":"📸 Scan"}
                {!scanning&&<input type="file" accept="image/*" capture="environment" onChange={scanPhoto} style={{ display:"none" }}/>}
              </label>
            </div>
            {/* Filter chips */}
            <div style={{ display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:16,scrollbarWidth:"none" }}>
              {["All",...CATEGORIES].map(c=>(
                <button key={c} onClick={()=>setFilterCat(c)} style={{ padding:"6px 13px",borderRadius:20,border:`1.5px solid ${filterCat===c?C.brandBorder:C.border}`,background:filterCat===c?C.brandLight:"transparent",color:filterCat===c?C.brandText:C.t2,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",fontFamily:F.ui,fontWeight:filterCat===c?700:500,flexShrink:0 }}>
                  {c==="All"?"All":`${CAT_EMOJI[c]} ${c}`}
                </button>
              ))}
              <button onClick={()=>setFilterStock(filterStock==="out"?"all":"out")} style={{ padding:"6px 13px",borderRadius:20,border:`1.5px solid ${filterStock==="out"?C.dangerBorder:C.border}`,background:filterStock==="out"?C.dangerLight:"transparent",color:filterStock==="out"?C.danger:C.t2,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",fontFamily:F.ui,fontWeight:filterStock==="out"?700:500,flexShrink:0 }}>🚨 Need reorder</button>
            </div>
            {loading?<div style={{ color:C.t3,textAlign:"center",paddingTop:40 }}>Loading...</div>
            :filtered.length===0?<EmptyState icon={search?"🔍":"🥦"} text={search?`Nothing found`:"Empty pantry"} sub={search?`No results for "${search}"`:"Tap + to add your first item"} action={!search?"Add item":null} onAction={()=>setShowAdd(true)}/>
            :Object.entries(grouped).map(([cat,catItems])=>(
              <div key={cat} style={{ marginBottom:28 }}>
                <div style={{ fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10,fontFamily:F.ui }}>{CAT_EMOJI[cat]} {cat}</div>
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>{catItems.map(item=><ItemCard key={item.id} item={item} onUpdate={updateItem} onDelete={deleteItem}/>)}</div>
              </div>
            ))}
          </>
        )}

        {/* SHOPPING */}
        {tab==="need"&&(
          <>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
              <p style={{ fontFamily:F.ui,fontSize:14,color:C.t2,margin:0 }}>{outCount?`${outCount} item${outCount!==1?"s":""} to pick up`:"You're fully stocked!"}</p>
              <button onClick={()=>setShowAddShop(true)} style={{ ...primaryBtn(),width:"auto",padding:"8px 16px",fontSize:13 }}>+ Add item</button>
            </div>
            {showAddShop&&(
              <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:"16px",marginBottom:18,boxShadow:C.sm,display:"flex",flexDirection:"column",gap:10 }}>
                <input autoFocus value={shopName} onChange={e=>setShopName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addShop()} placeholder="Item name..." style={inp} list="shop-list"/>
                <datalist id="shop-list">{items.map(i=><option key={i.id} value={i.name}/>)}</datalist>
                <select value={shopCat} onChange={e=>setShopCat(e.target.value)} style={inp}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
                <div style={{ display:"flex",gap:8 }}>
                  <button onClick={addShop} style={{ ...primaryBtn(),padding:"10px" }}>Add to List</button>
                  <button onClick={()=>{setShowAddShop(false);setShopName("");}} style={{ background:C.muted,border:`1px solid ${C.mutedBorder}`,color:C.t2,borderRadius:12,padding:"10px 16px",fontSize:14,cursor:"pointer",fontFamily:F.ui }}>Cancel</button>
                </div>
              </div>
            )}
            {needReorder.length>0&&(
              <div style={{ marginBottom:22 }}>
                <div style={{ fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10,fontFamily:F.ui }}>Out of stock / expired</div>
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {needReorder.map(item=>{ const exp=isExpired(item.expires_at); return (
                    <div key={item.id} style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",boxShadow:C.sm }}>
                      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                        <span style={{ fontFamily:F.ui,fontWeight:600,fontSize:15,color:C.t1 }}>{item.name}</span>
                        <span style={{ fontSize:11,fontWeight:700,color:exp?C.warn:C.danger,fontFamily:F.ui }}>{exp?"Expired":"Out of stock"}</span>
                      </div>
                      <div style={{ display:"flex",gap:6 }}>
                        <button onClick={()=>setOrderItem(item)} style={shopActionStyle(C.brandText,C.brandLight,C.brandBorder)}>✓ Ordered</button>
                        <button onClick={()=>skipped(item.id)} style={shopActionStyle(C.t2,"transparent",C.border)}>Skip</button>
                        <button onClick={()=>storeOOS(item.id)} style={shopActionStyle(C.danger,C.dangerLight,C.dangerBorder)}>Store OOS</button>
                      </div>
                    </div>
                  );})}
                </div>
              </div>
            )}
            {shopping.length>0&&(
              <div style={{ marginBottom:22 }}>
                <div style={{ fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10,fontFamily:F.ui }}>Added to list</div>
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {shopping.map(s=>(
                    <div key={s.id} style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",boxShadow:C.sm }}>
                      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                        <span style={{ fontFamily:F.ui,fontWeight:600,fontSize:15,color:C.t1 }}>{s.name}</span>
                        <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                          <span style={{ fontSize:11,color:C.t3,fontFamily:F.ui }}>{CAT_EMOJI[s.category]}</span>
                          <button onClick={()=>rmShop(s.id)} style={{ width:22,height:22,border:`1px solid ${C.border}`,background:"transparent",color:C.t3,borderRadius:6,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
                        </div>
                      </div>
                      <div style={{ display:"flex",gap:6 }}>
                        <button onClick={()=>setOrderItem(s)} style={shopActionStyle(C.brandText,C.brandLight,C.brandBorder)}>✓ Ordered</button>
                        <button onClick={()=>skipped(s.id)} style={shopActionStyle(C.t2,"transparent",C.border)}>Skip</button>
                        <button onClick={()=>storeOOS(s.id)} style={shopActionStyle(C.danger,C.dangerLight,C.dangerBorder)}>Store OOS</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {needReorder.length===0&&shopping.length===0&&<EmptyState icon="🛍️" text="All stocked up" sub="Nothing to pick up right now"/>}
          </>
        )}

        {/* MEALS */}
        {tab==="meals"&&(
          <>
            <div style={{ display:"flex",background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:3,marginBottom:20,boxShadow:C.sm }}>
              {[["schedule","📅 This Week"],["recipes","📖 Recipes"]].map(([t,l])=>(
                <button key={t} onClick={()=>setMealsSub(t)} style={{ flex:1,padding:"9px",borderRadius:9,border:"none",background:mealsSub===t?C.brand:"transparent",color:mealsSub===t?"#fff":C.t2,fontFamily:F.ui,fontWeight:mealsSub===t?700:500,fontSize:13,cursor:"pointer",transition:"all 0.15s" }}>{l}</button>
              ))}
            </div>
            {mealsSub==="schedule"&&(loading?<div style={{ color:C.t3,textAlign:"center",paddingTop:40 }}>Loading...</div>:<WeekSchedule mealPlan={mealPlan} recipes={recipes} items={items} onOpenSlot={(day,meal)=>setOpenSlot({day,meal})} onRemoveSlot={removeSlot} onAddMissingToShoppingList={addMissing}/>)}
            {mealsSub==="recipes"&&(
              <>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
                  <span style={{ fontFamily:F.ui,fontWeight:700,fontSize:15,color:C.t1 }}>Recipe Library</span>
                  <button onClick={()=>setShowAddRecipe(true)} style={{ ...primaryBtn(),width:"auto",padding:"7px 16px",fontSize:13 }}>+ Add Recipe</button>
                </div>
                <div style={{ display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:16,scrollbarWidth:"none" }}>
                  {["All",...RECIPE_TAGS].map(tag=>(
                    <button key={tag} onClick={()=>setTagFilter(tag)} style={{ padding:"6px 13px",borderRadius:20,border:`1.5px solid ${tagFilter===tag?C.brandBorder:C.border}`,background:tagFilter===tag?C.brandLight:"transparent",color:tagFilter===tag?C.brandText:C.t2,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",fontFamily:F.ui,fontWeight:tagFilter===tag?700:500,flexShrink:0 }}>
                      {tag==="All"?"All":`${RECIPE_TAG_EMOJI[tag]} ${tag}`}
                    </button>
                  ))}
                </div>
                {tagFilter==="All"?(
                  <>
                    {RECIPE_TAGS.map(tag=>{ const tr=recipes.filter(r=>(r.tags||[]).includes(tag)); if(!tr.length) return null; return (
                      <div key={tag} style={{ marginBottom:24 }}>
                        <div style={{ fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10,fontFamily:F.ui }}>{RECIPE_TAG_EMOJI[tag]} {tag}</div>
                        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>{tr.map(r=><RecipeCard key={r.id} recipe={r} items={items} onDelete={deleteRecipe} onEdit={r=>setEditRecipe(r)}/>)}</div>
                      </div>
                    );})}
                    {recipes.filter(r=>!(r.tags||[]).length).length>0&&(
                      <div style={{ marginBottom:24 }}>
                        <div style={{ fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10,fontFamily:F.ui }}>Uncategorized</div>
                        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>{recipes.filter(r=>!(r.tags||[]).length).map(r=><RecipeCard key={r.id} recipe={r} items={items} onDelete={deleteRecipe} onEdit={r=>setEditRecipe(r)}/>)}</div>
                      </div>
                    )}
                    {recipes.length===0&&<EmptyState icon="🍳" text="No recipes yet" sub="Add your first recipe to start planning meals"/>}
                  </>
                ):(filteredRecipes.length===0?<EmptyState icon={RECIPE_TAG_EMOJI[tagFilter]} text={`No ${tagFilter} recipes`} sub="Add a recipe and tag it to see it here"/>:<div style={{ display:"flex",flexDirection:"column",gap:8 }}>{filteredRecipes.map(r=><RecipeCard key={r.id} recipe={r} items={items} onDelete={deleteRecipe} onEdit={r=>setEditRecipe(r)}/>)}</div>)}
              </>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      {tab==="pantry"&&(
        <button onClick={()=>setShowAdd(true)} style={{ position:"fixed",bottom:76,right:18,height:48,borderRadius:24,background:C.brand,border:"none",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:`0 4px 16px rgba(47,125,82,0.4)`,display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:"0 20px",gap:6,fontFamily:F.ui }}>
          <span style={{ fontSize:20,lineHeight:1 }}>+</span> Add Item
        </button>
      )}

      {/* Bottom nav */}
      <div style={{ position:"fixed",bottom:0,left:0,right:0,background:C.surface,borderTop:`1px solid ${C.borderLight}`,display:"flex",zIndex:20,paddingBottom:"env(safe-area-inset-bottom,0px)" }}>
        {NAV.map(([t,emoji,label])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1,padding:"10px 0 8px",border:"none",background:"transparent",color:tab===t?C.brand:C.t3,fontSize:10,fontWeight:tab===t?700:500,cursor:"pointer",fontFamily:F.ui,display:"flex",flexDirection:"column",alignItems:"center",gap:3,borderTop:`2px solid ${tab===t?C.brand:"transparent"}`,transition:"color 0.15s" }}>
            <span style={{ fontSize:20 }}>{emoji}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {showAdd&&<AddItemModal onAdd={addItem} onClose={()=>setShowAdd(false)} defaultCategory={fabCat}/>}
      {(showAddRecipe||editRecipe)&&<RecipeModal recipe={editRecipe} onSave={saveRecipe} onClose={()=>{setShowAddRecipe(false);setEditRecipe(null);}} existingItems={items}/>}
      {orderItem&&<OrderModal item={orderItem} onConfirm={(qty)=>ordered(orderItem,qty)} onClose={()=>setOrderItem(null)}/>}
      {openSlot&&<MealSlotModal day={openSlot.day} meal={openSlot.meal} recipes={recipes} onScheduleRecipe={r=>schedRecipe(openSlot.day,openSlot.meal,r)} onEatOut={rest=>schedEatOut(openSlot.day,openSlot.meal,rest)} onClose={()=>setOpenSlot(null)}/>}
      {scanResults&&<ScanConfirmModal detectedItems={scanResults} existingItems={items} onConfirm={confirmScan} onClose={()=>setScanResults(null)}/>}
    </div>
  );
}
