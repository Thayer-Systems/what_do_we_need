// Mr. Sprinkles' spoken reaction lines — kept together so every place that
// awards/removes coins or marks a parent's work done says the same thing.
import { coinBalance } from "./coins.js";

export const COIN_GIVE_LINE = "Whoop whoop!";
export const COIN_MILESTONE_LINE = "Wow look at you! Stacking up those coins!";
export const COIN_TAKE_LINE = "Aw bummer. Let's try again!";

export const PARENT_AFFIRMATIONS = [
  "Atta girl!",
  "Wow, you're crushing it today!",
  "When I grow up, I want to be just like you!",
  "Someone call emergency, because you are on fire!",
];

export function randomParentAffirmation() {
  return PARENT_AFFIRMATIONS[Math.floor(Math.random() * PARENT_AFFIRMATIONS.length)];
}

// What Mr. Sprinkles says out loud for one coin-ledger entry, based on the
// balance right before it landed. Redemptions ("Redeemed: ...") stay
// silent — spending coins on purpose isn't "given" or "taken away".
export function coinAnnouncementFor(entry, priorLedger, coinRewards) {
  if (entry.reason && entry.reason.startsWith("Redeemed:")) return null;
  if (entry.delta < 0) return COIN_TAKE_LINE;
  if (entry.delta > 0) {
    const tiers = [...new Set((coinRewards || []).map((r) => r.coin_cost))];
    const before = coinBalance(priorLedger, entry.member_id);
    const after = before + entry.delta;
    if (tiers.some((t) => before < t && after >= t)) return COIN_MILESTONE_LINE;
    return COIN_GIVE_LINE;
  }
  return null;
}
