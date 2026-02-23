export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

export function formatPercentage(decimal: number, precision: number = 1): string {
  return `${(decimal * 100).toFixed(precision)}%`;
}

export function formatTroopCounts(troops: { infantry: number; cavalry: number; archers: number }): string {
  return `Infantry: ${formatNumber(troops.infantry)} | Cavalry: ${formatNumber(troops.cavalry)} | Archers: ${formatNumber(troops.archers)}`;
}
