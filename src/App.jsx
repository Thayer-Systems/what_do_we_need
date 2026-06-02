import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://dzqciagcyekqxborbats.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6cWNpYWdjeWVrcXhib3JiYXRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MjUzNTIsImV4cCI6MjA5MjAwMTM1Mn0.MfOw6ci5lRgzMhXGLavztjrQHgP3GCLieYuvsuNDHoM";
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY;

const CATEGORIES = ["Fridge","Freezer","Pantry","Lazy Susan","Kids","Dogs","Cleaning","Bathroom","Medicine","Coffee","Other","Need Reorder"];
const CAT_EMOJI = { Fridge:"🍇", Freezer:"❄️", Pantry:"🥖", "Lazy Susan":"🫙", Kids:"🧃", Dogs:"🐕", Cleaning:"🫧", Bathroom:"🚽", Medicine:"💊", Coffee:"☕", Other:"🍩", "Need Reorder":"🔄" };
const RECIPE_TAGS = ["Quick","Dinner","Lunch","Breakfast","Crockpot","Dump & Go"];
const RECIPE_TAG_EMOJI = { Quick:"⚡", Dinner:"🌙", Lunch:"☀️", Breakfast:"🍳", Crockpot:"🫕", "Dump & Go":"🪣" };
const EST_TIMES = ["5 min","10 min","15 min","30 min","45 min","1 hr","2 hr","3 hr","4 hr","5 hr","6 hr"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MEALS = ["Breakfast","Lunch","Dinner"];

const C = {
  bg:"#faf9f7", surface:"#ffffff", border:"#ebe7e1", borderLight:"#f2efe9",
  text:"#2c2825", textMid:"#7a7068", textLight:"#b0a89e",
  green:"#5a9e75", greenBg:"#eef7f2", greenBorder:"#c0dece",
  red:"#c0614a", redBg:"#fdf0ed", redBorder:"#ebbcb3",
  accent:"#7b9fd4", accentBg:"#f0f4fb", accentBorder:"#c8d8f0",
  btnBg:"#f4f0eb", btnBorder:"#e4dfd8",
  yellow:"#d4952a", yellowBg:"#fdf5e6", yellowBorder:"#f0d9a8",
  orange:"#c4733a", orangeBg:"#fdf3eb", orangeBorder:"#f0c8a0",
  purple:"#8b6fbd", purpleBg:"#f4f0fb", purpleBorder:"#d0c0f0",
  teal:"#4a9e8f", tealBg:"#edf7f5", tealBorder:"#b8ddd8",
};

const todayStr = () => new Date().toISOString().split("T")[0];
const isExpired = (e) => e ? e < todayStr() : false;
const isExpiringSoon = (e) => { if(!e) return false; const d=new Date(); d.setDate(d.getDate()+7); return e>=todayStr()&&e<=d.toISOString().split("T")[0]; };
const itemNeedsReorder = (i) => (!i.has_half && i.full_count===0) || isExpired(i.expires_at);

// Get Monday-based week start (Sun)
function getWeekStart() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  return d.toISOString().split("T")[0];
}

async function apiFetch(path, options={}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { apikey:SUPABASE_KEY, Authorization:`Bearer ${SUPABASE_KEY}`, "Content-Type":"application/json", Prefer:options.prefer||"return=representation", ...options.headers },
  });
  if(!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function scanShelf(base64Image, mediaType) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64Image } },
          { type: "text", text: `Analyze this image of a fridge, freezer, or pantry shelf. List every food or household item you can identify.

For each item return:
- name: common grocery name (e.g. "Milk", "Chicken Broth", "Ketchup")
- level: one of "full", "half", or "low" based on how much is left
- category: one of exactly these: Fridge, Freezer, Pantry, Lazy Susan, Kids, Dogs, Cleaning, Bathroom, Medicine, Coffee, Other

Return ONLY a JSON array, no explanation, no markdown. Example:
[{"name":"Milk","level":"half","category":"Fridge"},{"name":"Orange Juice","level":"full","category":"Fridge"}]

If you cannot identify any items, return an empty array: []` }
        ]
      }]
    })
  });
  if (!res.ok) throw new Error("Vision API error");
  const data = await res.json();
  const clean = data.content[0].text.trim().replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ---- SCAN CONFIRM MODAL ----
