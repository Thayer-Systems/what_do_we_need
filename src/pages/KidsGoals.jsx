import { useMemo, useState } from "react";
import { PageHeader, Modal, EmptyState } from "../components/ui.jsx";
import { IconBadge } from "../components/Deco.jsx";
import { Icon } from "../components/Icons.jsx";
import { BarChart, ProgressBar } from "../components/Charts.jsx";
import { BASE, F, hardShadow } from "../lib/theme.js";
import { useRouter } from "../lib/router.jsx";
import { coinBalance, daysUntilCashIn } from "../lib/coins.js";
import { choreAppliesToday } from "../lib/tasks.js";
import { ChoreModal } from "./Tasks.jsx";

const btn = (bg) => ({ background: bg, color: BASE.ink, border: `2.5px solid ${BASE.ink}`, borderRadius: 999, padding: "8px 16px", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: F.ui, boxShadow: hardShadow(BASE.ink, 3, 3) });
const inp = { background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, fontFamily: F.ui, width: "100%", boxSizing: "border-box" };

function KidPicker({ kids, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {kids.map((k) => (
        <button
          key={k.id}
          onClick={() => onChange(k.id)}
          style={{ ...btn(value === k.id ? k.color : "#fff"), color: value === k.id ? "#fff" : BASE.ink, display: "flex", alignItems: "center", gap: 6 }}
        >
          <IconBadge icon={k.icon} bg={value === k.id ? "#fff" : k.color} size={22} radius={7} iconColor={value === k.id ? k.color : "#fff"} /> {k.name}
        </button>
      ))}
    </div>
  );
}

function SubmitError({ error }) {
  if (!error) return null;
  return <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 700, color: BASE.red, marginTop: 10 }}>Couldn't save that: {error}</div>;
}

// Custom-amount coin adjuster. The reason field doubles as a rule picker —
// choosing a rule auto-fills the amount and +/- direction from it; picking
// "Custom reason" clears that and lets the free-text field + amount box
// take over.
function QuickAdjustModal({ kids, coinRules, onSubmit, onClose }) {
  const [kidId, setKidId] = useState(kids[0]?.id ?? null);
  const [amount, setAmount] = useState("1");
  const [sign, setSign] = useState(1);
  const [ruleId, setRuleId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const gives = coinRules.filter((r) => r.delta > 0).sort((a, b) => a.delta - b.delta || a.sort_order - b.sort_order);
  const takes = coinRules.filter((r) => r.delta < 0).sort((a, b) => b.delta - a.delta || a.sort_order - b.sort_order);

  const handleRulePick = (value) => {
    setRuleId(value);
    if (!value) return;
    const rule = coinRules.find((r) => String(r.id) === value);
    if (rule) {
      setAmount(String(Math.abs(rule.delta)));
      setSign(rule.delta > 0 ? 1 : -1);
      setReason(rule.label);
    }
  };

  const numericAmount = Math.max(1, Math.round(Math.abs(Number(amount)) || 1));

  const submit = async () => {
    setBusy(true);
    setError(null);
    const result = await onSubmit({ member_id: kidId, delta: numericAmount * sign, reason: reason.trim() || null, rule_id: ruleId ? Number(ruleId) : null });
    setBusy(false);
    if (result?.ok) onClose();
    else setError(result?.error || "Unknown error");
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, marginBottom: 14 }}>Adjust Coins</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><span style={{ fontSize: 11, fontWeight: 800, color: BASE.t2, textTransform: "uppercase", fontFamily: F.ui, marginBottom: 6, display: "block" }}>Kid</span><KidPicker kids={kids} value={kidId} onChange={setKidId} /></div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setSign(1)} style={btn(sign === 1 ? BASE.green : "#fff")}>+ Give</button>
          <button onClick={() => setSign(-1)} style={btn(sign === -1 ? BASE.red : "#fff")}>− Take</button>
        </div>
        <div>
          <span style={{ fontSize: 11, fontWeight: 800, color: BASE.t2, textTransform: "uppercase", fontFamily: F.ui, marginBottom: 6, display: "block" }}>Amount</span>
          <input
            type="number"
            min={1}
            style={inp}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={() => setAmount(String(numericAmount))}
          />
        </div>
        <div>
          <span style={{ fontSize: 11, fontWeight: 800, color: BASE.t2, textTransform: "uppercase", fontFamily: F.ui, marginBottom: 6, display: "block" }}>Reason</span>
          <select style={inp} value={ruleId} onChange={(e) => handleRulePick(e.target.value)}>
            <option value="">Custom reason…</option>
            <optgroup label="Coins Given For">
              {gives.map((r) => <option key={r.id} value={r.id}>+{r.delta} · {r.label}</option>)}
            </optgroup>
            <optgroup label="Coins Taken For">
              {takes.map((r) => <option key={r.id} value={r.id}>{r.delta} · {r.label}</option>)}
            </optgroup>
          </select>
          {!ruleId && (
            <input
              style={{ ...inp, marginTop: 8 }}
              placeholder="Type a reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          )}
        </div>
        <button disabled={!kidId || busy} style={{ ...btn(BASE.green), width: "100%", opacity: busy ? 0.6 : 1 }} onClick={submit}>
          {busy ? "Saving..." : `${sign === 1 ? "Give" : "Take"} ${numericAmount} Coin${numericAmount > 1 ? "s" : ""}`}
        </button>
        <SubmitError error={error} />
      </div>
    </Modal>
  );
}

