export function coinBalance(coinLedger, memberId) {
  return coinLedger.filter((l) => l.member_id === memberId).reduce((sum, l) => sum + l.delta, 0);
}
