import type { CSSProperties, ReactNode } from "react";
export interface GooeyNavItem {
  label: string;
  href?: string;
  icon?: ReactNode;
  expanded?: boolean;
  controls?: string;
}
export interface GooeyNavProps {
  items: GooeyNavItem[];
  activeIndex?: number;
  initialActiveIndex?: number;
  onChange?: (index: number, item: GooeyNavItem) => void;
  theme?: "dark" | "light";
  color?: string;
  activeTextColor?: string;
  colors?: string[];
  size?: "sm" | "md" | "lg";
  frame?: boolean;
  particleCount?: number;
  spread?: number;
  animationTime?: number;
  timeVariance?: number;
  gooeyness?: number;
  wobble?: number;
  hoverEffect?: boolean;
  contrastOverlay?: boolean;
  navLabel?: string;
  className?: string;
  style?: CSSProperties & Record<`--${string}`, string | number>;
}
export default function GooeyNav(props: GooeyNavProps): ReactNode;