function RuleApplyModal({ rule, kids, onSubmit, onClose }) {
  const [kidId, setKidId] = useState(kids[0]?.id ?? null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const positive = rule.delta > 0;

  const submit = async () => {
    setBusy(true);
    setError(null);
    const result = await onSubmit({ member_id: kidId, delta: rule.delta, reason: rule.label, rule_id: rule.id });
    setBusy(false);
    if (result?.ok) onClose();
    else setError(result?.error || "Unknown error");
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 22, color: positive ? BASE.green : BASE.red }}>{positive ? "+" : ""}{rule.delta}</span>
        <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 18 }}>{rule.label}</span>
      </div>
      <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2, marginBottom: 14 }}>Who does this apply to?</div>
      <KidPicker kids={kids} value={kidId} onChange={setKidId} />
      <button disabled={!kidId || busy} style={{ ...btn(positive ? BASE.green : BASE.red), width: "100%", marginTop: 16, opacity: busy ? 0.6 : 1 }} onClick={submit}>
        {busy ? "Saving..." : `${positive ? "Give" : "Take"} ${Math.abs(rule.delta)} Coin${Math.abs(rule.delta) > 1 ? "s" : ""}`}
      </button>
      <SubmitError error={error} />
    </Modal>
  );
}

function TierRewardsModal({ tier, rewards, kids, coinLedger, onSubmit, onClose }) {
  const [picked, setPicked] = useState(null);
  const items = rewards.filter((r) => r.coin_cost === tier);
  if (picked) return <RedeemModal reward={picked} kids={kids} coinLedger={coinLedger} onSubmit={onSubmit} onClose={onClose} />;
  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, marginBottom: 4 }}>{tier} Coins</div>
      <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2, marginBottom: 14 }}>Pick a reward to redeem</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((r) => (
          <div key={r.id} onClick={() => setPicked(r)} style={{ background: BASE.muted, border: `1.5px solid ${BASE.ink}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer", fontFamily: F.ui, fontWeight: 700, fontSize: 13 }}>
            {r.label}
          </div>
        ))}
      </div>
    </Modal>
  );
}

function RedeemModal({ reward, kids, coinLedger, onSubmit, onClose }) {
  const [kidId, setKidId] = useState(kids[0]?.id ?? null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const balance = kidId ? coinBalance(coinLedger, kidId) : 0;
  const canAfford = balance >= reward.coin_cost;

  const submit = async () => {
    setBusy(true);
    setError(null);
    const result = await onSubmit({ member_id: kidId, delta: -reward.coin_cost, reason: `Redeemed: ${reward.label}`, rule_id: null });
    setBusy(false);
    if (result?.ok) onClose();
    else setError(result?.error || "Unknown error");
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, marginBottom: 4 }}>{reward.label}</div>
      <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2, marginBottom: 14 }}>Costs {reward.coin_cost} coins</div>
      <KidPicker kids={kids} value={kidId} onChange={setKidId} />
      {kidId && <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 700, color: canAfford ? BASE.green : BASE.red, marginTop: 10 }}>{canAfford ? `Enough coins (${balance} available)` : `Not enough coins yet — has ${balance}`}</div>}
      <button disabled={!kidId || !canAfford || busy} style={{ ...btn(BASE.green), width: "100%", marginTop: 14, opacity: !kidId || !canAfford || busy ? 0.5 : 1 }} onClick={submit}>
        {busy ? "Saving..." : "Redeem"}
      </button>
      <SubmitError error={error} />
    </Modal>
  );
}

function LoadErrorBanner() {
  return (
    <div style={{ background: "#fff", border: `2px solid ${BASE.red}`, borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontFamily: F.ui, fontWeight: 800, fontSize: 12, color: BASE.red, marginBottom: 4 }}>Couldn't load coin data</div>
      <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.t2 }}>
        The coin tables didn't load — this usually means the Supabase migration hasn't finished, or the schema cache needs a nudge. In the Supabase SQL editor, run the latest <code>coin_tables_grants</code> migration (or just <code>NOTIFY pgrst, 'reload schema';</code> if it's already applied), then reload this page.
      </div>
    </div>
  );
}

// A slowly, continuously spinning gold coin badge for the corner of each
// kid's box — a flat circle rotated on the Y axis so it reads as a coin
// flipping in place rather than a flat wheel spin.
function SpinningCoin({ inline }) {
  return (
    <div
      style={{
        ...(inline ? {} : { position: "absolute", top: 10, right: 10 }),
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: "radial-gradient(circle at 35% 35%, #fff6c8, #ffd23f 55%, #c8951f 100%)",
        border: `2px solid ${BASE.ink}`, boxShadow: hardShadow(BASE.ink, 2, 2),
        animation: "sprinkles-coin-spin 3s linear infinite",
      }}
    />
  );
}

function RuleRow({ rule, onOpen }) {
  return (
    <div onClick={() => onOpen(rule)} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: `1.5px solid ${BASE.ink}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>
      <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 13, color: rule.delta > 0 ? BASE.green : BASE.red, minWidth: 22 }}>{rule.delta > 0 ? "+" : ""}{rule.delta}</span>
      <span style={{ fontFamily: F.ui, fontWeight: 600, fontSize: 12, flex: 1 }}>{rule.label}</span>
    </div>
  );
}

