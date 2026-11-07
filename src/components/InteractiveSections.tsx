"use client";

import Image from "next/image";
import Link from "next/link";
import { type CSSProperties, type Dispatch, type SetStateAction, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowIcon,
  ButtonLink,
  JournalCard,
  SectionHeading,
} from "@/components/Ui";
import type { ArticlePreview } from "@/lib/content";
import { clinic } from "@/lib/booking-catalog";
import { toast } from "@/components/Toast";
import { PostalScene } from "@/components/contact/PostalScene";
import { createDelivery, formOpacity, formTransform, type PaperBox } from "@/components/contact/postal";
import { contactInterests, contactSettings } from "@/lib/contact-options";
import { isContactField, parseContact, type ContactField } from "@/lib/contact-schema";
import { ResponsivePhoto } from "@/components/ResponsivePhoto";
import { BREATH_PHASE_SECONDS, createBreathingAudio } from "@/lib/breathing-audio";
import { scrollPageTo } from "@/lib/page-scroll";
import { SiteFade } from "@/components/SiteFade";
import { HeroRipple } from "@/components/HeroRipple";

export function HomeHero() {
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
        intro
          .from(".hero-line > span", {
            yPercent: 110,
            stagger: 0.12,
            duration: 0.85,
          })
          .from(
            ".hero-bottom",
            { y: 20, opacity: 0, duration: 0.6, stagger: 0.1 },
            "-=0.45",
          );
        if (window.matchMedia("(min-width: 761px)").matches) {
          intro.fromTo(
            ".hero-photo",
            { scale: 1.05 },
            { scale: 1, duration: 1.6 },
            0,
          );
        }
      }, root);
      return () => ctx.revert();
    });
    return () => media.revert();
  }, []);

  return (
    <section
      ref={root}
      id="top"
      className="home-hero"
      aria-labelledby="home-title"
    >
      <ResponsivePhoto
        src="/hero-wellness.jpg"
        alt="A peaceful yoga practice in nature"
        fill
        priority
        sizes="100vw"
        className="hero-photo"
        pictureClassName="hero-photo-frame"
      />
      <HeroRipple heroRef={root} />
      <div className="hero-shade" />
      <div className="tg-container hero-inner">
        <div className="hero-main">
          <h1 id="home-title">
            <span className="hero-line">
              <span>Care for </span>
            </span>
            <span className="hero-line">
              <span>your body, </span>
            </span>
            <span className="hero-line">
              <span>inside and out.</span>
            </span>
          </h1>
          <SiteFade className="hero-copy" trigger="mount">
            <p>
              Come as you are. Find the support you need.
              <br className="desktop-break" /> Personalized pelvic health and
              workplace wellness, with you at the center.
            </p>
            <div className="button-row">
              <ButtonLink href="/book">Start your care journey</ButtonLink>
              <Link href="/our-services" className="hero-secondary">
                Explore our services
                <ArrowIcon diagonal={false} />
              </Link>
            </div>
          </SiteFade>
        </div>
        <div className="hero-bottom">
          <div className="hero-availability">
            <span className="availability-dot" />
            In person &amp; online
            <span className="hero-divider" />
            Santa Clarita &amp; beyond
          </div>
          <Link href="/meet-the-owner" className="hero-practitioner">
            <span className="practitioner-photo">
              <Image src="/trapti.jpg" alt="" fill sizes="56px" />
            </span>
            <span>
              <strong>Care with a human connection.</strong>
              <small>Meet Trapti Agarwal, OTR/L</small>
            </span>
            <ArrowIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}

