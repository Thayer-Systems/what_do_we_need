import { useMemo, useState } from "react";
import { PageHeader, Modal, EmptyState } from "../components/ui.jsx";
import { IconBadge } from "../components/Deco.jsx";
import { Icon } from "../components/Icons.jsx";
import { LineChart, ProgressBar } from "../components/Charts.jsx";
import { BASE, F, hardShadow } from "../lib/theme.js";
import { useRouter } from "../lib/router.jsx";
import { coinBalance, daysUntilCashIn } from "../lib/coins.js";

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
  const [amount, setAmount] = useState(1);
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
      setAmount(Math.abs(rule.delta));
      setSign(rule.delta > 0 ? 1 : -1);
      setReason(rule.label);
    }
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    const result = await onSubmit({ member_id: kidId, delta: amount * sign, reason: reason.trim() || null, rule_id: ruleId ? Number(ruleId) : null });
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
            onChange={(e) => setAmount(Math.max(1, Math.round(Math.abs(Number(e.target.value)) || 1)))}
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
          {busy ? "Saving..." : `${sign === 1 ? "Give" : "Take"} ${amount} Coin${amount > 1 ? "s" : ""}`}
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
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.ui, fontSize: 11, fontWeight: 800, color: BASE.t2, marginBottom: 3 }}>
              <span>{achieved ? "✓ " : ""}{cost} coins</span>
              {!achieved && <span>{cost - balance} to go</span>}
            </div>
            <ProgressBar pct={pct} color={achieved ? BASE.green : BASE.yellow} height={14} />
          </div>
        );
      })}
    </div>
  );
}

// Per-kid coin history — cumulative balance over time, from the raw ledger.
export function KidCoinTrendsPage({ member, coinLedger }) {
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

  if (!member) return null;

  return (
    <div>
      <PageHeader title={`${member.name}'s Coins`} sprinkles="settings" back={() => navigate("/goals/kids")} />
      <div style={{ padding: "18px 16px 40px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: member.color, border: `2.5px solid ${BASE.ink}`, borderRadius: 12, boxShadow: hardShadow(BASE.ink, 4, 4), padding: "14px 16px", color: "#fff", display: "flex", alignItems: "center", gap: 12 }}>
          <IconBadge icon={member.icon} bg="#fff" size={40} radius={12} />
          <div>
            <div style={{ fontFamily: F.ui, fontSize: 11, fontWeight: 700, opacity: 0.85 }}>Current balance</div>
            <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 26 }}>{coinBalance(coinLedger, member.id)} coins</div>
          </div>
        </div>

        {points.length < 2 ? (
          <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t3 }}>Not enough history yet to chart a trend.</div>
        ) : (
          <div style={{ background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 12, padding: 14 }}>
            <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Balance over time</div>
            <LineChart data={points} color={member.color} labelEvery={Math.max(1, Math.round(points.length / 8))} />
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
    </div>
  );
}

export default function KidsGoals({ members, coinLedger, coinRules, coinRewards, coinLoadError, onAddCoinTransaction }) {
  const { navigate } = useRouter();
  const kids = useMemo(() => members.filter((m) => m.role !== "parent"), [members]);
  const [quickOpen, setQuickOpen] = useState(false);
  const [ruleModal, setRuleModal] = useState(null);
  const [tierModal, setTierModal] = useState(null);
  const gives = coinRules.filter((r) => r.delta > 0).sort((a, b) => a.delta - b.delta || a.sort_order - b.sort_order);
  const takes = coinRules.filter((r) => r.delta < 0).sort((a, b) => b.delta - a.delta || a.sort_order - b.sort_order);
  const tiers = useMemo(() => [...new Set(coinRewards.map((r) => r.coin_cost))].sort((a, b) => a - b), [coinRewards]);
  const cashInDays = daysUntilCashIn();

  if (kids.length === 0) {
    return (
      <div>
        <EmptyState icon="star" text="No kids on the family list yet — add family members and mark them as kids." />
      </div>
    );
  }

  const rulesListStyle = { display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto", paddingRight: 4 };

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

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(kids.length, 4)}, 1fr)`, gap: 12, alignItems: "start" }} className="sprinkles-kid-coin-row">
          {kids.map((k) => {
            const balance = coinBalance(coinLedger, k.id);
            return (
              <div
                key={k.id}
                onClick={() => navigate(`/goals/kids/trends/${k.id}`)}
                style={{ background: k.color, border: `2.5px solid ${BASE.ink}`, borderRadius: 12, boxShadow: hardShadow(BASE.ink, 4, 4), padding: "14px 12px", color: "#fff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}
              >
                <IconBadge icon={k.icon} bg="#fff" size={38} radius={12} />
                <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15 }}>{k.name}</span>
                <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 24 }}>{balance} <span style={{ fontFamily: F.ui, fontSize: 11, fontWeight: 700, opacity: 0.85 }}>coins</span></span>
                {tiers.length > 0 && (
                  <div style={{ background: "#fff", borderRadius: 10, padding: "10px", width: "100%", boxSizing: "border-box" }}>
                    <RewardTierBar balance={balance} tiers={tiers} onTierClick={(cost) => setTierModal(cost)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <style>{`
          @media (max-width: 640px) {
            .sprinkles-kid-coin-row { grid-template-columns: repeat(2, 1fr) !important; }
          }
        `}</style>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          <div>
            <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 14, marginBottom: 6, color: BASE.green }}>Coins Given For</div>
            <div style={rulesListStyle}>{gives.map((r) => <RuleRow key={r.id} rule={r} onOpen={setRuleModal} />)}</div>
          </div>
          <div>
            <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 14, marginBottom: 6, color: BASE.red }}>Coins Taken For</div>
            <div style={rulesListStyle}>{takes.map((r) => <RuleRow key={r.id} rule={r} onOpen={setRuleModal} />)}</div>
          </div>
        </div>

        <div>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, marginBottom: 10 }}>Recent Activity</div>
          {coinLedger.length === 0 ? (
            <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t3 }}>No coins given or taken yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[...coinLedger].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10).map((l) => {
                const kid = kids.find((k) => k.id === l.member_id);
                return (
                  <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, background: BASE.muted, borderRadius: 8, padding: "6px 10px" }}>
                    <IconBadge icon={kid?.icon || "donut"} bg={kid?.color || BASE.yellow} size={22} radius={7} iconColor="#fff" />
                    <span style={{ flex: 1, fontFamily: F.ui, fontSize: 12, fontWeight: 700 }}>{l.reason || (l.delta > 0 ? "Coins given" : "Coins taken")}</span>
                    <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 13, color: l.delta > 0 ? BASE.green : BASE.red }}>{l.delta > 0 ? "+" : ""}{l.delta}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {quickOpen && <QuickAdjustModal kids={kids} coinRules={coinRules} onSubmit={onAddCoinTransaction} onClose={() => setQuickOpen(false)} />}
      {ruleModal && <RuleApplyModal rule={ruleModal} kids={kids} onSubmit={onAddCoinTransaction} onClose={() => setRuleModal(null)} />}
      {tierModal != null && <TierRewardsModal tier={tierModal} rewards={coinRewards} kids={kids} coinLedger={coinLedger} onSubmit={onAddCoinTransaction} onClose={() => setTierModal(null)} />}
    </div>
  );
}
