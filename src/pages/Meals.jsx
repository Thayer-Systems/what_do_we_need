import { useState } from "react";
import { PageHeader, Card, Modal, Chip, EmptyState } from "../components/ui.jsx";
import { BASE, F, DAY_NAMES, hardShadow } from "../lib/theme.js";

const MEALS = ["Breakfast", "Lunch", "Dinner"];
const RECIPE_TAGS = ["Quick", "Dinner", "Lunch", "Breakfast", "Crockpot", "Dump & Go"];
const MEAL_COLOR = { Breakfast: BASE.yellow, Lunch: BASE.teal, Dinner: BASE.lilac };
const inp = { background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, fontFamily: F.ui, width: "100%", boxSizing: "border-box" };
const label = { fontSize: 11, fontWeight: 800, color: BASE.t2, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: F.ui, marginBottom: 6, display: "block" };
const btn = (bg) => ({ background: bg, color: BASE.ink, border: `2.5px solid ${BASE.ink}`, borderRadius: 999, padding: "8px 14px", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: F.ui, boxShadow: hardShadow(BASE.ink, 3, 3) });

function RecipeModal({ recipe, onSave, onClose }) {
  const [name, setName] = useState(recipe?.name || "");
  const [ingredients, setIngredients] = useState((recipe?.ingredients || [""]).join("\n"));
  const [tags, setTags] = useState(recipe?.tags || []);
  const [notes, setNotes] = useState(recipe?.notes || "");
  const toggle = (t) => setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, marginBottom: 14 }}>{recipe?.id ? "Edit Recipe" : "New Recipe"}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><span style={label}>Name</span><input autoFocus style={inp} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><span style={label}>Ingredients (one per line)</span><textarea style={{ ...inp, minHeight: 90 }} value={ingredients} onChange={(e) => setIngredients(e.target.value)} /></div>
        <div><span style={label}>Tags</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {RECIPE_TAGS.map((t) => <button key={t} onClick={() => toggle(t)} style={btn(tags.includes(t) ? BASE.teal : "#fff")}>{t}</button>)}
          </div>
        </div>
        <div><span style={label}>Notes</span><input style={inp} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <button
          style={{ ...btn(BASE.green), width: "100%" }}
          onClick={() => {
            const ing = ingredients.split("\n").map((s) => s.trim()).filter(Boolean);
            if (!name.trim() || !ing.length) return;
            onSave({ id: recipe?.id, name: name.trim(), ingredients: ing, tags, notes: notes.trim() || null });
          }}
        >
          Save Recipe
        </button>
      </div>
    </Modal>
  );
}

function RecipeLibrary({ recipes, open, setOpen, onAddNew, onEdit, onDelete }) {
  const [q, setQ] = useState("");
  const filtered = recipes.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={{ borderTop: open ? `2.5px solid ${BASE.ink}` : "none" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", textAlign: "left", background: BASE.yellow, border: `2.5px solid ${BASE.ink}`, borderRadius: 14, padding: "12px 16px", fontFamily: F.display, fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", justifyContent: "space-between", boxShadow: hardShadow(BASE.ink, 3, 3), margin: "18px 0" }}
      >
        <span>📖 Recipe Library ({recipes.length})</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input style={{ ...inp, flex: 1 }} placeholder="Search recipes..." value={q} onChange={(e) => setQ(e.target.value)} />
            <button style={btn(BASE.pink)} onClick={onAddNew}>+ New</button>
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon="🍳" text="No recipes yet" />
          ) : (
            filtered.map((r) => (
              <div
                key={r.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/recipe-id", String(r.id))}
                style={{ background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 12, padding: "10px 12px", cursor: "grab", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}
              >
                <div>
                  <div style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 13 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: BASE.t3, fontFamily: F.ui }}>{(r.tags || []).join(", ")}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => onEdit(r)} style={{ ...btn("#fff"), padding: "4px 9px", fontSize: 11 }}>Edit</button>
                  <button onClick={() => onDelete(r.id)} style={{ ...btn(BASE.red), padding: "4px 9px", fontSize: 11 }}>Del</button>
                </div>
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
      <PageHeader title="Meals" />
      <div style={{ padding: "18px 16px 32px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {DAY_NAMES.map((day) => (
            <Card key={day} style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "8px 14px", background: BASE.muted, borderBottom: `2px solid ${BASE.ink}`, fontFamily: F.ui, fontWeight: 800, fontSize: 13 }}>{day}</div>
              {MEALS.map((meal) => {
                const slot = slotFor(day, meal);
                return (
                  <div
                    key={meal}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, day, meal)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderTop: `1px solid ${BASE.muted}` }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: BASE.t2, minWidth: 66, fontFamily: F.ui }}>
                      <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: MEAL_COLOR[meal], marginRight: 6, border: `1px solid ${BASE.ink}` }} />
                      {meal}
                    </span>
                    {slot ? (
                      <div
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/slot-id", String(slot.id))}
                        style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: `1.5px solid ${BASE.ink}`, borderRadius: 8, padding: "5px 10px", cursor: "grab" }}
                      >
                        <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 13 }}>{slot.recipe_name}</span>
                        <button onClick={() => onRemoveSlot(slot.id)} style={{ border: "none", background: "transparent", fontSize: 12, cursor: "pointer" }}>✕</button>
                      </div>
                    ) : (
                      <div style={{ flex: 1, border: `1.5px dashed ${BASE.t3}`, borderRadius: 8, padding: "5px 10px", fontSize: 12, color: BASE.t3, fontFamily: F.ui }}>Drop a recipe here</div>
                    )}
                  </div>
                );
              })}
            </Card>
          ))}
        </div>

        <RecipeLibrary
          recipes={recipes}
          open={libOpen}
          setOpen={setLibOpen}
          onAddNew={() => setRecipeModal({})}
          onEdit={setRecipeModal}
          onDelete={onDeleteRecipe}
        />
      </div>

      {recipeModal && (
        <RecipeModal
          recipe={recipeModal.id ? recipeModal : null}
          onSave={(r) => { onSaveRecipe(r); setRecipeModal(null); }}
          onClose={() => setRecipeModal(null)}
        />
      )}
    </div>
  );
}
