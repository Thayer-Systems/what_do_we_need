import { useMemo, useState } from "react";
import { PageHeader, Card, Modal, EmptyState } from "../components/ui.jsx";
import { IconBadge } from "../components/Deco.jsx";
import { Icon, EQUIPMENT_ICONS } from "../components/Icons.jsx";
import { BarChart } from "../components/Charts.jsx";
import { BASE, F, DAY_NAMES, hardShadow } from "../lib/theme.js";
import { useRouter } from "../lib/router.jsx";

const MEALS = ["Breakfast", "Lunch", "Dinner"];
const RECIPE_TAGS = ["Quick", "Dinner", "Lunch", "Breakfast", "Crockpot", "Dump & Go"];
const EQUIPMENT = Object.keys(EQUIPMENT_ICONS);
const EST_TIMES = ["5 min", "10 min", "15 min", "30 min", "45 min", "1 hr", "2 hr", "3 hr", "4 hr", "5 hr", "6 hr"];
const MEAL_COLOR = { Breakfast: BASE.yellow, Lunch: BASE.teal, Dinner: BASE.lilac };
const inp = { background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, fontFamily: F.ui, width: "100%", boxSizing: "border-box" };
const label = { fontSize: 11, fontWeight: 800, color: BASE.t2, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: F.ui, marginBottom: 6, display: "block" };
const btn = (bg) => ({ background: bg, color: BASE.ink, border: `2.5px solid ${BASE.ink}`, borderRadius: 999, padding: "8px 14px", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: F.ui, boxShadow: hardShadow(BASE.ink, 3, 3) });

function todayFirstDays() {
  const start = new Date().getDay();
  return [...DAY_NAMES.slice(start), ...DAY_NAMES.slice(0, start)];
}

// ─── Food landing dash ─────────────────────────────────────────
const HUB_ITEMS = [
  ["meals", "Meals", BASE.lilac, "/food/meals"],
  ["cart", "Grocery", BASE.orange, "/food/grocery"],
  ["book", "Recipe Library", BASE.teal, "/food/recipes"],
  ["grid", "Trends", BASE.pink, "/food/trends"],
];

export function FoodHub() {
  const { navigate } = useRouter();
  return (
    <div>
      <PageHeader title="Food" sprinkles="meals" />
      <div style={{ padding: "20px 16px 40px", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        {HUB_ITEMS.map(([icon, name, color, path]) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              background: color, border: `2.5px solid ${BASE.ink}`, borderRadius: 18,
              boxShadow: hardShadow(BASE.ink, 4, 4), padding: "26px 14px", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
            }}
          >
            <IconBadge icon={icon} bg="#fff" size={54} radius={16} />
            <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, color: BASE.ink }}>{name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Recipe modals (shared) ────────────────────────────────────
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

function SlotPickerModal({ day, meal, recipes, onPick, onCreateNew, onClose }) {
  const [q, setQ] = useState("");
  const filtered = recipes.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, marginBottom: 4 }}>{day} · {meal}</div>
      <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.t2, marginBottom: 14 }}>Pick a recipe to add, or create a new one</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input autoFocus style={inp} placeholder="Search recipes..." value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={onCreateNew} style={{ ...btn(BASE.pink), flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="plus" size={13} /> New Recipe
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "50vh", overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t3 }}>No recipes match — create a new one above.</div>
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

