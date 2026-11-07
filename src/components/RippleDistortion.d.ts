import type { CSSProperties, ReactNode, RefObject } from "react";

export interface RippleDistortionProps {
  src?: string;
  brushSize?: number;
  strength?: number;
  swirl?: number;
  rings?: number;
  spread?: number;
  fade?: number;
  spacing?: number;
  dispersion?: number;
  glint?: number;
  tint?: string;
  tintAmount?: number;
  grayscale?: boolean;
  highlightColor?: string;
  trigger?: "hover" | "click" | "both";
  clickStrength?: number;
  quality?: "low" | "medium" | "high";
  enabled?: boolean;
  className?: string;
  style?: CSSProperties;
  imageRoot?: RefObject<HTMLElement | null>;
  onActivity?: (active: boolean) => void;
  onError?: () => void;
}

export default function RippleDistortion(
  props: RippleDistortionProps,
): ReactNode;
