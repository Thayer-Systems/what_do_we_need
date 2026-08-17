import { useMemo, useState } from "react";
import { PageHeader, Card, Modal, EmptyState } from "../components/ui.jsx";
import { IconBadge } from "../components/Deco.jsx";
import { Icon } from "../components/Icons.jsx";
import { BASE, F, hardShadow } from "../lib/theme.js";
import { useRouter } from "../lib/router.jsx";
import { coinBalance } from "../lib/coins.js";

const btn = (bg) => ({ background: bg, color: BASE.ink, border: `2.5px solid ${BASE.ink}`, borderRadius: 999, padding: "8px 16px", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: F.ui, boxShadow: hardShadow(BASE.ink, 3, 3) });
const QUICK_AMOUNTS = [1, 2, 3];

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

function QuickAdjustModal({ kids, onSubmit, onClose }) {
  const [kidId, setKidId] = useState(kids[0]?.id ?? null);
  const [amount, setAmount] = useState(1);
  const [sign, setSign] = useState(1);
  const [reason, setReason] = useState("");

  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, marginBottom: 14 }}>Adjust Coins</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><span style={{ fontSize: 11, fontWeight: 800, color: BASE.t2, textTransform: "uppercase", fontFamily: F.ui, marginBottom: 6, display: "block" }}>Kid</span><KidPicker kids={kids} value={kidId} onChange={setKidId} /></div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setSign(1)} style={btn(sign === 1 ? BASE.green : "#fff")}>+ Give</button>
          <button onClick={() => setSign(-1)} style={btn(sign === -1 ? BASE.red : "#fff")}>− Take</button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {QUICK_AMOUNTS.map((a) => <button key={a} onClick={() => setAmount(a)} style={btn(amount === a ? BASE.yellow : "#fff")}>{a}</button>)}
        </div>
        <input
          style={{ background: "#fff", border: `2px solid ${BASE.ink}`, borderRadius: 10, padding: "9px 12px", fontSize: 14, fontFamily: F.ui }}
          placeholder="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <button
          disabled={!kidId}
          style={{ ...btn(BASE.green), width: "100%" }}
          onClick={() => { onSubmit({ member_id: kidId, delta: amount * sign, reason: reason.trim() || null, rule_id: null }); onClose(); }}
        >
          {sign === 1 ? "Give" : "Take"} {amount} Coin{amount > 1 ? "s" : ""}
        </button>
      </div>
    </Modal>
  );
}

function RuleApplyModal({ rule, kids, onSubmit, onClose }) {
  const [kidId, setKidId] = useState(kids[0]?.id ?? null);
  const positive = rule.delta > 0;
  return (
    <Modal onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 22, color: positive ? BASE.green : BASE.red }}>{positive ? "+" : ""}{rule.delta}</span>
        <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 18 }}>{rule.label}</span>
      </div>
      <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2, marginBottom: 14 }}>Who does this apply to?</div>
      <KidPicker kids={kids} value={kidId} onChange={setKidId} />
      <button
        disabled={!kidId}
        style={{ ...btn(positive ? BASE.green : BASE.red), width: "100%", marginTop: 16 }}
        onClick={() => { onSubmit({ member_id: kidId, delta: rule.delta, reason: rule.label, rule_id: rule.id }); onClose(); }}
      >
        {positive ? "Give" : "Take"} {Math.abs(rule.delta)} Coin{Math.abs(rule.delta) > 1 ? "s" : ""}
      </button>
    </Modal>
  );
}

function RedeemModal({ reward, kids, coinLedger, onSubmit, onClose }) {
  const [kidId, setKidId] = useState(kids[0]?.id ?? null);
  const balance = kidId ? coinBalance(coinLedger, kidId) : 0;
  const canAfford = balance >= reward.coin_cost;
  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 20, marginBottom: 4 }}>{reward.label}</div>
      <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2, marginBottom: 14 }}>Costs {reward.coin_cost} coins</div>
      <KidPicker kids={kids} value={kidId} onChange={setKidId} />
      {kidId && <div style={{ fontFamily: F.ui, fontSize: 12, fontWeight: 700, color: canAfford ? BASE.green : BASE.red, marginTop: 10 }}>{canAfford ? `Enough coins (${balance} available)` : `Not enough coins yet — has ${balance}`}</div>}
      <button
        disabled={!kidId || !canAfford}
        style={{ ...btn(BASE.green), width: "100%", marginTop: 14, opacity: !kidId || !canAfford ? 0.5 : 1 }}
        onClick={() => { onSubmit({ member_id: kidId, delta: -reward.coin_cost, reason: `Redeemed: ${reward.label}`, rule_id: null }); onClose(); }}
      >
        Redeem
      </button>
    </Modal>
  );
}

