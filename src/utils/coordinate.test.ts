import { describe, it, expect } from 'vitest';
import { mmToPt, logicalYToPdfY, logicalToPdf } from './coordinate';

describe('coordinate', () => {
  it('mmToPt: 1mm ≈ 2.8346pt', () => {
    expect(mmToPt(1)).toBeCloseTo(2.834645669, 4);
    expect(mmToPt(10)).toBeCloseTo(28.34645669, 4);
  });

  it('logicalYToPdfY: 邏輯 Y 翻轉', () => {
    const pageH = 297;
    expect(logicalYToPdfY(0, pageH)).toBeCloseTo(mmToPt(297), 4);
    expect(logicalYToPdfY(297, pageH)).toBeCloseTo(0, 4);
    expect(logicalYToPdfY(148.5, pageH)).toBeCloseTo(mmToPt(148.5), 4);
  });

  it('logicalToPdf: 單點轉換', () => {
    const { xPt, yPt } = logicalToPdf(16.2, 15.3, 297);
    expect(xPt).toBeCloseTo(mmToPt(16.2), 4);
    expect(yPt).toBeCloseTo(mmToPt(297 - 15.3), 4);
  });
});
