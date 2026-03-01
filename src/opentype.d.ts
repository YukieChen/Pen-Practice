/** opentype.js 型別宣告 — 僅引用 Font */
declare module 'opentype.js' {
  export interface Font {
    charToGlyph(c: string): Glyph;
    getPath(text: string, x?: number, y?: number, fontSize?: number): Path;
  }
  export interface Glyph {
    path: Path;
    getBoundingBox(): BoundingBox;
  }
  export interface Path {
    commands: PathCommand[];
  }
  export interface PathCommand {
    type: string;
    x?: number;
    y?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
  }
  export interface BoundingBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }
  export function load(url: string): Promise<Font>;
  export function parse(buffer: ArrayBuffer): Font;
}