function ScanConfirmModal({ detectedItems, existingItems, onConfirm, onClose }) {
  const [items, setItems] = useState(() =>
    detectedItems.map((d, i) => ({
      ...d,
      id: i,
      selected: true,
      has_half: d.level === "half",
      full_count: d.level === "full" ? 1 : d.level === "low" ? 0 : 0,
      exists: !!existingItems.find(e => e.name.toLowerCase() === d.name.toLowerCase()),
    }))
  );

  const toggle = (id) => setItems(prev => prev.map(i => i.id === id ? { ...i, selected: !i.selected } : i));
  const updateField = (id, field, val) => setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: val } : i));

  const selected = items.filter(i => i.selected);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(44,40,37,0.5)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:200 }}>
      <div style={{ background:C.bg, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:480, maxHeight:"88vh", display:"flex", flexDirection:"column", boxShadow:"0 -4px 30px rgba(0,0,0,0.15)" }}>
        <div style={{ padding:"20px 20px 12px", borderBottom:`1px solid ${C.border}`, background:C.surface, borderRadius:"20px 20px 0 0" }}>
          <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:18, color:C.text, marginBottom:4 }}>📸 Scan Results</div>
          <div style={{ fontSize:12, color:C.textMid, fontFamily:"'Nunito',sans-serif" }}>Found {detectedItems.length} item{detectedItems.length!==1?"s":""}. Uncheck anything that looks wrong, then tap Save.</div>
        </div>
        <div style={{ overflowY:"auto", flex:1, padding:"12px 16px" }}>
          {items.length === 0 && <div style={{ color:C.textLight, textAlign:"center", paddingTop:30, fontFamily:"'Nunito',sans-serif" }}>No items detected. Try a clearer photo.</div>}
          {items.map(item => (
            <div key={item.id} style={{ background:item.selected?C.surface:"#f7f5f2", border:`1px solid ${item.selected?C.border:C.borderLight}`, borderRadius:12, padding:"12px 14px", marginBottom:8, opacity:item.selected?1:0.5 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:item.selected?10:0 }}>
                <input type="checkbox" checked={item.selected} onChange={()=>toggle(item.id)} style={{ width:18, height:18, cursor:"pointer", flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:14, color:C.text }}>{item.name}</span>
                    {item.exists && <span style={{ fontSize:10, fontWeight:700, color:C.accent, background:C.accentBg, border:`1px solid ${C.accentBorder}`, padding:"1px 7px", borderRadius:20, fontFamily:"'Nunito',sans-serif" }}>already tracked</span>}
                  </div>
                  <div style={{ fontSize:11, color:C.textLight, fontFamily:"'Nunito',sans-serif" }}>{item.category} · {item.level}</div>
                </div>
              </div>
              {item.selected && (
                <div style={{ display:"flex", gap:8, alignItems:"center", paddingLeft:28 }}>
                  <select value={item.category} onChange={(e)=>updateField(item.id,"category",e.target.value)} style={{ ...inputStyle, fontSize:12, padding:"5px 10px", flex:1 }}>
                    {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                  <select value={item.has_half?"half":item.full_count>0?"full":"low"} onChange={(e)=>{
                    const v=e.target.value;
                    updateField(item.id,"has_half",v==="half");
                    updateField(item.id,"full_count",v==="full"?1:0);
                  }} style={{ ...inputStyle, fontSize:12, padding:"5px 10px", flex:1 }}>
                    <option value="full">Full</option>
                    <option value="half">Half open</option>
                    <option value="low">Out/Low</option>
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ padding:"12px 16px 28px", borderTop:`1px solid ${C.border}`, background:C.surface, display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, background:C.btnBg, border:`1px solid ${C.btnBorder}`, color:C.textMid, borderRadius:12, padding:"13px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>Cancel</button>
          <button onClick={()=>onConfirm(selected)} disabled={selected.length===0} style={{ flex:2, background:C.green, color:"#fff", border:"none", borderRadius:12, padding:"13px", fontSize:14, fontWeight:800, cursor:selected.length===0?"not-allowed":"pointer", fontFamily:"'Nunito',sans-serif", opacity:selected.length===0?0.5:1 }}>
            Save {selected.length} Item{selected.length!==1?"s":""}
          </button>
        </div>
      </div>
    </div>
  );
}

const pillStyle = (color,bg,border) => ({ display:"inline-flex", alignItems:"center", fontSize:11, fontWeight:700, color, background:bg, border:`1px solid ${border}`, padding:"2px 9px", borderRadius:20, whiteSpace:"nowrap", fontFamily:"'Nunito',sans-serif" });
const btnStyle = (sm) => ({ width:sm?28:32, height:sm?28:32, borderRadius:8, border:`1px solid ${C.btnBorder}`, background:C.btnBg, color:C.textMid, fontSize:sm?15:17, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Nunito',sans-serif", fontWeight:700, flexShrink:0 });
const inputStyle = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", color:C.text, fontSize:15, fontFamily:"'Nunito',sans-serif", width:"100%", boxSizing:"border-box", outline:"none" };

// ---- ITEM DRILL-DOWN MODAL ----
function ItemListModal({ title, items, onUpdate, onDelete, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(44,40,37,0.4)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:100 }} onClick={(e)=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.bg, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:480, maxHeight:"80vh", display:"flex", flexDirection:"column", boxShadow:"0 -4px 30px rgba(0,0,0,0.1)" }}>
        <div style={{ padding:"20px 20px 12px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:18, color:C.text }}>{title}</div>
          <button onClick={onClose} style={{ ...btnStyle(true), background:"transparent", border:"none" }}>✕</button>
        </div>
        <div style={{ overflowY:"auto", padding:"12px 16px 24px", display:"flex", flexDirection:"column", gap:7 }}>
          {items.length===0 ? <div style={{ color:C.textLight, textAlign:"center", paddingTop:30, fontFamily:"'Nunito',sans-serif" }}>Nothing here!</div>
            : items.map(item=><ItemCard key={item.id} item={item} onUpdate={onUpdate} onDelete={onDelete}/>)}
        </div>
      </div>
    </div>
  );
}

// ---- HOME DASHBOARD ----
function Dashboard({ items, onNavigate, onUpdate, onDelete }) {
  const [drillDown,setDrillDown]=useState(null);
  const total=items.length;
  const outOfStock=items.filter(i=>!i.has_half&&i.full_count===0);
  const expired=items.filter(i=>isExpired(i.expires_at));
  const statCards=[
    { label:"Total Items", value:total, color:C.text, bg:C.surface, border:C.border, drill:{title:"All Items",items} },
    { label:"Out of Stock", value:outOfStock.length, color:outOfStock.length>0?C.red:C.textMid, bg:outOfStock.length>0?C.redBg:C.surface, border:outOfStock.length>0?C.redBorder:C.border, drill:{title:"Out of Stock",items:outOfStock} },
    { label:"Expired", value:expired.length, color:expired.length>0?C.orange:C.textMid, bg:expired.length>0?C.orangeBg:C.surface, border:expired.length>0?C.orangeBorder:C.border, drill:{title:"Expired Items",items:expired} },
  ];
  const catData=CATEGORIES.map(cat=>({ cat, count:items.filter(i=>i.category===cat).length, out:items.filter(i=>i.category===cat&&itemNeedsReorder(i)).length }));
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:700, color:C.textLight, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10, fontFamily:"'Nunito',sans-serif" }}>Overview</div>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {statCards.map(({label,value,color,bg,border,drill})=>(
          <div key={label} onClick={()=>setDrillDown(drill)} style={{ background:bg, border:`1px solid ${border}`, borderRadius:12, padding:"12px 14px", flex:1, minWidth:0, cursor:"pointer" }}>
            <div style={{ fontSize:22, fontWeight:800, color, fontFamily:"'Nunito',sans-serif" }}>{value}</div>
            <div style={{ fontSize:11, color:C.textLight, marginTop:2, fontFamily:"'Nunito',sans-serif" }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:11, fontWeight:700, color:C.textLight, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10, fontFamily:"'Nunito',sans-serif" }}>By Category</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:8, marginBottom:16 }}>
        {catData.map(({cat,count,out})=>(
          <div key={cat} onClick={()=>onNavigate("pantry",cat)} style={{ background:out>0?C.redBg:C.surface, border:`1px solid ${out>0?C.redBorder:C.border}`, borderRadius:12, padding:"12px 10px", display:"flex", flexDirection:"column", alignItems:"center", gap:4, cursor:"pointer" }}>
            <span style={{ fontSize:22 }}>{CAT_EMOJI[cat]}</span>
            <span style={{ fontSize:11, fontWeight:800, color:C.text, fontFamily:"'Nunito',sans-serif", textAlign:"center", lineHeight:1.2 }}>{cat}</span>
            <span style={{ fontSize:12, fontWeight:700, color:count>0?C.textMid:C.textLight, fontFamily:"'Nunito',sans-serif" }}>{count}</span>
            {out>0&&<span style={{ fontSize:10, fontWeight:800, color:C.red, fontFamily:"'Nunito',sans-serif" }}>{out} low</span>}
          </div>
        ))}
      </div>
      {drillDown&&<ItemListModal title={drillDown.title} items={drillDown.items} onUpdate={onUpdate} onDelete={onDelete} onClose={()=>setDrillDown(null)}/>}
    </div>
  );
}

// ---- ITEM CARD ----
function ItemCard({ item, onUpdate, onDelete }) {
  const { name, has_half, full_count, expires_at } = item;
  const expired=isExpired(expires_at); const expiringSoon=isExpiringSoon(expires_at);
  const outOfStock=!has_half&&full_count===0; const runningLow=!has_half&&full_count===1&&!expired;
  const summary=(() => { if(expired) return "Expired"; const p=[]; if(has_half) p.push("½ open"); if(full_count>0) p.push(`${full_count} new`); return p.length?p.join(" + "):"Out of stock"; })();
  const badgeColor=expired?C.orange:outOfStock?C.red:runningLow?C.yellow:C.green;
  const badgeBg=expired?C.orangeBg:outOfStock?C.redBg:runningLow?C.yellowBg:C.greenBg;
  const badgeBorder=expired?C.orangeBorder:outOfStock?C.redBorder:runningLow?C.yellowBorder:C.greenBorder;
  const formatDate=(d)=>{ if(!d) return null; const [y,m,day]=d.split("-"); return `${m}/${day}/${y.slice(2)}`; };
  return (
    <div style={{ background:expired?C.orangeBg:outOfStock?C.redBg:C.surface, border:`1px solid ${expired?C.orangeBorder:outOfStock?C.redBorder:runningLow?C.yellowBorder:C.border}`, borderRadius:12, padding:"12px 14px", display:"flex", flexDirection:"column", gap:9 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
        <div style={{ minWidth:0 }}>
          <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:15, color:expired?C.orange:outOfStock?C.red:C.text }}>{name}</div>
          {expires_at&&<div style={{ fontSize:11, color:expired?C.orange:expiringSoon?C.yellow:C.textLight, fontWeight:expired||expiringSoon?700:400, marginTop:2, fontFamily:"'Nunito',sans-serif" }}>{expired?"⚠️ Exp ":expiringSoon?"⏰ Exp ":"Exp "}{formatDate(expires_at)}</div>}
        </div>
        <div style={pillStyle(badgeColor,badgeBg,badgeBorder)}>{summary}</div>
      </div>
      <div style={{ display:"flex", gap:7, alignItems:"center", flexWrap:"wrap" }}>
        <button onClick={()=>onUpdate(item.id,{has_half:!has_half})} style={{ padding:"4px 11px", borderRadius:8, border:`1px solid ${has_half?C.greenBorder:C.btnBorder}`, background:has_half?C.greenBg:C.btnBg, color:has_half?C.green:C.textMid, fontSize:13, cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontWeight:has_half?700:500 }}>Opened</button>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <button onClick={()=>onUpdate(item.id,{full_count:Math.max(0,full_count-1)})} style={btnStyle(true)}>−</button>
          <span style={{ fontSize:15, fontWeight:800, color:C.text, minWidth:18, textAlign:"center", fontFamily:"'Nunito',sans-serif" }}>{full_count}</span>
          <button onClick={()=>onUpdate(item.id,{full_count:full_count+1})} style={btnStyle(true)}>+</button>
          <span style={{ fontSize:11, color:C.textLight, fontFamily:"'Nunito',sans-serif" }}>new</span>
        </div>
        <button onClick={()=>onDelete(item.id)} style={{ ...btnStyle(true), color:C.textLight, marginLeft:"auto" }}>✕</button>
      </div>
    </div>
  );
}

// ---- ADD ITEM MODAL ----
function AddItemModal({ onAdd, onClose, defaultCategory }) {
  const [name,setName]=useState(""); const [category,setCategory]=useState(defaultCategory||CATEGORIES[0]);
  const [hasOpened,setHasOpened]=useState(false); const [newCount,setNewCount]=useState(1);
  const [expiresAt,setExpiresAt]=useState(""); const [saving,setSaving]=useState(false);
  const submit=async()=>{ if(!name.trim()) return; setSaving(true); await onAdd({name:name.trim(),category,has_half:hasOpened,full_count:newCount,expires_at:expiresAt||null}); onClose(); };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(44,40,37,0.4)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:100 }} onClick={(e)=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.surface, borderRadius:"20px 20px 0 0", padding:"24px 20px", width:"100%", maxWidth:480, display:"flex", flexDirection:"column", gap:14, boxShadow:"0 -4px 30px rgba(0,0,0,0.1)" }}>
        <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:20, fontWeight:800, color:C.text }}>Add Item</div>
        <input autoFocus value={name} onChange={(e)=>setName(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&submit()} placeholder="Item name..." style={inputStyle}/>
        <select value={category} onChange={(e)=>setCategory(e.target.value)} style={inputStyle}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
        <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
          <label style={{ display:"flex", alignItems:"center", gap:8, color:C.textMid, fontSize:14, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
            <input type="checkbox" checked={hasOpened} onChange={(e)=>setHasOpened(e.target.checked)} style={{ width:16, height:16 }}/>Opened
          </label>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:"auto" }}>
            <span style={{ color:C.textMid, fontSize:13, fontFamily:"'Nunito',sans-serif" }}>New:</span>
            <button onClick={()=>setNewCount(Math.max(0,newCount-1))} style={btnStyle()}>−</button>
            <span style={{ color:C.text, fontWeight:800, minWidth:20, textAlign:"center", fontFamily:"'Nunito',sans-serif" }}>{newCount}</span>
            <button onClick={()=>setNewCount(newCount+1)} style={btnStyle()}>+</button>
          </div>
        </div>
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:6, fontFamily:"'Nunito',sans-serif" }}>Expiration date (optional)</div>
          <input type="date" value={expiresAt} onChange={(e)=>setExpiresAt(e.target.value)} style={inputStyle}/>
        </div>
        <button onClick={submit} disabled={saving} style={{ background:C.green, color:"#fff", border:"none", borderRadius:12, padding:"14px", fontSize:15, fontWeight:800, cursor:saving?"wait":"pointer", fontFamily:"'Nunito',sans-serif", opacity:saving?0.7:1 }}>{saving?"Adding...":"Add to List"}</button>
      </div>
    </div>
  );
}

