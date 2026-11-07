import type { HTMLAttributes, ReactNode } from "react";
export interface FadeContentProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  container?: string | HTMLElement | null;
  effect?: "fade" | "focus" | "develop" | "dissolve" | "mist" | "pixel";
  blur?: boolean | number;
  duration?: number;
  ease?: string;
  delay?: number;
  threshold?: number;
  initialOpacity?: number;
  stagger?: number;
  staggerFrom?: string | number;
  trigger?: "scroll" | "mount";
  once?: boolean;
  exit?: boolean;
  scrub?: boolean | number;
  disappearAfter?: number;
  disappearDuration?: number;
  disappearEase?: string;
  onStart?: () => void;
  onComplete?: () => void;
  onDisappearanceComplete?: () => void;
}
export default function FadeContent(props: FadeContentProps): ReactNode;
