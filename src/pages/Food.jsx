import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader, Card, Modal, EmptyState } from "../components/ui.jsx";
import { IconBadge } from "../components/Deco.jsx";
import { Icon, EQUIPMENT_ICONS } from "../components/Icons.jsx";
import { BarChart } from "../components/Charts.jsx";
import { BASE, F, hardShadow } from "../lib/theme.js";
import { useRouter } from "../lib/router.jsx";
import { FOLDERS, FOLDER_LABELS, WEEKLY_FOLDERS, WEEK_DAYS, getActiveWeekTag, folderForWeekTag, shuffle } from "../lib/weekPlan.js";

const RECIPE_TAGS = ["Quick", "Dinner", "Lunch", "Breakfast", "Crockpot", "Dump & Go"];
const EQUIPMENT = Object.keys(EQUIPMENT_ICONS);
const EST_TIMES = ["5 min", "10 min", "15 min", "30 min", "45 min", "1 hr", "2 hr", "3 hr", "4 hr", "5 hr", "6 hr"];
const MEAL_COLOR = { Breakfast: BASE.yellow, Lunch: BASE.teal, Dinner: BASE.lilac };
const inp = { background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, fontFamily: F.ui, width: "100%", boxSizing: "border-box" };
const label = { fontSize: 11, fontWeight: 800, color: BASE.t2, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: F.ui, marginBottom: 6, display: "block" };
const btn = (bg) => ({ background: bg, color: BASE.ink, border: `2.5px solid ${BASE.ink}`, borderRadius: 999, padding: "8px 14px", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: F.ui, boxShadow: hardShadow(BASE.ink, 3, 3) });

function mondayOfThisWeek() {
  const today = new Date();
  const dow = today.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
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

function RecipeModal({ recipe, defaultFolder, onSave, onDelete, onClose }) {
  const [name, setName] = useState(recipe?.name || "");
  const [ingredients, setIngredients] = useState((recipe?.ingredients || [""]).join("\n"));
  const [tags, setTags] = useState(recipe?.tags || []);
  const [equipment, setEquipment] = useState(recipe?.equipment || []);
  const [estTime, setEstTime] = useState(recipe?.est_time || "");
  const [notes, setNotes] = useState(recipe?.notes || "");
  const [folder, setFolder] = useState(recipe?.folder || defaultFolder || "");
  const [dayOfWeek, setDayOfWeek] = useState(recipe?.day_of_week || "");
  const toggle = (setter) => (val) => setter((p) => (p.includes(val) ? p.filter((x) => x !== val) : [...p, val]));
  const toggleTag = toggle(setTags);
  const toggleEquip = toggle(setEquipment);
  const isWeekly = WEEKLY_FOLDERS.includes(folder);

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
        <div><span style={label}>Folder</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button onClick={() => { setFolder(""); setDayOfWeek(""); }} style={btn(!folder ? BASE.yellow : "#fff")}>Uncategorized</button>
            {FOLDERS.map((f) => (
              <button key={f} onClick={() => { setFolder(f); if (!WEEKLY_FOLDERS.includes(f)) setDayOfWeek(""); }} style={btn(folder === f ? BASE.yellow : "#fff")}>{FOLDER_LABELS[f]}</button>
            ))}
          </div>
        </div>
        {isWeekly && (
          <div><span style={label}>Day of week</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {WEEK_DAYS.map((d) => <button key={d} onClick={() => setDayOfWeek(d)} style={btn(dayOfWeek === d ? BASE.teal : "#fff")}>{d}</button>)}
            </div>
          </div>
        )}
        <button
          style={{ ...btn(BASE.green), width: "100%" }}
          onClick={() => {
            const ing = ingredients.split("\n").map((s) => s.trim()).filter(Boolean);
            if (!name.trim() || !ing.length) return;
            onSave({
              id: recipe?.id, name: name.trim(), ingredients: ing, tags, equipment, est_time: estTime || null, notes: notes.trim() || null,
              folder: folder || null,
              day_of_week: isWeekly ? dayOfWeek || null : null,
              week_tag: isWeekly ? Number(folder.split("-")[1]) : null,
            });
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

// A pool of 10 fallback dinners — 3 random picks, re-rolled whenever this
// view is loaded (no persistence, so navigating away and back re-rolls).
// Square box so it can sit next to the grocery list box.
function AlternativeMealsWidget({ recipes, onView }) {
  const pool = useMemo(() => recipes.filter((r) => r.folder === "alternative-meals"), [recipes]);
  const [picks, setPicks] = useState([]);
  const rolled = useRef(false);

  useEffect(() => {
    if (!rolled.current && pool.length) {
      setPicks(shuffle(pool).slice(0, 3));
      rolled.current = true;
    }
  }, [pool]);

  if (!pool.length) return null;

  return (
    <Card style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>Need Something Different?</span>
        <button onClick={() => setPicks(shuffle(pool).slice(0, 3))} style={{ ...btn("#fff"), display: "flex", alignItems: "center", gap: 6, padding: "6px 12px" }}>
          <Icon name="star" size={13} /> Shuffle
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, justifyContent: "center" }}>
        {picks.map((r) => (
          <div key={r.id} onClick={() => onView(r)} style={{ background: BASE.muted, borderRadius: 8, padding: "10px 12px", cursor: "pointer", fontFamily: F.ui, fontWeight: 700, fontSize: 13 }}>
            {r.name}
          </div>
        ))}
      </div>
    </Card>
  );
}

// Square box mirroring AlternativeMealsWidget, sitting next to it on the
// same row, replacing the old full-width "Grocery List" button.
function GroceryListBox({ shopping, navigate }) {
  return (
    <Card onClick={() => navigate("/food/grocery")} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", textAlign: "center", padding: "24px 16px" }}>
      <IconBadge icon="cart" bg={BASE.orange} size={48} />
      <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 18 }}>Grocery List</span>
      <span style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2, fontWeight: 700 }}>
        {shopping.length === 0 ? "Nothing on the list" : `${shopping.length} item${shopping.length === 1 ? "" : "s"} pending`}
      </span>
    </Card>
  );
}