export function KidsGoalsRulesPage({ members, coinRules, coinLedger, coinLoadError, onAddCoinTransaction }) {
  const { navigate } = useRouter();
  const kids = useMemo(() => members.filter((m) => m.role !== "parent"), [members]);
  const [ruleModal, setRuleModal] = useState(null);
  const gives = coinRules.filter((r) => r.delta > 0).sort((a, b) => a.delta - b.delta || a.sort_order - b.sort_order);
  const takes = coinRules.filter((r) => r.delta < 0).sort((a, b) => b.delta - a.delta || a.sort_order - b.sort_order);

  return (
    <div>
      <PageHeader title="Coin Rules" sprinkles="settings" back={() => navigate("/goals/kids")} />
      <div style={{ padding: "18px 16px 40px", display: "flex", flexDirection: "column", gap: 18 }}>
        {coinLoadError && <LoadErrorBanner />}
        <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2 }}>Tap a rule to give or take coins from a kid right away.</div>
        <div>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, marginBottom: 8, color: BASE.green }}>Coins Given For</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{gives.map((r) => <RuleRow key={r.id} rule={r} onOpen={setRuleModal} />)}</div>
        </div>
        <div>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, marginBottom: 8, color: BASE.red }}>Coins Taken For</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{takes.map((r) => <RuleRow key={r.id} rule={r} onOpen={setRuleModal} />)}</div>
        </div>
      </div>
      {ruleModal && kids.length > 0 && (
        <RuleApplyModal rule={ruleModal} kids={kids} onSubmit={onAddCoinTransaction} onClose={() => setRuleModal(null)} />
      )}
    </div>
  );
}

