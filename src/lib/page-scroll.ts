export function scrollPageTo(top: number, immediate = false) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top, behavior: immediate || reduce ? "instant" : "smooth" });
}
