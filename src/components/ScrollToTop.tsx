"use client";

import { useEffect, useState } from "react";
import { scrollPageTo } from "@/lib/page-scroll";

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="Scroll to top"
      title="Back to top"
      tabIndex={visible ? 0 : -1}
      disabled={!visible}
      onClick={() => scrollPageTo(0)}
      className={`scroll-to-top ${visible ? "scroll-to-top--visible" : ""}`}
    >
      <svg
        viewBox="0 0 16 16"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <path
          d="M8 12.5V3.5M4.2 7.2 8 3.5l3.8 3.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