type Service = {
  slug: string;
  title: string;
  description: string;
  image: string;
  audience: string;
  intro: string;
  features: readonly string[];
};
export function CareSelector({ services }: { services: readonly Service[] }) {
  const [audience, setAudience] = useState("personal");
  const reduced = useReducedMotion();
  const visible = services.filter((s) => s.audience === audience);
  const featured = visible[0];
  return (
    <section id="services" className="tg-section">
      <div className="tg-container">
        <SectionHeading
          title={
            <>
              Care that meets you
              <br />
              where you are.
            </>
          }
          description="For your body, your everyday life, and the people you work with. Find a little more support in the way that suits you."
        />
        <div className="care-tabs" role="tablist" aria-label="Choose your care">
          <button
            type="button"
            id="tab-personal"
            role="tab"
            aria-selected={audience === "personal"}
            aria-controls="care-panel"
            tabIndex={audience === "personal" ? 0 : -1}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                setAudience("workplace");
                document.getElementById("tab-workplace")?.focus();
              }
            }}
            onClick={() => setAudience("personal")}
          >
            For you
            {audience === "personal" && (
              <motion.span
                layoutId="care-tab-indicator"
                className="tab-indicator"
                transition={{ duration: reduced ? 0 : 0.25 }}
              />
            )}
          </button>
          <button
            type="button"
            id="tab-workplace"
            role="tab"
            aria-selected={audience === "workplace"}
            aria-controls="care-panel"
            tabIndex={audience === "workplace" ? 0 : -1}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                setAudience("personal");
                document.getElementById("tab-personal")?.focus();
              }
            }}
            onClick={() => setAudience("workplace")}
          >
            For your workplace
            {audience === "workplace" && (
              <motion.span
                layoutId="care-tab-indicator"
                className="tab-indicator"
                transition={{ duration: reduced ? 0 : 0.25 }}
              />
            )}
          </button>
        </div>
        <div
          id="care-panel"
          role="tabpanel"
          aria-labelledby={`tab-${audience}`}
          tabIndex={0}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={audience}
              className="care-feature"
              initial={{ opacity: 0, x: reduced ? 0 : 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reduced ? 0 : -12 }}
              transition={{ duration: 0.22 }}
            >
              <div className="care-feature-image">
                <ResponsivePhoto
                  src={featured.image}
                  alt={
                    audience === "personal"
                      ? "Thoughtful movement in a light-filled space"
                      : "A comfortable, thoughtfully designed workspace"
                  }
                  fill
                  sizes="(min-width: 800px) 45vw, 100vw"
                />
              </div>
              <div className="care-feature-copy">
                <h3>
                  {audience === "personal"
                    ? "Feel more at home in your body."
                    : "A healthier way to work, together."}
                </h3>
                <p>{featured.intro}</p>
                <ul className="check-list">
                  {featured.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <ButtonLink href={`/${featured.slug}`}>
                  Explore{" "}
                  {audience === "personal"
                    ? "pelvic health"
                    : "workplace wellness"}
                </ButtonLink>
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="service-link-row">
            {visible.slice(1).map((s) => (
              <Link key={s.slug} href={`/${s.slug}`}>
                <span>{s.title}</span>
                <ArrowIcon />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function JourneySection({
  steps,
}: {
  steps: readonly { title: string; text: string }[];
}) {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  useLayoutEffect(() => {
    const section = root.current;
    const container = section?.querySelector<HTMLElement>(".journey-steps");
    const svg = section?.querySelector<SVGSVGElement>(".journey-rail-svg");
    const trail = section?.querySelector<SVGPathElement>(".journey-progress");
    const guide = section?.querySelector<SVGPathElement>(".journey-guide");
    const marker = section?.querySelector<SVGGElement>(".journey-marker");
    const stations = Array.from(section?.querySelectorAll<HTMLButtonElement>(".journey-number") ?? []);
    if (!section || !container || !svg || !trail || !guide || !marker || stations.length < 2) return;
    gsap.registerPlugin(ScrollTrigger);
    const cursor = { progress: 1 };
    const motionPreference = matchMedia("(prefers-reduced-motion: no-preference)");
    let centers: number[] = [];
    let length = 0;
    let previousIndex = -1;
    let lastHeight = 0;
    let lastWidth = 0;
    const render = () => {
      const progress = Math.max(0, Math.min(1, cursor.progress));
      trail.setAttribute("stroke-dashoffset", String(1 - progress));
      if (!length) return;
      const point = trail.getPointAtLength(length * progress);
      marker.setAttribute("transform", `translate(${point.x} ${point.y}) rotate(${progress * 90})`);
      const nearest = centers.reduce((best, y, index) => Math.abs(y - point.y) < Math.abs(centers[best] - point.y) ? index : best, 0);
      if (motionPreference.matches && nearest !== previousIndex) {
        previousIndex = nearest;
        setActive(nearest);
      }
    };
    const measure = () => {
      const box = container.getBoundingClientRect();
      if (lastHeight === box.height && lastWidth === box.width) return false;
      lastHeight = box.height;
      lastWidth = box.width;
      centers = stations.map((station) => {
        const rect = station.getBoundingClientRect();
        return rect.top - box.top + rect.height / 2;
      });
      const path = centers.reduce((d, y, index) => {
        if (!index) return `M45 ${y}`;
        const previous = centers[index - 1];
        const bend = index % 2 ? 80 : 10;
        return `${d} C${bend} ${previous + (y - previous) * 0.35} ${bend} ${previous + (y - previous) * 0.65} 45 ${y}`;
      }, "");
      svg.setAttribute("viewBox", `0 0 90 ${box.height}`);
      guide.setAttribute("d", path);
      trail.setAttribute("d", path);
      length = trail.getTotalLength();
      render();
      return true;
    };
    measure();
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.set(marker, { opacity: 1 });
        gsap.fromTo(
          cursor,
          { progress: 0 },
          {
            progress: 1,
            ease: "none",
            onUpdate: render,
            scrollTrigger: {
              trigger: container,
              start: () => container.getBoundingClientRect().top + window.scrollY + centers[0] - window.innerHeight * 0.55,
              end: () => container.getBoundingClientRect().top + window.scrollY + centers[centers.length - 1] - window.innerHeight * 0.55,
              scrub: 0.65,
              invalidateOnRefresh: true,
            },
          },
        );
        section.querySelectorAll<HTMLElement>(".journey-step").forEach((step) => {
          gsap.fromTo(step.querySelector(".journey-step-copy"), { x: 18 }, {
            x: 0,
            ease: "power2.out",
            scrollTrigger: { trigger: step, start: "top 82%", end: "top 56%", scrub: 0.4 },
          });
        });
      }, root);
      return () => {
        ctx.revert();
        cursor.progress = 1;
        render();
      };
    });
    const observer = new ResizeObserver(() => {
      if (measure()) ScrollTrigger.refresh();
    });
    observer.observe(container);
    const refresh = () => { measure(); };
    ScrollTrigger.addEventListener("refreshInit", refresh);
    return () => {
      observer.disconnect();
      ScrollTrigger.removeEventListener("refreshInit", refresh);
      media.revert();
    };
  }, [steps.length]);
  const goToStep = (index: number) => {
    const target = root.current?.querySelectorAll<HTMLButtonElement>(".journey-number")[index];
    if (!target) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) setActive(index);
    scrollPageTo(target.getBoundingClientRect().top + window.scrollY + target.offsetHeight / 2 - window.innerHeight * 0.55, reduced);
  };
  return (
    <section ref={root} id="how" className="tg-section journey-section">
      <div className="tg-container journey-grid">
        <div className="journey-sticky">
          <h2>
            A gentler beginning.
            <br />A path that’s yours.
          </h2>
          <p>
            Getting support should feel simple. We’ll take it one conversation,
            one step, and one day at a time.
          </p>
          <ButtonLink href="/book">Take the first step</ButtonLink>
          <div className="journey-small-image">
            <ResponsivePhoto
              src="/journey-woodland.jpg"
              alt="A walking path winding gently through a green woodland"
              fill
              sizes="(min-width:900px) 35vw, 90vw"
            />
            <span>Your pace. Your path.</span>
          </div>
        </div>
        <div className="journey-steps">
            <svg className="journey-rail-svg" viewBox="0 0 90 1000" preserveAspectRatio="none" fill="none" aria-hidden="true">
              <path className="journey-guide" d="M45 49V900" />
              <path className="journey-progress" d="M45 49V900" pathLength="1" strokeDasharray="1" />
              <g className="journey-marker">
                <circle r="13" fill="var(--brand-pale)" />
                <path d="M0-10 2.8-2.8 10 0 2.8 2.8 0 10-2.8 2.8-10 0-2.8-2.8Z" fill="var(--brand-green)" />
              </g>
            </svg>
          {steps.map((step, i) => (
            <article
              key={step.title}
              className={`journey-step ${active === i ? "is-active" : ""} ${i < active ? "is-past" : ""}`}
            >
              <button className="journey-number" type="button" onClick={() => goToStep(i)}
                aria-label={`Go to step ${i + 1}: ${step.title}`} aria-current={active === i ? "step" : undefined}>
                0{i + 1}
              </button>
              <div className="journey-step-copy">
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BreathingPause() {
  const pauseRoot = useRef<HTMLElement>(null);
  const audio = useRef<ReturnType<typeof createBreathingAudio> | null>(null);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [soundUnavailable, setSoundUnavailable] = useState(false);
  useEffect(() => {
    if (!running) {
      audio.current?.stop();
      audio.current = null;
      return;
    }
    audio.current?.setBreath(phase % 2 === 0);
  }, [running, phase]);
  useEffect(() => {
    audio.current?.setMuted(!soundOn);
  }, [soundOn]);
  useEffect(() => {
    const end = () => {
      setRunning(false);
      setPhase((value) => value >= 6 ? value : 0);
      audio.current?.stop();
      audio.current = null;
    };
    const visibility = () => { if (document.hidden) end(); };
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) end(); });
    if (pauseRoot.current) observer.observe(pauseRoot.current);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      audio.current?.stop();
    };
  }, []);
  useEffect(() => {
    if (!running) return;
    let count = 0;
    const timer = setInterval(() => {
      count++;
      setPhase(count);
      if (count >= 6) setRunning(false);
    }, BREATH_PHASE_SECONDS * 1000);
    return () => clearInterval(timer);
  }, [running]);
  const label = running
    ? phase % 2 === 0
      ? "Breathe in"
      : "Breathe out"
    : phase >= 6
      ? "A moment, just for you."
      : "Room to breathe.";
  return (
    <section ref={pauseRoot} className="tg-section pause-section" id="pause">
      <div className="tg-container pause-panel">
        <div className="pause-landscape" aria-hidden="true">
          <ResponsivePhoto
            src="/breathing-ocean.jpg"
            alt=""
            fill
            sizes="(min-width: 760px) 65vw, 100vw"
          />
        </div>
        <div className="pause-grid">
          <div className="pause-copy">
            <h2>
              Sometimes, the next step
              <br />
              is a little pause.
            </h2>
            <p>
              A moment to slow down and reconnect. Keep your breathing natural
              and comfortable, and follow only if it feels right for you.
            </p>
            <button
              className="tg-button tg-button--light"
              type="button"
              aria-pressed={running}
              onClick={() => {
                if (!running) {
                  try {
                    audio.current = createBreathingAudio(!soundOn);
                  } catch {
                    setSoundUnavailable(true);
                  }
                }
                setRunning(!running);
                setPhase(0);
              }}
            >
              {running ? "End your pause" : "Take a breathing break"}
              <span>
                <ArrowIcon />
              </span>
            </button>
            <button className="breathing-sound-toggle" type="button" aria-pressed={soundOn}
              aria-label={soundOn ? "Mute breathing sound" : "Enable breathing sound"}
              disabled={soundUnavailable} onClick={() => setSoundOn(!soundOn)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M11 5 6 9H3v6h3l5 4Z" strokeLinejoin="round" />
                {soundOn ? <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" strokeLinecap="round" /> : <path d="m16 9 5 6m0-6-5 6" strokeLinecap="round" />}
              </svg>
              {soundUnavailable ? "Sound unavailable" : soundOn ? "Sound on" : "Sound off"}
            </button>
            <div className="pause-details">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 7v5l3 2" strokeLinecap="round" />
              </svg>
              <span>Three gentle cycles. Stop whenever you need.</span>
            </div>
          </div>
          <div
            className="breathing-experience"
            role="group"
            aria-label="Guided breathing pause"
          >
            <div className="breathing-space breathing-space--lungs" aria-hidden="true"
              data-phase={running ? phase % 2 === 0 ? "in" : "out" : "idle"}>
              <div className="breathing-lung-orbit"
                style={{ "--breath-duration": `${BREATH_PHASE_SECONDS}s` } as CSSProperties}>
                <div className="breathing-lungs">
                <Image className="breathing-lung breathing-lung--right" src="/lungs/right-lung.svg" width={1300} height={1260} alt="" unoptimized />
                <Image className="breathing-lung breathing-lung--left" src="/lungs/left-lung.svg" width={1300} height={1260} alt="" unoptimized />
                <Image className="breathing-airway" src="/lungs/airway.svg" width={1300} height={1260} alt="" unoptimized />
                <svg className="breathing-flow-overlay" viewBox="100 0 1300 1260" focusable="false">
                <g className="breathing-airflow" fill="none" strokeLinecap="round">
                  <path className="breathing-flow-path" d="M750 64C745 220 750 370 750 495" />
                  <path className="breathing-flow-path" d="M750 495C735 542 680 558 623 601C553 653 501 724 452 819" />
                  <path className="breathing-flow-path" d="M750 495C765 542 820 558 877 601C947 653 999 724 1048 819" />
                </g>
                </svg>
                </div>
              </div>
              <div className="breathing-center">
                <p>{label}</p>
                <span>
                  {running
                    ? phase % 2 === 0 ? "Air flowing in · Gently expand" : "Air flowing out · Gently soften"
                    : phase >= 6
                      ? "Carry a little calm with you"
                      : "A moment, just for you"}
                </span>
              </div>
            </div>
            <div className="breathing-cycle-progress" aria-hidden="true">
              {[0, 1, 2].map((cycle) => (
                <span
                  key={cycle}
                  className={`${phase >= (cycle + 1) * 2 ? "is-complete" : ""} ${running && Math.floor(phase / 2) === cycle ? "is-current" : ""}`}
                />
              ))}
            </div>
            <p className="breathing-status" role="status">
              {running
                ? `${label} · Breath ${Math.min(3, Math.floor(phase / 2) + 1)} of 3`
                : phase >= 6
                  ? "Your pause is complete."
                  : "Start whenever you’re ready."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function JournalBrowser({
  entries,
  initialCategory = "all",
}: {
  entries: ArticlePreview[];
  initialCategory?: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [limit, setLimit] = useState(12);
  const reduced = useReducedMotion();
  const filtered = entries.filter(
    (e) =>
      (category === "all" || category === e.category) &&
      `${e.title} ${e.excerpt}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="journal-browser">
      <div className="journal-toolbar">
        <div className="filter-buttons" aria-label="Filter articles">
          {[
            ["all", "All articles"],
            ["pelvic", "Pelvic health"],
            ["workplace", "Workplace wellbeing"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={category === value}
              onClick={() => {
                setCategory(value);
                setLimit(12);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="journal-search">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <circle cx="10" cy="10" r="6" />
            <path d="m15 15 5 5" />
          </svg>
          <input
            type="search"
            aria-label="Search the journal"
            placeholder="What’s on your mind?"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(12);
            }}
          />
        </label>
      </div>
      <p className="result-count" role="status">
        {filtered.length} {filtered.length === 1 ? "article" : "articles"}
        {query ? ` for “${query}”` : " to explore"}
      </p>
      <motion.div layout={!reduced} className="journal-grid">
        {filtered.slice(0, limit).map((article, i) => (
          <motion.div key={article.slug} layout={!reduced}>
            <JournalCard article={article} index={i} />
          </motion.div>
        ))}
      </motion.div>
      {!filtered.length && (
        <div className="journal-empty">
          <h2>Let’s try another search.</h2>
          <p>Try “postpartum”, “pelvic health”, “posture”, or “workplace”.</p>
          <button
            type="button"
            className="text-link"
            onClick={() => {
              setQuery("");
              setCategory("all");
            }}
          >
            Show all articles
            <ArrowIcon diagonal={false} />
          </button>
        </div>
      )}
      {filtered.length > limit && (
        <div className="center-action">
          <button
            className="tg-button tg-button--outline"
            type="button"
            onClick={() => setLimit((v) => v + 12)}
          >
            Explore more articles
            <span>
              <ArrowIcon diagonal={false} />
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

function clearContactField(
  setErrors: Dispatch<SetStateAction<Partial<Record<ContactField, string>>>>,
  name: ContactField,
) {
  setErrors((current) => {
    if (!current[name]) return current;
    const next = { ...current };
    delete next[name];
    return next;
  });
}

function ContactThanks({ reduced }: { reduced: boolean }) {
  const ease = [0.16, 1, 0.3, 1] as const;
  const enter = (delay: number) =>
    reduced
      ? { duration: 0 }
      : { duration: 0.55, delay, ease };
  return (
    <motion.div
      className="contact-form contact-form-done"
      initial={reduced ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -16 }}
      transition={enter(0)}
    >
      <motion.h2 initial={reduced ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={enter(0.12)}>
        Thank you.
      </motion.h2>
      <motion.p initial={reduced ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={enter(0.22)}>
        We have your note. The clinic will read it and be in touch. If you’d
        like to talk sooner, call {clinic.phone}.
      </motion.p>
      <motion.a
        className="tg-button tg-button--primary"
        href={`tel:${clinic.phone.replace(/[^\d+]/g, "")}`}
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={enter(0.34)}
      >
        Call the clinic
        <span>
          <ArrowIcon />
        </span>
      </motion.a>
    </motion.div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p className="field-error" id={id}>
      {message}
    </p>
  );
}

export function ContactForm() {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Partial<Record<ContactField, string>>>({});
  const [scene, setScene] = useState<PaperBox | null>(null);
  const [status, setStatus] = useState("");
  const reduced = useReducedMotion();
  const formRef = useRef<HTMLFormElement>(null);
  const progress = useMotionValue(0);
  const landedRef = useRef(false);
  const sending = useRef(false);

  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => {
      sending.current = false;
      landedRef.current = false;
      progress.set(0);
      setBusy(false);
      setScene(null);
      setStatus("");
      setDone(false);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [done, progress]);

  function applyMotion(value: number) {
    const form = formRef.current;
    if (!form) return;
    form.dataset.sendProgress = value.toFixed(3);
    form.style.opacity = String(formOpacity(value));
    form.style.transform = formTransform(value);
    form.style.transformOrigin = "50% 50%";
    form.style.willChange = "transform, opacity";
    if (value >= 1.01) {
      form.style.opacity = "0";
      if (!landedRef.current) {
        landedRef.current = true;
        form.reset();
      }
    }
    if (value >= 0.18) form.setAttribute("aria-hidden", "true");
    else form.removeAttribute("aria-hidden");
  }

  function clearMotion() {
    const form = formRef.current;
    if (!form) return;
    delete form.dataset.sendProgress;
    form.style.opacity = "";
    form.style.transform = "";
    form.style.transformOrigin = "";
    form.style.willChange = "";
    form.removeAttribute("aria-hidden");
    form.inert = false;
    setScene(null);
  }

  return (
    <AnimatePresence mode="wait">
    {done ? (
      <ContactThanks key="thanks" reduced={reduced === true} />
    ) : (
    <div key="form" className="contact-form-stage">
    <form
      ref={formRef}
      className="contact-form"
      data-send-form
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        if (sending.current) return;
        const form = event.currentTarget;
        const data = new FormData(form);
        const parsed = parseContact({
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          interest: data.get("interest"),
          setting: data.get("setting"),
          message: data.get("message"),
        });
        if (!parsed.ok) {
          setErrors(parsed.fields);
          setError("");
          setStatus(parsed.message);
          toast({ title: parsed.message, tone: "alert" });
          const target = form.elements.namedItem(parsed.field);
          if (target instanceof HTMLElement) target.focus();
          return;
        }
        sending.current = true;
        setBusy(true);
        setErrors({});
        setError("");
        const animate = reduced === false;
        const delivery = animate ? createDelivery(progress, applyMotion) : null;
        let playing: Promise<"done" | "stopped"> | null = null;
        if (delivery) {
          const style = getComputedStyle(form);
          setScene({
            width: form.offsetWidth,
            height: form.offsetHeight,
            radius: parseFloat(style.borderTopLeftRadius) || 0,
            border: style.border,
            shadow: style.boxShadow,
          });
          form.inert = true;
          setStatus("Sending your note.");
          playing = delivery.run();
        }
        try {
          const response = await fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: data.get("name"),
              email: data.get("email"),
              phone: data.get("phone"),
              interest: data.get("interest"),
              setting: data.get("setting"),
              message: data.get("message"),
              company: data.get("company"),
            }),
          });
          const body = (await response.json()) as { error?: string; field?: string };
          if (!response.ok) {
            const message = body.error || "Please try again.";
            if (body.field && isContactField(body.field)) {
              setErrors({ [body.field]: message });
              setError("");
            } else {
              setError(message);
            }
            throw new Error(message);
          }
          if (delivery && playing) {
            delivery.succeed();
            setStatus("Your note was sent.");
            void playing.then((result) => {
              if (result !== "done") return;
              form.reset();
              setDone(true);
              toast({ title: "Note sent.", detail: "The clinic will be in touch." });
            });
          } else {
            form.reset();
            toast({ title: "Note sent.", detail: "The clinic will be in touch." });
            setDone(true);
          }
        } catch (reason) {
          const text = reason instanceof Error ? reason.message : "Please try again.";
          if (delivery) {
            await delivery.fail();
            clearMotion();
          }
          setBusy(false);
          sending.current = false;
          setError(text);
          setStatus(text);
          toast({ title: text, tone: "alert" });
        } finally {
          if (!delivery) {
            setBusy(false);
            sending.current = false;
          }
        }
      }}
    >
      <h2>Let’s start a conversation.</h2>
      <p>Tell us a little about the support you’re looking for.</p>
      <div className="contact-honeypot" aria-hidden="true">
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="form-grid">
        <label>
          Your name
          <input
            name="name"
            autoComplete="name"
            required
            maxLength={100}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "contact-name-error" : undefined}
            onChange={() => clearContactField(setErrors, "name")}
          />
          <FieldError id="contact-name-error" message={errors.name} />
        </label>
        <label>
          Email address
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            maxLength={180}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "contact-email-error" : undefined}
            onChange={() => clearContactField(setErrors, "email")}
          />
          <FieldError id="contact-email-error" message={errors.email} />
        </label>
        <label>
          Phone <span>(optional)</span>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={30}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "contact-phone-error" : undefined}
            onChange={() => clearContactField(setErrors, "phone")}
          />
          <FieldError id="contact-phone-error" message={errors.phone} />
        </label>
        <label>
          I’m interested in
          <select
            name="interest"
            defaultValue={contactInterests[0]}
            aria-invalid={Boolean(errors.interest)}
            aria-describedby={errors.interest ? "contact-interest-error" : undefined}
            onChange={() => clearContactField(setErrors, "interest")}
          >
            {contactInterests.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <FieldError id="contact-interest-error" message={errors.interest} />
        </label>
      </div>
      <label>
        Preferred setting
        <select
          name="setting"
          defaultValue={contactSettings[0]}
          aria-invalid={Boolean(errors.setting)}
          aria-describedby={errors.setting ? "contact-setting-error" : undefined}
          onChange={() => clearContactField(setErrors, "setting")}
        >
          {contactSettings.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <FieldError id="contact-setting-error" message={errors.setting} />
      </label>
      <label>
        How can we help?
        <textarea
          name="message"
          rows={4}
          required
          maxLength={2000}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "contact-message-error" : undefined}
          onChange={() => clearContactField(setErrors, "message")}
          placeholder="Share what you’d like to discuss. Please leave detailed medical information for your consultation."
        />
        <FieldError id="contact-message-error" message={errors.message} />
      </label>
      <p className="form-note">
        This note goes to the clinic. It isn’t a medical record, and it doesn’t
        book a time.
      </p>
      <button
        type="submit"
        className={busy ? "tg-button tg-button--primary contact-send is-loading" : "tg-button tg-button--primary contact-send"}
      >
        {busy && reduced ? "Sending…" : "Send your note"}
        <span>
          <ArrowIcon />
        </span>
        {busy && reduced !== true && (
          <span className="contact-send-loader" aria-hidden="true">
            <i />
          </span>
        )}
      </button>
      {error && (
        <p className="form-feedback is-error" role="alert">
          {error}
        </p>
      )}
      <p className="contact-send-status" role="status">{status}</p>
    </form>
    {scene && <PostalScene progress={progress} box={scene} />}
    </div>
    )}
    </AnimatePresence>
  );
}