// ---- RECIPE CARD ----
function RecipeCard({ recipe, items, onDelete, onEdit }) {
  const [expanded,setExpanded]=useState(false);
  const ingredients=recipe.ingredients||[]; const tags=recipe.tags||[];
  const getItemStatus=(ing)=>{ const m=items.find(i=>i.name.toLowerCase()===ing.toLowerCase()); if(!m) return "unknown"; return itemNeedsReorder(m)?"out":"in"; };
  const statuses=ingredients.map(ing=>getItemStatus(ing));
  const allIn=statuses.every(s=>s==="in"); const someOut=statuses.some(s=>s==="out");
  const sc=allIn?C.green:someOut?C.red:C.yellow; const sb=allIn?C.greenBg:someOut?C.redBg:C.yellowBg; const sbr=allIn?C.greenBorder:someOut?C.redBorder:C.yellowBorder;
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
      <div style={{ padding:"13px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, cursor:"pointer" }} onClick={()=>setExpanded(!expanded)}>
        <div style={{ minWidth:0 }}>
          <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:15, color:C.text }}>🍽️ {recipe.name}</div>
          <div style={{ display:"flex", gap:5, marginTop:4, flexWrap:"wrap", alignItems:"center" }}>
            {recipe.est_time&&<span style={{ fontSize:11, color:C.textMid, fontFamily:"'Nunito',sans-serif" }}>⏱ {recipe.est_time}</span>}
            {tags.map(tag=><span key={tag} style={{ fontSize:10, fontWeight:700, color:C.purple, background:C.purpleBg, border:`1px solid ${C.purpleBorder}`, padding:"1px 7px", borderRadius:20, fontFamily:"'Nunito',sans-serif" }}>{RECIPE_TAG_EMOJI[tag]} {tag}</span>)}
          </div>
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <span style={pillStyle(sc,sb,sbr)}>{allIn?"Ready!":someOut?"Missing":"Untracked"}</span>
          <span style={{ color:C.textLight, fontSize:14 }}>{expanded?"▲":"▼"}</span>
        </div>
      </div>
      {expanded&&(
        <div style={{ borderTop:`1px solid ${C.borderLight}`, padding:"12px 14px", display:"flex", flexDirection:"column", gap:6 }}>
          {recipe.notes&&<div style={{ fontSize:13, color:C.textMid, fontStyle:"italic", fontFamily:"'Nunito',sans-serif", marginBottom:4 }}>{recipe.notes}</div>}
          {ingredients.map((ing,i)=>{ const s=getItemStatus(ing); const ic=s==="in"?C.green:s==="out"?C.red:C.yellow; const ib=s==="in"?C.greenBg:s==="out"?C.redBg:C.yellowBg; const ibr=s==="in"?C.greenBorder:s==="out"?C.redBorder:C.yellowBorder; return (
            <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
              <span style={{ fontSize:14, fontFamily:"'Nunito',sans-serif", color:C.text }}>{ing}</span>
              <span style={pillStyle(ic,ib,ibr)}>{s==="in"?"✓ In stock":s==="out"?"✗ Need to order":"? Not tracked"}</span>
            </div>
          );})}
          <div style={{ display:"flex", gap:8, marginTop:4, justifyContent:"flex-end" }}>
            <button onClick={()=>onEdit(recipe)} style={{ background:C.accentBg, border:`1px solid ${C.accentBorder}`, color:C.accent, borderRadius:8, padding:"4px 12px", fontSize:12, cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontWeight:700 }}>Edit</button>
            <button onClick={()=>onDelete(recipe.id)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textLight, borderRadius:8, padding:"4px 12px", fontSize:12, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- RECIPE MODAL ----
function RecipeModal({ recipe, onSave, onClose, existingItems }) {
  const [name,setName]=useState(recipe?.name||""); const [notes,setNotes]=useState(recipe?.notes||"");
  const [ingredients,setIngredients]=useState(recipe?.ingredients?.length?recipe.ingredients:[""]);
  const [tags,setTags]=useState(recipe?.tags||[]); const [estTime,setEstTime]=useState(recipe?.est_time||"");
  const [saving,setSaving]=useState(false); const isEdit=!!recipe?.id;
  const toggleTag=(tag)=>setTags(p=>p.includes(tag)?p.filter(t=>t!==tag):[...p,tag]);
  const submit=async()=>{ if(!name.trim()) return; const cleaned=ingredients.map(s=>s.trim()).filter(Boolean); if(!cleaned.length) return; setSaving(true); await onSave({id:recipe?.id,name:name.trim(),notes:notes.trim()||null,ingredients:cleaned,tags,est_time:estTime||null}); onClose(); };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(44,40,37,0.4)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:100 }} onClick={(e)=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.surface, borderRadius:"20px 20px 0 0", padding:"24px 20px", width:"100%", maxWidth:480, display:"flex", flexDirection:"column", gap:14, boxShadow:"0 -4px 30px rgba(0,0,0,0.1)", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:20, fontWeight:800, color:C.text }}>{isEdit?"Edit Recipe":"Add Recipe"}</div>
        <input autoFocus value={name} onChange={(e)=>setName(e.target.value)} placeholder="Recipe name..." style={inputStyle}/>
        <input value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Notes (optional)..." style={inputStyle}/>
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:6, fontFamily:"'Nunito',sans-serif" }}>Est. Time</div>
          <select value={estTime} onChange={(e)=>setEstTime(e.target.value)} style={inputStyle}>
            <option value="">Select time...</option>
            {EST_TIMES.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:8, fontFamily:"'Nunito',sans-serif" }}>Tags</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {RECIPE_TAGS.map(tag=>(
              <button key={tag} onClick={()=>toggleTag(tag)} style={{ padding:"6px 12px", borderRadius:20, border:`1px solid ${tags.includes(tag)?C.purpleBorder:C.border}`, background:tags.includes(tag)?C.purpleBg:"transparent", color:tags.includes(tag)?C.purple:C.textMid, fontSize:13, cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontWeight:tags.includes(tag)?800:600 }}>
                {RECIPE_TAG_EMOJI[tag]} {tag}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:8, fontFamily:"'Nunito',sans-serif" }}>Ingredients <span style={{ fontWeight:400, color:C.textLight }}>(match pantry names to check stock)</span></div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {ingredients.map((ing,i)=>(
              <div key={i} style={{ display:"flex", gap:8 }}>
                <input value={ing} onChange={(e)=>setIngredients(p=>p.map((x,idx)=>idx===i?e.target.value:x))} placeholder={`Ingredient ${i+1}...`} style={{ ...inputStyle, flex:1 }} list="item-suggestions"/>
                {ingredients.length>1&&<button onClick={()=>setIngredients(p=>p.filter((_,idx)=>idx!==i))} style={{ ...btnStyle(), flexShrink:0 }}>✕</button>}
              </div>
            ))}
            <datalist id="item-suggestions">{existingItems.map(item=><option key={item.id} value={item.name}/>)}</datalist>
          </div>
          <button onClick={()=>setIngredients(p=>[...p,""])} style={{ marginTop:8, background:C.accentBg, border:`1px solid ${C.accentBorder}`, color:C.accent, borderRadius:8, padding:"6px 14px", fontSize:13, cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontWeight:700 }}>+ Add ingredient</button>
        </div>
        <button onClick={submit} disabled={saving} style={{ background:C.purple, color:"#fff", border:"none", borderRadius:12, padding:"14px", fontSize:15, fontWeight:800, cursor:saving?"wait":"pointer", fontFamily:"'Nunito',sans-serif", opacity:saving?0.7:1 }}>{saving?"Saving...":(isEdit?"Save Changes":"Save Recipe")}</button>
      </div>
    </div>
  );
}

