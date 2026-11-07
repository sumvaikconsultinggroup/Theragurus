/** Progress map from the Motion Submit Button delivery scene. Duration 5.6s, linear. */

export const DELIVERY_SECONDS = 5.6;

export function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function invLerp(value: number, start: number, end: number) {
  return clamp01((value - start) / (end - start));
}

export function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

export function smooth(t: number) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

export function smoother(t: number) {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

type Ease = (t: number) => number;

export function sample(value: number, stops: number[], output: number[], ease: Ease = smooth) {
  if (value <= stops[0]) return output[0];
  for (let i = 1; i < stops.length; i++) {
    if (value <= stops[i]) {
      return lerp(output[i - 1], output[i], ease(invLerp(value, stops[i - 1], stops[i])));
    }
  }
  return output[output.length - 1];
}

export type FoldPose = {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  rx: number;
  ry: number;
};

/** Card fold, progress 0 → 0.46. Later progress is the envelope's flight, not the form. */
export function foldPose(progress: number): FoldPose {
  const e = Math.min(progress, 0.46);
  return {
    x: 0,
    y: sample(e, [0, 0.18, 0.35, 0.4, 0.426, 0.46], [0, -12, -3, 0, 1.2, 0], smoother),
    rotate: sample(e, [0, 0.18, 0.36, 0.46], [0, -2, -1, -2], smoother),
    scale: sample(e, [0, 0.09, 0.32, 0.4, 0.426, 0.46], [1, 0.99, 0.62, 0.62, 0.617, 0.62], smoother),
    rx: sample(e, [0, 0.18, 0.38, 0.46], [0, 14, 0, 0], smoother),
    ry: 0,
  };
}

export function formTransform(progress: number) {
  if (progress >= 1.01) return "";
  const pose = foldPose(progress);
  return `translate3d(${pose.x}px, ${pose.y}px, 0) rotate(${pose.rotate}deg) scale(${pose.scale}) perspective(1200px) rotateX(${pose.rx}deg)`;
}

export function formOpacity(progress: number) {
  if (progress >= 1.01) return smoother(invLerp(progress, 1.01, 1.08));
  return 1 - smooth(invLerp(progress, 0.08, 0.18));
}

export type PaperBox = {
  width: number;
  height: number;
  radius: number;
  border: string;
  shadow: string;
};

export function paperHeight(progress: number, box: PaperBox) {
  return sample(progress, [0, 0.1, 0.32], [box.height, box.height, Math.min(box.width * 0.54, 250)]);
}

export function paperRadius(progress: number, box: PaperBox) {
  return sample(progress, [0, 0.15, 0.33], [box.radius, box.radius, 7]);
}

export function paperOpacity(progress: number) {
  return sample(progress, [0, 0.08, 0.18, 0.95, 0.965, 1], [0, 0, 1, 1, 0, 0]);
}

export function flapOpacity(progress: number) {
  return sample(progress, [0, 0.1, 0.2, 1], [0, 0, 1, 1]);
}

export function paperShadow(progress: number, box: PaperBox) {
  if (progress < 0.32) return box.shadow;
  const drop = 1 - smooth(invLerp(progress, 0.49, 0.6));
  const y = sample(progress, [0.32, 0.6, 0.78, 1], [12, 10, 5, 4]);
  const blur = sample(progress, [0.32, 0.6, 0.78, 1], [22, 18, 10, 9]);
  return `0 ${y}px ${blur}px -7px rgba(24,22,20,${0.25 * drop}), 0 1px 2px rgba(24,22,20,${0.09 * drop})`;
}

export function paperTransform(progress: number, box: PaperBox) {
  if (progress <= 0.46) {
    const pose = foldPose(progress);
    return `translate3d(0px, ${pose.y}px, 0px) rotate(${pose.rotate}deg) scale(${pose.scale}) perspective(1200px) rotateX(${pose.rx}deg)`;
  }
  const glide = smooth(invLerp(progress, 0.49, 0.6));
  const widthRatio = box.width / 600;
  const tilt = sample(progress, [0.735, 0.875], [-225, 90]);
  const envelope = Math.min(box.width * 0.54, 250);
  const a = lerp(0.62 * Math.cos(-Math.PI / 90), 0.15, glide);
  const b = lerp(0.62 * Math.sin(-Math.PI / 90), 16 / 600, glide);
  const c = lerp(-0.62 * Math.sin(-Math.PI / 90), (-100 * widthRatio) / envelope, glide);
  const d = lerp(0.62 * Math.cos(-Math.PI / 90), (4000 / 155) * (widthRatio / envelope), glide);
  const lift = 48 - 36 * smooth(invLerp(tilt, 20, 90));
  const x = glide * (24 + tilt) * widthRatio + glide * mailboxNudge.x;
  const y = glide * (64.6 - lift - (tilt * 40) / 155) * widthRatio + glide * mailboxNudge.y;
  return `matrix(${a}, ${b}, ${c}, ${d}, ${x}, ${y})`;
}

export function sceneOpacity(progress: number) {
  return 1 - smooth(invLerp(progress, 1, 1.05));
}

export function sceneScale(progress: number) {
  return sample(progress, [0, 0.46, 0.61], [1, 1, 1]);
}

/** A small lift, up and to the right, so the mailbox sits just off the form. */
export const mailboxNudge = { x: 28, y: -40 };

export function mailboxOpacity(progress: number) {
  return smooth(invLerp(progress, 0.58, 0.64));
}

export function mailboxShift(progress: number) {
  return {
    x: sample(progress, [0.58, 0.64], [16, 0]),
    y: sample(progress, [0.58, 0.64], [5, 0]),
  };
}

export function sealMotion(progress: number) {
  return {
    scale: sample(progress, [0, 0.35, 0.405, 0.426, 0.46], [1.035, 1.035, 1, 0.985, 1], smoother),
    y: sample(progress, [0, 0.35, 0.405, 0.426, 0.46], [-9, -9, 0, 0.65, 0], smoother),
    opacity: sample(progress, [0, 0.35, 0.401, 1], [0, 0, 1, 1], smoother),
  };
}

export function slotShade(progress: number) {
  const tilt = sample(progress, [0.735, 0.875], [-225, 90]);
  return `${clamp01((tilt + 50) / 100) * 100}%`;
}

function perspectivePoint(x: number, y: number, degrees: number, originX: number) {
  const radians = (degrees * Math.PI) / 180;
  const local = x - originX;
  const divisor = 1800 / (1800 - -local * Math.sin(radians));
  return `${originX + local * Math.cos(radians) * divisor},${300 + (y - 300) * divisor}`;
}

export function sideFlap(degrees: number, right: boolean) {
  const origin = right ? 1000 : 0;
  const points = right
    ? [
        [1000, 0],
        [450, 318],
        [1000, 600],
      ]
    : [
        [0, 0],
        [550, 318],
        [0, 600],
      ];
  return points.map(([x, y], index) => `${index ? "L" : "M"}${perspectivePoint(x, y, degrees, origin)}`).join(" ") + " Z";
}

export function topFlap(degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  const points = [
    [0, 0],
    [1000, 0],
    [520, 390],
    [500, 398],
    [480, 390],
  ];
  return (
    points
      .map(([x, y], index) => {
        const divisor = 1800 / (1800 - y * Math.sin(radians));
        return `${index ? "L" : "M"}${500 + (x - 500) * divisor},${y * Math.cos(radians) * divisor}`;
      })
      .join(" ") + " Z"
  );
}

export function envelopeFlaps(progress: number) {
  return {
    left: sideFlap(sample(progress, [0, 0.13, 0.27], [110, 110, 0]), false),
    right: sideFlap(sample(progress, [0, 0.16, 0.3], [-110, -110, 0]), true),
    top: topFlap(sample(progress, [0, 0.23, 0.4], [178, 178, 0], smoother)),
    topShade: sample(progress, [0, 0.23, 0.31, 0.4], [0.025, 0.025, 0.13, 0.025]),
  };
}

function doorPoint(x: number, y: number, angle: number) {
  const swing = -(160 - y) * Math.sin(angle);
  return `${270 + 0.9 * x + swing * 0.62},${95 + 0.16 * x + 160 + (y - 160) * Math.cos(angle) - swing * 0.35}`;
}

export function doorAngle(progress: number) {
  const open = smooth((progress - 0.64) / 0.095);
  const close = smooth((progress - 0.875) / 0.07);
  return ((Math.PI / 180) * 96 * open * (1 - close));
}

function doorPath(angle: number, inset = 0) {
  const curve = 33.14;
  const left = inset;
  const right = 120 - inset;
  const top = inset;
  const bottom = 160 - inset;
  const side = 60 - inset;
  const bow = (side / 60) * curve;
  return [
    `M${doorPoint(left, bottom, angle)}`,
    `L${doorPoint(left, 60, angle)}`,
    `C${doorPoint(left, 60 - bow, angle)} ${doorPoint(60 - bow, top, angle)} ${doorPoint(60, top, angle)}`,
    `C${doorPoint(60 + bow, top, angle)} ${doorPoint(right, 60 - bow, angle)} ${doorPoint(right, 60, angle)}`,
    `L${doorPoint(right, bottom, angle)} Z`,
  ].join(" ");
}

export function doorPaths(progress: number) {
  const angle = doorAngle(progress);
  return {
    door: doorPath(angle),
    inner: doorPath(angle, 5),
    rim: `M${doorPoint(9, 149, angle)} L${doorPoint(9, 60, angle)} C${doorPoint(9, 33, angle)} ${doorPoint(32, 9, angle)} ${doorPoint(60, 9, angle)}`,
    plate: `M${doorPoint(50, 18, angle)} L${doorPoint(70, 18, angle)} L${doorPoint(70, 27, angle)} L${doorPoint(50, 27, angle)} Z`,
    slot: `M${doorPoint(52, 19, angle)} L${doorPoint(68, 19, angle)}`,
    shade: 0.09 + 0.21 * Math.sin(angle),
  };
}

function flagPoint(x: number, y: number, progress: number) {
  const turn = -76 * (1 - smooth((progress - 0.945) / 0.04)) * (Math.PI / 180);
  const dx = x - 470;
  const dy = y - 189;
  return `${470 + dx * Math.cos(turn) - dy * Math.sin(turn)},${189 + dx * Math.sin(turn) + dy * Math.cos(turn)}`;
}

function flagPath(points: number[][], progress: number, close = false) {
  return points.map(([x, y], index) => `${index ? "L" : "M"}${flagPoint(x, y, progress)}`).join(" ") + (close ? " Z" : "");
}

export function flagPaths(progress: number) {
  return {
    flag: flagPath(
      [
        [467, 190],
        [467, 116],
        [470, 113],
        [493, 107],
        [495, 109],
        [495, 128],
        [473, 133.5],
        [473, 190],
      ],
      progress,
      true,
    ),
    edge: flagPath(
      [
        [470, 188],
        [470, 117],
        [492, 111],
      ],
      progress,
    ),
    crease: flagPath(
      [
        [473, 134],
        [492.5, 129],
      ],
      progress,
    ),
  };
}

export function createDelivery(
  progress: { get(): number; set(value: number): void },
  apply: (value: number) => void,
) {
  let generation = 0;
  let outcome: "pending" | "ok" | "err" = "pending";
  let release: (() => void) | null = null;

  function tween(to: number, seconds: number, token: number) {
    const from = progress.get();
    const started = performance.now();
    const ms = Math.max(10, seconds * 1000);
    return new Promise<boolean>((resolve) => {
      const step = (now: number) => {
        if (token !== generation) {
          resolve(false);
          return;
        }
        const t = Math.min(1, (now - started) / ms);
        progress.set(from + (to - from) * t);
        apply(progress.get());
        if (t < 1) requestAnimationFrame(step);
        else resolve(true);
      };
      requestAnimationFrame(step);
    });
  }

  return {
    async run() {
      const token = ++generation;
      outcome = "pending";
      progress.set(0);
      apply(0);
      if (!(await tween(0.46, DELIVERY_SECONDS * 0.34, token))) return "stopped" as const;
      if (outcome === "pending") {
        await new Promise<void>((done) => {
          release = done;
        });
        release = null;
      }
      if (token !== generation || (outcome as "pending" | "ok" | "err") !== "ok") return "stopped" as const;
      if (!(await tween(1, DELIVERY_SECONDS * 0.66, token))) return "stopped" as const;
      if (!(await tween(1.08, 0.7, token))) return "stopped" as const;
      return "done" as const;
    },
    succeed() {
      if (outcome === "err") return;
      outcome = "ok";
      release?.();
    },
    async fail() {
      outcome = "err";
      const token = ++generation;
      release?.();
      release = null;
      await tween(0, 0.4, token);
      progress.set(0);
      apply(0);
    },
  };
}
