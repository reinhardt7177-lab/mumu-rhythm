import { stageGeometry } from "../content/stageGeometry.generated";
import type { Song } from "../types";
import { songMotif } from "./visualTimeline";

/**
 * Canvas 2D procedural artwork for song cards, mission and result screens.
 * Every song has its own motif drawn from code; no bitmap assets are used.
 */

export type ArtVariant = "card" | "hero";

interface ArtContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  colors: readonly string[];
  night: string;
  accent: string;
  seed: number;
  hero: boolean;
}

function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function backdrop(art: ArtContext, top: string): void {
  const { ctx, width, height, night } = art;
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, top);
  sky.addColorStop(1, night);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
}

/** Blender floor rungs reused as a perspective floor, scaled into the art frame. */
function perspectiveFloor(art: ArtContext, horizon: number, color: string): void {
  const { ctx, width, height } = art;
  const rungs = stageGeometry.stage.rungs;
  const y0 = rungs[rungs.length - 1].y;
  const y1 = rungs[0].y;
  ctx.lineWidth = Math.max(1, width / 600);
  rungs.forEach((rung) => {
    const t = (rung.y - y0) / (y1 - y0);
    const y = horizon + (height - horizon) * t;
    ctx.strokeStyle = withAlpha(color, 0.12 + t * 0.4);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  });
  for (let index = -8; index <= 8; index += 1) {
    ctx.strokeStyle = withAlpha(color, 0.22);
    ctx.beginPath();
    ctx.moveTo(width / 2 + index * width * 0.02, horizon);
    ctx.lineTo(width / 2 + index * width * 0.16, height);
    ctx.stroke();
  }
}

function circuit(art: ArtContext): void {
  const { ctx, width, height, colors } = art;
  backdrop(art, "#131a3a");
  const horizon = height * 0.56;
  const sunX = width * 0.62;
  for (let ring = 7; ring >= 1; ring -= 1) {
    ctx.strokeStyle = withAlpha(colors[ring % 5], 0.2 + (7 - ring) * 0.08);
    ctx.lineWidth = Math.max(1.5, width / 260);
    ctx.beginPath();
    ctx.arc(sunX, horizon, ring * height * 0.055, Math.PI, 0);
    ctx.stroke();
  }
  ctx.fillStyle = colors[3];
  ctx.beginPath();
  ctx.arc(sunX, horizon, height * 0.05, Math.PI, 0);
  ctx.fill();
  perspectiveFloor(art, horizon, colors[2]);
  const laneColors = ["#3fe0d8", "#ff5fa2", "#ffc94a", "#6fdc6a", "#6f9bff"];
  laneColors.forEach((color, lane) => {
    const x = width * (0.14 + lane * 0.085);
    const y = height * (0.3 + ((lane * 37) % 5) * 0.08);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width * 0.07, Math.max(6, height * 0.03));
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(x + 3, y + 2, width * 0.07 - 6, 2);
  });
}

function keys(art: ArtContext): void {
  const { ctx, width, height, colors } = art;
  backdrop(art, "#3a1830");
  const count = 22;
  const keyTop = height * 0.62;
  const keyWidth = width / count;
  for (let index = 0; index < count; index += 1) {
    const x = index * keyWidth;
    ctx.fillStyle = index % 7 === 3 ? colors[3] : colors[0];
    ctx.fillRect(x + 1, keyTop, keyWidth - 2, height - keyTop);
    const slot = index % 7;
    if (slot !== 2 && slot !== 6) {
      ctx.fillStyle = "#1a0f18";
      ctx.fillRect(x + keyWidth * 0.66, keyTop, keyWidth * 0.68, (height - keyTop) * 0.58);
    }
  }
  // Marching staircase of melody notes above the keys.
  const rand = random(art.seed);
  for (let step = 0; step < 14; step += 1) {
    const x = width * (0.06 + step * 0.065);
    const rise = Math.abs(((step % 8) - 4)) / 4;
    const y = keyTop - height * (0.1 + rise * 0.28) - rand() * height * 0.02;
    ctx.fillStyle = step % 3 === 0 ? colors[1] : colors[2];
    ctx.fillRect(x, y, width * 0.05, height * 0.025);
    ctx.strokeStyle = withAlpha(colors[0], 0.5);
    ctx.lineWidth = Math.max(1, width / 500);
    ctx.beginPath();
    ctx.moveTo(x + width * 0.05, y);
    ctx.lineTo(x + width * 0.05, y - height * 0.08);
    ctx.stroke();
  }
}

