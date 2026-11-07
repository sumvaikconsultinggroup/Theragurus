"use client";

import FadeContent, { type FadeContentProps } from "./FadeContent";

export function SiteFade({ className = "", ...props }: FadeContentProps) {
  return (
    <FadeContent
      effect="mist"
      duration={1.8}
      ease="power2.out"
      stagger={0.1}
      threshold={0.1}
      once
      className={`site-fade ${className}`}
      {...props}
    />
  );
}
