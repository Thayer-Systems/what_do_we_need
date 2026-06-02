import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://dzqciagcyekqxborbats.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6cWNpYWdjeWVrcXhib3JiYXRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MjUzNTIsImV4cCI6MjA5MjAwMTM1Mn0.MfOw6ci5lRgzMhXGLavztjrQHgP3GCLieYuvsuNDHoM";

const CATEGORIES = ["Fridge", "Freezer", "Pantry", "Kids", "Cleaning", "Other"];
const CAT_EMOJI = { Fridge: "🧊", Freezer: "❄️", Pantry: "🥫", Kids: "🧸", Cleaning: "🧹", Other: "📦" };

const C = {
  bg: "#faf9f7", surface: "#ffffff", border: "#ebe7e1", borderLight: "#f2efe9",
  text: "#2c2825", textMid: "#7a7068", textLight: "#b0a89e",
  green: "#5a9e75", greenBg: "#eef7f2", greenBorder: "#c0dece",
  red: "#c0614a", redBg: "#fdf0ed", redBorder: "#ebbcb3",
  accent: "#7b9fd4", accentBg: "#f0f4fb", accentBorder: "#c8d8f0",
  btnBg: "#f4f0eb", btnBorder: "#e4dfd8",
  yellow: "#d4952a", yellowBg: "#fdf5e6", yellowBorder: "#f0d9a8",
  orange: "#c4733a", orangeBg: "#fdf3eb", orangeBorder: "#f0c8a0",
  purple: "#8b6fbd", purpleBg: "#f4f0fb", purpleBorder: "#d0c0f0",
};

const today = () => new Date().toISOString().split("T")[0];

function isExpired(expires_at) {
  if (!expires_at) return false;
  return expires_at < today();
}

function isExpiringSoon(expires_at) {
  if (!expires_at) return false;
  const d = new Date();
  d.setDate(d.getDate() + 7);
  const soon = d.toISOString().split("T")[0];
  return expires_at >= today() && expires_at <= soon;
}

