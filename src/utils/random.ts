/**
 * 隨機挑選 — Fisher-Yates shuffle + slice，有說明模式字池 >4 取 4 用
 */
export function randomPick<T>(array: T[], count: number): T[] {
  if (count <= 0 || array.length === 0) return [];
  const copy = array.slice();
  const n = Math.min(copy.length, count);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}
