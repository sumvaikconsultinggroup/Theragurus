"use client";
import { usePathname } from "next/navigation";
import { Suspense, useLayoutEffect, useRef, type ReactNode } from "react";
import { SitePresence } from "./SitePresence";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollToTop } from "./ScrollToTop";
import { introWordmark } from "@/data/intro-wordmark";
import "./SiteIntro.css";

function HomeIntro() {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.hidden = true;
      return;
    }
    const main = document.getElementById("main-content");
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    el.hidden = false;
    main?.setAttribute("inert", "");
    const timeline = gsap.timeline();
    const done = () => {
      timeline?.kill();
      el.hidden = true;
      main?.removeAttribute("inert");
      document.body.style.overflow = oldOverflow;
      if (el.contains(document.activeElement) && main) {
        main.tabIndex = -1;
        main.focus({ preventScroll: true });
      }
    };
    el.focus({ preventScroll: true });
    const key = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        event.preventDefault();
        el.focus();
      }
      if (event.key === "Escape") done();
    };
    el.addEventListener("keydown", key);
    gsap.registerPlugin(CustomEase);
    const drawEase = CustomEase.create("introDraw", "0.712,0,0,1");
    const eraseEase = CustomEase.create("introErase", "0.684,0,0,1");
    const strokes = el.querySelectorAll(".intro-logo-stroke");
    timeline.eventCallback("onComplete", done);
    timeline
      .fromTo(
        strokes,
        { attr: { "stroke-dashoffset": 1 } },
        { attr: { "stroke-dashoffset": 0 }, duration: 1.2, ease: drawEase },
        0,
      )
      .fromTo(strokes, { fillOpacity: 0 }, { fillOpacity: 1, duration: 0.35, ease: "power2.out" }, 0.85)
      .to(strokes, { fillOpacity: 0, duration: 0.25, ease: "power2.in" }, 1.55)
      .to(
        strokes,
        { attr: { "stroke-dashoffset": -1 }, duration: 1.2, ease: eraseEase },
        1.55,
      )
      .fromTo(el.querySelectorAll(".intro-panel"), { yPercent: 0 }, {
        yPercent: 100,
        duration: 1.2,
        stagger: 0.1,
        ease: "power2.inOut",
      }, 2.15);
    return () => {
      timeline?.kill();
      el.hidden = true;
      el.removeEventListener("keydown", key);
      main?.removeAttribute("inert");
      document.body.style.overflow = oldOverflow;
    };
  }, []);
  return (
    <>
    <noscript>
      <style>{`.site-intro { display: none !important; }`}</style>
    </noscript>
    <div
      className="site-intro"
      ref={root}
      role="dialog"
      aria-label="Welcome to TheraGurus"
      aria-modal="true"
      tabIndex={-1}
    >
      <div className="intro-panels" aria-hidden="true">
        {[1, 2, 3, 4].map((panel) => <div key={panel} className={`intro-panel bg-${panel}`} />)}
      </div>
      <div className="site-intro-brand" aria-hidden="true">
        <svg viewBox={introWordmark.viewBox} className="intro-wordmark" fill="none">
          {introWordmark.letters.map((path, index) => (
            <path key={index} className={`intro-logo-stroke${index >= 5 ? " intro-logo-stroke--green" : ""}`}
              d={path} pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
          ))}
        </svg>
      </div>
    </div>
    </>
  );
}
export function SiteFrame({
  children,
  header,
  footer,
}: {
  children: ReactNode;
  header: ReactNode;
  footer: ReactNode;
}) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return <>{children}</>;
  if (pathname === "/test/hallway") {
    return (
      <>
        <HomeIntro />
        {children}
      </>
    );
  }
  return (
    <>
      {pathname === "/" && <HomeIntro />}
      {pathname === "/" ? null : header}
      {children}
      {footer}
      <ScrollToTop />
      <Suspense fallback={null}>
        <SitePresence />
      </Suspense>
    </>
  );
}
