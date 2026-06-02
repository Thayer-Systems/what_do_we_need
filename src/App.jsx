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

// ---- DESIGN TOKENS ----
const C = {
  // Backgrounds
  bg: "#f7f4ef",           // warm parchment
  surface: "#ffffff",
  surfaceWarm: "#fdfcfa",  // cards
  raised: "#ffffff",       // elevated modals

  // Borders
  border: "#e8e2d9",
  borderLight: "#f0ece5",

  // Text
  text: "#1e1a16",
  textMid: "#6b6258",
  textLight: "#a89d93",
  textInverse: "#ffffff",

  // Brand green (fresh, grocery)
  green: "#3d8c5c",
  greenLight: "#52a872",
  greenBg: "#edf7f2",
  greenBorder: "#b8ddc9",
  greenText: "#2a6342",

  // Alert colors
  red: "#c04a38",
  redBg: "#fdf1ee",
  redBorder: "#e8b8b0",

  yellow: "#c47e1a",
  yellowBg: "#fdf6e8",
  yellowBorder: "#ecd49a",

  orange: "#b85c2a",
  orangeBg: "#fdf2eb",
  orangeBorder: "#e8c0a0",

  // Accents
  accent: "#5b82b8",
  accentBg: "#eef3fa",
  accentBorder: "#bdd0ec",

  purple: "#7a5baa",
  purpleBg: "#f3eefc",
  purpleBorder: "#c8b8e8",

  teal: "#3a8c7e",
  tealBg: "#ecf7f5",
  tealBorder: "#a8d8d0",

  // Shadows
  shadow: "0 1px 3px rgba(30,26,22,0.07), 0 4px 12px rgba(30,26,22,0.06)",
  shadowSm: "0 1px 2px rgba(30,26,22,0.06), 0 2px 6px rgba(30,26,22,0.05)",
  shadowLg: "0 4px 16px rgba(30,26,22,0.10), 0 12px 32px rgba(30,26,22,0.08)",
};

const F = {
  sans: "'Plus Jakarta Sans', 'Nunito', sans-serif",
  display: "'Fraunces', 'DM Serif Display', Georgia, serif",
};

const todayStr = () => new Date().toISOString().split("T")[0];
const isExpired = (e) => e ? e < todayStr() : false;
const isExpiringSoon = (e) => { if(!e) return false; const d=new Date(); d.setDate(d.getDate()+7); return e>=todayStr()&&e<=d.toISOString().split("T")[0]; };
const itemNeedsReorder = (i) => (!i.has_half && i.full_count===0) || isExpired(i.expires_at);

function getWeekStart() {
  const d = new Date(); d.setDate(d.getDate() - d.getDay());
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
    headers: { "x-api-key":ANTHROPIC_KEY, "anthropic-version":"2023-06-01", "anthropic-dangerous-direct-browser-access":"true", "Content-Type":"application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5", max_tokens: 1024,
      messages: [{ role:"user", content: [
        { type:"image", source:{ type:"base64", media_type:mediaType, data:base64Image } },
        { type:"text", text:`Analyze this image of a fridge, freezer, or pantry shelf. List every food or household item you can identify.\n\nFor each item return:\n- name: common grocery name\n- level: one of "full", "half", or "low"\n- category: one of: Fridge, Freezer, Pantry, Lazy Susan, Kids, Dogs, Cleaning, Bathroom, Medicine, Coffee, Other\n\nReturn ONLY a JSON array. Example:\n[{"name":"Milk","level":"half","category":"Fridge"}]\n\nIf no items visible return: []` }
      ]}]
    })
  });
  if (!res.ok) throw new Error("Vision API error");
  const data = await res.json();
  return JSON.parse(data.content[0].text.trim().replace(/```json|```/g,"").trim());
}

// ---- SHARED STYLES ----
const inputBase = {
  background: C.surface, border:`1px solid ${C.border}`, borderRadius:12,
  padding:"11px 14px", color:C.text, fontSize:15, fontFamily:F.sans,
  width:"100%", boxSizing:"border-box", outline:"none",
  boxShadow: "inset 0 1px 2px rgba(30,26,22,0.04)",
};

const chip = (active, color=C.accent, bg=C.accentBg, border=C.accentBorder) => ({
  padding:"5px 13px", borderRadius:20,
  border:`1.5px solid ${active ? border : C.border}`,
  background: active ? bg : "transparent",
  color: active ? color : C.textMid,
  fontSize:12, cursor:"pointer", whiteSpace:"nowrap",
  fontFamily:F.sans, fontWeight: active ? 700 : 500,
  transition:"all 0.15s ease",
});

const actionBtn = (color, bg, border) => ({
  flex:1, background:bg, border:`1.5px solid ${border}`, color,
  borderRadius:10, padding:"8px 0", fontSize:12,
  cursor:"pointer", fontFamily:F.sans, fontWeight:700,
});

// Stock level indicator bar
function StockBar({ has_half, full_count, expired }) {
  const pct = expired ? 0 : has_half ? (full_count > 0 ? 100 : 45) : full_count === 0 ? 0 : Math.min(100, full_count * 25 + 50);
  const color = expired ? C.orange : pct === 0 ? C.red : pct < 50 ? C.yellow : C.green;
  return (
    <div style={{ height:3, background:C.borderLight, borderRadius:4, overflow:"hidden", marginTop:6 }}>
      <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:4, transition:"width 0.3s ease" }}/>
    </div>
  );
}

