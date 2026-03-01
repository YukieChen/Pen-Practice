/**
 * opentype path → 我們的 PathCommand（含 Q→C 轉換），對齊 04 §3.3
 */
import type { PathCommand } from '../types';

/** 04 §3.3 convertQ2C：Q 控制點 (cx,cy)、終點 (x,y)、前一點 (px,py) */
export function quadraticToCubic(
  px: number,
  py: number,
  cx: number,
  cy: number,
  x: number,
  y: number
): { x1: number; y1: number; x2: number; y2: number; x: number; y: number } {
  return {
    x1: px + (2 / 3) * (cx - px),
    y1: py + (2 / 3) * (cy - py),
    x2: x + (2 / 3) * (cx - x),
    y2: y + (2 / 3) * (cy - y),
    x,
    y,
  };
}

/** opentype.js command 型狀（簡化） */
export interface OtCommand {
  type: string;
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

/**
 * 將 opentype path command 轉成 PathCommand（M/L/C/Z）；Q 轉 C 需前一點
 */
export function convertPathCommand(
  cmd: OtCommand,
  prev?: { x: number; y: number }
): PathCommand {
  switch (cmd.type) {
    case 'M':
      return { type: 'M', x: cmd.x ?? 0, y: cmd.y ?? 0 };
    case 'L':
      return { type: 'L', x: cmd.x ?? 0, y: cmd.y ?? 0 };
    case 'Q': {
      const px = prev?.x ?? 0;
      const py = prev?.y ?? 0;
      const cx = cmd.x1 ?? cmd.x2 ?? 0;
      const cy = cmd.y1 ?? cmd.y2 ?? 0;
      const x = cmd.x ?? 0;
      const y = cmd.y ?? 0;
      const { x1, y1, x2, y2 } = quadraticToCubic(px, py, cx, cy, x, y);
      return { type: 'C', x1, y1, x2, y2, x, y };
    }
    case 'C':
      return {
        type: 'C',
        x1: cmd.x1 ?? 0,
        y1: cmd.y1 ?? 0,
        x2: cmd.x2 ?? 0,
        y2: cmd.y2 ?? 0,
        x: cmd.x ?? 0,
        y: cmd.y ?? 0,
      };
    case 'Z':
      return { type: 'Z' };
    default:
      return { type: 'Z' };
  }
}

/** 整條 path 轉換（追蹤當前點供 Q 使用） */
export function convertPath(commands: OtCommand[]): PathCommand[] {
  let x = 0;
  let y = 0;
  return commands.map((cmd) => {
    const out = convertPathCommand(cmd, { x, y });
    if (out.type === 'M' || out.type === 'L') {
      x = out.x;
      y = out.y;
    } else if (out.type === 'C') {
      x = out.x;
      y = out.y;
    }
    return out;
  });
}
