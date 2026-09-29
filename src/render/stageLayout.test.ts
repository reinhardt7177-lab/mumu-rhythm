import { describe, expect, it } from "vitest";
import { stageGeometry } from "../content/stageGeometry.generated";
import { STAGE_ASPECT, computeLaneLayout, computeViewportLayout, noteY, rectsOverlap } from "./stageLayout";

describe("computeViewportLayout", () => {
  it("centres an integer 9:16 stage with left/right MV panels on desktop", () => {
    const layout = computeViewportLayout(1600, 900);
    expect(layout.mode).toBe("wide");
    expect(layout.stage).toEqual({ x: 547, y: 0, width: 506, height: 900 });
    expect(Number.isInteger(layout.stage.width) && Number.isInteger(layout.stage.height)).toBe(true);
    expect(Math.abs(layout.stage.width / layout.stage.height - STAGE_ASPECT)).toBeLessThan(0.002);
    expect(layout.panels).toHaveLength(2);
    expect(layout.panels[0].width + layout.stage.width + layout.panels[1].width).toBe(1600);
    layout.panels.forEach((panel) => expect(rectsOverlap(panel, layout.stage)).toBe(false));
  });

  it("uses side panels on landscape tablets", () => {
    const layout = computeViewportLayout(1024, 768);
    expect(layout.mode).toBe("wide");
    expect(layout.stage.height).toBe(768);
    expect(layout.sideCaptions).toBe(true);
  });

  it("fits portrait phones to width and fills the rest top/bottom", () => {
    const layout = computeViewportLayout(390, 844);
    expect(layout.mode).toBe("portrait");
    expect(layout.stage.width).toBe(390);
    expect(layout.stage.height).toBe(693);
    expect(layout.stage.x).toBe(0);
    expect(layout.panels).toHaveLength(2);
    expect(layout.panels[0].height + layout.stage.height + layout.panels[1].height).toBe(844);
  });

  it("asks short landscape phones (844x390) to rotate", () => {
    expect(computeViewportLayout(844, 390).mode).toBe("rotate");
    expect(computeViewportLayout(1280, 720).mode).toBe("wide");
  });

  it("never exceeds the viewport", () => {
    for (const [w, h] of [[320, 480], [768, 1024], [2560, 1080], [500, 500], [1, 1]]) {
      const { stage } = computeViewportLayout(w, h);
      expect(stage.x + stage.width).toBeLessThanOrEqual(w);
      expect(stage.y + stage.height).toBeLessThanOrEqual(h);
    }
  });
});

describe("computeLaneLayout", () => {
  const layout = computeLaneLayout(506, 900, 80);

  it("places the beat line and lane span from the Blender camera fit", () => {
    expect(layout.hitY).toBeCloseTo(900 * stageGeometry.stage.hitLineY);
    expect(layout.left).toBeCloseTo(506 * stageGeometry.stage.laneSpan[0]);
    expect(layout.right).toBeCloseTo(506 * stageGeometry.stage.laneSpan[1]);
  });

  it("has five equal, ordered, non-overlapping lanes", () => {
    expect(layout.lanes).toHaveLength(5);
    layout.lanes.forEach((lane, index) => {
      expect(lane.width).toBeCloseTo(layout.lanes[0].width);
      expect(lane.center).toBeCloseTo((lane.left + lane.right) / 2);
      if (index > 0) expect(lane.left).toBeGreaterThan(layout.lanes[index - 1].right);
    });
    expect(layout.noteWidth).toBeLessThanOrEqual(layout.lanes[0].width);
  });

  it("keeps the note travel area below the HUD and above the beat line", () => {
    expect(layout.top).toBeGreaterThanOrEqual(80);
    expect(layout.top).toBeLessThan(layout.hitY);
    expect(layout.bottom).toBeGreaterThan(layout.hitY);
    expect(layout.bottom).toBeLessThanOrEqual(900);
  });

  it("moves notes linearly from the top to the beat line", () => {
    expect(noteY(layout, 0, 2.5)).toBeCloseTo(layout.hitY);
    expect(noteY(layout, 2.5, 2.5)).toBeCloseTo(layout.top);
    expect(noteY(layout, 1.25, 2.5)).toBeCloseTo((layout.top + layout.hitY) / 2);
    expect(noteY(layout, -0.1, 2.5)).toBeGreaterThan(layout.hitY);
  });
});

describe("Blender stage geometry", () => {
  it("contains only numeric perspective data converging on the horizon", () => {
    const [, horizonY] = stageGeometry.stage.camera.horizon;
    stageGeometry.stage.rails.forEach((rail) => {
      expect(rail.y1).toBeGreaterThanOrEqual(horizonY);
      expect(rail.y0).toBeGreaterThan(rail.y1);
      expect(Math.abs(rail.x1 - 0.5)).toBeLessThan(Math.abs(rail.x0 - 0.5));
    });
    const depths = stageGeometry.stage.rungs.map((rung) => rung.depth);
    expect([...depths].sort((a, b) => a - b)).toEqual(depths);
    expect(stageGeometry.mv.towers.length).toBeGreaterThan(0);
  });
});