// ---- ITEM CARD ----
function ItemCard({ item, onUpdate, onDelete }) {
  const { name, has_half, full_count, expires_at, category } = item;
  const expired=isExpired(expires_at); const expiringSoon=isExpiringSoon(expires_at);
  const outOfStock=!has_half&&full_count===0; const runningLow=!has_half&&full_count===1&&!expired;
  const formatDate=(d)=>{ if(!d) return null; const [y,m,day]=d.split("-"); return `${m}/${day}/${y.slice(2)}`; };

  const statusLabel = expired?"Expired":outOfStock?"Out of stock":runningLow?"Running low":has_half&&full_count===0?"Opened only":`${has_half?"½ + ":""}${full_count} ${full_count===1?"unit":"units"}`;
  const statusColor = expired?C.orange:outOfStock?C.red:runningLow?C.yellow:C.green;

  return (
    <div style={{
      background: C.surface,
      border:`1px solid ${expired?C.orangeBorder:outOfStock?C.redBorder:C.border}`,
      borderRadius:14, padding:"14px 16px",
      boxShadow: C.shadowSm,
      display:"flex", flexDirection:"column", gap:10,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
        <div style={{ minWidth:0 }}>
          <div style={{ fontFamily:F.sans, fontWeight:700, fontSize:16, color:expired?C.orange:outOfStock?C.red:C.text, letterSpacing:"-0.2px" }}>{name}</div>
          <div style={{ display:"flex", gap:8, marginTop:3, alignItems:"center" }}>
            <span style={{ fontSize:11, color:C.textLight, fontFamily:F.sans }}>{CAT_EMOJI[category]} {category}</span>
            {expires_at && <span style={{ fontSize:11, color:expired?C.orange:expiringSoon?C.yellow:C.textLight, fontWeight:expired||expiringSoon?700:400, fontFamily:F.sans }}>{expired?"⚠️ Exp ":expiringSoon?"⏰ Exp ":""}{formatDate(expires_at)}</span>}
          </div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2 }}>
          <span style={{ fontSize:12, fontWeight:700, color:statusColor, fontFamily:F.sans, whiteSpace:"nowrap" }}>{statusLabel}</span>
          <StockBar has_half={has_half} full_count={full_count} expired={expired}/>
        </div>
      </div>

      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <button onClick={()=>onUpdate(item.id,{has_half:!has_half})} style={{
          padding:"5px 13px", borderRadius:8,
          border:`1.5px solid ${has_half?C.greenBorder:C.border}`,
          background:has_half?C.greenBg:"transparent",
          color:has_half?C.greenText:C.textMid,
          fontSize:12, cursor:"pointer", fontFamily:F.sans, fontWeight:has_half?700:500,
        }}>Opened</button>

        <div style={{ display:"flex", alignItems:"center", gap:8, background:C.surfaceWarm, border:`1px solid ${C.border}`, borderRadius:10, padding:"4px 10px" }}>
          <button onClick={()=>onUpdate(item.id,{full_count:Math.max(0,full_count-1)})} style={{ width:22, height:22, border:"none", background:"transparent", color:C.textMid, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:F.sans, fontWeight:700, flexShrink:0 }}>−</button>
          <span style={{ fontSize:15, fontWeight:700, color:C.text, minWidth:16, textAlign:"center", fontFamily:F.sans }}>{full_count}</span>
          <button onClick={()=>onUpdate(item.id,{full_count:full_count+1})} style={{ width:22, height:22, border:"none", background:"transparent", color:C.textMid, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:F.sans, fontWeight:700, flexShrink:0 }}>+</button>
          <span style={{ fontSize:11, color:C.textLight, fontFamily:F.sans }}>new</span>
        </div>

        <button onClick={()=>onDelete(item.id)} style={{ marginLeft:"auto", width:28, height:28, border:`1px solid ${C.border}`, background:"transparent", color:C.textLight, borderRadius:8, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
      </div>
    </div>
  );
}

// ---- ITEM LIST MODAL ----
function ItemListModal({ title, items, onUpdate, onDelete, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(30,26,22,0.45)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:100 }} onClick={(e)=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.bg, borderRadius:"22px 22px 0 0", width:"100%", maxWidth:480, maxHeight:"80vh", display:"flex", flexDirection:"column", boxShadow:C.shadowLg }}>
        <div style={{ padding:"20px 20px 14px", borderBottom:`1px solid ${C.borderLight}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontFamily:F.display, fontSize:20, fontWeight:700, color:C.text }}>{title}</span>
          <button onClick={onClose} style={{ width:30, height:30, border:`1px solid ${C.border}`, background:C.surface, color:C.textMid, borderRadius:8, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>
        <div style={{ overflowY:"auto", padding:"14px 16px 28px", display:"flex", flexDirection:"column", gap:8 }}>
          {items.length===0
            ? <div style={{ color:C.textLight, textAlign:"center", paddingTop:30, fontFamily:F.sans }}>Nothing here!</div>
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
  const catData=CATEGORIES.map(cat=>({ cat, count:items.filter(i=>i.category===cat).length, out:items.filter(i=>i.category===cat&&itemNeedsReorder(i)).length }));

  return (
    <div>
      {/* Stat row */}
      <div style={{ display:"flex", gap:10, marginBottom:22 }}>
        {[
          { label:"Total", value:total, color:C.text, valueBg:C.surface, drill:{title:"All Items",items} },
          { label:"Out of stock", value:outOfStock.length, color:outOfStock.length>0?C.red:C.textLight, valueBg:outOfStock.length>0?C.redBg:C.surface, drill:{title:"Out of Stock",items:outOfStock} },
          { label:"Expired", value:expired.length, color:expired.length>0?C.orange:C.textLight, valueBg:expired.length>0?C.orangeBg:C.surface, drill:{title:"Expired Items",items:expired} },
        ].map(({label,value,color,valueBg,drill})=>(
          <div key={label} onClick={()=>setDrillDown(drill)} style={{ flex:1, background:valueBg, border:`1px solid ${C.border}`, borderRadius:16, padding:"14px 12px", cursor:"pointer", boxShadow:C.shadowSm, textAlign:"center" }}>
            <div style={{ fontSize:26, fontWeight:800, color, fontFamily:F.sans, lineHeight:1 }}>{value}</div>
            <div style={{ fontSize:11, color:C.textLight, marginTop:4, fontFamily:F.sans, lineHeight:1.2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Category grid */}
      <div style={{ fontSize:11, fontWeight:700, color:C.textLight, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12, fontFamily:F.sans }}>Categories</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10 }}>
        {catData.map(({cat,count,out})=>(
          <div key={cat} onClick={()=>onNavigate("pantry",cat)} style={{
            background: out>0 ? C.redBg : C.surface,
            border:`1px solid ${out>0?C.redBorder:C.border}`,
            borderRadius:16, padding:"14px 8px",
            display:"flex", flexDirection:"column", alignItems:"center", gap:5,
            cursor:"pointer", boxShadow:C.shadowSm,
            transition:"transform 0.1s ease",
          }}>
            <span style={{ fontSize:24 }}>{CAT_EMOJI[cat]}</span>
            <span style={{ fontSize:11, fontWeight:700, color:C.text, fontFamily:F.sans, textAlign:"center", lineHeight:1.2 }}>{cat}</span>
            <span style={{ fontSize:13, fontWeight:800, color:count>0?C.textMid:C.textLight, fontFamily:F.sans }}>{count}</span>
            {out>0 && <span style={{ fontSize:10, fontWeight:700, color:C.red, fontFamily:F.sans, background:C.redBg, padding:"1px 7px", borderRadius:10, border:`1px solid ${C.redBorder}` }}>{out} low</span>}
          </div>
        ))}
      </div>
      {drillDown&&<ItemListModal title={drillDown.title} items={drillDown.items} onUpdate={onUpdate} onDelete={onDelete} onClose={()=>setDrillDown(null)}/>}
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
    <div style={{ position:"fixed", inset:0, background:"rgba(30,26,22,0.45)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:100 }} onClick={(e)=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.surface, borderRadius:"22px 22px 0 0", padding:"24px 20px 36px", width:"100%", maxWidth:480, display:"flex", flexDirection:"column", gap:14, boxShadow:C.shadowLg }}>
        <div style={{ fontFamily:F.display, fontSize:22, fontWeight:700, color:C.text, marginBottom:2 }}>Add Item</div>
        <input autoFocus value={name} onChange={(e)=>setName(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&submit()} placeholder="Item name..." style={inputBase}/>
        <select value={category} onChange={(e)=>setCategory(e.target.value)} style={inputBase}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
          <label style={{ display:"flex", alignItems:"center", gap:8, color:C.textMid, fontSize:14, cursor:"pointer", fontFamily:F.sans }}>
            <input type="checkbox" checked={hasOpened} onChange={(e)=>setHasOpened(e.target.checked)} style={{ width:16, height:16, accentColor:C.green }}/>
            Have an opened one
          </label>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:"auto" }}>
            <span style={{ color:C.textMid, fontSize:13, fontFamily:F.sans }}>New:</span>
            <button onClick={()=>setNewCount(Math.max(0,newCount-1))} style={{ width:30, height:30, border:`1px solid ${C.border}`, background:C.surfaceWarm, color:C.textMid, borderRadius:8, fontSize:17, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:F.sans, fontWeight:700 }}>−</button>
            <span style={{ fontSize:16, fontWeight:800, minWidth:20, textAlign:"center", fontFamily:F.sans, color:C.text }}>{newCount}</span>
            <button onClick={()=>setNewCount(newCount+1)} style={{ width:30, height:30, border:`1px solid ${C.border}`, background:C.surfaceWarm, color:C.textMid, borderRadius:8, fontSize:17, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:F.sans, fontWeight:700 }}>+</button>
          </div>
        </div>
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:C.textMid, marginBottom:6, fontFamily:F.sans }}>Expiration date <span style={{ fontWeight:400, color:C.textLight }}>(optional)</span></div>
          <input type="date" value={expiresAt} onChange={(e)=>setExpiresAt(e.target.value)} style={inputBase}/>
        </div>
        <button onClick={submit} disabled={saving} style={{ background:C.green, color:"#fff", border:"none", borderRadius:14, padding:"15px", fontSize:15, fontWeight:700, cursor:saving?"wait":"pointer", fontFamily:F.sans, opacity:saving?0.7:1, boxShadow:"0 2px 8px rgba(61,140,92,0.35)", marginTop:2 }}>{saving?"Adding...":"Add to Pantry"}</button>
      </div>
    </div>
  );
}

// ---- RECIPE CARD ----
function RecipeCard({ recipe, items, onDelete, onEdit }) {
  const [expanded,setExpanded]=useState(false);
  const ingredients=recipe.ingredients||[]; const tags=recipe.tags||[];
  const getStatus=(ing)=>{ const m=items.find(i=>i.name.toLowerCase()===ing.toLowerCase()); if(!m) return "unknown"; return itemNeedsReorder(m)?"out":"in"; };
  const statuses=ingredients.map(ing=>getStatus(ing));
  const allIn=statuses.every(s=>s==="in"); const someOut=statuses.some(s=>s==="out");
  const sc=allIn?C.green:someOut?C.red:C.yellow;

  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden", boxShadow:C.shadowSm }}>
      <div style={{ padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, cursor:"pointer" }} onClick={()=>setExpanded(!expanded)}>
        <div style={{ minWidth:0 }}>
          <div style={{ fontFamily:F.sans, fontWeight:700, fontSize:15, color:C.text, marginBottom:5 }}>{recipe.name}</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
            {recipe.est_time&&<span style={{ fontSize:11, color:C.textMid, fontFamily:F.sans, background:C.surfaceWarm, border:`1px solid ${C.border}`, padding:"1px 8px", borderRadius:20 }}>⏱ {recipe.est_time}</span>}
            {tags.map(tag=><span key={tag} style={{ fontSize:10, fontWeight:700, color:C.purple, background:C.purpleBg, border:`1px solid ${C.purpleBorder}`, padding:"1px 8px", borderRadius:20, fontFamily:F.sans }}>{RECIPE_TAG_EMOJI[tag]} {tag}</span>)}
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
          <div style={{ width:10, height:10, borderRadius:"50%", background:sc, flexShrink:0 }}/>
          <span style={{ color:C.textLight, fontSize:13 }}>{expanded?"▲":"▼"}</span>
        </div>
      </div>
      {expanded&&(
        <div style={{ borderTop:`1px solid ${C.borderLight}`, padding:"14px 16px", display:"flex", flexDirection:"column", gap:8, background:C.surfaceWarm }}>
          {recipe.notes&&<div style={{ fontSize:13, color:C.textMid, fontStyle:"italic", fontFamily:F.sans, paddingBottom:4 }}>{recipe.notes}</div>}
          {ingredients.map((ing,i)=>{ const s=getStatus(ing); const ic=s==="in"?C.green:s==="out"?C.red:C.yellow; return (
            <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
              <span style={{ fontSize:14, fontFamily:F.sans, color:C.text }}>{ing}</span>
              <span style={{ fontSize:11, fontWeight:700, color:ic, fontFamily:F.sans }}>{s==="in"?"✓ In stock":s==="out"?"✗ Need to order":"? Untracked"}</span>
            </div>
          );})}
          <div style={{ display:"flex", gap:8, marginTop:4, justifyContent:"flex-end" }}>
            <button onClick={()=>onEdit(recipe)} style={{ background:C.accentBg, border:`1px solid ${C.accentBorder}`, color:C.accent, borderRadius:8, padding:"5px 14px", fontSize:12, cursor:"pointer", fontFamily:F.sans, fontWeight:700 }}>Edit</button>
            <button onClick={()=>onDelete(recipe.id)} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textLight, borderRadius:8, padding:"5px 14px", fontSize:12, cursor:"pointer", fontFamily:F.sans }}>Delete</button>
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
    <div style={{ position:"fixed", inset:0, background:"rgba(30,26,22,0.45)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:100 }} onClick={(e)=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.surface, borderRadius:"22px 22px 0 0", padding:"24px 20px 36px", width:"100%", maxWidth:480, display:"flex", flexDirection:"column", gap:14, boxShadow:C.shadowLg, maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ fontFamily:F.display, fontSize:22, fontWeight:700, color:C.text }}>{isEdit?"Edit Recipe":"New Recipe"}</div>
        <input autoFocus value={name} onChange={(e)=>setName(e.target.value)} placeholder="Recipe name..." style={inputBase}/>
        <input value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Notes (optional)..." style={inputBase}/>
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:C.textMid, marginBottom:6, fontFamily:F.sans }}>Est. Time</div>
          <select value={estTime} onChange={(e)=>setEstTime(e.target.value)} style={inputBase}><option value="">Select time...</option>{EST_TIMES.map(t=><option key={t} value={t}>{t}</option>)}</select>
        </div>
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:C.textMid, marginBottom:10, fontFamily:F.sans }}>Tags</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {RECIPE_TAGS.map(tag=>(
              <button key={tag} onClick={()=>toggleTag(tag)} style={{ padding:"6px 14px", borderRadius:20, border:`1.5px solid ${tags.includes(tag)?C.purpleBorder:C.border}`, background:tags.includes(tag)?C.purpleBg:"transparent", color:tags.includes(tag)?C.purple:C.textMid, fontSize:13, cursor:"pointer", fontFamily:F.sans, fontWeight:tags.includes(tag)?700:500 }}>
                {RECIPE_TAG_EMOJI[tag]} {tag}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:C.textMid, marginBottom:8, fontFamily:F.sans }}>Ingredients <span style={{ fontWeight:400, color:C.textLight }}>(match pantry names for stock check)</span></div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {ingredients.map((ing,i)=>(
              <div key={i} style={{ display:"flex", gap:8 }}>
                <input value={ing} onChange={(e)=>setIngredients(p=>p.map((x,idx)=>idx===i?e.target.value:x))} placeholder={`Ingredient ${i+1}...`} style={{ ...inputBase, flex:1 }} list="item-suggestions"/>
                {ingredients.length>1&&<button onClick={()=>setIngredients(p=>p.filter((_,idx)=>idx!==i))} style={{ width:34, height:44, border:`1px solid ${C.border}`, background:C.surfaceWarm, color:C.textMid, borderRadius:10, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>}
              </div>
            ))}
            <datalist id="item-suggestions">{existingItems.map(item=><option key={item.id} value={item.name}/>)}</datalist>
          </div>
          <button onClick={()=>setIngredients(p=>[...p,""])} style={{ marginTop:8, background:C.accentBg, border:`1px solid ${C.accentBorder}`, color:C.accent, borderRadius:10, padding:"7px 14px", fontSize:13, cursor:"pointer", fontFamily:F.sans, fontWeight:600 }}>+ Add ingredient</button>
        </div>
        <button onClick={submit} disabled={saving} style={{ background:C.purple, color:"#fff", border:"none", borderRadius:14, padding:"15px", fontSize:15, fontWeight:700, cursor:saving?"wait":"pointer", fontFamily:F.sans, opacity:saving?0.7:1, boxShadow:"0 2px 8px rgba(122,91,170,0.3)", marginTop:2 }}>{saving?"Saving...":(isEdit?"Save Changes":"Save Recipe")}</button>
      </div>
    </div>
  );
}

// ---- MEAL SLOT PICKER ----
function MealSlotModal({ day, meal, recipes, onScheduleRecipe, onEatOut, onClose }) {
  const [mode,setMode]=useState("pick"); const [restaurant,setRestaurant]=useState(""); const [search,setSearch]=useState("");
  const filtered=recipes.filter(r=>r.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(30,26,22,0.45)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:150 }} onClick={(e)=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.surface, borderRadius:"22px 22px 0 0", width:"100%", maxWidth:480, maxHeight:"85vh", display:"flex", flexDirection:"column", boxShadow:C.shadowLg }}>
        <div style={{ padding:"20px 20px 14px", borderBottom:`1px solid ${C.borderLight}` }}>
          <div style={{ fontFamily:F.display, fontWeight:700, fontSize:19, color:C.text, marginBottom:14 }}>{day} — {meal}</div>
          <div style={{ display:"flex", gap:8, background:C.bg, borderRadius:12, padding:4 }}>
            <button onClick={()=>setMode("pick")} style={{ flex:1, padding:"9px", borderRadius:9, border:"none", background:mode==="pick"?C.surface:"transparent", color:mode==="pick"?C.text:C.textMid, fontFamily:F.sans, fontWeight:mode==="pick"?700:500, fontSize:13, cursor:"pointer", boxShadow:mode==="pick"?C.shadowSm:"none" }}>🍽️ From Recipes</button>
            <button onClick={()=>setMode("eatout")} style={{ flex:1, padding:"9px", borderRadius:9, border:"none", background:mode==="eatout"?C.surface:"transparent", color:mode==="eatout"?C.text:C.textMid, fontFamily:F.sans, fontWeight:mode==="eatout"?700:500, fontSize:13, cursor:"pointer", boxShadow:mode==="eatout"?C.shadowSm:"none" }}>🍴 Eat Out</button>
          </div>
        </div>
        {mode==="pick"&&(
          <div style={{ display:"flex", flexDirection:"column", flex:1, minHeight:0 }}>
            <div style={{ padding:"12px 16px 8px" }}><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search recipes..." style={inputBase}/></div>
            <div style={{ overflowY:"auto", padding:"0 16px 28px", display:"flex", flexDirection:"column", gap:8 }}>
              {filtered.length===0?<div style={{ color:C.textLight, textAlign:"center", paddingTop:20, fontFamily:F.sans }}>No recipes found</div>
              :filtered.map(r=>(
                <div key={r.id} onClick={()=>onScheduleRecipe(r)} style={{ background:C.surfaceWarm, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 14px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", gap:10 }}>
                  <div>
                    <div style={{ fontFamily:F.sans, fontWeight:700, fontSize:14, color:C.text, marginBottom:4 }}>{r.name}</div>
                    <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                      {r.est_time&&<span style={{ fontSize:11, color:C.textMid, fontFamily:F.sans }}>⏱ {r.est_time}</span>}
                      {(r.tags||[]).map(tag=><span key={tag} style={{ fontSize:10, fontWeight:700, color:C.purple, background:C.purpleBg, border:`1px solid ${C.purpleBorder}`, padding:"1px 7px", borderRadius:20, fontFamily:F.sans }}>{tag}</span>)}
                    </div>
                  </div>
                  <span style={{ color:C.textLight, fontSize:16, flexShrink:0 }}>→</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {mode==="eatout"&&(
          <div style={{ padding:"20px 20px 36px", display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ fontSize:14, color:C.textMid, fontFamily:F.sans }}>Where are you eating?</div>
            <input autoFocus value={restaurant} onChange={(e)=>setRestaurant(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&restaurant.trim()&&onEatOut(restaurant.trim())} placeholder="Restaurant name..." style={inputBase}/>
            <button onClick={()=>restaurant.trim()&&onEatOut(restaurant.trim())} disabled={!restaurant.trim()} style={{ background:C.teal, color:"#fff", border:"none", borderRadius:14, padding:"15px", fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:F.sans, opacity:restaurant.trim()?1:0.5, boxShadow:"0 2px 8px rgba(58,140,126,0.3)" }}>Save</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- WEEK SCHEDULE ----
function WeekSchedule({ mealPlan, recipes, items, onOpenSlot, onRemoveSlot, onAddMissingToShoppingList }) {
  const todayDay=DAYS[new Date().getDay()];
  const missingIngredients=[];
  mealPlan.forEach(slot=>{ if(slot.eat_out) return; const recipe=recipes.find(r=>r.id===slot.recipe_id); if(!recipe) return; (recipe.ingredients||[]).forEach(ing=>{ const item=items.find(i=>i.name.toLowerCase()===ing.toLowerCase()); if(!item||itemNeedsReorder(item)) { if(!missingIngredients.find(m=>m.toLowerCase()===ing.toLowerCase())) missingIngredients.push(ing); } }); });
  const getSlot=(day,meal)=>mealPlan.find(s=>s.day===day&&s.meal===meal);
  const mealDot={ Breakfast:"#d4952a", Lunch:"#5b82b8", Dinner:"#7a5baa" };

  return (
    <div>
      {missingIngredients.length>0&&(
        <div style={{ background:C.yellowBg, border:`1.5px solid ${C.yellowBorder}`, borderRadius:14, padding:"14px 16px", marginBottom:18, boxShadow:C.shadowSm }}>
          <div style={{ fontFamily:F.sans, fontWeight:700, fontSize:13, color:C.yellow, marginBottom:5 }}>⚠️ {missingIngredients.length} missing ingredient{missingIngredients.length!==1?"s":""} this week</div>
          <div style={{ fontSize:12, color:C.textMid, fontFamily:F.sans, marginBottom:10, lineHeight:1.5 }}>{missingIngredients.join(", ")}</div>
          <button onClick={()=>onAddMissingToShoppingList(missingIngredients)} style={{ background:C.yellow, color:"#fff", border:"none", borderRadius:8, padding:"7px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:F.sans }}>Add all to Shopping List</button>
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {DAYS.map(day=>(
          <div key={day} style={{ background:C.surface, border:`1.5px solid ${day===todayDay?C.greenBorder:C.border}`, borderRadius:16, overflow:"hidden", boxShadow:C.shadowSm }}>
            <div style={{ padding:"10px 16px", background:day===todayDay?C.greenBg:C.surfaceWarm, borderBottom:`1px solid ${C.borderLight}`, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontFamily:F.sans, fontWeight:800, fontSize:14, color:day===todayDay?C.greenText:C.text }}>{day}</span>
              {day===todayDay&&<span style={{ fontSize:10, fontWeight:700, color:C.green, background:C.greenBg, border:`1px solid ${C.greenBorder}`, padding:"1px 8px", borderRadius:20, fontFamily:F.sans }}>Today</span>}
            </div>
            {MEALS.map((meal,mi)=>{
              const slot=getSlot(day,meal);
              return (
                <div key={meal} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", borderTop:mi>0?`1px solid ${C.borderLight}`:"none" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:72 }}>
                    <div style={{ width:7, height:7, borderRadius:"50%", background:mealDot[meal], flexShrink:0 }}/>
                    <span style={{ fontSize:12, fontWeight:600, color:C.textMid, fontFamily:F.sans }}>{meal}</span>
                  </div>
                  {slot?(
                    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                      <span style={{ fontFamily:F.sans, fontSize:13, fontWeight:600, color:slot.eat_out?C.teal:C.text }}>{slot.eat_out?"🍴 ":"🍽️ "}{slot.recipe_name}</span>
                      <button onClick={()=>onRemoveSlot(slot.id)} style={{ width:24, height:24, border:`1px solid ${C.border}`, background:"transparent", color:C.textLight, borderRadius:6, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                    </div>
                  ):(
                    <button onClick={()=>onOpenSlot(day,meal)} style={{ flex:1, textAlign:"left", background:"transparent", border:`1.5px dashed ${C.border}`, borderRadius:8, padding:"6px 12px", fontSize:12, color:C.textLight, cursor:"pointer", fontFamily:F.sans }}>+ Add meal</button>
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

// ---- ORDER MODAL ----
function OrderModal({ item, onConfirm, onClose }) {
  const [qty,setQty]=useState(1);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(30,26,22,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:"0 20px" }} onClick={(e)=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:20, padding:"28px 24px", width:"100%", maxWidth:360, display:"flex", flexDirection:"column", gap:18, boxShadow:C.shadowLg }}>
        <div style={{ fontFamily:F.display, fontWeight:700, fontSize:20, color:C.text }}>How many ordered?</div>
        <div style={{ fontFamily:F.sans, fontSize:14, color:C.textMid }}>{item.name}</div>
        <div style={{ display:"flex", alignItems:"center", gap:16, justifyContent:"center", background:C.surfaceWarm, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px" }}>
          <button onClick={()=>setQty(Math.max(1,qty-1))} style={{ width:36, height:36, border:`1px solid ${C.border}`, background:C.surface, color:C.textMid, borderRadius:10, fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>−</button>
          <span style={{ fontSize:32, fontWeight:800, color:C.text, minWidth:44, textAlign:"center", fontFamily:F.sans }}>{qty}</span>
          <button onClick={()=>setQty(qty+1)} style={{ width:36, height:36, border:`1px solid ${C.border}`, background:C.surface, color:C.textMid, borderRadius:10, fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>+</button>
        </div>
        <button onClick={()=>onConfirm(qty)} style={{ background:C.green, color:"#fff", border:"none", borderRadius:14, padding:"14px", fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:F.sans, boxShadow:"0 2px 8px rgba(61,140,92,0.3)" }}>Confirm</button>
        <button onClick={onClose} style={{ background:"transparent", border:`1px solid ${C.border}`, color:C.textMid, borderRadius:14, padding:"11px", fontSize:14, cursor:"pointer", fontFamily:F.sans }}>Cancel</button>
      </div>
    </div>
  );
}

// ---- SCAN CONFIRM MODAL ----
function ScanConfirmModal({ detectedItems, existingItems, onConfirm, onClose }) {
  const [items,setItems]=useState(()=>detectedItems.map((d,i)=>({ ...d, id:i, selected:true, has_half:d.level==="half", full_count:d.level==="full"?1:0, exists:!!existingItems.find(e=>e.name.toLowerCase()===d.name.toLowerCase()) })));
  const toggle=(id)=>setItems(prev=>prev.map(i=>i.id===id?{...i,selected:!i.selected}:i));
  const updateField=(id,field,val)=>setItems(prev=>prev.map(i=>i.id===id?{...i,[field]:val}:i));
  const selected=items.filter(i=>i.selected);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(30,26,22,0.5)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:200 }}>
      <div style={{ background:C.bg, borderRadius:"22px 22px 0 0", width:"100%", maxWidth:480, maxHeight:"88vh", display:"flex", flexDirection:"column", boxShadow:C.shadowLg }}>
        <div style={{ padding:"20px 20px 14px", borderBottom:`1px solid ${C.border}`, background:C.surface, borderRadius:"22px 22px 0 0" }}>
          <div style={{ fontFamily:F.display, fontWeight:700, fontSize:20, color:C.text, marginBottom:4 }}>📸 Scan Results</div>
          <div style={{ fontSize:12, color:C.textMid, fontFamily:F.sans }}>Found {detectedItems.length} item{detectedItems.length!==1?"s":""}. Uncheck anything wrong, then save.</div>
        </div>
        <div style={{ overflowY:"auto", flex:1, padding:"12px 16px" }}>
          {items.length===0&&<div style={{ color:C.textLight, textAlign:"center", paddingTop:30, fontFamily:F.sans }}>No items detected. Try a clearer photo.</div>}
          {items.map(item=>(
            <div key={item.id} style={{ background:item.selected?C.surface:C.surfaceWarm, border:`1px solid ${item.selected?C.border:C.borderLight}`, borderRadius:12, padding:"12px 14px", marginBottom:8, opacity:item.selected?1:0.5, boxShadow:item.selected?C.shadowSm:"none" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:item.selected?10:0 }}>
                <input type="checkbox" checked={item.selected} onChange={()=>toggle(item.id)} style={{ width:18, height:18, cursor:"pointer", flexShrink:0, accentColor:C.green }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontFamily:F.sans, fontWeight:700, fontSize:14, color:C.text }}>{item.name}</span>
                    {item.exists&&<span style={{ fontSize:10, fontWeight:700, color:C.accent, background:C.accentBg, border:`1px solid ${C.accentBorder}`, padding:"1px 7px", borderRadius:20, fontFamily:F.sans }}>tracked</span>}
                  </div>
                  <div style={{ fontSize:11, color:C.textLight, fontFamily:F.sans }}>{item.category} · {item.level}</div>
                </div>
              </div>
              {item.selected&&(
                <div style={{ display:"flex", gap:8, paddingLeft:28 }}>
                  <select value={item.category} onChange={(e)=>updateField(item.id,"category",e.target.value)} style={{ ...inputBase, fontSize:12, padding:"6px 10px", flex:1 }}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
                  <select value={item.has_half?"half":item.full_count>0?"full":"low"} onChange={(e)=>{ const v=e.target.value; updateField(item.id,"has_half",v==="half"); updateField(item.id,"full_count",v==="full"?1:0); }} style={{ ...inputBase, fontSize:12, padding:"6px 10px", flex:1 }}>
                    <option value="full">Full</option><option value="half">Half open</option><option value="low">Out/Low</option>
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ padding:"12px 16px 32px", borderTop:`1px solid ${C.border}`, background:C.surface, display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, background:C.surfaceWarm, border:`1px solid ${C.border}`, color:C.textMid, borderRadius:12, padding:"13px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:F.sans }}>Cancel</button>
          <button onClick={()=>onConfirm(selected)} disabled={selected.length===0} style={{ flex:2, background:C.green, color:"#fff", border:"none", borderRadius:12, padding:"13px", fontSize:14, fontWeight:700, cursor:selected.length===0?"not-allowed":"pointer", fontFamily:F.sans, opacity:selected.length===0?0.5:1, boxShadow:"0 2px 8px rgba(61,140,92,0.3)" }}>Save {selected.length} Item{selected.length!==1?"s":""}</button>
        </div>
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
  const [mealsSubTab,setMealsSubTab]=useState("schedule");
  const [openSlot,setOpenSlot]=useState(null);
  const [scanning,setScanning]=useState(false);
  const [scanResults,setScanResults]=useState(null);
  const weekStart=getWeekStart();

  const handleScanPhoto=(e)=>{ const file=e.target.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=async(ev)=>{ const base64=ev.target.result.split(",")[1]; setScanning(true); try{ const detected=await scanShelf(base64,file.type||"image/jpeg"); setScanResults(detected); }catch(err){ alert("Scan failed: "+err.message); }finally{ setScanning(false); e.target.value=""; } }; reader.readAsDataURL(file); };
  const handleScanConfirm=async(confirmedItems)=>{ for(const item of confirmedItems){ const existing=items.find(i=>i.name.toLowerCase()===item.name.toLowerCase()); if(existing){ await updateItem(existing.id,{has_half:item.has_half,full_count:item.full_count}); }else{ await addItem({name:item.name,category:item.category,has_half:item.has_half,full_count:item.full_count,expires_at:null}); } } setScanResults(null); };

  const load=useCallback(async()=>{ try{ setError(null); const [itemData,recipeData,shoppingData,mealData]=await Promise.all([apiFetch("wdwn_items?order=name.asc"),apiFetch("wdwn_recipes?order=name.asc"),apiFetch("wdwn_shopping?status=eq.pending&order=name.asc"),apiFetch(`wdwn_meal_plan?week_start=eq.${weekStart}&order=id.asc`)]); setItems(itemData||[]); setRecipes(recipeData||[]); setShopping(shoppingData||[]); setMealPlan(mealData||[]); setLastSynced(new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})); }catch(e){ setError("Couldn't load. Check connection."); }finally{ setLoading(false); } },[weekStart]);
  useEffect(()=>{load();},[load]);

  const addItem=async(ni)=>{ const data=await apiFetch("wdwn_items",{method:"POST",body:JSON.stringify(ni)}); if(data&&data[0]) setItems(prev=>[...prev,data[0]].sort((a,b)=>a.name.localeCompare(b.name))); };
  const updateItem=async(id,ch)=>{ setItems(prev=>prev.map(i=>i.id===id?{...i,...ch}:i)); await apiFetch(`wdwn_items?id=eq.${id}`,{method:"PATCH",body:JSON.stringify(ch),prefer:"return=minimal"}); };
  const deleteItem=async(id)=>{ setItems(prev=>prev.filter(i=>i.id!==id)); await apiFetch(`wdwn_items?id=eq.${id}`,{method:"DELETE",prefer:"return=minimal"}); };
  const saveRecipe=async(r)=>{ const p={name:r.name,notes:r.notes,ingredients:r.ingredients,tags:r.tags,est_time:r.est_time}; if(r.id){ await apiFetch(`wdwn_recipes?id=eq.${r.id}`,{method:"PATCH",body:JSON.stringify(p)}); setRecipes(prev=>prev.map(x=>x.id===r.id?{...x,...p}:x)); }else{ const data=await apiFetch("wdwn_recipes",{method:"POST",body:JSON.stringify(p)}); if(data&&data[0]) setRecipes(prev=>[...prev,data[0]].sort((a,b)=>a.name.localeCompare(b.name))); } };
  const deleteRecipe=async(id)=>{ setRecipes(prev=>prev.filter(r=>r.id!==id)); await apiFetch(`wdwn_recipes?id=eq.${id}`,{method:"DELETE",prefer:"return=minimal"}); };
  const scheduleRecipe=async(day,meal,recipe)=>{ const data=await apiFetch("wdwn_meal_plan",{method:"POST",body:JSON.stringify({day,meal,recipe_id:recipe.id,recipe_name:recipe.name,week_start:weekStart,eat_out:false})}); if(data&&data[0]) setMealPlan(prev=>[...prev,data[0]]); setOpenSlot(null); };
  const scheduleEatOut=async(day,meal,restaurant)=>{ const data=await apiFetch("wdwn_meal_plan",{method:"POST",body:JSON.stringify({day,meal,recipe_id:null,recipe_name:restaurant,week_start:weekStart,eat_out:true})}); if(data&&data[0]) setMealPlan(prev=>[...prev,data[0]]); setOpenSlot(null); };
  const removeSlot=async(id)=>{ setMealPlan(prev=>prev.filter(s=>s.id!==id)); await apiFetch(`wdwn_meal_plan?id=eq.${id}`,{method:"DELETE",prefer:"return=minimal"}); };
  const addMissingToShoppingList=async(missingNames)=>{ for(const name of missingNames.filter(n=>!shopping.find(s=>s.name.toLowerCase()===n.toLowerCase()))){ const data=await apiFetch("wdwn_shopping",{method:"POST",body:JSON.stringify({name,category:"Other",status:"pending"})}); if(data&&data[0]) setShopping(prev=>[...prev,data[0]]); } };
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

  const tabStyle=(tab)=>({
    flex:1, padding:"10px 0 8px", border:"none", background:"transparent",
    color:activeTab===tab?C.green:C.textLight,
    fontSize:10, fontWeight:activeTab===tab?700:500, cursor:"pointer",
    fontFamily:F.sans, display:"flex", flexDirection:"column", alignItems:"center", gap:3,
    borderTop:`2px solid ${activeTab===tab?C.green:"transparent"}`,
    transition:"color 0.15s ease",
  });

  const PAGE_TITLES = { home:"Home", pantry:"Pantry", need:"Shopping", meals:"Meals" };
  const PAGE_SUBTITLES = { home:"Your household at a glance", pantry:"What's in the house", need:"What to pick up", meals:"This week's plan" };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:F.sans, color:C.text, paddingBottom:80 }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{ padding:"18px 20px 14px", background:C.surface, borderBottom:`1px solid ${C.borderLight}`, position:"sticky", top:0, zIndex:10, boxShadow:"0 1px 0 rgba(30,26,22,0.06)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontFamily:F.display, fontWeight:700, fontSize:24, color:C.text, letterSpacing:"-0.3px", lineHeight:1.1 }}>{PAGE_TITLES[activeTab]}</div>
            <div style={{ fontSize:12, color:C.textLight, marginTop:3, fontFamily:F.sans }}>{PAGE_SUBTITLES[activeTab]}{lastSynced&&<span style={{ marginLeft:6 }}>· {lastSynced}</span>}{outCount>0&&<span style={{ color:C.red, marginLeft:6, fontWeight:700 }}>{outCount} to reorder</span>}</div>
          </div>
          <button onClick={load} style={{ width:34, height:34, background:C.surfaceWarm, border:`1px solid ${C.border}`, color:C.textMid, borderRadius:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>↻</button>
        </div>
      </div>

      <div style={{ padding:"18px 16px 0" }}>
        {error&&<div style={{ color:C.red, background:C.redBg, border:`1px solid ${C.redBorder}`, borderRadius:12, padding:"12px 16px", marginBottom:14, fontSize:13, fontFamily:F.sans }}>{error}</div>}

        {/* HOME */}
        {activeTab==="home"&&(loading?<div style={{ color:C.textLight, textAlign:"center", paddingTop:60, fontFamily:F.sans }}>Loading...</div>:<Dashboard items={items} onNavigate={(tab,cat)=>{setActiveTab(tab);setFilterCat(cat);}} onUpdate={updateItem} onDelete={deleteItem}/>)}

        {/* PANTRY */}
        {activeTab==="pantry"&&(
          <>
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search pantry..." style={{ ...inputBase, flex:1 }}/>
              <label style={{ display:"flex", alignItems:"center", gap:5, background:scanning?"#f0ece5":C.green, border:"none", color:scanning?C.textMid:"#fff", borderRadius:12, padding:"0 16px", fontSize:13, fontWeight:700, cursor:scanning?"wait":"pointer", fontFamily:F.sans, whiteSpace:"nowrap", flexShrink:0, boxShadow:scanning?"none":"0 2px 6px rgba(61,140,92,0.3)" }}>
                {scanning?"⏳ Scanning...":"📸 Scan"}
                {!scanning&&<input type="file" accept="image/*" capture="environment" onChange={handleScanPhoto} style={{ display:"none" }}/>}
              </label>
            </div>
            <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:6, marginBottom:14 }}>
              {["All",...CATEGORIES].map(c=>(
                <button key={c} onClick={()=>setFilterCat(c)} style={chip(filterCat===c)}>
                  {c==="All"?"All":`${CAT_EMOJI[c]} ${c}`}
                </button>
              ))}
              <button onClick={()=>setFilterStock(filterStock==="out"?"all":"out")} style={chip(filterStock==="out",C.red,C.redBg,C.redBorder)}>🚨 Need reorder</button>
            </div>
            {loading?<div style={{ color:C.textLight, textAlign:"center", paddingTop:40 }}>Loading...</div>
            :filtered.length===0?<div style={{ color:C.textLight, textAlign:"center", paddingTop:60, fontFamily:F.sans }}>{search?`Nothing found for "${search}"`:"No items yet — tap + to add one!"}</div>
            :Object.entries(grouped).map(([cat,catItems])=>(
              <div key={cat} style={{ marginBottom:24 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.textLight, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10, fontFamily:F.sans }}>{CAT_EMOJI[cat]} {cat}</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>{catItems.map(item=><ItemCard key={item.id} item={item} onUpdate={updateItem} onDelete={deleteItem}/>)}</div>
              </div>
            ))}
          </>
        )}

        {/* SHOPPING */}
        {activeTab==="need"&&(
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontFamily:F.sans, fontWeight:700, fontSize:15, color:C.textMid }}>{outCount>0?`${outCount} item${outCount!==1?"s":""} to pick up`:"You're fully stocked!"}</div>
              <button onClick={()=>setShowAddShoppingItem(true)} style={{ background:C.green, color:"#fff", border:"none", borderRadius:10, padding:"7px 16px", fontSize:13, cursor:"pointer", fontFamily:F.sans, fontWeight:700, boxShadow:"0 2px 6px rgba(61,140,92,0.25)" }}>+ Add item</button>
            </div>
            {showAddShoppingItem&&(
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:"16px", marginBottom:16, boxShadow:C.shadowSm, display:"flex", flexDirection:"column", gap:10 }}>
                <input autoFocus value={newShoppingName} onChange={(e)=>setNewShoppingName(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&addShoppingItem()} placeholder="Item name..." style={inputBase} list="pantry-suggestions"/>
                <datalist id="pantry-suggestions">{items.map(i=><option key={i.id} value={i.name}/>)}</datalist>
                <select value={newShoppingCat} onChange={(e)=>setNewShoppingCat(e.target.value)} style={inputBase}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={addShoppingItem} style={{ flex:1, background:C.green, color:"#fff", border:"none", borderRadius:10, padding:"11px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:F.sans }}>Add to List</button>
                  <button onClick={()=>{setShowAddShoppingItem(false);setNewShoppingName("");}} style={{ background:C.surfaceWarm, border:`1px solid ${C.border}`, color:C.textMid, borderRadius:10, padding:"11px 16px", fontSize:14, cursor:"pointer", fontFamily:F.sans }}>Cancel</button>
                </div>
              </div>
            )}
            {needReorder.length>0&&(
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.textLight, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10, fontFamily:F.sans }}>Out of stock / expired</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {needReorder.map(item=>{ const exp=isExpired(item.expires_at); return (
                    <div key={item.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 16px", boxShadow:C.shadowSm }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:10 }}>
                        <span style={{ fontFamily:F.sans, fontWeight:700, fontSize:15, color:C.text }}>{item.name}</span>
                        <span style={{ fontSize:11, fontWeight:700, color:exp?C.orange:C.red, fontFamily:F.sans }}>{exp?"Expired":"Out of stock"}</span>
                      </div>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={()=>setOrderItem(item)} style={actionBtn(C.greenText,C.greenBg,C.greenBorder)}>✓ Ordered</button>
                        <button onClick={()=>handleSkipped(item.id)} style={actionBtn(C.textMid,"transparent",C.border)}>Skip</button>
                        <button onClick={()=>handleOutOfStock(item.id)} style={actionBtn(C.red,C.redBg,C.redBorder)}>Store OOS</button>
                      </div>
                    </div>
                  );})}
                </div>
              </div>
            )}
            {shopping.length>0&&(
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.textLight, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10, fontFamily:F.sans }}>Added to list</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {shopping.map(s=>(
                    <div key={s.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 16px", boxShadow:C.shadowSm }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:10 }}>
                        <span style={{ fontFamily:F.sans, fontWeight:700, fontSize:15, color:C.text }}>{s.name}</span>
                        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                          <span style={{ fontSize:11, color:C.textLight, fontFamily:F.sans }}>{CAT_EMOJI[s.category]} {s.category}</span>
                          <button onClick={()=>removeShoppingItem(s.id)} style={{ width:24, height:24, border:`1px solid ${C.border}`, background:"transparent", color:C.textLight, borderRadius:6, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={()=>setOrderItem(s)} style={actionBtn(C.greenText,C.greenBg,C.greenBorder)}>✓ Ordered</button>
                        <button onClick={()=>handleSkipped(s.id)} style={actionBtn(C.textMid,"transparent",C.border)}>Skip</button>
                        <button onClick={()=>handleOutOfStock(s.id)} style={actionBtn(C.red,C.redBg,C.redBorder)}>Store OOS</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {needReorder.length===0&&shopping.length===0&&<div style={{ color:C.textLight, textAlign:"center", paddingTop:60, fontFamily:F.sans, fontSize:15 }}>You're all stocked up! 🎉</div>}
          </>
        )}

        {/* MEALS */}
        {activeTab==="meals"&&(
          <>
            <div style={{ display:"flex", background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, padding:4, marginBottom:18, boxShadow:C.shadowSm }}>
              {[["schedule","📅 This Week"],["recipes","📖 Recipes"]].map(([t,label])=>(
                <button key={t} onClick={()=>setMealsSubTab(t)} style={{ flex:1, padding:"9px", borderRadius:10, border:"none", background:mealsSubTab===t?C.green:"transparent", color:mealsSubTab===t?"#fff":C.textMid, fontFamily:F.sans, fontWeight:mealsSubTab===t?700:500, fontSize:13, cursor:"pointer", transition:"all 0.15s ease" }}>{label}</button>
              ))}
            </div>
            {mealsSubTab==="schedule"&&(loading?<div style={{ color:C.textLight, textAlign:"center", paddingTop:40 }}>Loading...</div>:<WeekSchedule mealPlan={mealPlan} recipes={recipes} items={items} onOpenSlot={(day,meal)=>setOpenSlot({day,meal})} onRemoveSlot={removeSlot} onAddMissingToShoppingList={addMissingToShoppingList}/>)}
            {mealsSubTab==="recipes"&&(
              <>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <div style={{ fontFamily:F.sans, fontWeight:700, fontSize:15, color:C.text }}>Recipe Library</div>
                  <button onClick={()=>setShowAddRecipe(true)} style={{ background:C.purple, color:"#fff", border:"none", borderRadius:10, padding:"7px 16px", fontSize:13, cursor:"pointer", fontFamily:F.sans, fontWeight:700, boxShadow:"0 2px 6px rgba(122,91,170,0.25)" }}>+ Add Recipe</button>
                </div>
                <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:6, marginBottom:14 }}>
                  {["All",...RECIPE_TAGS].map(tag=>(
                    <button key={tag} onClick={()=>setRecipeTagFilter(tag)} style={chip(recipeTagFilter===tag,C.purple,C.purpleBg,C.purpleBorder)}>
                      {tag==="All"?"All":`${RECIPE_TAG_EMOJI[tag]} ${tag}`}
                    </button>
                  ))}
                </div>
                {recipeTagFilter==="All"?(
                  <>
                    {RECIPE_TAGS.map(tag=>{ const tagRecipes=recipes.filter(r=>(r.tags||[]).includes(tag)); if(!tagRecipes.length) return null; return (
                      <div key={tag} style={{ marginBottom:22 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:C.textLight, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10, fontFamily:F.sans }}>{RECIPE_TAG_EMOJI[tag]} {tag}</div>
                        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>{tagRecipes.map(r=><RecipeCard key={r.id} recipe={r} items={items} onDelete={deleteRecipe} onEdit={r=>setEditingRecipe(r)}/>)}</div>
                      </div>
                    );})}
                    {recipes.filter(r=>!(r.tags||[]).length).length>0&&(
                      <div style={{ marginBottom:22 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:C.textLight, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10, fontFamily:F.sans }}>📋 Uncategorized</div>
                        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>{recipes.filter(r=>!(r.tags||[]).length).map(r=><RecipeCard key={r.id} recipe={r} items={items} onDelete={deleteRecipe} onEdit={r=>setEditingRecipe(r)}/>)}</div>
                      </div>
                    )}
                    {recipes.length===0&&<div style={{ color:C.textLight, textAlign:"center", paddingTop:40, fontFamily:F.sans }}>No recipes yet!</div>}
                  </>
                ):(filteredRecipes.length===0?<div style={{ color:C.textLight, textAlign:"center", paddingTop:30, fontFamily:F.sans }}>No {recipeTagFilter} recipes yet.</div>:<div style={{ display:"flex", flexDirection:"column", gap:8 }}>{filteredRecipes.map(r=><RecipeCard key={r.id} recipe={r} items={items} onDelete={deleteRecipe} onEdit={r=>setEditingRecipe(r)}/>)}</div>)}
              </>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      {activeTab==="pantry"&&(
        <button onClick={()=>setShowAdd(true)} style={{ position:"fixed", bottom:74, right:18, width:54, height:54, borderRadius:"50%", background:C.green, border:"none", color:"#fff", fontSize:26, cursor:"pointer", boxShadow:"0 4px 14px rgba(61,140,92,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 }}>+</button>
      )}

      {/* Bottom nav */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:C.surface, borderTop:`1px solid ${C.borderLight}`, display:"flex", zIndex:20, paddingBottom:"env(safe-area-inset-bottom,0px)" }}>
        {[["home","🏠","Home"],["pantry","🍏","Pantry"],["need","🛒",outCount>0?`Need (${outCount})`:"Need"],["meals","🍽️","Meals"]].map(([tab,emoji,label])=>(
          <button key={tab} style={tabStyle(tab)} onClick={()=>setActiveTab(tab)}>
            <span style={{ fontSize:20 }}>{emoji}</span>
            <span style={{ fontSize:10 }}>{label}</span>
          </button>
        ))}
      </div>

      {showAdd&&<AddItemModal onAdd={addItem} onClose={()=>setShowAdd(false)} defaultCategory={fabDefaultCat}/>}
      {(showAddRecipe||editingRecipe)&&<RecipeModal recipe={editingRecipe} onSave={saveRecipe} onClose={()=>{setShowAddRecipe(false);setEditingRecipe(null);}} existingItems={items}/>}
      {orderItem&&<OrderModal item={orderItem} onConfirm={(qty)=>handleOrdered(orderItem,qty)} onClose={()=>setOrderItem(null)}/>}
      {openSlot&&<MealSlotModal day={openSlot.day} meal={openSlot.meal} recipes={recipes} onScheduleRecipe={(r)=>scheduleRecipe(openSlot.day,openSlot.meal,r)} onEatOut={(rest)=>scheduleEatOut(openSlot.day,openSlot.meal,rest)} onClose={()=>setOpenSlot(null)}/>}
      {scanResults&&<ScanConfirmModal detectedItems={scanResults} existingItems={items} onConfirm={handleScanConfirm} onClose={()=>setScanResults(null)}/>}
    </div>
  );
}
