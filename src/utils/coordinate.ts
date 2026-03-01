/**
 * 座標轉換 — 與 04/05 C1 對齊：mm→pt、邏輯 Y 翻轉
 * 邏輯：原點左上、單位 mm、Y 向下 → PDF：原點左下、單位 pt、Y 向上
 */
const MM_TO_PT = 72 / 25.4;

/** mm → PDF points（1mm ≈ 2.8346pt） */
export function mmToPt(mm: number): number {
  return mm * MM_TO_PT;
}

/**
 * 邏輯 Y（左上為 0，向下增加）→ PDF Y（左下為 0，向上增加）
 * @param logicalYMm 邏輯座標 Y，單位 mm
 * @param pageHeightMm 頁高，單位 mm（如 A4 = 297）
 */
export function logicalYToPdfY(logicalYMm: number, pageHeightMm: number): number {
  return (pageHeightMm - logicalYMm) * MM_TO_PT;
}

/** 邏輯 (xMm, yMm) → PDF (xPt, yPt)，用於單點 */
export function logicalToPdf(
  xMm: number,
  yMm: number,
  pageHeightMm: number
): { xPt: number; yPt: number } {
  return {
    xPt: mmToPt(xMm),
    yPt: logicalYToPdfY(yMm, pageHeightMm),
  };
}
