"use client";

import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowIcon, ButtonLink } from "@/components/Ui";
import { scrollPageTo } from "@/lib/page-scroll";
import "./PelvicAnatomyJourney.css";

const topics = ["The anatomy", "Everyday changes", "Your care"];

const annotations = [
  {
    title: "Pelvic bones",
    text: "The framework around your pelvic floor.",
    line: "M 250 136 L 250 215 L 278 300",
    point: [278, 300],
  },
  {
    title: "Pelvic floor muscles",
    text: "A group of muscles that provides support from within.",
    line: "M 425 437 L 535 588 L 615 588",
    point: [425, 437],
  },
  {
    title: "Part of the whole you",
    text: "Your movement, breath and daily life matter, too.",
    line: "M 760 136 L 680 205 L 540 405",
    point: [540, 405],
  },
];

/** One illustration travels between the three story positions; no scroll hijacking. */
export function PelvicAnatomyJourney() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const traveller = useRef<HTMLElement>(null);
  const scroll = useRef<ScrollTrigger | null>(null);
  const [active, setActive] = useState(0);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const section = root.current;
    const trackElement = track.current;
    const stageElement = stage.current;
    const figure = traveller.current;
    if (!section || !trackElement || !stageElement || !figure) return;

    const media = gsap.matchMedia();
    media.add(
      {
        desktop: "(min-width: 901px)",
        mobile: "(max-width: 900px) and (min-height: 720px)",
        reduce: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const { desktop, mobile, reduce } = context.conditions!;
        if (reduce || (!desktop && !mobile)) return;

        section.dataset.animation = desktop ? "travelling" : "compact";
        const docks = gsap.utils.toArray<HTMLElement>(".anatomy-dock", section);
        const chapters = gsap.utils.toArray<HTMLElement>(".anatomy-chapter", section);
        const callouts = annotations.map((_, i) =>
          gsap.utils.toArray<HTMLElement>(`[data-anatomy-callout="${i}"]`, section),
        );
        const lines = annotations.map((_, i) =>
          gsap.utils.toArray<SVGPathElement>(`[data-anatomy-line="${i}"]`, section),
        );
        const trail = section.querySelector<SVGPathElement>(".anatomy-trail-base");
        const trailFill = section.querySelector<SVGPathElement>(".anatomy-trail-progress");

        const position = (index: number) => {
          const dock = docks[index].getBoundingClientRect();
          const canvas = stageElement.getBoundingClientRect();
          return {
            x: dock.left - canvas.left + (dock.width - figure.offsetWidth) / 2,
            y: dock.top - canvas.top + (dock.height - figure.offsetHeight) / 2,
          };
        };

        const drawTrail = () => {
          if (!desktop || !trail || !trailFill) return;
          const points = docks.map((_, i) => {
            const p = position(i);
            return { x: p.x + figure.offsetWidth / 2, y: p.y + figure.offsetHeight / 2 };
          });
          const [a, b, c] = points;
          const path = `M ${a.x} ${a.y} C ${a.x} ${a.y + 270}, ${b.x} ${b.y - 270}, ${b.x} ${b.y} C ${b.x} ${b.y + 270}, ${c.x} ${c.y - 270}, ${c.x} ${c.y}`;
          trail.setAttribute("d", path);
          trailFill.setAttribute("d", path);
        };

        const layoutCompactLeaders = () => {
          if (!mobile) return;
          const visual = figure.querySelector<HTMLElement>(".anatomy-visual")!;
          const image = figure.querySelector<HTMLImageElement>(".anatomy-illustration")!;
          const fit = Math.min(image.offsetWidth / 1440, image.offsetHeight / 1000);
          const imageWidth = 1440 * fit;
          const imageHeight = 1000 * fit;
          const imageX = image.offsetLeft + (image.offsetWidth - imageWidth) / 2;
          const imageY = image.offsetTop + (image.offsetHeight - imageHeight) / 2;
          const anchors = [[0.18, 0.4], [0.375, 0.53], [0.6, 0.53]];
          annotations.forEach((_, i) => {
            const label = figure.querySelector<HTMLElement>(`.anatomy-callout--${i}`)!;
            const line = figure.querySelector<SVGPathElement>(`[data-anatomy-line="${i}"].anatomy-leader--compact`)!;
            const x = (imageX + anchors[i][0] * imageWidth) / visual.clientWidth * 1000;
            const y = (imageY + anchors[i][1] * imageHeight) / visual.clientHeight * 760;
            const startY = (label.offsetHeight + 12) / visual.clientHeight * 760;
            line.setAttribute("d", `M 250 ${startY} L ${(250 + x) / 2} ${(startY + y) / 2} L ${x} ${y}`);
            figure.querySelectorAll<SVGCircleElement>(`.anatomy-leaders [data-anatomy-callout="${i}"] circle.anatomy-leader--compact`).forEach((circle) => {
              circle.setAttribute("cx", String(x));
              circle.setAttribute("cy", String(y));
            });
          });
        };

        gsap.set(callouts.flat(), { autoAlpha: 0 });
        gsap.set(callouts[0], { autoAlpha: 1 });
        gsap.set(lines.flat(), { strokeDashoffset: 1 });
        gsap.set(lines[0], { strokeDashoffset: 0 });
        if (desktop) {
          gsap.set(figure, { x: () => position(0).x, y: () => position(0).y });
          drawTrail();
        } else {
          gsap.set(chapters, { autoAlpha: 0, y: 18 });
          gsap.set(chapters[0], { autoAlpha: 1, y: 0 });
          layoutCompactLeaders();
        }

        let lastActive = -1;
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: trackElement,
            start: desktop
              ? () => `top+=${position(0).y + figure.offsetHeight / 2} 56%`
              : "top 104px",
            end: desktop
              ? () => `top+=${position(2).y + figure.offsetHeight / 2} 56%`
              : "bottom bottom",
            scrub: 0.55,
            invalidateOnRefresh: true,
            onRefresh: () => { drawTrail(); layoutCompactLeaders(); },
            onUpdate: (self) => {
              const next = Math.min(2, Math.round(self.progress * 2));
              if (lastActive !== next) {
                lastActive = next;
                setActive(next);
              }
            },
          },
        });
        scroll.current = timeline.scrollTrigger ?? null;

        if (desktop) {
          timeline
            .to(figure, {
              x: () => position(1).x,
              y: () => position(1).y,
              rotation: -2.5,
              ease: "sine.inOut",
              duration: 1,
            }, 0)
            .to(figure, {
              x: () => position(2).x,
              y: () => position(2).y,
              rotation: 0,
              ease: "sine.inOut",
              duration: 1,
            }, 1);
          if (trailFill) {
            timeline.fromTo(trailFill, { strokeDashoffset: 1 }, {
              strokeDashoffset: 0, duration: 2, ease: "none",
            }, 0);
          }
        } else {
          timeline
            .to(figure, { x: -9, y: 5, rotation: -2, duration: 1, ease: "sine.inOut" }, 0)
            .to(figure, { x: 5, y: 0, rotation: 1, duration: 1, ease: "sine.inOut" }, 1);
          chapters.forEach((chapter, i) => {
            if (i > 0) {
              timeline.set(chapter, { autoAlpha: 1, y: 12 }, i - 0.5);
              timeline.to(chapter, {
                y: 0, duration: 0.2, ease: "power2.out",
              }, i - 0.5);
            }
            if (i < 2) {
              timeline.set(chapter, { autoAlpha: 0 }, i + 0.5);
            }
          });
        }

        callouts.forEach((callout, i) => {
          if (i > 0) {
            timeline.to(callout, { autoAlpha: 1, duration: 0.18 }, i - 0.26);
            timeline.fromTo(lines[i], { strokeDashoffset: 1 }, {
              strokeDashoffset: 0, duration: 0.22, ease: "power2.out",
            }, i - 0.26);
          }
          if (i < 2) {
            timeline.to(callout, { autoAlpha: 0, duration: 0.14 }, i + 0.22);
          }
        });

        // Late-loading fonts and nearby photographs can change the scroll positions.
        let disposed = false;
        void document.fonts.ready.then(() => {
          if (!disposed) ScrollTrigger.refresh();
        });

        return () => {
          disposed = true;
          scroll.current = null;
          delete section.dataset.animation;
        };
      },
    );
    return () => media.revert();
  }, []);

  const visitTopic = (index: number) => {
    const animation = scroll.current;
    if (animation) {
      scrollPageTo(animation.start + (animation.end - animation.start) * index / 2);
    } else {
      setActive(index);
      const chapter = root.current?.querySelectorAll<HTMLElement>(".anatomy-chapter")[index];
      if (chapter) scrollPageTo(chapter.getBoundingClientRect().top + window.scrollY - 125);
    }
  };

  return (
    <section ref={root} className="pelvic-anatomy" id="understand-your-pelvic-floor" aria-labelledby="anatomy-title">
      <div className="tg-container">
        <header className="anatomy-introduction">
          <h2 id="anatomy-title">A little understanding.<br /><em>A closer connection.</em></h2>
          <p>Get to know the part of your body that so often goes unspoken. A little awareness is a gentle place to begin.</p>
        </header>

        <div ref={track} className="anatomy-track">
          <div ref={stage} className="anatomy-stage">
            <svg className="anatomy-trail" width="100%" height="100%" aria-hidden="true">
              <path className="anatomy-trail-base" fill="none" />
              <path className="anatomy-trail-progress" fill="none" pathLength="1" />
            </svg>

            <figure ref={traveller} className="anatomy-traveller">
              <div className="anatomy-visual">
                <Image
                  className="anatomy-illustration"
                  src="/anatomy/pelvic-floor.svg"
                  alt="Pelvic bones surrounding the pink pelvic floor muscles, viewed from above"
                  width={1440}
                  height={1000}
                  sizes="(max-width: 900px) 88vw, 580px"
                  unoptimized
                />
                <svg className="anatomy-leaders" viewBox="0 0 1000 760" preserveAspectRatio="none" fill="none" aria-hidden="true">
                  {annotations.map((annotation, i) => (
                    <g key={annotation.title} data-anatomy-callout={i}>
                      <path className="anatomy-leader-line anatomy-leader--wide" data-anatomy-line={i} d={annotation.line} pathLength="1" />
                      <path className="anatomy-leader-line anatomy-leader--compact" data-anatomy-line={i} pathLength="1" />
                      <circle className="anatomy-point-halo anatomy-leader--wide" cx={annotation.point[0]} cy={annotation.point[1]} r="13" />
                      <circle className="anatomy-point anatomy-leader--wide" cx={annotation.point[0]} cy={annotation.point[1]} r="5" />
                      <circle className="anatomy-point-halo anatomy-leader--compact" r="13" />
                      <circle className="anatomy-point anatomy-leader--compact" r="5" />
                    </g>
                  ))}
                </svg>
                {annotations.map((annotation, i) => (
                  <div className={`anatomy-callout anatomy-callout--${i}`} data-anatomy-callout={i} key={annotation.title}>
                    <strong>{annotation.title}</strong>
                    <p>{annotation.text}</p>
                  </div>
                ))}
              </div>
            </figure>

            <nav className="anatomy-waypoints" aria-label="Explore pelvic health">
              {topics.map((topic, i) => (
                <button key={topic} type="button" aria-current={active === i ? "step" : undefined} onClick={() => visitTopic(i)}>
                  <span className="anatomy-waypoint-line" aria-hidden="true" />
                  {topic}
                </button>
              ))}
            </nav>

            <div className="anatomy-chapters">
              <article className="anatomy-chapter" aria-labelledby="anatomy-support-title">
                <div className="anatomy-copy">
                  <h3 id="anatomy-support-title">Small muscles.<br />Everyday support.</h3>
                  <p>Your pelvic floor is a group of muscles at the base of your pelvis. Like a supportive hammock, it helps hold the bladder, bowel and reproductive organs in place.</p>
                  <p>It is one part of your body’s bigger story.</p>
                </div>
                <div className="anatomy-dock" aria-hidden="true" />
              </article>

              <article className="anatomy-chapter" aria-labelledby="anatomy-awareness-title">
                <div className="anatomy-copy">
                  <h3 id="anatomy-awareness-title">Notice a change?<br />Let’s talk about it.</h3>
                  <p>Bladder leaks, pelvic heaviness, discomfort with intimacy or changes after pregnancy can be difficult to bring up. You deserve space to talk about what you’re noticing.</p>
                  <Link href="/conditions" className="text-link">Explore common concerns <ArrowIcon diagonal={false} /></Link>
                </div>
                <div className="anatomy-dock" aria-hidden="true" />
              </article>

              <article className="anatomy-chapter" aria-labelledby="anatomy-care-title">
                <div className="anatomy-copy">
                  <h3 id="anatomy-care-title">Your body.<br />Your story. Your care.</h3>
                  <p>Care starts with listening. At TheraGurus, we consider your pelvic health alongside your movement, breath and daily life, then work with you on a plan that fits your needs.</p>
                  <ButtonLink href="/book">Start a conversation</ButtonLink>
                </div>
                <div className="anatomy-dock" aria-hidden="true" />
              </article>
            </div>
          </div>
        </div>
        <p className="anatomy-more"><Link href="/holistic-pelvic-floor-therapy">A little more about pelvic floor care <ArrowIcon diagonal={false} /></Link></p>
      </div>
    </section>
  );
}
