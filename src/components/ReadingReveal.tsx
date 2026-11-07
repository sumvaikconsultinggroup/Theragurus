import ScrollReveal, { type ScrollRevealProps } from "./ScrollReveal";

/** React Bits motion with the site's existing semantic tags and typography. */
export function ReadingReveal({ as = "p", ...props }: ScrollRevealProps) {
  const body = as === "p" || as === "blockquote";
  return <ScrollReveal as={as} mode="scrub" splitBy="words" effect="fade"
    highlightColor={null} stagger={0.05} duration={0.8} smoothing={0.15}
    baseOpacity={body ? 0.25 : 0.1} baseRotation={body ? 0 : 3}
    baseOffset={0} enableBlur blurStrength={body ? 2 : 4}
    rotationEnd="bottom 72%" wordAnimationEnd="bottom 58%" {...props} />;
}