// ─── Meals (weekly plan grid) ───────────────────────────────────
export function MealsPage({ recipes, mealPlan, onSaveRecipe, onDeleteRecipe, onScheduleRecipe, onMoveSlot, onRemoveSlot }) {
  const { navigate } = useRouter();
  const [recipeModal, setRecipeModal] = useState(null);
  const [viewRecipe, setViewRecipe] = useState(null);
  const [pickerSlot, setPickerSlot] = useState(null);
  const [createFromSlot, setCreateFromSlot] = useState(false);
  const days = useMemo(todayFirstDays, []);

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
      <PageHeader title="Meals" sprinkles="meals" back={() => navigate("/food")} />
      <div style={{ padding: "18px 16px 32px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {days.map((day, i) => (
            <Card key={day} style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "8px 14px", background: i === 0 ? BASE.yellow : BASE.muted, borderBottom: `2px solid ${BASE.ink}`, fontFamily: F.ui, fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                {i === 0 ? "Today" : day}
                {i === 0 && <span style={{ fontWeight: 600, fontSize: 11, color: BASE.t2 }}>· {day}</span>}
              </div>
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
        <button onClick={() => navigate("/food/recipes")} style={{ ...btn(BASE.teal), width: "100%", marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Icon name="book" size={15} /> Browse Recipe Library
        </button>
      </div>

      {viewRecipe && <RecipeViewModal recipe={viewRecipe} onClose={() => setViewRecipe(null)} onEdit={(r) => { setViewRecipe(null); setRecipeModal(r); }} />}
      {pickerSlot && (
        <SlotPickerModal
          day={pickerSlot.day}
          meal={pickerSlot.meal}
          recipes={recipes}
          onPick={(r) => { onScheduleRecipe(pickerSlot.day, pickerSlot.meal, r); setPickerSlot(null); }}
          onCreateNew={() => { setCreateFromSlot(true); setRecipeModal({}); }}
          onClose={() => setPickerSlot(null)}
        />
      )}
      {recipeModal && (
        <RecipeModal
          recipe={recipeModal.id ? recipeModal : null}
          onSave={async (r) => {
            const saved = await onSaveRecipe(r);
            if (createFromSlot && pickerSlot && (saved || r.id)) {
              const toSchedule = saved || recipes.find((x) => x.id === r.id) || r;
              onScheduleRecipe(pickerSlot.day, pickerSlot.meal, toSchedule);
            }
            setCreateFromSlot(false);
            setRecipeModal(null);
            setPickerSlot(null);
          }}
          onDelete={onDeleteRecipe}
          onClose={() => { setRecipeModal(null); setCreateFromSlot(false); }}
        />
      )}
    </div>
  );
}

// ─── Recipe library (standalone) ────────────────────────────────
export function RecipeLibraryPage({ recipes, onSaveRecipe, onDeleteRecipe }) {
  const { navigate } = useRouter();
  const [q, setQ] = useState("");
  const [recipeModal, setRecipeModal] = useState(null);
  const [viewRecipe, setViewRecipe] = useState(null);
  const filtered = recipes.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Recipe Library"
        sprinkles="meals"
        back={() => navigate("/food")}
        right={<button onClick={() => setRecipeModal({})} style={btn(BASE.pink)}><Icon name="plus" size={15} /></button>}
      />
      <div style={{ padding: "18px 16px 40px" }}>
        <input style={{ ...inp, marginBottom: 14 }} placeholder="Search recipes..." value={q} onChange={(e) => setQ(e.target.value)} />
        {filtered.length === 0 ? (
          <EmptyState icon="book" text="No recipes yet" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((r) => (
              <Card key={r.id} onClick={() => setViewRecipe(r)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div>
                  <div style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 14 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: BASE.t3, fontFamily: F.ui }}>{r.est_time ? `${r.est_time} · ` : ""}{(r.tags || []).join(", ")}</div>
                </div>
                <Icon name="chevronRight" size={16} />
              </Card>
            ))}
          </div>
        )}
      </div>

      {viewRecipe && <RecipeViewModal recipe={viewRecipe} onClose={() => setViewRecipe(null)} onEdit={(r) => { setViewRecipe(null); setRecipeModal(r); }} />}
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

// ─── Trends ──────────────────────────────────────────────────────
const FOOD_GROUPS = {
  Produce: ["lettuce", "tomato", "onion", "pepper", "carrot", "broccoli", "spinach", "potato", "garlic", "apple", "banana", "berries", "lemon", "lime", "avocado", "celery", "cucumber", "corn", "squash", "mushroom", "fruit", "vegetable", "salad", "greens"],
  Protein: ["chicken", "beef", "pork", "turkey", "fish", "salmon", "shrimp", "egg", "beans", "tofu", "sausage", "bacon", "steak", "ground beef", "lentil"],
  Dairy: ["milk", "cheese", "butter", "yogurt", "cream", "sour cream"],
  Grains: ["rice", "pasta", "bread", "tortilla", "oats", "flour", "noodle", "quinoa", "cereal"],
  "Pantry & Other": [],
};
function categorize(name) {
  const n = name.toLowerCase();
  for (const [group, words] of Object.entries(FOOD_GROUPS)) {
    if (words.some((w) => n.includes(w))) return group;
  }
  return "Pantry & Other";
}

export function TrendsPage({ recipes, mealPlan, shopping }) {
  const { navigate } = useRouter();

  const ingredientCounts = useMemo(() => {
    const counts = {};
    recipes.forEach((r) => (r.ingredients || []).forEach((ing) => {
      const key = ing.trim().toLowerCase();
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [recipes]);

  const mealCounts = useMemo(() => {
    const counts = {};
    mealPlan.forEach((s) => { counts[s.recipe_name] = (counts[s.recipe_name] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [mealPlan]);

  const groupCounts = useMemo(() => {
    const counts = Object.fromEntries(Object.keys(FOOD_GROUPS).map((g) => [g, 0]));
    recipes.forEach((r) => (r.ingredients || []).forEach((ing) => { counts[categorize(ing)]++; }));
    shopping.forEach((s) => { counts[categorize(s.name)]++; });
    return counts;
  }, [recipes, shopping]);

  const groupData = Object.entries(groupCounts).map(([label, value]) => ({ label: label.split(" ")[0], value }));
  const maxGroup = Math.max(1, ...Object.values(groupCounts));
  const underRepresented = Object.entries(groupCounts).filter(([, v]) => v <= maxGroup * 0.25).map(([g]) => g);

  return (
    <div>
      <PageHeader title="Trends" sprinkles="meals" back={() => navigate("/food")} />
      <div style={{ padding: "18px 16px 40px", display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Most-used ingredients</div>
          <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.t2, marginBottom: 12 }}>Across your recipe library</div>
          {ingredientCounts.length === 0 ? (
            <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t3 }}>Add some recipes to see trends.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ingredientCounts.map(([name, count]) => (
                <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: BASE.muted, borderRadius: 8, padding: "6px 10px", border: `1.5px solid ${BASE.ink}` }}>
                  <span style={{ fontFamily: F.ui, fontSize: 13, fontWeight: 700, textTransform: "capitalize" }}>{name}</span>
                  <span style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 800, color: BASE.t2 }}>×{count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Most common meals</div>
          <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.t2, marginBottom: 12 }}>Scheduled this week</div>
          {mealCounts.length === 0 ? (
            <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t3 }}>Nothing planned this week yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {mealCounts.map(([name, count]) => (
                <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: BASE.muted, borderRadius: 8, padding: "6px 10px", border: `1.5px solid ${BASE.ink}` }}>
                  <span style={{ fontFamily: F.ui, fontSize: 13, fontWeight: 700 }}>{name}</span>
                  <span style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 800, color: BASE.t2 }}>×{count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Food groups</div>
          <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.t2, marginBottom: 12 }}>Combined from recipes + grocery list</div>
          <BarChart data={groupData} color={BASE.green} />
          {underRepresented.length > 0 && (
            <div style={{ marginTop: 12, fontFamily: F.ui, fontSize: 12, color: BASE.t2 }}>
              <b>Under-represented:</b> {underRepresented.join(", ")} — consider adding a recipe or grocery item from these groups.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