function frills(art: ArtContext): void {
  const { ctx, width, height, colors } = art;
  backdrop(art, "#2c2128");
  const rows = 6;
  for (let row = 0; row < rows; row += 1) {
    const y = height * (0.3 + row * 0.12);
    const radius = width * (0.05 - row * 0.004);
    const color = colors[[1, 3, 2, 0, 1, 4][row]];
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, y);
    for (let x = 0; x <= width + radius * 2; x += radius * 2) {
      ctx.arc(x + radius, y, radius, Math.PI, 0, true);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = Math.max(1, width / 400);
    ctx.stroke();
  }
  for (let light = 0; light < 9; light += 1) {
    const x = width * (0.08 + light * 0.105);
    const glow = ctx.createRadialGradient(x, height * 0.12, 0, x, height * 0.12, height * 0.14);
    glow.addColorStop(0, withAlpha(colors[3], 0.8));
    glow.addColorStop(1, withAlpha(colors[3], 0));
    ctx.fillStyle = glow;
    ctx.fillRect(x - height * 0.14, 0, height * 0.28, height * 0.3);
  }
}

function gallop(art: ArtContext): void {
  const { ctx, width, height, colors } = art;
  backdrop(art, "#f0b35a");
  const sky = ctx.createLinearGradient(0, 0, 0, height * 0.6);
  sky.addColorStop(0, "#1c3f63");
  sky.addColorStop(1, withAlpha(colors[3], 0.35));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height * 0.6);
  ctx.fillStyle = colors[3];
  ctx.beginPath();
  ctx.arc(width * 0.72, height * 0.5, height * 0.12, 0, Math.PI * 2);
  ctx.fill();
  const ranges: Array<[string, number, number]> = [["#2b4f7a", 0.5, 0.28], ["#1e3a5c", 0.58, 0.2], ["#12304a", 0.66, 0.14]];
  ranges.forEach(([color, base, peak], layer) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, height);
    const peaks = 5 + layer * 2;
    for (let index = 0; index <= peaks; index += 1) {
      const x = (index / peaks) * width;
      const y = height * (base - (index % 2 === 0 ? peak : peak * 0.3));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    if (layer === 0) {
      ctx.fillStyle = colors[0];
      for (let index = 0; index <= peaks; index += 2) {
        const x = (index / peaks) * width;
        const y = height * (base - peak);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - width * 0.03, y + height * 0.06);
        ctx.lineTo(x + width * 0.03, y + height * 0.06);
        ctx.closePath();
        ctx.fill();
      }
    }
  });
  ctx.fillStyle = "#0e2a3b";
  ctx.fillRect(0, height * 0.72, width, height * 0.28);
  // Galloping chevrons racing to the right.
  ctx.lineWidth = Math.max(3, width / 90);
  ctx.lineJoin = "round";
  for (let index = 0; index < 7; index += 1) {
    const x = width * (0.1 + index * 0.12);
    const y = height * 0.86;
    ctx.strokeStyle = [colors[1], colors[3], colors[2]][index % 3];
    ctx.beginPath();
    ctx.moveTo(x, y - height * 0.06);
    ctx.lineTo(x + width * 0.04, y);
    ctx.lineTo(x, y + height * 0.06);
    ctx.stroke();
  }
}

