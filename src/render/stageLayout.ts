import { stageGeometry } from "../content/stageGeometry.generated";

/** Pure layout math shared by the Canvas 2D stage, the Skia layer and the WebGL MV. */

export const STAGE_ASPECT = 9 / 16;
/** Landscape viewports shorter than this are treated as sideways phones. */
export const ROTATE_MAX_HEIGHT = 500;
/** Side panels narrower than this are too small for the side-by-side MV captions. */
export const MIN_MV_SIDE = 160;
export const LANE_COUNT = 5;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ViewportMode = "wide" | "portrait" | "rotate";

export interface ViewportLayout {
  mode: ViewportMode;
  viewport: { width: number; height: number };
  /** Integer CSS-pixel rectangle of the 9:16 play stage. */
  stage: Rect;
  /** Regions outside the stage that the MV fills (left/right or top/bottom). */
  panels: Rect[];
  /** True when left/right panels are wide enough for captions. */
  sideCaptions: boolean;
}

export interface LaneMetric {
  left: number;
  right: number;
  center: number;
  width: number;
}

export interface LaneLayout {
  width: number;
  height: number;
  /** Top of the note travel area (below the in-stage HUD). */
  top: number;
  /** Beat line where a note head should be hit. */
  hitY: number;
  /** Bottom edge of the lane field (below the beat line, for key labels). */
  bottom: number;
  left: number;
  right: number;
  lanes: LaneMetric[];
  noteWidth: number;
  noteHeight: number;
  /** Height of the highlighted beat zone ending at hitY. */
  zoneHeight: number;
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export function computeViewportLayout(width: number, height: number): ViewportLayout {
  const vw = Math.max(1, Math.floor(width));
  const vh = Math.max(1, Math.floor(height));
  const landscape = vw > vh;
  const rotate = landscape && vh < ROTATE_MAX_HEIGHT;

  // Fit a 9:16 rectangle inside the viewport without any CSS scaling.
  // Width-limited viewports (portrait phones) use the full width exactly.
  let stageWidth: number;
  let stageHeight: number;
  if (vw / vh < STAGE_ASPECT) {
    stageWidth = vw;
    stageHeight = Math.min(vh, Math.floor(vw / STAGE_ASPECT));
  } else {
    stageHeight = vh;
    stageWidth = Math.min(vw, Math.floor(vh * STAGE_ASPECT));
  }
  const x = Math.floor((vw - stageWidth) / 2);
  const y = Math.floor((vh - stageHeight) / 2);
  const stage: Rect = { x, y, width: stageWidth, height: stageHeight };

  const panels: Rect[] = [];
  if (x > 0) {
    panels.push({ x: 0, y: 0, width: x, height: vh });
    panels.push({ x: x + stageWidth, y: 0, width: vw - x - stageWidth, height: vh });
  } else if (y > 0) {
    panels.push({ x: 0, y: 0, width: vw, height: y });
    panels.push({ x: 0, y: y + stageHeight, width: vw, height: vh - y - stageHeight });
  }

  const sideCaptions = x >= MIN_MV_SIDE;
  const mode: ViewportMode = rotate ? "rotate" : sideCaptions ? "wide" : "portrait";
  return { mode, viewport: { width: vw, height: vh }, stage, panels, sideCaptions };
}

/** Lane geometry inside the stage. The lane span and beat line come from the Blender camera fit. */
export function computeLaneLayout(stageWidth: number, stageHeight: number, hudHeight: number): LaneLayout {
  const width = Math.max(1, stageWidth);
  const height = Math.max(1, stageHeight);
  const [spanLeft, spanRight] = stageGeometry.stage.laneSpan;
  const left = width * spanLeft;
  const right = width * spanRight;
  const gap = clamp(width * 0.008, 2, 6);
  const laneWidth = (right - left - gap * (LANE_COUNT - 1)) / LANE_COUNT;
  const lanes = Array.from({ length: LANE_COUNT }, (_, lane) => {
    const laneLeft = left + lane * (laneWidth + gap);
    return { left: laneLeft, right: laneLeft + laneWidth, center: laneLeft + laneWidth / 2, width: laneWidth };
  });
  const hitY = height * stageGeometry.stage.hitLineY;
  const top = clamp(hudHeight + 8, 0, hitY * 0.4);
  const bottom = Math.min(height - 4, hitY + clamp(height * 0.07, 30, 70));
  const noteWidth = Math.max(12, laneWidth - clamp(laneWidth * 0.12, 4, 12));
  const noteHeight = clamp(laneWidth * 0.26, 16, 30);
  const zoneHeight = clamp((hitY - top) * 0.16, 56, 140);
  return { width, height, top, hitY, bottom, left, right, lanes, noteWidth, noteHeight, zoneHeight };
}

/** Screen y of a note head `until` seconds before it reaches the beat line. */
export function noteY(layout: LaneLayout, untilSeconds: number, approachSeconds: number): number {
  return layout.hitY - (untilSeconds / approachSeconds) * (layout.hitY - layout.top);
}

/** Maps Blender stage-normalized coordinates (0..1, y down) to stage pixels. */
export function toStagePoint(layout: Pick<LaneLayout, "width" | "height">, nx: number, ny: number): [number, number] {
  return [nx * layout.width, ny * layout.height];
}

export function rectContains(rect: Rect, px: number, py: number): boolean {
  return px >= rect.x && px < rect.x + rect.width && py >= rect.y && py < rect.y + rect.height;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}