// One full-width bar per reward tier, stacked vertically — each bar shows
// progress toward that specific reward on its own scale (0 → tier cost),
// so it's obvious at a glance how close a kid is to each one, rather than
// squinting at segments inside a single skinny bar. Tapping a tier shows
// what's redeemable there.
function RewardTierBar({ balance, tiers, onTierClick }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {tiers.map((cost) => {
        const achieved = balance >= cost;
        const pct = Math.min(100, Math.round((balance / cost) * 100));
        return (
          <div key={cost} onClick={(e) => { e.stopPropagation(); onTierClick(cost); }} style={{ cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.ui, fontSize: 13, fontWeight: 800, color: BASE.t2, marginBottom: 4 }}>
              <span>{achieved ? "✓ " : ""}{cost} coins</span>
              {!achieved && <span>{cost - balance} to go</span>}
            </div>
            <ProgressBar pct={pct} color={achieved ? BASE.green : BASE.yellow} height={16} />
          </div>
        );
      })}
    </div>
  );
}

// Per-kid coin drill-down: reward progress bars, what's currently eligible,
// a balance-over-time chart, and the full history — everything that used to
// live inline on the overview cards now lives here instead, reached by
// tapping one of the overview boxes.
export function KidCoinTrendsPage({ member, coinLedger, coinRewards = [], onAddCoinTransaction }) {
  const { navigate } = useRouter();
  const entries = useMemo(
    () => coinLedger.filter((l) => l.member_id === member?.id).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [coinLedger, member]
  );
  let running = 0;
  const points = entries.map((l) => {
    running += l.delta;
    return { label: new Date(l.created_at).toLocaleDateString([], { month: "numeric", day: "numeric" }), value: running };
  });

  const balance = member ? coinBalance(coinLedger, member.id) : 0;
  const tiers = useMemo(() => [...new Set(coinRewards.map((r) => r.coin_cost))].sort((a, b) => a - b), [coinRewards]);
  const eligible = coinRewards.filter((r) => r.coin_cost <= balance).sort((a, b) => b.coin_cost - a.coin_cost || a.sort_order - b.sort_order);
  const [tierModal, setTierModal] = useState(null);

  if (!member) return null;

  return (
    <div>
      <PageHeader title={`${member.name}'s Coins`} sprinkles="settings" back={() => navigate("/goals/kids")} />
      <div style={{ padding: "18px 16px 40px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: member.color, border: `2.5px solid ${BASE.ink}`, borderRadius: 12, boxShadow: hardShadow(BASE.ink, 4, 4), padding: "14px 16px", color: "#fff", display: "flex", alignItems: "center", gap: 12 }}>
          <IconBadge icon={member.icon} bg="#fff" size={40} radius={12} />
          <div>
            <div style={{ fontFamily: F.ui, fontSize: 11, fontWeight: 700, opacity: 0.85 }}>Current balance</div>
            <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 26 }}>{balance} coins</div>
          </div>
        </div>

        {tiers.length > 0 && (
          <div style={{ background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 12, padding: 14 }}>
            <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Progress toward rewards</div>
            <RewardTierBar balance={balance} tiers={tiers} onTierClick={setTierModal} />
          </div>
        )}

        <div style={{ background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 12, padding: 14 }}>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Eligible for</div>
          {eligible.length === 0 ? (
            <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.t3 }}>Not enough coins yet for a reward.</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontFamily: F.ui, fontSize: 13, fontWeight: 600, display: "flex", flexDirection: "column", gap: 4 }}>
              {eligible.map((r) => <li key={r.id}>{r.label}</li>)}
            </ul>
          )}
        </div>

        {points.length < 2 ? (
          <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t3 }}>Not enough history yet to chart a trend.</div>
        ) : (
          <div style={{ background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 12, padding: 14 }}>
            <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Balance over time</div>
            <BarChart data={points} color={member.color} showTrend />
          </div>
        )}

        <div>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, marginBottom: 10 }}>All Activity</div>
          {entries.length === 0 ? (
            <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t3 }}>No coins given or taken yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[...entries].reverse().map((l) => (
                <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, background: BASE.muted, borderRadius: 8, padding: "6px 10px" }}>
                  <span style={{ flex: 1, fontFamily: F.ui, fontSize: 12, fontWeight: 700 }}>{l.reason || (l.delta > 0 ? "Coins given" : "Coins taken")}</span>
                  <span style={{ fontFamily: F.ui, fontSize: 11, color: BASE.t3 }}>{new Date(l.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                  <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 13, color: l.delta > 0 ? BASE.green : BASE.red }}>{l.delta > 0 ? "+" : ""}{l.delta}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {tierModal != null && <TierRewardsModal tier={tierModal} rewards={coinRewards} kids={[member]} coinLedger={coinLedger} onSubmit={onAddCoinTransaction} onClose={() => setTierModal(null)} />}
    </div>
  );
}

