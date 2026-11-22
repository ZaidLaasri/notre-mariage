export interface Point {
  x: number;
  y: number;
}
export interface CanvasItem {
  id: string;
  canvas_x?: number | null;
  canvas_y?: number | null;
}
export const CARD_WIDTH = 240;
export const CARD_HEIGHT = 270;
export function itemPoint(item: CanvasItem, index: number): Point {
  return {
    x: item.canvas_x ?? (index % 4) * 280,
    y: item.canvas_y ?? Math.floor(index / 4) * 310,
  };
}
export function movedPoint(
  start: Point,
  dx: number,
  dy: number,
  zoom: number,
): Point {
  return {
    x: Math.round(start.x + dx / zoom),
    y: Math.round(start.y + dy / zoom),
  };
}
export function zoomAt(
  pan: Point,
  cursor: Point,
  oldZoom: number,
  nextZoom: number,
): Point {
  return {
    x: cursor.x - ((cursor.x - pan.x) * nextZoom) / oldZoom,
    y: cursor.y - ((cursor.y - pan.y) * nextZoom) / oldZoom,
  };
}
export function fitCanvas(points: Point[], width: number, height: number) {
  if (!points.length) return { zoom: 1, pan: { x: 40, y: 40 } };
  const minX = Math.min(...points.map((p) => p.x)),
    minY = Math.min(...points.map((p) => p.y));
  const w = Math.max(...points.map((p) => p.x)) + CARD_WIDTH - minX;
  const h = Math.max(...points.map((p) => p.y)) + CARD_HEIGHT - minY;
  const zoom = Math.max(0.05, Math.min(1, (width - 64) / w, (height - 64) / h));
  return {
    zoom,
    pan: {
      x: (width - w * zoom) / 2 - minX * zoom,
      y: (height - h * zoom) / 2 - minY * zoom,
    },
  };
}