function itemNeedsReorder(item) {
  if (!item.has_half && item.full_count === 0) return true;
  if (isExpired(item.expires_at)) return true;
  return false;
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const pillStyle = (color, bg, border) => ({
  display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 700,
  color, background: bg, border: `1px solid ${border}`,
  padding: "2px 9px", borderRadius: 20, whiteSpace: "nowrap",
  fontFamily: "'Nunito', sans-serif",
});

const btnStyle = (sm) => ({
  width: sm ? 28 : 32, height: sm ? 28 : 32, borderRadius: 8,
  border: `1px solid ${C.btnBorder}`, background: C.btnBg, color: C.textMid,
  fontSize: sm ? 15 : 17, cursor: "pointer", display: "flex",
  alignItems: "center", justifyContent: "center",
  fontFamily: "'Nunito', sans-serif", fontWeight: 700, flexShrink: 0,
});

const inputStyle = {
  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
  padding: "10px 14px", color: C.text, fontSize: 15,
  fontFamily: "'Nunito', sans-serif", width: "100%", boxSizing: "border-box", outline: "none",
};

// ---- Dashboard ----
function DashCard({ label, value, color, bg, border }) {
  return (
    <div style={{ background: bg || C.surface, border: `1px solid ${border || C.border}`, borderRadius: 12, padding: "12px 14px", flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || C.text, fontFamily: "'Nunito', sans-serif" }}>{value}</div>
      <div style={{ fontSize: 11, color: C.textLight, marginTop: 2, fontFamily: "'Nunito', sans-serif" }}>{label}</div>
    </div>
  );
}

function Dashboard({ items }) {
  const total = items.length;
  const outOfStock = items.filter(i => !i.has_half && i.full_count === 0).length;
  const expired = items.filter(i => isExpired(i.expires_at)).length;
  const low = items.filter(i => !i.has_half && i.full_count === 1 && !isExpired(i.expires_at)).length;
  const catCounts = CATEGORIES.map(cat => ({
    cat,
    count: items.filter(i => i.category === cat).length,
    out: items.filter(i => i.category === cat && itemNeedsReorder(i)).length,
  })).filter(c => c.count > 0);

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'Nunito', sans-serif" }}>Overview</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <DashCard label="Total items" value={total} />
        <DashCard label="Out of stock" value={outOfStock} color={outOfStock > 0 ? C.red : C.textMid} bg={outOfStock > 0 ? C.redBg : C.surface} border={outOfStock > 0 ? C.redBorder : C.border} />
        <DashCard label="Expired" value={expired} color={expired > 0 ? C.orange : C.textMid} bg={expired > 0 ? C.orangeBg : C.surface} border={expired > 0 ? C.orangeBorder : C.border} />
      </div>
      {catCounts.length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textLight, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'Nunito', sans-serif" }}>By Category</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {catCounts.map(({ cat, count, out }) => (
              <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15 }}>{CAT_EMOJI[cat]}</span>
                <span style={{ fontSize: 13, color: C.text, fontFamily: "'Nunito', sans-serif", flex: 1, fontWeight: 600 }}>{cat}</span>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: C.textMid, fontFamily: "'Nunito', sans-serif" }}>{count} item{count !== 1 ? "s" : ""}</span>
                  {out > 0 && <span style={pillStyle(C.red, C.redBg, C.redBorder)}>{out} need reorder</span>}
                </div>
                <div style={{ width: 60, height: 5, borderRadius: 4, background: C.borderLight, overflow: "hidden" }}>
                  <div style={{ width: `${Math.round(((count - out) / count) * 100)}%`, height: "100%", background: out > 0 ? C.yellow : C.green, borderRadius: 4, transition: "width 0.3s" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Item Card ----
function ItemCard({ item, onUpdate, onDelete }) {
  const { name, category, has_half, full_count, expires_at } = item;
  const expired = isExpired(expires_at);
  const expiringSoon = isExpiringSoon(expires_at);
  const outOfStock = !has_half && full_count === 0;
  const runningLow = !has_half && full_count === 1 && !expired;

  const summary = (() => {
    if (expired) return "Expired";
    const parts = [];
    if (has_half) parts.push("½ open");
    if (full_count > 0) parts.push(`${full_count} new`);
    if (parts.length === 0) return "Out of stock";
    return parts.join(" + ");
  })();

  const badgeColor = expired ? C.orange : outOfStock ? C.red : runningLow ? C.yellow : C.green;
  const badgeBg = expired ? C.orangeBg : outOfStock ? C.redBg : runningLow ? C.yellowBg : C.greenBg;
  const badgeBorder = expired ? C.orangeBorder : outOfStock ? C.redBorder : runningLow ? C.yellowBorder : C.greenBorder;
  const cardBg = expired ? C.orangeBg : outOfStock ? C.redBg : C.surface;
  const cardBorder = expired ? C.orangeBorder : outOfStock ? C.redBorder : runningLow ? C.yellowBorder : C.border;

  const formatDate = (d) => {
    if (!d) return null;
    const [y, m, day] = d.split("-");
    return `${m}/${day}/${y.slice(2)}`;
  };

  return (
    <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 9 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 15, color: expired ? C.orange : outOfStock ? C.red : C.text, lineHeight: 1.3 }}>
            {CAT_EMOJI[category]} {name}
          </div>
          <div style={{ fontSize: 11, color: C.textLight, marginTop: 2, fontFamily: "'Nunito', sans-serif", display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span>{category}</span>
            {expires_at && (
              <span style={{ color: expired ? C.orange : expiringSoon ? C.yellow : C.textLight, fontWeight: expired || expiringSoon ? 700 : 400 }}>
                {expired ? "⚠️ Expired " : expiringSoon ? "⏰ Exp. " : "Exp. "}{formatDate(expires_at)}
              </span>
            )}
          </div>
        </div>
        <div style={pillStyle(badgeColor, badgeBg, badgeBorder)}>{summary}</div>
      </div>
      <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={() => onUpdate(item.id, { has_half: !has_half })}
          style={{
            padding: "4px 11px", borderRadius: 8,
            border: `1px solid ${has_half ? C.greenBorder : C.btnBorder}`,
            background: has_half ? C.greenBg : C.btnBg,
            color: has_half ? C.green : C.textMid,
            fontSize: 13, cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontWeight: has_half ? 700 : 500,
          }}
        >
          Opened
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => onUpdate(item.id, { full_count: Math.max(0, full_count - 1) })} style={btnStyle(true)}>−</button>
          <span style={{ fontSize: 15, fontWeight: 800, color: C.text, minWidth: 18, textAlign: "center", fontFamily: "'Nunito', sans-serif" }}>{full_count}</span>
          <button onClick={() => onUpdate(item.id, { full_count: full_count + 1 })} style={btnStyle(true)}>+</button>
          <span style={{ fontSize: 11, color: C.textLight, fontFamily: "'Nunito', sans-serif" }}>new</span>
        </div>
        <button onClick={() => onDelete(item.id)} style={{ ...btnStyle(true), color: C.textLight, marginLeft: "auto" }}>✕</button>
      </div>
    </div>
  );
}

// ---- Add Item Modal ----
function AddItemModal({ onAdd, onClose }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [hasOpened, setHasOpened] = useState(false);
  const [newCount, setNewCount] = useState(1);
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onAdd({ name: name.trim(), category, has_half: hasOpened, full_count: newCount, expires_at: expiresAt || null });
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(44,40,37,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "20px 20px 0 0", padding: "24px 20px", width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 -4px 30px rgba(0,0,0,0.1)" }}>
        <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 20, fontWeight: 800, color: C.text }}>Add Item</div>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Item name..." style={inputStyle} />
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, color: C.textMid, fontSize: 14, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
            <input type="checkbox" checked={hasOpened} onChange={(e) => setHasOpened(e.target.checked)} style={{ width: 16, height: 16 }} />
            Opened
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            <span style={{ color: C.textMid, fontSize: 13, fontFamily: "'Nunito', sans-serif" }}>New:</span>
            <button onClick={() => setNewCount(Math.max(0, newCount - 1))} style={btnStyle()}>−</button>
            <span style={{ color: C.text, fontWeight: 800, minWidth: 20, textAlign: "center", fontFamily: "'Nunito', sans-serif" }}>{newCount}</span>
            <button onClick={() => setNewCount(newCount + 1)} style={btnStyle()}>+</button>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, marginBottom: 6, fontFamily: "'Nunito', sans-serif" }}>Expiration date (optional)</div>
          <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} style={inputStyle} />
        </div>
        <button onClick={submit} disabled={saving} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 800, cursor: saving ? "wait" : "pointer", fontFamily: "'Nunito', sans-serif", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Adding..." : "Add to List"}
        </button>
      </div>
    </div>
  );
}