function spiral(art: ArtContext): void {
  const { ctx, width, height, colors } = art;
  backdrop(art, "#3b1740");
  const cx = width * 0.64;
  const cy = height * 0.48;
  ctx.lineCap = "round";
  for (let arm = 0; arm < 3; arm += 1) {
    ctx.strokeStyle = [colors[1], colors[2], colors[3]][arm];
    ctx.lineWidth = Math.max(2, width / (140 + arm * 60));
    ctx.beginPath();
    for (let step = 0; step <= 160; step += 1) {
      const t = step / 160;
      const angle = t * Math.PI * 5 + arm * (Math.PI * 2 / 3);
      const radius = Math.exp(t * 2.2) * height * 0.02;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius * 0.82;
      if (step === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Long–short contrast: one sustained arc and a burst of short dashes.
  ctx.strokeStyle = colors[0];
  ctx.lineWidth = Math.max(3, width / 110);
  ctx.beginPath();
  ctx.arc(width * 0.22, height * 0.95, height * 0.55, Math.PI * 1.2, Math.PI * 1.62);
  ctx.stroke();
  for (let index = 0; index < 12; index += 1) {
    ctx.fillStyle = index % 2 ? colors[4] : colors[3];
    ctx.fillRect(width * (0.08 + index * 0.028), height * (0.82 - (index % 4) * 0.035), width * 0.016, height * 0.016);
  }
}

function puff(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, size * 1.25, size * 0.42, 0, 0, Math.PI * 2);
  ctx.arc(x - size * 0.5, y - size * 0.18, size * 0.46, 0, Math.PI * 2);
  ctx.arc(x + size * 0.18, y - size * 0.34, size * 0.58, 0, Math.PI * 2);
  ctx.arc(x + size * 0.75, y - size * 0.1, size * 0.36, 0, Math.PI * 2);
  ctx.fill();
}

/** Cloud Hop: cloud platforms climb (the call) then step back down (the answer), joined by hop arcs. */
function clouds(art: ArtContext): void {
  const { ctx, width, height, colors } = art;
  backdrop(art, "#27508f");
  const rand = random(art.seed);
  for (let star = 0; star < 36; star += 1) {
    ctx.fillStyle = withAlpha(colors[0], 0.25 + rand() * 0.5);
    const size = 1 + rand() * 2;
    ctx.fillRect(rand() * width, rand() * height * 0.55, size, size);
  }
  // Far soft cloud bank.
  for (let index = 0; index < 6; index += 1) {
    puff(ctx, width * (index / 5), height * 0.9, width * 0.14, withAlpha(colors[4], 0.28));
  }
  const steps = [0.72, 0.6, 0.48, 0.36, 0.46, 0.58, 0.7];
  const points = steps.map((level, index) => ({ x: width * (0.1 + index * 0.13), y: height * level }));
  // Hop arcs: warm on the way up (question), cool on the way down (answer).
  ctx.lineWidth = Math.max(2, width / 220);
  ctx.setLineDash([Math.max(3, width / 120), Math.max(4, width / 90)]);
  for (let index = 0; index + 1 < points.length; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    ctx.strokeStyle = index < 3 ? colors[1] : colors[2];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y - height * 0.05);
    ctx.quadraticCurveTo((a.x + b.x) / 2, Math.min(a.y, b.y) - height * 0.16, b.x, b.y - height * 0.05);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  points.forEach((point, index) => {
    puff(ctx, point.x, point.y, width * 0.045, index === 3 ? colors[3] : colors[0]);
    ctx.fillStyle = index < 3 ? colors[1] : index === 3 ? colors[3] : colors[2];
    ctx.beginPath();
    ctx.arc(point.x, point.y - height * 0.075, Math.max(3, width * 0.012), 0, Math.PI * 2);
    ctx.fill();
  });
  // Question and answer marks.
  ctx.font = `800 ${Math.max(12, height * 0.11)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = withAlpha(colors[1], 0.9);
  ctx.fillText("?", points[3].x, points[3].y - height * 0.2);
  ctx.fillStyle = withAlpha(colors[2], 0.9);
  ctx.fillText("♪", points[6].x + width * 0.06, points[6].y - height * 0.14);
}

function gear(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, teeth: number, rotation: number, color: string, hole: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let index = 0; index < teeth * 2; index += 1) {
    const angle = rotation + (index / (teeth * 2)) * Math.PI * 2;
    const r = index % 2 === 0 ? radius : radius * 0.8;
    const spread = Math.PI / (teeth * 2) * 0.55;
    ctx.lineTo(x + Math.cos(angle - spread) * r, y + Math.sin(angle - spread) * r);
    ctx.lineTo(x + Math.cos(angle + spread) * r, y + Math.sin(angle + spread) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = hole;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.32, 0, Math.PI * 2);
  ctx.fill();
}

/** Robot Parade: interlocking gears above one bar-long riff block repeated identically (ostinato). */
function gears(art: ArtContext): void {
  const { ctx, width, height, colors, night } = art;
  backdrop(art, "#23331c");
  ctx.strokeStyle = withAlpha(colors[2], 0.12);
  ctx.lineWidth = 1;
  const cell = Math.max(12, width / 24);
  for (let x = 0; x < width; x += cell) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += cell) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  const big = height * 0.2;
  gear(ctx, width * 0.66, height * 0.36, big, 12, 0.1, colors[3], night);
  gear(ctx, width * 0.66 + big * 1.72, height * 0.36 + big * 0.55, big * 0.62, 8, 0.35, colors[1], night);
  gear(ctx, width * 0.66 - big * 1.45, height * 0.36 - big * 0.62, big * 0.5, 7, 0.2, colors[2], night);
  // Same riff shape four times: heights follow the bass lanes 0,0,1,2,3,1.
  const riff = [0, 0, 1, 2, 3, 1];
  const onsets = [0, 0.75, 1.5, 2, 2.5, 3.5];
  const baseY = height * 0.9;
  const barWidth = width * 0.22;
  for (let bar = 0; bar < 4; bar += 1) {
    const left = width * 0.06 + bar * barWidth;
    ctx.fillStyle = withAlpha(colors[0], 0.08);
    ctx.fillRect(left, baseY - height * 0.24, barWidth - width * 0.015, height * 0.26);
    riff.forEach((lane, index) => {
      const x = left + (onsets[index] / 4) * (barWidth - width * 0.02);
      const h = height * (0.05 + lane * 0.045);
      ctx.fillStyle = [colors[2], colors[2], colors[3], colors[1], colors[4], colors[3]][index];
      ctx.fillRect(x, baseY - h, barWidth * 0.1, h);
    });
  }
  // Robot marchers: square heads with antennas stepping on the beat.
  for (let index = 0; index < 5; index += 1) {
    const x = width * (0.1 + index * 0.1);
    const y = height * (0.5 + (index % 2) * 0.03);
    const size = height * 0.07;
    ctx.fillStyle = colors[0];
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = night;
    ctx.fillRect(x + size * 0.2, y + size * 0.3, size * 0.18, size * 0.18);
    ctx.fillRect(x + size * 0.62, y + size * 0.3, size * 0.18, size * 0.18);
    ctx.strokeStyle = colors[0];
    ctx.lineWidth = Math.max(1, width / 400);
    ctx.beginPath();
    ctx.moveTo(x + size / 2, y);
    ctx.lineTo(x + size / 2, y - size * 0.4);
    ctx.stroke();
    ctx.fillStyle = colors[index % 2 ? 1 : 3];
    ctx.beginPath();
    ctx.arc(x + size / 2, y - size * 0.45, size * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
}

const DRAWERS = [circuit, keys, frills, gallop, spiral, clouds, gears];

/** Draws the procedural artwork for `song` into `canvas` at its CSS size (DPR capped at 2). */
export function drawSongArt(canvas: HTMLCanvasElement, song: Song, variant: ArtVariant = "card"): void {
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(1, Math.round(rect.width || canvas.clientWidth || 320));
  const cssHeight = Math.max(1, Math.round(rect.height || canvas.clientHeight || 240));
  const density = Math.min(2, window.devicePixelRatio || 1);
  const pixelWidth = Math.round(cssWidth * density);
  const pixelHeight = Math.round(cssHeight * density);
  const motif = songMotif(song.id);
  const signature = `${song.id}|${variant}|${pixelWidth}x${pixelHeight}`;
  // Resize storms (rotation, keyboard) redraw the same art; skip identical repaints.
  if (canvas.dataset.artSignature === signature) return;
  if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(density, 0, 0, density, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  const art: ArtContext = {
    ctx,
    width: cssWidth,
    height: cssHeight,
    colors: motif.colors,
    night: motif.night,
    accent: song.palette.accent,
    seed: song.id.length * 97 + motif.id * 13,
    hero: variant === "hero",
  };
  DRAWERS[motif.id](art);
  if (variant === "hero") {
    const shade = ctx.createLinearGradient(0, 0, cssWidth, 0);
    shade.addColorStop(0, "rgba(6, 8, 14, 0.9)");
    shade.addColorStop(0.55, "rgba(6, 8, 14, 0.55)");
    shade.addColorStop(1, "rgba(6, 8, 14, 0.2)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, cssWidth, cssHeight);
  }
  canvas.dataset.motif = motif.name;
  canvas.dataset.artSignature = signature;
}
