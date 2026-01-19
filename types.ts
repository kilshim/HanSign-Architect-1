export interface Point {
  x: number;
  y: number;
  pressure?: number;
  time: number;
  pointerType?: string; // 'mouse' | 'pen' | 'touch'
}

export type Stroke = Point[];

export type ToolType = 'pen' | 'pencil' | 'calligraphy';

export interface DrawingOptions {
  color: string;
  minWidth: number;
  maxWidth: number;
  smoothing: number; // 0 to 1
  streamline: number; // 0 to 1 (interpolation factor)
  tool: ToolType;
}

export type DrawingMode = 'draw' | 'type';