// ---- Recipe Components ----
function RecipeCard({ recipe, items, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const ingredients = recipe.ingredients || [];

  const getItemStatus = (ingredientName) => {
    const match = items.find(i => i.name.toLowerCase() === ingredientName.toLowerCase());
    if (!match) return "unknown";
    if (itemNeedsReorder(match)) return "out";
    return "in";
  };

  const statuses = ingredients.map(ing => getItemStatus(ing));
  const allIn = statuses.every(s => s === "in");
  const someOut = statuses.some(s => s === "out");
  const hasUnknown = statuses.some(s => s === "unknown");

  const recipeStatus = allIn ? "ready" : someOut ? "missing" : "partial";
  const statusLabel = allIn ? "Ready to make!" : someOut ? "Missing items" : "Some items untracked";
  const statusColor = allIn ? C.green : someOut ? C.red : C.yellow;
  const statusBg = allIn ? C.greenBg : someOut ? C.redBg : C.yellowBg;
  const statusBorder = allIn ? C.greenBorder : someOut ? C.redBorder : C.yellowBorder;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      <div
        style={{ padding: "13px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 15, color: C.text }}>🍽️ {recipe.name}</div>
          <div style={{ fontSize: 11, color: C.textLight, marginTop: 2, fontFamily: "'Nunito', sans-serif" }}>{ingredients.length} ingredient{ingredients.length !== 1 ? "s" : ""}</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={pillStyle(statusColor, statusBg, statusBorder)}>{statusLabel}</span>
          <span style={{ color: C.textLight, fontSize: 14 }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.borderLight}`, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
          {recipe.notes && (
            <div style={{ fontSize: 13, color: C.textMid, fontFamily: "'Nunito', sans-serif", marginBottom: 4, fontStyle: "italic" }}>{recipe.notes}</div>
          )}
          {ingredients.map((ing, i) => {
            const status = getItemStatus(ing);
            const ic = status === "in" ? C.green : status === "out" ? C.red : C.yellow;
            const ib = status === "in" ? C.greenBg : status === "out" ? C.redBg : C.yellowBg;
            const ibr = status === "in" ? C.greenBorder : status === "out" ? C.redBorder : C.yellowBorder;
            const label = status === "in" ? "✓ In stock" : status === "out" ? "✗ Need to order" : "? Not tracked";
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 14, fontFamily: "'Nunito', sans-serif", color: C.text }}>{ing}</span>
                <span style={pillStyle(ic, ib, ibr)}>{label}</span>
              </div>
            );
          })}
          <button
            onClick={() => onDelete(recipe.id)}
            style={{ marginTop: 4, alignSelf: "flex-end", background: "transparent", border: `1px solid ${C.border}`, color: C.textLight, borderRadius: 8, padding: "4px 12px", fontSize: 12, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}
          >
            Remove recipe
          </button>
        </div>
      )}
    </div>
  );
}

function AddRecipeModal({ onAdd, onClose, existingItems }) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [ingredients, setIngredients] = useState([""]);
  const [saving, setSaving] = useState(false);

  const updateIng = (i, val) => setIngredients(prev => prev.map((v, idx) => idx === i ? val : v));
  const addIng = () => setIngredients(prev => [...prev, ""]);
  const removeIng = (i) => setIngredients(prev => prev.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!name.trim()) return;
    const cleaned = ingredients.map(s => s.trim()).filter(Boolean);
    if (!cleaned.length) return;
    setSaving(true);
    await onAdd({ name: name.trim(), notes: notes.trim() || null, ingredients: cleaned });
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(44,40,37,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100, overflowY: "auto" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "20px 20px 0 0", padding: "24px 20px", width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 -4px 30px rgba(0,0,0,0.1)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 20, fontWeight: 800, color: C.text }}>Add Recipe</div>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Recipe name..." style={inputStyle} />
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)..." style={inputStyle} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, marginBottom: 8, fontFamily: "'Nunito', sans-serif" }}>
            Ingredients <span style={{ fontWeight: 400, color: C.textLight }}>(must match item names exactly to check stock)</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ingredients.map((ing, i) => (
              <div key={i} style={{ display: "flex", gap: 8 }}>
                <input
                  value={ing}
                  onChange={(e) => updateIng(i, e.target.value)}
                  placeholder={`Ingredient ${i + 1}...`}
                  style={{ ...inputStyle, flex: 1 }}
                  list="item-suggestions"
                />
                {ingredients.length > 1 && (
                  <button onClick={() => removeIng(i)} style={{ ...btnStyle(), flexShrink: 0 }}>✕</button>
                )}
              </div>
            ))}
            <datalist id="item-suggestions">
              {existingItems.map(item => <option key={item.id} value={item.name} />)}
            </datalist>
          </div>
          <button
            onClick={addIng}
            style={{ marginTop: 8, background: C.accentBg, border: `1px solid ${C.accentBorder}`, color: C.accent, borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}
          >
            + Add ingredient
          </button>
        </div>
        <button onClick={submit} disabled={saving} style={{ background: C.purple, color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 800, cursor: saving ? "wait" : "pointer", fontFamily: "'Nunito', sans-serif", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving..." : "Save Recipe"}
        </button>
      </div>
    </div>
  );
}

// ---- Main App ----
export default function App() {
  const [items, setItems] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [filterStock, setFilterStock] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [lastSynced, setLastSynced] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [itemData, recipeData] = await Promise.all([
        apiFetch("wdwn_items?order=name.asc"),
        apiFetch("wdwn_recipes?order=name.asc"),
      ]);
      setItems(itemData || []);
      setRecipes(recipeData || []);
      setLastSynced(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      setError("Couldn't load. Check connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addItem = async (newItem) => {
    const data = await apiFetch("wdwn_items", { method: "POST", body: JSON.stringify(newItem) });
    if (data && data[0]) setItems(prev => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const updateItem = async (id, changes) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...changes } : i));
    await apiFetch(`wdwn_items?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(changes), prefer: "return=minimal" });
  };

  const deleteItem = async (id) => {
    setItems(prev => prev.filter(i => i.id !== id));
    await apiFetch(`wdwn_items?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
  };

  const addRecipe = async (recipe) => {
    const data = await apiFetch("wdwn_recipes", { method: "POST", body: JSON.stringify(recipe) });
    if (data && data[0]) setRecipes(prev => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const deleteRecipe = async (id) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
    await apiFetch(`wdwn_recipes?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
  };

  const needReorder = items.filter(i => itemNeedsReorder(i));
  const outCount = needReorder.length;

  const filtered = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "All" || item.category === filterCat;
    const needsReorder = itemNeedsReorder(item);
    const matchStock = filterStock === "all" || (filterStock === "out" && needsReorder) || (filterStock === "in" && !needsReorder);
    return matchSearch && matchCat && matchStock;
  });

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const catItems = filtered.filter((i) => i.category === cat);
    if (catItems.length) acc[cat] = catItems;
    return acc;
  }, {});

  const tabStyle = (tab) => ({
    flex: 1, padding: "10px 0", border: "none", background: "transparent",
    color: activeTab === tab ? C.accent : C.textLight,
    fontSize: 11, fontWeight: activeTab === tab ? 800 : 600, cursor: "pointer",
    fontFamily: "'Nunito', sans-serif", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 3,
    borderTop: `2px solid ${activeTab === tab ? C.accent : "transparent"}`,
  });

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Nunito', sans-serif", color: C.text, paddingBottom: 80 }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ padding: "18px 16px 12px", borderBottom: `1px solid ${C.borderLight}`, position: "sticky", top: 0, background: C.bg, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 900, fontSize: 22, color: C.text, letterSpacing: "-0.3px" }}>
              What Do We Need? 🛒
            </div>
            <div style={{ fontSize: 11, color: C.textLight, marginTop: 1 }}>
              {lastSynced ? `Last synced ${lastSynced}` : "Syncing..."}
              {outCount > 0 && <span style={{ color: C.red, marginLeft: 8, fontWeight: 700 }}>{outCount} need reorder</span>}
            </div>
          </div>
          <button onClick={load} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.textMid, borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>↻</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "16px 16px 0" }}>

        {/* PANTRY TAB */}
        {activeTab === "home" && (
          <>
            {!loading && items.length > 0 && <Dashboard items={items} />}
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍  Search items..." style={{ ...inputStyle, marginBottom: 10 }} />
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 12 }}>
              {["All", ...CATEGORIES].map((c) => (
                <button key={c} onClick={() => setFilterCat(c)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${filterCat === c ? C.accentBorder : C.border}`, background: filterCat === c ? C.accentBg : "transparent", color: filterCat === c ? C.accent : C.textMid, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Nunito', sans-serif", fontWeight: filterCat === c ? 800 : 600 }}>
                  {c === "All" ? "All" : `${CAT_EMOJI[c]} ${c}`}
                </button>
              ))}
              <button onClick={() => setFilterStock(filterStock === "out" ? "all" : "out")} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${filterStock === "out" ? C.redBorder : C.border}`, background: filterStock === "out" ? C.redBg : "transparent", color: filterStock === "out" ? C.red : C.textMid, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Nunito', sans-serif", fontWeight: filterStock === "out" ? 800 : 600 }}>
                🚨 Need reorder
              </button>
            </div>
            {error && <div style={{ color: C.red, background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, fontFamily: "'Nunito', sans-serif" }}>{error}</div>}
            {loading ? (
              <div style={{ color: C.textLight, textAlign: "center", paddingTop: 40, fontFamily: "'Nunito', sans-serif" }}>Loading your pantry...</div>
            ) : filtered.length === 0 ? (
              <div style={{ color: C.textLight, textAlign: "center", paddingTop: 40, fontFamily: "'Nunito', sans-serif" }}>
                {search ? `Nothing found for "${search}"` : "No items yet — tap + to add one!"}
              </div>
            ) : (
              Object.entries(grouped).map(([cat, catItems]) => (
                <div key={cat} style={{ marginBottom: 22 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: C.textMid, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8, fontFamily: "'Nunito', sans-serif" }}>
                    {CAT_EMOJI[cat]} {cat}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {catItems.map((item) => <ItemCard key={item.id} item={item} onUpdate={updateItem} onDelete={deleteItem} />)}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* NEED TAB */}
        {activeTab === "need" && (
          <>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 17, color: C.text, marginBottom: 14 }}>Shopping List 🛒</div>
            {needReorder.length === 0 ? (
              <div style={{ color: C.textLight, textAlign: "center", paddingTop: 40, fontFamily: "'Nunito', sans-serif" }}>You're all stocked up! 🎉</div>
            ) : (
              CATEGORIES.map(cat => {
                const outItems = needReorder.filter(i => i.category === cat);
                if (!outItems.length) return null;
                return (
                  <div key={cat} style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: C.textMid, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8, fontFamily: "'Nunito', sans-serif" }}>
                      {CAT_EMOJI[cat]} {cat}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {outItems.map(item => {
                        const expired = isExpired(item.expires_at);
                        const reason = expired ? "Expired" : "Out of stock";
                        const rc = expired ? C.orange : C.red;
                        const rb = expired ? C.orangeBg : C.redBg;
                        const rbr = expired ? C.orangeBorder : C.redBorder;
                        return (
                          <div key={item.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                            <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 15, color: C.text }}>{item.name}</span>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <span style={pillStyle(rc, rb, rbr)}>{reason}</span>
                              <button
                                onClick={() => updateItem(item.id, { full_count: 1, expires_at: null })}
                                style={{ background: C.greenBg, border: `1px solid ${C.greenBorder}`, color: C.green, borderRadius: 8, padding: "4px 10px", fontSize: 12, cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}
                              >
                                Got it ✓
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {/* RECIPES TAB */}
        {activeTab === "recipes" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 17, color: C.text }}>Recipes 🍽️</div>
              <button
                onClick={() => setShowAddRecipe(true)}
                style={{ background: C.purpleBg, border: `1px solid ${C.purpleBorder}`, color: C.purple, borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontWeight: 800 }}
              >
                + Add Recipe
              </button>
            </div>
            {recipes.length === 0 ? (
              <div style={{ color: C.textLight, textAlign: "center", paddingTop: 40, fontFamily: "'Nunito', sans-serif" }}>No recipes yet — add one to check if you're stocked up!</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} items={items} onDelete={deleteRecipe} />)}
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB - only on home and need tabs */}
      {activeTab !== "recipes" && (
        <button
          onClick={() => setShowAdd(true)}
          style={{ position: "fixed", bottom: 72, right: 18, width: 52, height: 52, borderRadius: "50%", background: C.green, border: "none", color: "#fff", fontSize: 26, fontWeight: 300, cursor: "pointer", boxShadow: "0 4px 16px rgba(90,158,117,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
        >
          +
        </button>
      )}

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 20 }}>
        <button style={tabStyle("home")} onClick={() => setActiveTab("home")}>
          <span style={{ fontSize: 18 }}>🏠</span><span>Pantry</span>
        </button>
        <button style={tabStyle("need")} onClick={() => setActiveTab("need")}>
          <span style={{ fontSize: 18 }}>🛒</span><span>Need {outCount > 0 ? `(${outCount})` : ""}</span>
        </button>
        <button style={tabStyle("recipes")} onClick={() => setActiveTab("recipes")}>
          <span style={{ fontSize: 18 }}>🍽️</span><span>Recipes</span>
        </button>
      </div>

      {showAdd && <AddItemModal onAdd={addItem} onClose={() => setShowAdd(false)} />}
      {showAddRecipe && <AddRecipeModal onAdd={addRecipe} onClose={() => setShowAddRecipe(false)} existingItems={items} />}
    </div>
  );
}