// This week's already-planned Lunch or Dinner lineup, read straight from
// the meal_plan table. Clicking an empty day opens the recipe picker to add
// a meal; a planned day can be viewed, swapped for another recipe, or
// removed — this is the only place lunches/dinners get edited now that the
// separate "Weekly Add" grid is gone.
function WeekMealsBox({ mealLabel, weekDays, mealPlan, recipes, onView, onPickSlot, onRemoveSlot }) {
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16 }}>This Week's {mealLabel}s</span>
        <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: MEAL_COLOR[mealLabel], border: `1.5px solid ${BASE.ink}` }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {weekDays.map(({ short, date }) => {
          const slot = mealPlan.find((s) => s.day === short && s.meal === mealLabel);
          const recipe = slot && recipes.find((r) => r.id === slot.recipe_id);
          return (
            <div key={short} style={{ display: "flex", alignItems: "center", gap: 10, background: BASE.muted, borderRadius: 8, padding: "6px 10px" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: BASE.t2, minWidth: 60, fontFamily: F.ui }}>{short} {date.getMonth() + 1}/{date.getDate()}</span>
              {slot ? (
                <>
                  <span onClick={() => recipe && onView(recipe)} style={{ flex: 1, fontFamily: F.ui, fontWeight: 700, fontSize: 13, cursor: recipe ? "pointer" : "default" }}>{slot.recipe_name}</span>
                  <button onClick={() => onPickSlot(short, mealLabel)} title="Choose a different meal" style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex", flexShrink: 0, padding: 4 }}><Icon name="edit" size={13} /></button>
                  <button onClick={() => onRemoveSlot(slot.id)} title="Remove" style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex", flexShrink: 0, padding: 4 }}><Icon name="close" size={13} /></button>
                </>
              ) : (
                <span onClick={() => onPickSlot(short, mealLabel)} style={{ flex: 1, fontFamily: F.ui, fontSize: 12, color: BASE.t3, fontStyle: "italic", cursor: "pointer" }}>+ Add a meal</span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Food (weekly plan) ─────────────────────────
const FOOD_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export function FoodWeekPage({ recipes, mealPlan, shopping = [], onSaveRecipe, onDeleteRecipe, onScheduleRecipe, onMoveSlot, onRemoveSlot }) {
  const { navigate } = useRouter();
  const [recipeModal, setRecipeModal] = useState(null);
  const [viewRecipe, setViewRecipe] = useState(null);
  const [pickerSlot, setPickerSlot] = useState(null);
  const [createFromSlot, setCreateFromSlot] = useState(false);

  const weekDays = useMemo(() => {
    const monday = mondayOfThisWeek();
    return FOOD_DAYS.map((short, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return { short, date: d };
    });
  }, []);

  const slotFor = (day, meal) => mealPlan.find((s) => s.day === day && s.meal === meal);

  // The weekly-add grid used to duplicate "This Week's Dinners" (a separate
  // read-only view of the recipe library's rotation folder) — instead,
  // auto-schedule that rotation straight into meal_plan for any Dinner slot
  // that's still empty, so there's one place to see and edit it.
  const attemptedAutofill = useRef(new Set());
  useEffect(() => {
    if (!recipes.length) return;
    const activeWeekTag = getActiveWeekTag();
    const folder = folderForWeekTag(activeWeekTag);
    weekDays.forEach(({ short }) => {
      if (attemptedAutofill.current.has(short)) return;
      if (slotFor(short, "Dinner")) return;
      const recipe = recipes.find((r) => r.folder === folder && r.day_of_week === short);
      if (recipe) {
        attemptedAutofill.current.add(short);
        onScheduleRecipe(short, "Dinner", recipe);
      }
    });
  }, [recipes, mealPlan, weekDays]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 18px) 16px 32px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginBottom: 12 }}>
          <button onClick={() => navigate("/food/recipes")} style={btn("#fff")}><Icon name="book" size={15} /></button>
          <button onClick={() => navigate("/food/trends")} style={btn("#fff")}><Icon name="grid" size={15} /></button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <WeekMealsBox mealLabel="Lunch" weekDays={weekDays} mealPlan={mealPlan} recipes={recipes} onView={setViewRecipe} onPickSlot={(day, meal) => setPickerSlot({ day, meal })} onRemoveSlot={onRemoveSlot} />
            <AlternativeMealsWidget recipes={recipes} onView={setViewRecipe} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <WeekMealsBox mealLabel="Dinner" weekDays={weekDays} mealPlan={mealPlan} recipes={recipes} onView={setViewRecipe} onPickSlot={(day, meal) => setPickerSlot({ day, meal })} onRemoveSlot={onRemoveSlot} />
            <GroceryListBox shopping={shopping} navigate={navigate} />
          </div>
        </div>
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
  const [folderFilter, setFolderFilter] = useState("all");
  const [recipeModal, setRecipeModal] = useState(null);
  const [viewRecipe, setViewRecipe] = useState(null);
  const filtered = recipes.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()) && (folderFilter === "all" || r.folder === folderFilter));

  return (
    <div>
      <PageHeader
        title="Recipe Library"
        sprinkles="meals"
        back={() => navigate("/food")}
        right={<button onClick={() => setRecipeModal({})} style={btn(BASE.pink)}><Icon name="plus" size={15} /></button>}
      />
      <div style={{ padding: "18px 16px 40px" }}>
        <input style={{ ...inp, marginBottom: 10 }} placeholder="Search recipes..." value={q} onChange={(e) => setQ(e.target.value)} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          <button onClick={() => setFolderFilter("all")} style={btn(folderFilter === "all" ? BASE.yellow : "#fff")}>All</button>
          {FOLDERS.map((f) => <button key={f} onClick={() => setFolderFilter(f)} style={btn(folderFilter === f ? BASE.yellow : "#fff")}>{FOLDER_LABELS[f]}</button>)}
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon="book" text="No recipes yet" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((r) => (
              <Card key={r.id} onClick={() => setViewRecipe(r)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div>
                  <div style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 14 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: BASE.t3, fontFamily: F.ui }}>
                    {r.folder ? `${FOLDER_LABELS[r.folder]}${r.day_of_week ? ` · ${r.day_of_week}` : ""} · ` : ""}
                    {r.est_time ? `${r.est_time} · ` : ""}{(r.tags || []).join(", ")}
                  </div>
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
          defaultFolder={folderFilter !== "all" ? folderFilter : ""}
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