// One kid's daily chore list — checking every one of them off is what pays
// out the flat 3-coin all-or-none bonus (App.jsx's onToggleChore), so this
// list is the actual "do the thing" surface; the boxes above are just the
// running total.
function KidChoreList({ kid, chores, completions, onToggleChore, onAdd, onEdit }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const doneToday = new Set(completions.filter((c) => c.date === todayStr).map((c) => c.chore_id));
  const mine = chores.filter((c) => c.member_id === kid.id && c.active);
  const applicable = mine.filter((c) => choreAppliesToday(c));
  const doneCount = applicable.filter((c) => doneToday.has(c.id)).length;

  return (
    <div style={{ background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <IconBadge icon={kid.icon} bg={kid.color} size={28} radius={9} iconColor="#fff" />
        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15, flex: 1 }}>{kid.name}'s Tasks</div>
        {applicable.length > 0 && (
          <div style={{ fontFamily: F.ui, fontSize: 11, fontWeight: 800, color: BASE.t2 }}>{doneCount}/{applicable.length}{doneCount === applicable.length ? " · +3 coins!" : ""}</div>
        )}
        <button onClick={() => onAdd(kid)} style={{ width: 26, height: 26, borderRadius: 8, border: `2px solid ${BASE.ink}`, background: BASE.pink, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, padding: 0 }}>
          <Icon name="plus" size={13} />
        </button>
      </div>
      {mine.length === 0 ? (
        <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.t3 }}>No tasks yet — tap + to add one.</div>
      ) : applicable.length === 0 ? (
        <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.t3 }}>Nothing scheduled for today.</div>
      ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {applicable.map((c) => {
          const done = doneToday.has(c.id);
          return (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, background: BASE.muted, borderRadius: 8, padding: "8px 10px" }}>
              <button
                onClick={() => !done && onToggleChore(c)}
                title={done ? "Completed" : "Mark complete"}
                style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${BASE.ink}`, background: done ? BASE.green : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: done ? "default" : "pointer", padding: 0 }}
              >
                {done && <Icon name="check" size={13} color="#fff" />}
              </button>
              <span onClick={() => onEdit(c)} style={{ flex: 1, fontFamily: F.ui, fontWeight: 700, fontSize: 13, textDecoration: done ? "line-through" : "none", opacity: done ? 0.55 : 1, cursor: "pointer" }}>{c.title}</span>
              <Icon name="edit" size={13} style={{ opacity: 0.35, flexShrink: 0 }} />
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

// The overview: one box per kid — icon, total coin count, and a spinning
// coin — sized to fit three kids without scrolling. Progress bars, eligible
// rewards, and full history live one tap away on KidCoinTrendsPage; coin
// rules live only behind the book icon. The daily chore checklist that
// actually earns those coins lives on its own "Kids Chores" subpage instead
// (see KidsChoresPage below).
export default function KidsGoals({ members, coinLedger, coinRules, coinRewards, coinLoadError, onAddCoinTransaction }) {
  const { navigate } = useRouter();
  const kids = useMemo(() => members.filter((m) => m.role !== "parent"), [members]);
  const [quickOpen, setQuickOpen] = useState(false);
  const cashInDays = daysUntilCashIn();

  if (kids.length === 0) {
    return (
      <div>
        <EmptyState icon="star" text="No kids on the family list yet — add family members and mark them as kids." />
      </div>
    );
  }

  return (
    <div>
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 18px) 16px 40px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
          <button onClick={() => navigate("/goals/kids/rules")} style={btn("#fff")}><Icon name="book" size={15} /></button>
          <button onClick={() => setQuickOpen(true)} style={btn(BASE.pink)}><Icon name="plus" size={15} /></button>
        </div>

        {coinLoadError && <LoadErrorBanner />}

        <div style={{ background: BASE.ink, color: "#fff", borderRadius: 12, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: F.ui }}>
          <Icon name="star" size={16} color={BASE.yellow} />
          <span style={{ fontWeight: 800, fontSize: 14 }}>
            {cashInDays === 0 ? "Coins cash in today!" : `Coins cash in Friday — ${cashInDays} day${cashInDays === 1 ? "" : "s"} left`}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(150px, 1fr))`, gap: 12 }}>
          {kids.map((k) => {
            const balance = coinBalance(coinLedger, k.id);
            return (
              <div
                key={k.id}
                onClick={() => navigate(`/goals/kids/trends/${k.id}`)}
                style={{ background: k.color, border: `2.5px solid ${BASE.ink}`, borderRadius: 14, boxShadow: hardShadow(BASE.ink, 4, 4), padding: 16, color: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}
              >
                <div style={{ width: 72, height: 72, flexShrink: 0, background: "#fff", border: `2.5px solid ${BASE.ink}`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  <IconBadge icon={k.icon} bg="#fff" size={54} radius={0} style={{ boxShadow: "none", border: "none" }} />
                </div>
                <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 17 }}>{k.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 30 }}>{balance}</span>
                  <SpinningCoin inline />
                </div>
              </div>
            );
          })}
        </div>
        <style>{`
          @keyframes sprinkles-coin-spin {
            from { transform: rotateY(0deg); }
            to { transform: rotateY(360deg); }
          }
        `}</style>
      </div>

      {quickOpen && <QuickAdjustModal kids={kids} coinRules={coinRules} onSubmit={onAddCoinTransaction} onClose={() => setQuickOpen(false)} />}
    </div>
  );
}