// ---- MEAL SLOT PICKER MODAL ----
function MealSlotModal({ day, meal, recipes, onScheduleRecipe, onEatOut, onClose }) {
  const [mode, setMode] = useState("pick"); // "pick" | "eatout"
  const [restaurant, setRestaurant] = useState("");
  const [search, setSearch] = useState("");

  const filtered = recipes.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  const handleEatOut = () => {
    if (!restaurant.trim()) return;
    onEatOut(restaurant.trim());
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(44,40,37,0.4)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:150 }} onClick={(e)=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.surface, borderRadius:"20px 20px 0 0", width:"100%", maxWidth:480, maxHeight:"85vh", display:"flex", flexDirection:"column", boxShadow:"0 -4px 30px rgba(0,0,0,0.12)" }}>
        <div style={{ padding:"20px 20px 12px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:17, color:C.text, marginBottom:12 }}>{day} — {meal}</div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>setMode("pick")} style={{ flex:1, padding:"9px", borderRadius:10, border:`1px solid ${mode==="pick"?C.purpleBorder:C.border}`, background:mode==="pick"?C.purpleBg:"transparent", color:mode==="pick"?C.purple:C.textMid, fontFamily:"'Nunito',sans-serif", fontWeight:mode==="pick"?800:600, fontSize:13, cursor:"pointer" }}>🍽️ Recipe</button>
            <button onClick={()=>setMode("eatout")} style={{ flex:1, padding:"9px", borderRadius:10, border:`1px solid ${mode==="eatout"?C.tealBorder:C.border}`, background:mode==="eatout"?C.tealBg:"transparent", color:mode==="eatout"?C.teal:C.textMid, fontFamily:"'Nunito',sans-serif", fontWeight:mode==="eatout"?800:600, fontSize:13, cursor:"pointer" }}>🍴 Eat Out</button>
          </div>
        </div>

        {mode==="pick" && (
          <div style={{ display:"flex", flexDirection:"column", flex:1, minHeight:0 }}>
            <div style={{ padding:"12px 16px 8px" }}>
              <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search recipes..." style={inputStyle}/>
            </div>
            <div style={{ overflowY:"auto", padding:"0 16px 24px", display:"flex", flexDirection:"column", gap:8 }}>
              {filtered.length===0
                ? <div style={{ color:C.textLight, textAlign:"center", paddingTop:20, fontFamily:"'Nunito',sans-serif" }}>No recipes found</div>
                : filtered.map(r=>(
                  <div key={r.id} onClick={()=>onScheduleRecipe(r)} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 14px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", gap:10 }}>
                    <div>
                      <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:14, color:C.text }}>{r.name}</div>
                      <div style={{ display:"flex", gap:5, marginTop:3, flexWrap:"wrap" }}>
                        {r.est_time&&<span style={{ fontSize:11, color:C.textMid, fontFamily:"'Nunito',sans-serif" }}>⏱ {r.est_time}</span>}
                        {(r.tags||[]).map(tag=><span key={tag} style={{ fontSize:10, fontWeight:700, color:C.purple, background:C.purpleBg, border:`1px solid ${C.purpleBorder}`, padding:"1px 7px", borderRadius:20, fontFamily:"'Nunito',sans-serif" }}>{tag}</span>)}
                      </div>
                    </div>
                    <span style={{ color:C.textLight, fontSize:18 }}>→</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {mode==="eatout" && (
          <div style={{ padding:"16px 20px 32px", display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:14, color:C.textMid }}>Where are you eating?</div>
            <input autoFocus value={restaurant} onChange={(e)=>setRestaurant(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&handleEatOut()} placeholder="Restaurant name..." style={inputStyle}/>
            <button onClick={handleEatOut} disabled={!restaurant.trim()} style={{ background:C.teal, color:"#fff", border:"none", borderRadius:12, padding:"14px", fontSize:15, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif", opacity:restaurant.trim()?1:0.5 }}>Save Eat Out</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- WEEK SCHEDULE VIEW ----
function WeekSchedule({ mealPlan, recipes, items, onOpenSlot, onRemoveSlot, onAddMissingToShoppingList }) {
  const todayDay = DAYS[new Date().getDay()];

  // Compute all missing ingredients from scheduled recipes this week
  const missingIngredients = [];
  mealPlan.forEach(slot => {
    if (slot.eat_out) return;
    const recipe = recipes.find(r => r.id === slot.recipe_id);
    if (!recipe) return;
    (recipe.ingredients || []).forEach(ing => {
      const item = items.find(i => i.name.toLowerCase() === ing.toLowerCase());
      if (!item || itemNeedsReorder(item)) {
        if (!missingIngredients.find(m => m.toLowerCase() === ing.toLowerCase())) {
          missingIngredients.push(ing);
        }
      }
    });
  });

  const getSlot = (day, meal) => mealPlan.find(s => s.day === day && s.meal === meal);

  const mealColors = { Breakfast: { color:"#b07a2a", bg:"#fdf8ed", border:"#f0dfa0" }, Lunch: { color:"#4a7fb5", bg:"#edf4fb", border:"#bcd4f0" }, Dinner: { color:"#6a5a9e", bg:"#f4f0fb", border:"#ccc0f0" } };

  return (
    <div>
      {missingIngredients.length > 0 && (
        <div style={{ background:C.yellowBg, border:`1px solid ${C.yellowBorder}`, borderRadius:12, padding:"12px 14px", marginBottom:16 }}>
          <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:13, color:C.yellow, marginBottom:6 }}>⚠️ {missingIngredients.length} missing ingredient{missingIngredients.length!==1?"s":""} for this week</div>
          <div style={{ fontSize:12, color:C.textMid, fontFamily:"'Nunito',sans-serif", marginBottom:10 }}>{missingIngredients.join(", ")}</div>
          <button onClick={()=>onAddMissingToShoppingList(missingIngredients)} style={{ background:C.yellow, color:"#fff", border:"none", borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>Add all to Shopping List</button>
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {DAYS.map(day => (
          <div key={day} style={{ background:C.surface, border:`1px solid ${day===todayDay?C.greenBorder:C.border}`, borderRadius:14, overflow:"hidden" }}>
            <div style={{ padding:"10px 14px", background:day===todayDay?C.greenBg:"transparent", borderBottom:`1px solid ${C.borderLight}`, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:14, color:day===todayDay?C.green:C.text }}>{day}</span>
              {day===todayDay&&<span style={pillStyle(C.green,C.greenBg,C.greenBorder)}>Today</span>}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
              {MEALS.map((meal,mi) => {
                const slot = getSlot(day, meal);
                const mc = mealColors[meal];
                return (
                  <div key={meal} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderTop:mi>0?`1px solid ${C.borderLight}`:"none" }}>
                    <span style={{ fontSize:11, fontWeight:700, color:mc.color, background:mc.bg, border:`1px solid ${mc.border}`, padding:"2px 8px", borderRadius:20, minWidth:60, textAlign:"center", fontFamily:"'Nunito',sans-serif" }}>{meal}</span>
                    {slot ? (
                      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                        {slot.eat_out ? (
                          <span style={{ fontFamily:"'Nunito',sans-serif", fontSize:13, color:C.teal, fontWeight:700 }}>🍴 {slot.recipe_name}</span>
                        ) : (
                          <span style={{ fontFamily:"'Nunito',sans-serif", fontSize:13, color:C.text, fontWeight:600 }}>🍽️ {slot.recipe_name}</span>
                        )}
                        <button onClick={()=>onRemoveSlot(slot.id)} style={{ ...btnStyle(true), background:"transparent", border:"none", color:C.textLight }}>✕</button>
                      </div>
                    ) : (
                      <button onClick={()=>onOpenSlot(day, meal)} style={{ flex:1, textAlign:"left", background:"transparent", border:`1px dashed ${C.border}`, borderRadius:8, padding:"6px 12px", fontSize:12, color:C.textLight, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>+ Add</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- ORDER MODAL ----
function OrderModal({ item, onConfirm, onClose }) {
  const [qty,setQty]=useState(1);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(44,40,37,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:"0 20px" }} onClick={(e)=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:"24px 20px", width:"100%", maxWidth:360, display:"flex", flexDirection:"column", gap:16 }}>
        <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:17, color:C.text }}>How many did you order?</div>
        <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:14, color:C.textMid }}>{item.name}</div>
        <div style={{ display:"flex", alignItems:"center", gap:12, justifyContent:"center" }}>
          <button onClick={()=>setQty(Math.max(1,qty-1))} style={btnStyle()}>−</button>
          <span style={{ fontSize:28, fontWeight:800, color:C.text, minWidth:40, textAlign:"center", fontFamily:"'Nunito',sans-serif" }}>{qty}</span>
          <button onClick={()=>setQty(qty+1)} style={btnStyle()}>+</button>
        </div>
        <button onClick={()=>onConfirm(qty)} style={{ background:C.green, color:"#fff", border:"none", borderRadius:12, padding:"13px", fontSize:15, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>Confirm Order</button>
        <button onClick={onClose} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMid, borderRadius:12, padding:"10px", fontSize:14, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>Cancel</button>
      </div>
    </div>
  );
}

// ---- MAIN APP ----
export default function App() {
  const [items,setItems]=useState([]); const [recipes,setRecipes]=useState([]); const [shopping,setShopping]=useState([]);
  const [mealPlan,setMealPlan]=useState([]);
  const [loading,setLoading]=useState(true); const [error,setError]=useState(null);
  const [search,setSearch]=useState(""); const [filterCat,setFilterCat]=useState("All"); const [filterStock,setFilterStock]=useState("all");
  const [showAdd,setShowAdd]=useState(false); const [showAddRecipe,setShowAddRecipe]=useState(false); const [editingRecipe,setEditingRecipe]=useState(null);
  const [orderItem,setOrderItem]=useState(null); const [activeTab,setActiveTab]=useState("home"); const [lastSynced,setLastSynced]=useState(null);
  const [showAddShoppingItem,setShowAddShoppingItem]=useState(false); const [newShoppingName,setNewShoppingName]=useState(""); const [newShoppingCat,setNewShoppingCat]=useState(CATEGORIES[0]);
  const [recipeTagFilter,setRecipeTagFilter]=useState("All");
  const [mealsSubTab,setMealsSubTab]=useState("schedule"); // "schedule" | "recipes"
  const [openSlot,setOpenSlot]=useState(null); // {day, meal}
  const [scanning,setScanning]=useState(false);
  const [scanResults,setScanResults]=useState(null);
  const weekStart = getWeekStart();

  const handleScanPhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      const base64 = dataUrl.split(",")[1];
      const mediaType = file.type || "image/jpeg";
      setScanning(true);
      try {
        const detected = await scanShelf(base64, mediaType);
        setScanResults(detected);
      } catch(err) {
        alert("Scan failed: " + err.message);
      } finally {
        setScanning(false);
        e.target.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const handleScanConfirm = async (confirmedItems) => {
    for (const item of confirmedItems) {
      const existing = items.find(i => i.name.toLowerCase() === item.name.toLowerCase());
      if (existing) {
        await updateItem(existing.id, { has_half: item.has_half, full_count: item.full_count });
      } else {
        await addItem({ name: item.name, category: item.category, has_half: item.has_half, full_count: item.full_count, expires_at: null });
      }
    }
    setScanResults(null);
  };

  const load = useCallback(async () => {
    try {
      setError(null);
      const [itemData,recipeData,shoppingData,mealData] = await Promise.all([
        apiFetch("wdwn_items?order=name.asc"),
        apiFetch("wdwn_recipes?order=name.asc"),
        apiFetch("wdwn_shopping?status=eq.pending&order=name.asc"),
        apiFetch(`wdwn_meal_plan?week_start=eq.${weekStart}&order=id.asc`),
      ]);
      setItems(itemData||[]); setRecipes(recipeData||[]); setShopping(shoppingData||[]); setMealPlan(mealData||[]);
      setLastSynced(new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}));
    } catch(e) { setError("Couldn't load. Check connection."); }
    finally { setLoading(false); }
  },[weekStart]);

  useEffect(()=>{load();},[load]);

  const addItem=async(newItem)=>{ const data=await apiFetch("wdwn_items",{method:"POST",body:JSON.stringify(newItem)}); if(data&&data[0]) setItems(prev=>[...prev,data[0]].sort((a,b)=>a.name.localeCompare(b.name))); };
  const updateItem=async(id,changes)=>{ setItems(prev=>prev.map(i=>i.id===id?{...i,...changes}:i)); await apiFetch(`wdwn_items?id=eq.${id}`,{method:"PATCH",body:JSON.stringify(changes),prefer:"return=minimal"}); };
  const deleteItem=async(id)=>{ setItems(prev=>prev.filter(i=>i.id!==id)); await apiFetch(`wdwn_items?id=eq.${id}`,{method:"DELETE",prefer:"return=minimal"}); };

  const saveRecipe=async(recipe)=>{ const payload={name:recipe.name,notes:recipe.notes,ingredients:recipe.ingredients,tags:recipe.tags,est_time:recipe.est_time}; if(recipe.id){ await apiFetch(`wdwn_recipes?id=eq.${recipe.id}`,{method:"PATCH",body:JSON.stringify(payload)}); setRecipes(prev=>prev.map(r=>r.id===recipe.id?{...r,...payload}:r)); }else{ const data=await apiFetch("wdwn_recipes",{method:"POST",body:JSON.stringify(payload)}); if(data&&data[0]) setRecipes(prev=>[...prev,data[0]].sort((a,b)=>a.name.localeCompare(b.name))); } };
  const deleteRecipe=async(id)=>{ setRecipes(prev=>prev.filter(r=>r.id!==id)); await apiFetch(`wdwn_recipes?id=eq.${id}`,{method:"DELETE",prefer:"return=minimal"}); };

  const scheduleRecipe=async(day,meal,recipe)=>{
    const data=await apiFetch("wdwn_meal_plan",{method:"POST",body:JSON.stringify({day,meal,recipe_id:recipe.id,recipe_name:recipe.name,week_start:weekStart,eat_out:false})});
    if(data&&data[0]) setMealPlan(prev=>[...prev,data[0]]);
    setOpenSlot(null);
  };
  const scheduleEatOut=async(day,meal,restaurant)=>{
    const data=await apiFetch("wdwn_meal_plan",{method:"POST",body:JSON.stringify({day,meal,recipe_id:null,recipe_name:restaurant,week_start:weekStart,eat_out:true})});
    if(data&&data[0]) setMealPlan(prev=>[...prev,data[0]]);
    setOpenSlot(null);
  };
  const removeSlot=async(id)=>{ setMealPlan(prev=>prev.filter(s=>s.id!==id)); await apiFetch(`wdwn_meal_plan?id=eq.${id}`,{method:"DELETE",prefer:"return=minimal"}); };

  const addMissingToShoppingList=async(missingNames)=>{
    const toAdd=missingNames.filter(name=>!shopping.find(s=>s.name.toLowerCase()===name.toLowerCase()));
    for(const name of toAdd){
      const data=await apiFetch("wdwn_shopping",{method:"POST",body:JSON.stringify({name,category:"Other",status:"pending"})});
      if(data&&data[0]) setShopping(prev=>[...prev,data[0]]);
    }
  };

  const addShoppingItem=async()=>{ if(!newShoppingName.trim()) return; const data=await apiFetch("wdwn_shopping",{method:"POST",body:JSON.stringify({name:newShoppingName.trim(),category:newShoppingCat,status:"pending"})}); if(data&&data[0]) setShopping(prev=>[...prev,data[0]]); setNewShoppingName(""); setShowAddShoppingItem(false); };
  const handleOrdered=async(shopItem,qty)=>{ await apiFetch(`wdwn_shopping?id=eq.${shopItem.id}`,{method:"PATCH",body:JSON.stringify({status:"ordered",quantity_ordered:qty}),prefer:"return=minimal"}); setShopping(prev=>prev.filter(s=>s.id!==shopItem.id)); const existing=items.find(i=>i.name.toLowerCase()===shopItem.name.toLowerCase()); if(existing){ await updateItem(existing.id,{full_count:existing.full_count+qty,expires_at:null}); }else{ await addItem({name:shopItem.name,category:shopItem.category,has_half:false,full_count:qty,expires_at:null}); } setOrderItem(null); };
  const handleSkipped=async(id)=>{ await apiFetch(`wdwn_shopping?id=eq.${id}`,{method:"PATCH",body:JSON.stringify({status:"skipped"}),prefer:"return=minimal"}); setShopping(prev=>prev.filter(s=>s.id!==id)); };
  const handleOutOfStock=async(id)=>{ await apiFetch(`wdwn_shopping?id=eq.${id}`,{method:"PATCH",body:JSON.stringify({status:"out_of_stock"}),prefer:"return=minimal"}); setShopping(prev=>prev.filter(s=>s.id!==id)); };
  const removeShoppingItem=async(id)=>{ setShopping(prev=>prev.filter(s=>s.id!==id)); await apiFetch(`wdwn_shopping?id=eq.${id}`,{method:"DELETE",prefer:"return=minimal"}); };

  const needReorder=items.filter(i=>itemNeedsReorder(i));
  const outCount=needReorder.length+shopping.length;
  const filtered=items.filter(item=>{ const ms=item.name.toLowerCase().includes(search.toLowerCase()); const mc=filterCat==="All"||item.category===filterCat; const mst=filterStock==="all"||(filterStock==="out"&&itemNeedsReorder(item))||(filterStock==="in"&&!itemNeedsReorder(item)); return ms&&mc&&mst; });
  const grouped=CATEGORIES.reduce((acc,cat)=>{ const ci=filtered.filter(i=>i.category===cat); if(ci.length) acc[cat]=ci; return acc; },{});
  const fabDefaultCat=filterCat!=="All"?filterCat:CATEGORIES[0];
  const filteredRecipes=recipeTagFilter==="All"?recipes:recipes.filter(r=>(r.tags||[]).includes(recipeTagFilter));

  const tabStyle=(tab)=>({ flex:1, padding:"10px 0", border:"none", background:"transparent", color:activeTab===tab?C.green:C.textLight, fontSize:10, fontWeight:activeTab===tab?800:600, cursor:"pointer", fontFamily:"'Nunito',sans-serif", display:"flex", flexDirection:"column", alignItems:"center", gap:2, borderTop:`2px solid ${activeTab===tab?C.green:"transparent"}` });
  const subTabStyle=(t)=>({ flex:1, padding:"8px", border:"none", background:mealsSubTab===t?C.green:"transparent", color:mealsSubTab===t?"#fff":C.textMid, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif", borderRadius:8 });

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'Nunito',sans-serif", color:C.text, paddingBottom:80 }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <div style={{ padding:"18px 16px 12px", borderBottom:`1px solid ${C.borderLight}`, position:"sticky", top:0, background:C.bg, zIndex:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:22, color:C.text, letterSpacing:"-0.3px" }}>What Do We Need? 🛒</div>
            <div style={{ fontSize:11, color:C.textLight, marginTop:1 }}>{lastSynced?`Last synced ${lastSynced}`:"Syncing..."}{outCount>0&&<span style={{ color:C.red, marginLeft:8, fontWeight:700 }}>{outCount} need reorder</span>}</div>
          </div>
          <button onClick={load} style={{ background:C.surface, border:`1px solid ${C.border}`, color:C.textMid, borderRadius:8, padding:"6px 12px", fontSize:12, cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontWeight:700 }}>↻</button>
        </div>
      </div>

      <div style={{ padding:"16px 16px 0" }}>
        {error&&<div style={{ color:C.red, background:C.redBg, border:`1px solid ${C.redBorder}`, borderRadius:10, padding:"10px 14px", marginBottom:12, fontSize:13 }}>{error}</div>}

        {activeTab==="home"&&(loading?<div style={{ color:C.textLight, textAlign:"center", paddingTop:40 }}>Loading...</div>:<Dashboard items={items} onNavigate={(tab,cat)=>{setActiveTab(tab);setFilterCat(cat);}} onUpdate={updateItem} onDelete={deleteItem}/>)}

        {activeTab==="pantry"&&(
          <>
            {/* Scan banner */}
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="🔍  Search items..." style={{ ...inputStyle, flex:1, marginBottom:0 }}/>
              <label style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, background:scanning?C.btnBg:C.accentBg, border:`1px solid ${C.accentBorder}`, color:C.accent, borderRadius:10, padding:"0 14px", fontSize:13, fontWeight:800, cursor:scanning?"wait":"pointer", fontFamily:"'Nunito',sans-serif", whiteSpace:"nowrap", flexShrink:0 }}>
                {scanning ? "⏳ Scanning..." : "📸 Scan"}
                {!scanning && <input type="file" accept="image/*" capture="environment" onChange={handleScanPhoto} style={{ display:"none" }}/>}
              </label>
            </div>
            <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:6, marginBottom:12 }}>
              {["All",...CATEGORIES].map(c=>(
                <button key={c} onClick={()=>setFilterCat(c)} style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${filterCat===c?C.accentBorder:C.border}`, background:filterCat===c?C.accentBg:"transparent", color:filterCat===c?C.accent:C.textMid, fontSize:12, cursor:"pointer", whiteSpace:"nowrap", fontFamily:"'Nunito',sans-serif", fontWeight:filterCat===c?800:600 }}>
                  {c==="All"?"All":`${CAT_EMOJI[c]} ${c}`}
                </button>
              ))}
              <button onClick={()=>setFilterStock(filterStock==="out"?"all":"out")} style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${filterStock==="out"?C.redBorder:C.border}`, background:filterStock==="out"?C.redBg:"transparent", color:filterStock==="out"?C.red:C.textMid, fontSize:12, cursor:"pointer", whiteSpace:"nowrap", fontFamily:"'Nunito',sans-serif", fontWeight:filterStock==="out"?800:600 }}>🚨 Need reorder</button>
            </div>
            {loading?<div style={{ color:C.textLight, textAlign:"center", paddingTop:40 }}>Loading...</div>
            :filtered.length===0?<div style={{ color:C.textLight, textAlign:"center", paddingTop:40 }}>{search?`Nothing found for "${search}"`:"No items yet — tap + to add one!"}</div>
            :Object.entries(grouped).map(([cat,catItems])=>(
              <div key={cat} style={{ marginBottom:22 }}>
                <div style={{ fontSize:12, fontWeight:800, color:C.textMid, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8, fontFamily:"'Nunito',sans-serif" }}>{CAT_EMOJI[cat]} {cat}</div>
                <div style={{ display:"flex", flexDirection:"column", gap:7 }}>{catItems.map(item=><ItemCard key={item.id} item={item} onUpdate={updateItem} onDelete={deleteItem}/>)}</div>
              </div>
            ))}
          </>
        )}

        {activeTab==="need"&&(
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:17, color:C.text }}>Shopping List 🛒</div>
              <button onClick={()=>setShowAddShoppingItem(true)} style={{ background:C.accentBg, border:`1px solid ${C.accentBorder}`, color:C.accent, borderRadius:8, padding:"6px 14px", fontSize:13, cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontWeight:800 }}>+ Add</button>
            </div>
            {showAddShoppingItem&&(
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px", marginBottom:14, display:"flex", flexDirection:"column", gap:10 }}>
                <input autoFocus value={newShoppingName} onChange={(e)=>setNewShoppingName(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&addShoppingItem()} placeholder="Item name..." style={inputStyle} list="pantry-suggestions"/>
                <datalist id="pantry-suggestions">{items.map(i=><option key={i.id} value={i.name}/>)}</datalist>
                <select value={newShoppingCat} onChange={(e)=>setNewShoppingCat(e.target.value)} style={inputStyle}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={addShoppingItem} style={{ flex:1, background:C.green, color:"#fff", border:"none", borderRadius:10, padding:"10px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>Add to List</button>
                  <button onClick={()=>{setShowAddShoppingItem(false);setNewShoppingName("");}} style={{ background:C.btnBg, border:`1px solid ${C.btnBorder}`, color:C.textMid, borderRadius:10, padding:"10px 14px", fontSize:14, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>Cancel</button>
                </div>
              </div>
            )}
            {needReorder.length>0&&(
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.textLight, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8, fontFamily:"'Nunito',sans-serif" }}>Out of Stock / Expired</div>
                <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                  {needReorder.map(item=>{ const exp=isExpired(item.expires_at); return (
                    <div key={item.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 14px" }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:8 }}>
                        <span style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:15, color:C.text }}>{item.name}</span>
                        <span style={pillStyle(exp?C.orange:C.red,exp?C.orangeBg:C.redBg,exp?C.orangeBorder:C.redBorder)}>{exp?"Expired":"Out of stock"}</span>
                      </div>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={()=>setOrderItem(item)} style={{ flex:1, background:C.greenBg, border:`1px solid ${C.greenBorder}`, color:C.green, borderRadius:8, padding:"6px 0", fontSize:12, cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontWeight:800 }}>✓ Ordered</button>
                        <button onClick={()=>handleSkipped(item.id)} style={{ flex:1, background:C.btnBg, border:`1px solid ${C.btnBorder}`, color:C.textMid, borderRadius:8, padding:"6px 0", fontSize:12, cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontWeight:700 }}>Skip</button>
                        <button onClick={()=>handleOutOfStock(item.id)} style={{ flex:1, background:C.redBg, border:`1px solid ${C.redBorder}`, color:C.red, borderRadius:8, padding:"6px 0", fontSize:12, cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontWeight:700 }}>Store OOS</button>
                      </div>
                    </div>
                  );})}
                </div>
              </div>
            )}
            {shopping.length>0&&(
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.textLight, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8, fontFamily:"'Nunito',sans-serif" }}>Added to List</div>
                <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                  {shopping.map(s=>(
                    <div key={s.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 14px" }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:8 }}>
                        <span style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:15, color:C.text }}>{s.name}</span>
                        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                          <span style={{ fontSize:11, color:C.textLight, fontFamily:"'Nunito',sans-serif" }}>{s.category}</span>
                          <button onClick={()=>removeShoppingItem(s.id)} style={{ ...btnStyle(true), color:C.textLight }}>✕</button>
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={()=>setOrderItem(s)} style={{ flex:1, background:C.greenBg, border:`1px solid ${C.greenBorder}`, color:C.green, borderRadius:8, padding:"6px 0", fontSize:12, cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontWeight:800 }}>✓ Ordered</button>
                        <button onClick={()=>handleSkipped(s.id)} style={{ flex:1, background:C.btnBg, border:`1px solid ${C.btnBorder}`, color:C.textMid, borderRadius:8, padding:"6px 0", fontSize:12, cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontWeight:700 }}>Skip</button>
                        <button onClick={()=>handleOutOfStock(s.id)} style={{ flex:1, background:C.redBg, border:`1px solid ${C.redBorder}`, color:C.red, borderRadius:8, padding:"6px 0", fontSize:12, cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontWeight:700 }}>Store OOS</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {needReorder.length===0&&shopping.length===0&&<div style={{ color:C.textLight, textAlign:"center", paddingTop:40, fontFamily:"'Nunito',sans-serif" }}>You're all stocked up! 🎉</div>}
          </>
        )}

        {activeTab==="meals"&&(
          <>
            {/* Sub-tab toggle */}
            <div style={{ display:"flex", gap:6, background:C.btnBg, borderRadius:12, padding:4, marginBottom:16 }}>
              <button style={subTabStyle("schedule")} onClick={()=>setMealsSubTab("schedule")}>📅 This Week</button>
              <button style={subTabStyle("recipes")} onClick={()=>setMealsSubTab("recipes")}>📖 Recipes</button>
            </div>

            {mealsSubTab==="schedule"&&(
              loading?<div style={{ color:C.textLight, textAlign:"center", paddingTop:40 }}>Loading...</div>
              :<WeekSchedule mealPlan={mealPlan} recipes={recipes} items={items} onOpenSlot={(day,meal)=>setOpenSlot({day,meal})} onRemoveSlot={removeSlot} onAddMissingToShoppingList={addMissingToShoppingList}/>
            )}

            {mealsSubTab==="recipes"&&(
              <>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:17, color:C.text }}>Recipes</div>
                  <button onClick={()=>setShowAddRecipe(true)} style={{ background:C.purpleBg, border:`1px solid ${C.purpleBorder}`, color:C.purple, borderRadius:8, padding:"6px 14px", fontSize:13, cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontWeight:800 }}>+ Add</button>
                </div>
                <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:6, marginBottom:14 }}>
                  {["All",...RECIPE_TAGS].map(tag=>(
                    <button key={tag} onClick={()=>setRecipeTagFilter(tag)} style={{ padding:"5px 12px", borderRadius:20, border:`1px solid ${recipeTagFilter===tag?C.purpleBorder:C.border}`, background:recipeTagFilter===tag?C.purpleBg:"transparent", color:recipeTagFilter===tag?C.purple:C.textMid, fontSize:12, cursor:"pointer", whiteSpace:"nowrap", fontFamily:"'Nunito',sans-serif", fontWeight:recipeTagFilter===tag?800:600 }}>
                      {tag==="All"?"All":` ${RECIPE_TAG_EMOJI[tag]} ${tag}`}
                    </button>
                  ))}
                </div>
                {recipeTagFilter==="All"?(
                  <>
                    {RECIPE_TAGS.map(tag=>{ const tagRecipes=recipes.filter(r=>(r.tags||[]).includes(tag)); if(!tagRecipes.length) return null; return (
                      <div key={tag} style={{ marginBottom:22 }}>
                        <div style={{ fontSize:12, fontWeight:800, color:C.textMid, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8, fontFamily:"'Nunito',sans-serif" }}>{RECIPE_TAG_EMOJI[tag]} {tag}</div>
                        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>{tagRecipes.map(r=><RecipeCard key={r.id} recipe={r} items={items} onDelete={deleteRecipe} onEdit={r=>setEditingRecipe(r)}/>)}</div>
                      </div>
                    );})}
                    {recipes.filter(r=>!(r.tags||[]).length).length>0&&(
                      <div style={{ marginBottom:22 }}>
                        <div style={{ fontSize:12, fontWeight:800, color:C.textMid, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8, fontFamily:"'Nunito',sans-serif" }}>📋 Uncategorized</div>
                        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>{recipes.filter(r=>!(r.tags||[]).length).map(r=><RecipeCard key={r.id} recipe={r} items={items} onDelete={deleteRecipe} onEdit={r=>setEditingRecipe(r)}/>)}</div>
                      </div>
                    )}
                    {recipes.length===0&&<div style={{ color:C.textLight, textAlign:"center", paddingTop:40, fontFamily:"'Nunito',sans-serif" }}>No recipes yet!</div>}
                  </>
                ):(
                  filteredRecipes.length===0
                    ?<div style={{ color:C.textLight, textAlign:"center", paddingTop:30, fontFamily:"'Nunito',sans-serif" }}>No {recipeTagFilter} recipes yet.</div>
                    :<div style={{ display:"flex", flexDirection:"column", gap:8 }}>{filteredRecipes.map(r=><RecipeCard key={r.id} recipe={r} items={items} onDelete={deleteRecipe} onEdit={r=>setEditingRecipe(r)}/>)}</div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {activeTab==="pantry"&&(
        <button onClick={()=>setShowAdd(true)} style={{ position:"fixed", bottom:72, right:18, width:52, height:52, borderRadius:"50%", background:C.green, border:"none", color:"#fff", fontSize:26, cursor:"pointer", boxShadow:"0 4px 16px rgba(90,158,117,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 }}>+</button>
      )}

      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:C.surface, borderTop:`1px solid ${C.border}`, display:"flex", zIndex:20 }}>
        <button style={tabStyle("home")} onClick={()=>setActiveTab("home")}><span style={{ fontSize:18 }}>🏠</span><span>Home</span></button>
        <button style={tabStyle("pantry")} onClick={()=>setActiveTab("pantry")}><span style={{ fontSize:18 }}>🍏</span><span>Pantry</span></button>
        <button style={tabStyle("need")} onClick={()=>setActiveTab("need")}><span style={{ fontSize:18 }}>🛒</span><span>Need {outCount>0?`(${outCount})`:""}</span></button>
        <button style={tabStyle("meals")} onClick={()=>setActiveTab("meals")}><span style={{ fontSize:18 }}>🍽️</span><span>Meals</span></button>
      </div>

      {showAdd&&<AddItemModal onAdd={addItem} onClose={()=>setShowAdd(false)} defaultCategory={fabDefaultCat}/>}
      {(showAddRecipe||editingRecipe)&&<RecipeModal recipe={editingRecipe} onSave={saveRecipe} onClose={()=>{setShowAddRecipe(false);setEditingRecipe(null);}} existingItems={items}/>}
      {orderItem&&<OrderModal item={orderItem} onConfirm={(qty)=>handleOrdered(orderItem,qty)} onClose={()=>setOrderItem(null)}/>}
      {openSlot&&<MealSlotModal day={openSlot.day} meal={openSlot.meal} recipes={recipes} onScheduleRecipe={(r)=>scheduleRecipe(openSlot.day,openSlot.meal,r)} onEatOut={(rest)=>scheduleEatOut(openSlot.day,openSlot.meal,rest)} onClose={()=>setOpenSlot(null)}/>}
      {scanResults&&<ScanConfirmModal detectedItems={scanResults} existingItems={items} onConfirm={handleScanConfirm} onClose={()=>setScanResults(null)}/>}
    </div>
  );
}
