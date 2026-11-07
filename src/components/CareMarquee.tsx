"use client";

import { useEffect, useRef, useState } from "react";

const phrases = ["Your body.", "Your pace.", "Your path.", "Care that listens."];

export function CareMarquee() {
  const root = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(element);
    const visibility = () => setPageVisible(!document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  return (
    <section ref={root} className="home-marquee" aria-label="Care at your pace"
      data-running={visible && pageVisible}>
      <p className="sr-only">{phrases.join(" ")}</p>
      <div className="home-marquee-window" aria-hidden="true">
        <div className="home-marquee-track">
          {[0, 1].map((copy) => (
            <div className="home-marquee-group" key={copy}>
              {phrases.map((phrase) => (
                <span className="home-marquee-item" key={phrase}>
                  <span>{phrase}</span>
                  <svg className="home-marquee-star" viewBox="0 0 40 40" fill="currentColor">
                    <path d="M20 0 25 15 40 20 25 25 20 40 15 25 0 20 15 15Z" />
                  </svg>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
