import type { ReactNode, RefObject } from "react";
export interface ScrollRevealProps {
  children: ReactNode;
  as?: "h1" | "h2" | "h3" | "p" | "blockquote" | "div";
  id?: string;
  scrollContainerRef?: RefObject<HTMLElement | null>;
  highlightColor?: string | null;
  mode?: "scrub" | "enter";
  splitBy?: "words" | "chars" | "lines";
  effect?: "fade" | "rise" | "flip" | "scale";
  stagger?: number;
  duration?: number;
  smoothing?: number;
  baseOpacity?: number;
  baseRotation?: number;
  baseOffset?: number;
  enableBlur?: boolean;
  blurStrength?: number;
  rotationEnd?: string;
  wordAnimationEnd?: string;
  containerClassName?: string;
  textClassName?: string;
}
export default function ScrollReveal(props: ScrollRevealProps): ReactNode;
