export const clamp = (n: number, low = 0, high = 1) => Math.max(low, Math.min(high, n));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smoother = (n: number) => { const t = clamp(n); return t ** 3 * (t * (t * 6 - 15) + 10); };
export const smooth = (a: number, b: number, n: number) => {
  const t = clamp((n - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// Projection and pacing measured from the reference's 800vh gallery.
// Scene units are CSS pixels; the DOM cards and GPU room share one camera.
export function hallwayGeometry(width: number, height: number, count: number) {
  const phone = width < 640;
  const perspective = phone ? clamp(height * 1.05, 680, 1000) : clamp(height * 1.3, 850, 1350);
  const cardWidth = phone ? Math.min(width * 0.56, height * 0.28) : Math.min(clamp(width * 0.2, 230, 330), Math.max(150, (height - 144) / 2));
  const gap = perspective * (phone ? 0.62 : 0.58);
  // Mobile door was capped too short (~0.5× height). Match a tall gallery opening.
  const doorHeight = phone
    ? Math.min(height * 0.78, Math.max(width * 1.05, height * 0.7))
    : height * 0.62;
  const doorWidth = phone ? Math.min(doorHeight * 0.72, width * 0.55) : doorHeight * 0.8;
  const thickness = doorWidth * 0.32;
  const end = count * gap;
  const travel = thickness + perspective + doorWidth * 0.15;
  const passage = travel / (gap * 0.85) * 1.35;
  return { width, height, phone, perspective, cardWidth, gap, doorHeight, doorWidth, thickness, end, travel, passage, total: count + passage + 0.2, count };
}

export type HallwayGeometry = ReturnType<typeof hallwayGeometry>;

export function hallwayCamera(progress: number, g: HallwayGeometry) {
  const units = progress * g.total;
  let distance: number;
  if (units <= g.count) {
    distance = g.gap * (units - 0.15 / (2 * Math.PI) * Math.sin(2 * Math.PI * units));
  } else if (units <= g.count + g.passage) {
    const t = (units - g.count) / g.passage;
    const velocity = g.gap * 0.85 * g.passage / g.travel;
    distance = g.end + g.travel * (velocity * (t ** 3 - 2 * t ** 2 + t) + 3 * t ** 2 - 2 * t ** 3);
  } else distance = g.end + g.travel;
  const center = smoother((distance - (g.end - g.gap * 0.5)) / (g.travel + g.gap * 0.5));
  const away = clamp(distance / Math.max(g.gap, 1));
  // Continue the opening left/right lean for later cards, then settle at the door.
  const cardAlong = clamp(distance / Math.max(g.gap, 1), 0, Math.max(g.count - 0.001, 0));
  const side = Math.floor(cardAlong) % 2 === 0 ? 1 : -1;
  const local = cardAlong - Math.floor(cardAlong);
  const swayAmp = g.phone ? g.width * 0.03 : g.width * 0.08;
  const sway = g.phone ? 0 : side * swayAmp * Math.sin(local * Math.PI) * (1 - center);
  const baseX = g.phone
    ? 0
    : mix(g.width * 0.135, g.width * 0.02, smoother(away));
  return {
    distance,
    units,
    cx: mix(baseX + sway, 0, center),
    cy: mix(g.phone ? -g.height * 0.19 : -g.height * 0.03, 0, center),
    intro: 1 - smooth(0.04, 0.5, away),
    // Short beat after the doorway is open, then the outside scene is fully in.
    gate: smooth(0, Math.max(48, g.doorWidth * 0.15), distance - (g.end + g.thickness + g.perspective)),
    arrival: smooth(0.2, 0.9, clamp((units - g.count - g.passage) / 0.2)),
  };
}
