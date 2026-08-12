import { useState } from "react";
import { PageHeader, Card, Modal, EmptyState } from "../components/ui.jsx";
import { Icon, EQUIPMENT_ICONS } from "../components/Icons.jsx";
import { BASE, F, DAY_NAMES, hardShadow } from "../lib/theme.js";

const MEALS = ["Breakfast", "Lunch", "Dinner"];
const RECIPE_TAGS = ["Quick", "Dinner", "Lunch", "Breakfast", "Crockpot", "Dump & Go"];
const EQUIPMENT = Object.keys(EQUIPMENT_ICONS);
const EST_TIMES = ["5 min", "10 min", "15 min", "30 min", "45 min", "1 hr", "2 hr", "3 hr", "4 hr", "5 hr", "6 hr"];
const MEAL_COLOR = { Breakfast: BASE.yellow, Lunch: BASE.teal, Dinner: BASE.lilac };
const inp = { background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, fontFamily: F.ui, width: "100%", boxSizing: "border-box" };
const label = { fontSize: 11, fontWeight: 800, color: BASE.t2, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: F.ui, marginBottom: 6, display: "block" };
const btn = (bg) => ({ background: bg, color: BASE.ink, border: `2.5px solid ${BASE.ink}`, borderRadius: 999, padding: "8px 14px", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: F.ui, boxShadow: hardShadow(BASE.ink, 3, 3) });

function RecipeViewModal({ recipe, onClose, onEdit }) {
  return (
    <Modal onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 22 }}>{recipe.name}</div>
        <button onClick={() => onEdit(recipe)} style={btn(BASE.yellow)}>Edit</button>
      </div>
      {recipe.est_time && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: F.ui, fontSize: 13, fontWeight: 700, color: BASE.t2, marginBottom: 10 }}>
          <Icon name="clock" size={15} /> {recipe.est_time}
        </div>
      )}
      {(recipe.equipment || []).length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {recipe.equipment.map((e) => (
            <div key={e} style={{ display: "flex", alignItems: "center", gap: 6, background: BASE.muted, border: `1.5px solid ${BASE.ink}`, borderRadius: 999, padding: "5px 12px" }}>
              <Icon name={EQUIPMENT_ICONS[e] || "oven"} size={15} />
              <span style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 700 }}>{e}</span>
            </div>
          ))}
        </div>
      )}
      {(recipe.tags || []).length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {recipe.tags.map((t) => <span key={t} style={{ fontSize: 11, fontWeight: 700, color: BASE.brandText || BASE.ink, background: BASE.teal, border: `1.5px solid ${BASE.ink}`, padding: "2px 10px", borderRadius: 999, fontFamily: F.ui }}>{t}</span>)}
        </div>
      )}
      <div style={label}>Ingredients</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
        {(recipe.ingredients || []).map((ing, i) => (
          <div key={i} style={{ fontFamily: F.ui, fontSize: 14 }}>• {ing}</div>
        ))}
      </div>
      {recipe.notes && (
        <>
          <div style={label}>Notes</div>
          <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2, fontStyle: "italic" }}>{recipe.notes}</div>
        </>
      )}
    </Modal>
  );
}

