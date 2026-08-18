export function coinBalance(coinLedger, memberId) {
  return coinLedger.filter((l) => l.member_id === memberId).reduce((sum, l) => sum + l.delta, 0);
}

// Coins cash in every Friday. Returns 0 on Friday itself ("cash in today"),
// otherwise how many days until the next one.
export function daysUntilCashIn(date = new Date()) {
  const FRIDAY = 5;
  return (FRIDAY - date.getDay() + 7) % 7;
}