function LoadErrorBanner() {
  return (
    <div style={{ background: "#fff", border: `2px solid ${BASE.red}`, borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontFamily: F.ui, fontWeight: 800, fontSize: 12, color: BASE.red, marginBottom: 4 }}>Couldn't load coin data</div>
      <div style={{ fontFamily: F.ui, fontSize: 12, color: BASE.t2 }}>
        The coin tables didn't load — this usually means the Supabase migration hasn't finished, or the schema cache needs a nudge. In the Supabase SQL editor, try running <code>NOTIFY pgrst, 'reload schema';</code>, then reload this page.
      </div>
    </div>
  );
}

export function KidsGoalsRulesPage({ members, coinRules, coinLedger, coinLoadError, onAddCoinTransaction }) {
  const { navigate } = useRouter();
  const kids = useMemo(() => members.filter((m) => m.role !== "parent"), [members]);
  const [ruleModal, setRuleModal] = useState(null);
  const gives = coinRules.filter((r) => r.delta > 0).sort((a, b) => a.delta - b.delta || a.sort_order - b.sort_order);
  const takes = coinRules.filter((r) => r.delta < 0).sort((a, b) => b.delta - a.delta || a.sort_order - b.sort_order);

  const RuleRow = ({ rule }) => (
    <div onClick={() => setRuleModal(rule)} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: `1.5px solid ${BASE.ink}`, borderRadius: 10, padding: "8px 12px", cursor: "pointer" }}>
      <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 16, color: rule.delta > 0 ? BASE.green : BASE.red, minWidth: 28 }}>{rule.delta > 0 ? "+" : ""}{rule.delta}</span>
      <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 13, flex: 1 }}>{rule.label}</span>
      <Icon name="chevronRight" size={14} />
    </div>
  );

  return (
    <div>
      <PageHeader title="Coin Rules" sprinkles="settings" back={() => navigate("/goals/kids")} />
      <div style={{ padding: "18px 16px 40px", display: "flex", flexDirection: "column", gap: 18 }}>
        {coinLoadError && <LoadErrorBanner />}
        <div style={{ fontFamily: F.ui, fontSize: 13, color: BASE.t2 }}>Tap a rule to give or take coins from a kid right away.</div>
        <div>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, marginBottom: 8, color: BASE.green }}>Coins Given For</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{gives.map((r) => <RuleRow key={r.id} rule={r} />)}</div>
        </div>
        <div>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, marginBottom: 8, color: BASE.red }}>Coins Taken For</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{takes.map((r) => <RuleRow key={r.id} rule={r} />)}</div>
        </div>
      </div>
      {ruleModal && kids.length > 0 && (
        <RuleApplyModal rule={ruleModal} kids={kids} onSubmit={onAddCoinTransaction} onClose={() => setRuleModal(null)} />
      )}
    </div>
  );
}

export default function KidsGoals({ members, coinLedger, coinRules, coinRewards, coinLoadError, onAddCoinTransaction }) {
  const { navigate } = useRouter();
  const kids = useMemo(() => members.filter((m) => m.role !== "parent"), [members]);
  const [quickOpen, setQuickOpen] = useState(false);
  const [redeemModal, setRedeemModal] = useState(null);
  const rewards = [...coinRewards].sort((a, b) => a.coin_cost - b.coin_cost || a.sort_order - b.sort_order);

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
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(150px, 1fr))`, gap: 12 }}>
          {kids.map((k) => (
            <div key={k.id} style={{ background: k.color, border: `2.5px solid ${BASE.ink}`, borderRadius: 18, boxShadow: hardShadow(BASE.ink, 4, 4), padding: "18px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "#fff" }}>
              <IconBadge icon={k.icon} bg="#fff" size={44} radius={14} />
              <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15 }}>{k.name}</div>
              <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 28 }}>{coinBalance(coinLedger, k.id)}</div>
              <div style={{ fontFamily: F.ui, fontSize: 11, fontWeight: 700, opacity: 0.85 }}>coins</div>
            </div>
          ))}
        </div>

        <button onClick={() => navigate("/goals/kids/rules")} style={{ ...btn(BASE.teal), width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px" }}>
          <Icon name="book" size={15} /> View Coin Rules
        </button>

        <div>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 16, marginBottom: 10 }}>Rewards</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rewards.map((r) => (
              <Card key={r.id} onClick={() => setRedeemModal(r)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: F.ui, fontWeight: 700, fontSize: 13 }}>{r.label}</span>
                <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 14, color: BASE.t2 }}>{r.coin_cost} coins</span>
              </Card>
            ))}
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

      {quickOpen && <QuickAdjustModal kids={kids} onSubmit={onAddCoinTransaction} onClose={() => setQuickOpen(false)} />}
      {redeemModal && <RedeemModal reward={redeemModal} kids={kids} coinLedger={coinLedger} onSubmit={onAddCoinTransaction} onClose={() => setRedeemModal(null)} />}
    </div>
  );
}