function RecipeModal({ recipe, onSave, onDelete, onClose }) {
  const [name, setName] = useState(recipe?.name || "");
  const [ingredients, setIngredients] = useState((recipe?.ingredients || [""]).join("\n"));
  const [tags, setTags] = useState(recipe?.tags || []);
  const [equipment, setEquipment] = useState(recipe?.equipment || []);
  const [estTime, setEstTime] = useState(recipe?.est_time || "");
  const [notes, setNotes] = useState(recipe?.notes || "");
  const toggle = (setter) => (val) => setter((p) => (p.includes(val) ? p.filter((x) => x !== val) : [...p, val]));
  const toggleTag = toggle(setTags);
  const toggleEquip = toggle(setEquipment);

  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, marginBottom: 14 }}>{recipe?.id ? "Edit Recipe" : "New Recipe"}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><span style={label}>Name</span><input autoFocus style={inp} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><span style={label}>Ingredients (one per line)</span><textarea style={{ ...inp, minHeight: 90 }} value={ingredients} onChange={(e) => setIngredients(e.target.value)} /></div>
        <div><span style={label}>Est. Time</span>
          <select style={inp} value={estTime} onChange={(e) => setEstTime(e.target.value)}>
            <option value="">Select...</option>
            {EST_TIMES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div><span style={label}>Equipment</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {EQUIPMENT.map((e) => (
              <button key={e} onClick={() => toggleEquip(e)} style={{ ...btn(equipment.includes(e) ? BASE.lilac : "#fff"), display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name={EQUIPMENT_ICONS[e]} size={14} /> {e}
              </button>
            ))}
          </div>
        </div>
        <div><span style={label}>Tags</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {RECIPE_TAGS.map((t) => <button key={t} onClick={() => toggleTag(t)} style={btn(tags.includes(t) ? BASE.teal : "#fff")}>{t}</button>)}
          </div>
        </div>
        <div><span style={label}>Notes</span><input style={inp} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <button
          style={{ ...btn(BASE.green), width: "100%" }}
          onClick={() => {
            const ing = ingredients.split("\n").map((s) => s.trim()).filter(Boolean);
            if (!name.trim() || !ing.length) return;
            onSave({ id: recipe?.id, name: name.trim(), ingredients: ing, tags, equipment, est_time: estTime || null, notes: notes.trim() || null });
          }}
        >
          Save Recipe
        </button>
        {recipe?.id && (
          <button style={{ ...btn(BASE.red), width: "100%" }} onClick={() => { onDelete(recipe.id); onClose(); }}>Delete Recipe</button>
        )}
      </div>
    </Modal>
  );
}

function SlotPickerModal({ day, meal, recipes, onPick, onClose }) {
  const [q, setQ] = useState("");
  const filtered = recipes.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, marginBottom: 4 }}>{day} · {meal}</div>
      <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.t2, marginBottom: 14 }}>Pick a recipe to add</div>
      <input autoFocus style={{ ...inp, marginBottom: 10 }} placeholder="Search recipes..." value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "50vh", overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t3 }}>No recipes match.</div>
        ) : (
          filtered.map((r) => (
            <div key={r.id} onClick={() => onPick(r)} style={{ background: BASE.muted, border: `1.5px solid ${BASE.ink}`, borderRadius: 10, padding: "8px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 13 }}>{r.name}</span>
              <Icon name="chevronRight" size={14} />
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

function RecipeLibrary({ recipes, open, setOpen, onAddNew, onView }) {
  const [q, setQ] = useState("");
  const filtered = recipes.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={{ borderTop: open ? `2.5px solid ${BASE.ink}` : "none" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", textAlign: "left", background: BASE.yellow, border: `2.5px solid ${BASE.ink}`, borderRadius: 14, padding: "12px 16px", fontFamily: F.display, fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: hardShadow(BASE.ink, 3, 3), margin: "18px 0" }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="book" size={18} /> Recipe Library ({recipes.length})</span>
        <Icon name="chevronDown" size={16} style={{ transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input style={{ ...inp, flex: 1 }} placeholder="Search recipes..." value={q} onChange={(e) => setQ(e.target.value)} />
            <button style={btn(BASE.pink)} onClick={onAddNew}>+ New</button>
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon="book" text="No recipes yet" />
          ) : (
            filtered.map((r) => (
              <div
                key={r.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/recipe-id", String(r.id))}
                onClick={() => onView(r)}
                style={{ background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 12, padding: "10px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}
              >
                <div>
                  <div style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 13 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: BASE.t3, fontFamily: F.ui }}>{r.est_time ? `${r.est_time} · ` : ""}{(r.tags || []).join(", ")}</div>
                </div>
                <Icon name="chevronRight" size={16} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function Meals({ recipes, mealPlan, onSaveRecipe, onDeleteRecipe, onScheduleRecipe, onMoveSlot, onRemoveSlot }) {
  const [libOpen, setLibOpen] = useState(false);
  const [recipeModal, setRecipeModal] = useState(null);
  const [viewRecipe, setViewRecipe] = useState(null);
  const [pickerSlot, setPickerSlot] = useState(null);

  const slotFor = (day, meal) => mealPlan.find((s) => s.day === day && s.meal === meal);

  const handleDrop = (e, day, meal) => {
    e.preventDefault();
    const recipeId = e.dataTransfer.getData("text/recipe-id");
    const slotId = e.dataTransfer.getData("text/slot-id");
    if (recipeId) {
      const recipe = recipes.find((r) => r.id === Number(recipeId));
      if (recipe) onScheduleRecipe(day, meal, recipe);
    } else if (slotId) {
      onMoveSlot(Number(slotId), day, meal);
    }
  };

  return (
    <div>
      <PageHeader title="Meals" sprinkles="meals" />
      <div style={{ padding: "18px 16px 32px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {DAY_NAMES.map((day) => (
            <Card key={day} style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "8px 14px", background: BASE.muted, borderBottom: `2px solid ${BASE.ink}`, fontFamily: F.ui, fontWeight: 800, fontSize: 13 }}>{day}</div>
              {MEALS.map((meal) => {
                const slot = slotFor(day, meal);
                return (
                  <div key={meal} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, day, meal)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderTop: `1px solid ${BASE.muted}` }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: BASE.t2, minWidth: 66, fontFamily: F.ui }}>
                      <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: MEAL_COLOR[meal], marginRight: 6, border: `1px solid ${BASE.ink}` }} />
                      {meal}
                    </span>
                    {slot ? (
                      <div
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/slot-id", String(slot.id))}
                        onClick={() => { const r = recipes.find((x) => x.id === slot.recipe_id); if (r) setViewRecipe(r); }}
                        style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: `1.5px solid ${BASE.ink}`, borderRadius: 8, padding: "5px 10px", cursor: "grab" }}
                      >
                        <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 13 }}>{slot.recipe_name}</span>
                        <button onClick={(e) => { e.stopPropagation(); onRemoveSlot(slot.id); }} style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex" }}><Icon name="close" size={13} /></button>
                      </div>
                    ) : (
                      <div
                        onClick={() => setPickerSlot({ day, meal })}
                        style={{ flex: 1, border: `1.5px dashed ${BASE.t3}`, borderRadius: 8, padding: "5px 10px", fontSize: 12, color: BASE.t3, fontFamily: F.ui, cursor: "pointer" }}
                      >
                        + Add a recipe
                      </div>
                    )}
                  </div>
                );
              })}
            </Card>
          ))}
        </div>

        <RecipeLibrary recipes={recipes} open={libOpen} setOpen={setLibOpen} onAddNew={() => setRecipeModal({})} onView={setViewRecipe} />
      </div>

      {viewRecipe && <RecipeViewModal recipe={viewRecipe} onClose={() => setViewRecipe(null)} onEdit={(r) => { setViewRecipe(null); setRecipeModal(r); }} />}
      {pickerSlot && (
        <SlotPickerModal
          day={pickerSlot.day}
          meal={pickerSlot.meal}
          recipes={recipes}
          onPick={(r) => { onScheduleRecipe(pickerSlot.day, pickerSlot.meal, r); setPickerSlot(null); }}
          onClose={() => setPickerSlot(null)}
        />
      )}
      {recipeModal && (
        <RecipeModal
          recipe={recipeModal.id ? recipeModal : null}
          onSave={(r) => { onSaveRecipe(r); setRecipeModal(null); }}
          onDelete={onDeleteRecipe}
          onClose={() => setRecipeModal(null)}
        />
      )}
    </div>
  );
}