// "Kids Chores" — reached from the Tasks dropdown alongside "Kids Coins".
// Each kid's daily checklist lives here (with add/edit for that kid's
// chores, reusing the same ChoreModal the Household Tasks page uses);
// checking every item off pays the flat 3-coin all-or-none bonus and the
// "Great job {name}" voice line (both wired in App.jsx's onToggleChore).
export function KidsChoresPage({ members, chores, completions, onToggleChore, onAddChore, onUpdateChore, onDeleteChore }) {
  const kids = useMemo(() => members.filter((m) => m.role !== "parent"), [members]);
  const [choreModal, setChoreModal] = useState(null);
  const [defaultKid, setDefaultKid] = useState(null);

  if (kids.length === 0) {
    return (
      <div>
        <EmptyState icon="check" text="No kids on the family list yet — add family members and mark them as kids." />
      </div>
    );
  }

  return (
    <div>
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 18px) 16px 40px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 22, marginBottom: 6 }}>Kids' Chores</div>
        {kids.map((k) => (
          <KidChoreList
            key={k.id}
            kid={k}
            chores={chores}
            completions={completions}
            onToggleChore={onToggleChore}
            onAdd={(kid) => { setDefaultKid(kid); setChoreModal({}); }}
            onEdit={(chore) => { setDefaultKid(null); setChoreModal(chore); }}
          />
        ))}
      </div>

      {choreModal && (
        <ChoreModal
          chore={choreModal.id ? choreModal : (defaultKid ? { member_id: defaultKid.id } : null)}
          members={kids}
          onSave={(v) => (v.id ? onUpdateChore(v.id, v) : onAddChore(v))}
          onDelete={onDeleteChore}
          onClose={() => { setChoreModal(null); setDefaultKid(null); }}
        />
      )}
    </div>
  );
}
