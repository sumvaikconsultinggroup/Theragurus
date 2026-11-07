"use client";

import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { ArrowIcon } from "@/components/Ui";
import { hallwayServices } from "./hallway-data";
import { clamp, hallwayCamera, hallwayGeometry, mix, smooth } from "./hallway-motion";
import { createHallwayRoom } from "./hallway-room";
import "./HallwayExperience.css";

export function HallwayExperience({ asHero = false }: { asHero?: boolean }) {
  const root = useRef<HTMLElement>(null);
  const enter = useRef<(() => void) | null>(null);
  const replay = useRef<(() => void) | null>(null);
  const headerUi = useRef({ on: false, compact: false });
  const [headerOn, setHeaderOn] = useState(false);
  const [headerCompact, setHeaderCompact] = useState(false);
  const careHref = asHero ? "#home-care" : "#hallway-services";
  const servicesHref = asHero ? "/our-services" : "#hallway-services";

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const stage = el.querySelector<HTMLElement>(".hallway-stage")!;
    const cards = [...el.querySelectorAll<HTMLElement>(".hallway-card")];
    const intro = el.querySelector<HTMLElement>(".hallway-intro")!;
    const outside = el.querySelector<HTMLElement>(".hallway-outside")!;
    const photo = el.querySelector<HTMLElement>(".hallway-photo")!;
    const ending = el.querySelector<HTMLElement>(".hallway-ending")!;
    const shade = el.querySelector<HTMLElement>(".hallway-photo-shade")!;
    const hint = el.querySelector<HTMLElement>(".hallway-scroll-hint")!;
    const walkNav = el.querySelector<HTMLElement>(".hallway-nav-walk")!;
    const canvas = el.querySelector<HTMLCanvasElement>("canvas")!;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const fine = matchMedia("(pointer: fine)");
    let room: ReturnType<typeof createHallwayRoom> = null;
    let g = hallwayGeometry(stage.clientWidth, stage.clientHeight, cards.length);
    let current = 0, target = 0, raf = 0, last = 0, visible = true, disposed = false;
    let middle = 0, middleVelocity = 0, velocity = 0;
    let px = 0, py = 0, tx = 0, ty = 0;
    const rows = [.02, -.07, .06, -.03, .08, -.05, 0, .05, -.08, .03, -.06];
    const cardParts = cards.map(card => ({
      card,
      caption: card.querySelector<HTMLElement>(".hallway-caption")!,
      media: card.querySelector<HTMLElement>(".hallway-card-media")!,
      reflection: card.querySelector<HTMLElement>(".hallway-reflection")!,
      link: card.querySelector<HTMLAnchorElement>("a")!,
    }));
    const progress = () => clamp(-el.getBoundingClientRect().top / Math.max(1, el.offsetHeight - stage.clientHeight * 2));

    const render = () => {
      if (disposed || media.matches) return;
      const camera = hallwayCamera(current, g);
      const { distance, cx, cy } = camera;
      const pointerX = px * g.width * .035, pointerY = py * g.width * .02;
      const spread = g.phone ? g.width * .075 : Math.min(g.width * .25, g.width / 2 - g.cardWidth / 2 - 28);
      const firstSpread = g.phone ? spread : Math.min(spread, Math.max(0, g.width / 2 - g.cardWidth / 2 - 24 - g.width * .135));

      cardParts.forEach(({ card, caption, media: cardMedia, reflection, link }, index) => {
        const depth = index * g.gap - distance;
        const side = index % 2 === 0 ? 1 : -1;
        const scale = g.perspective / Math.max(g.perspective * .12, g.perspective + depth);
        const alpha = (1 - smooth(g.gap * 4.2, g.gap * 6, depth)) * (1 - smooth(-g.perspective * .2, -g.perspective * .46, depth));
        const active = depth < g.gap * 6 && depth > -g.perspective * .5 && alpha > .005;
        const worldY = g.phone ? g.height * .035 : rows[index % rows.length] * g.height + g.height * .01;
        const wall = side * (index === 0 ? firstSpread : spread);
        const x = cx + (wall - pointerX) * scale;
        let y = cy + (worldY - pointerY) * scale;
        if (g.phone && depth < 0) y += -depth / g.perspective * g.height * 1.15;
        // Same wall tilt on every card (left / right), with a light pointer lean.
        const yaw = -side * 12 + px * 5;
        const pitch = py * 3;
        card.style.opacity = active ? String(alpha) : "0";
        card.style.visibility = active ? "visible" : "hidden";
        card.style.zIndex = String(20000 - Math.round(depth / 4));
        card.style.transform = `translate3d(${x}px,${y}px,0) scale(${scale}) perspective(${g.perspective}px) rotateY(${yaw}deg) rotateX(${pitch}deg)`;
        card.style.pointerEvents = active ? "auto" : "none";
        const sharp = 1 - smooth(g.gap * .06, g.gap * 1.4, Math.abs(depth));
        cardMedia.style.filter = `blur(${(1 - sharp) * 4}px) brightness(${mix(.38, 1, sharp)})`;
        const captionAlpha = 1 - smooth(g.gap * .1, g.gap * .3, Math.abs(depth));
        caption.style.opacity = String(captionAlpha);
        link.tabIndex = active && captionAlpha > .5 ? 0 : -1;
        const reflectY = (g.height * .8 - worldY * 2) * scale;
        reflection.style.transform = `translateY(${reflectY}px) scaleY(-1)`;
        reflection.style.opacity = active ? String(.15 * (1 - smooth(g.gap, g.gap * 5, Math.max(0, depth)))) : "0";
      });

      intro.style.opacity = String(camera.intro);
      intro.style.transform = `translateY(${-clamp(distance / g.gap) * 28}px)`;
      intro.style.filter = `blur(${(1 - camera.intro) * 6}px)`;
      intro.style.pointerEvents = camera.intro < .05 ? "none" : "auto";
      intro.inert = camera.intro < .05;
      hint.style.opacity = String(camera.intro);
      const eye = distance - g.perspective;
      let left = 0, right = g.width, top = 0, bottom = g.height;
      for (const z of [g.end, g.end + g.thickness]) {
        if (eye >= z) continue;
        const projection = g.perspective / (z - eye);
        left = Math.max(left, g.width / 2 + cx + (-g.doorWidth / 2 - pointerX) * projection);
        right = Math.min(right, g.width / 2 + cx + (g.doorWidth / 2 - pointerX) * projection);
        top = Math.max(top, g.height / 2 + cy + (g.height * .4 - g.doorHeight - pointerY) * projection);
        bottom = Math.min(bottom, g.height / 2 + cy + (g.height * .4 - pointerY) * projection);
      }
      // Keep a usable doorway aperture — never allow an inverted/empty clip.
      const doorLeft = clamp(Math.min(left, right - 8), 0, g.width - 8);
      const doorRight = clamp(Math.max(right, doorLeft + 8), doorLeft + 8, g.width);
      const doorTop = clamp(Math.min(top, bottom - 8), 0, g.height - 8);
      const doorBottom = clamp(Math.max(bottom, doorTop + 8), doorTop + 8, g.height);
      outside.style.clipPath = eye >= g.end + g.thickness
        ? "none"
        : `inset(${doorTop}px ${Math.max(0, g.width - doorRight)}px ${Math.max(0, g.height - doorBottom)}px ${doorLeft}px)`;
      outside.style.zIndex = String(20000 - Math.round((g.end - distance) / 4));
      const photoDepth = g.end + g.thickness + g.perspective * 1.6;
      const photoProjection = g.perspective / Math.max(1, photoDepth - eye);
      const photoScale = 1.6 * photoProjection;
      const photoX = cx - pointerX * photoProjection, photoY = cy - pointerY * photoProjection;
      const centerX = g.width / 2 + photoX, centerY = g.height / 2 + photoY;
      // The image plane must cover both edges of the thick doorway at every depth.
      // Fit to its visible aperture before the camera crosses into the full image.
      const fitX = Math.max(centerX-left,right-centerX) / (g.width / 2);
      const fitY = Math.max(centerY-top,bottom-centerY) / (g.height / 2);
      const fittedScale = Math.max(photoScale,fitX,fitY) * 1.025;
      photo.style.transform = `translate3d(${photoX}px,${photoY}px,0) scale(${fittedScale})`;
      photo.style.filter = `blur(${(1 - smooth(g.end-g.gap*3,g.end+g.perspective,distance)) * 8}px)`;
      shade.style.opacity = String(1 - camera.gate);
      ending.style.opacity = String(camera.gate);
      ending.style.transform = `translateY(${(1 - camera.gate) * 14}px)`;
      ending.style.pointerEvents = camera.gate < .05 ? "none" : "auto";
      ending.inert = camera.gate < .05;
      const arrived = camera.gate > 0.04;
      stage.dataset.arrival = arrived ? "true" : "false";
      document.documentElement.dataset.hallArrival = arrived ? "true" : "false";
      walkNav.inert = arrived;
      const arrivalScroll = el.offsetTop + Math.max(0, el.offsetHeight - stage.clientHeight * 2);
      const compact = window.scrollY > arrivalScroll + 90;
      if (arrived !== headerUi.current.on || compact !== headerUi.current.compact) {
        headerUi.current = { on: arrived, compact };
        setHeaderOn(arrived);
        setHeaderCompact(compact);
      }
      canvas.style.visibility = eye >= g.end + g.thickness ? "hidden" : "visible";
      if (eye < g.end + g.thickness) room?.draw(g, distance, cx, cy, pointerX, pointerY);
      el.dataset.progress = current.toFixed(5);
      el.dataset.camera = distance.toFixed(2);
      el.dataset.arrival = camera.arrival.toFixed(3);
    };
    const tick = (now: number) => {
      raf = 0;
      if (!visible || document.hidden || media.matches || disposed) return;
      const dt = Math.min(.05, Math.max(.001, last ? (now - last) / 1000 : .016667)); last = now;
      const steps = Math.ceil(dt / .008), step = dt / steps;
      for (let i=0;i<steps;i++) {
        middleVelocity += (6.5 ** 2 * (target-middle) - 13 * middleVelocity) * step;
        middle += middleVelocity * step;
        velocity += (6.5 ** 2 * (middle-current) - 13 * velocity) * step;
        current += velocity * step;
      }
      const follow = 1 - Math.exp(-dt / .28);
      px = mix(px, tx, follow); py = mix(py, ty, follow);
      const moving = Math.abs(current-target) > .00002 || Math.abs(velocity) > .0002 || Math.abs(middle-target) > .00002 || Math.abs(middleVelocity) > .0002;
      const unsettled = moving || Math.abs(px-tx) + Math.abs(py-ty) > .001;
      if (!moving) { current = middle = target; velocity = middleVelocity = 0; }
      if (!unsettled) {px = tx; py = ty;}
      render();
      if (unsettled) raf = requestAnimationFrame(tick);
    };
    const kick = () => { if (!raf && visible && !document.hidden && !media.matches) raf = requestAnimationFrame(tick); };
    const onScroll = () => { target = progress(); kick(); };
    const measure = () => {
      g = hallwayGeometry(stage.clientWidth, stage.clientHeight, cards.length);
      el.style.setProperty("--hall-card-w", `${g.cardWidth}px`);
      el.style.setProperty("--hall-card-h", `${g.cardWidth * 1.25}px`);
      target = progress(); current = middle = target; velocity = middleVelocity = 0; render();
    };
    const onMotion = () => {
      el.dataset.reduced = String(media.matches);
      if (media.matches) {
        cancelAnimationFrame(raf); raf = 0; room?.dispose(); room = null;
        intro.inert = false; ending.inert = false; walkNav.inert = false;
        stage.dataset.arrival = "false";
        document.documentElement.dataset.hallArrival = "false";
        headerUi.current = { on: false, compact: false };
        setHeaderOn(false);
        setHeaderCompact(false);
        cardParts.forEach(({link})=>{link.tabIndex=0;});
      }
      else { room = room || createHallwayRoom(canvas); measure(); }
    };
    const onPointer = (event: PointerEvent) => {
      if (!fine.matches || media.matches) return;
      const bounds = stage.getBoundingClientRect();
      tx = clamp((event.clientX-bounds.left)/bounds.width*2-1,-1,1);
      ty = clamp((event.clientY-bounds.top)/bounds.height*2-1,-1,1); kick();
    };
    const onLeave = () => { tx = ty = 0; kick(); };
    const onVisibility = () => { last = 0; if (document.hidden) {cancelAnimationFrame(raf);raf=0;} else {target=progress();kick();} };
    const onContextLost = (event: Event) => { event.preventDefault(); canvas.style.display = "none"; };
    const onContextRestored = () => { room?.dispose(); room=createHallwayRoom(canvas);canvas.style.display="";render(); };
    const observer = new IntersectionObserver(entries => { visible=entries[0].isIntersecting; if(visible) {target=progress();kick();} else {cancelAnimationFrame(raf);raf=0;} });
    const resize = new ResizeObserver(measure);
    el.dataset.enhanced = "true";
    if (asHero) {
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
      window.scrollTo(0, 0);
    }
    onMotion(); measure(); observer.observe(el); resize.observe(stage);
    window.addEventListener("scroll",onScroll,{passive:true});
    stage.addEventListener("pointermove",onPointer,{passive:true}); stage.addEventListener("pointerleave",onLeave);
    document.addEventListener("visibilitychange",onVisibility); media.addEventListener("change",onMotion);
    canvas.addEventListener("webglcontextlost",onContextLost);canvas.addEventListener("webglcontextrestored",onContextRestored);
    enter.current = () => {
      const y=el.getBoundingClientRect().top+window.scrollY+el.offsetHeight-stage.clientHeight*2;
      window.scrollTo({top:y,behavior:media.matches?"instant":"smooth"});
    };
    replay.current = () => {window.scrollTo({top:el.getBoundingClientRect().top+window.scrollY,behavior:media.matches?"instant":"smooth"});};
    return () => {
      disposed=true;cancelAnimationFrame(raf);observer.disconnect();resize.disconnect();room?.dispose();
      delete document.documentElement.dataset.hallArrival;
      if (asHero && "scrollRestoration" in history) history.scrollRestoration = "auto";
      window.removeEventListener("scroll",onScroll);stage.removeEventListener("pointermove",onPointer);stage.removeEventListener("pointerleave",onLeave);
      document.removeEventListener("visibilitychange",onVisibility);media.removeEventListener("change",onMotion);
      canvas.removeEventListener("webglcontextlost",onContextLost);canvas.removeEventListener("webglcontextrestored",onContextRestored);
      enter.current=null;replay.current=null;
    };
  }, []);

  return (
    <>
    <SiteHeader
      scrolled={headerCompact}
      activeHref="/"
      className={`hallway-site-header${headerOn ? " is-on" : ""}`}
      locked={!headerOn}
    />
    <div className="hallway-page">
      <section ref={root} className="hallway-root" aria-label="Explore your path to wellbeing">
        <div className="hallway-stage">
          <header className="hallway-nav-walk">
            <Link className="hallway-brand" href="/" aria-label="TheraGurus home">
              <span className="hallway-brand-mark"><Image src="/theragurus-logo.png" alt="" width={1489} height={1056} sizes="76px" /></span>
              <span>Thera<span>Gurus</span></span>
            </Link>
            <nav aria-label="Hallway navigation">
              <a href={careHref}>Our care</a>
              <Link href="/about-us">Our story</Link>
              <Link className="hallway-nav-cta" href="/book">Let’s talk <ArrowIcon /></Link>
            </nav>
          </header>
          <canvas className="hallway-room" aria-hidden="true" />
          <div className="hallway-outside" aria-hidden="true">
            <div className="hallway-photo">
              <picture>
                <source media="(max-width: 639px)" srcSet="/mobile/yoga-portrait.jpg" />
                {/* Native images keep the room/door photo in one independently transformed layer. */}
                <img src="/hero-wellness.jpg" alt="" fetchPriority="high" />
              </picture>
            </div>
            <div className="hallway-photo-shade" />
          </div>
          <div className="hallway-intro">
            <h1>Find your way<br />to feeling better.</h1>
            <p>A space for your body, your questions, and your next chapter. Explore pelvic health and workplace wellbeing, with you at the centre.</p>
            <div className="hallway-intro-actions">
              <button type="button" onClick={()=>enter.current?.()}>Step inside <ArrowIcon diagonal={false} /></button>
              <a href={careHref}>Explore our care</a>
            </div>
          </div>
          <ul className="hallway-gallery" aria-label="TheraGurus care gallery">
            {hallwayServices.map((service,index)=>(
              <li className="hallway-card" key={service.title}>
                <Link href={service.href} tabIndex={0}>
                  <div className="hallway-card-media">
                    <Image src={service.image} alt="" fill sizes="(max-width: 639px) 65vw, 330px" priority={index<3} />
                  </div>
                  <div className="hallway-caption"><span>{service.title}</span><small>{service.detail}</small></div>
                </Link>
                <div className="hallway-reflection" aria-hidden="true"><Image src={service.image} alt="" fill sizes="330px" /></div>
              </li>
            ))}
          </ul>
          <div className="hallway-ending" inert>
            <div className="hallway-ending-copy">
              <h2>Care for<br />your body,<br />inside and out.</h2>
              <p>Come as you are. Find the support you need.<br className="hallway-desktop-break" /> Personalized pelvic health and workplace wellness, with you at the center.</p>
              <div className="hallway-ending-actions">
                <Link className="hallway-primary" href="/book">Start your care journey <span><ArrowIcon /></span></Link>
                <a href={servicesHref}>Explore our services <ArrowIcon diagonal={false} /></a>
              </div>
            </div>
            <div className="hallway-ending-foot">
              <div className="hallway-visit-note"><span /> In person &amp; online <i /> Santa Clarita &amp; beyond</div>
              <Link className="hallway-owner" href="/meet-the-owner">
                <span className="hallway-owner-photo"><Image src="/trapti.jpg" alt="" fill sizes="56px" /></span>
                <span>
                  <strong>Care with a human connection.</strong>
                  <small>Meet Trapti Agarwal, OTR/L</small>
                </span>
                <ArrowIcon />
              </Link>
            </div>
          </div>
          <div className="hallway-scroll-hint" aria-hidden="true"><span />Scroll to explore</div>
        </div>
      </section>
      {asHero ? null : (
      <section id="hallway-services" className="hallway-services">
        <div className="hallway-services-heading">
          <h2>Different paths.<br /><em>The same personal care.</em></h2>
          <p>Start with what feels right for you. We’ll talk through your goals and find your next step together.</p>
        </div>
        <div className="hallway-service-list">
          {hallwayServices.slice(0,7).map(service=><Link href={service.href} key={service.title}><span>{service.title}</span><small>{service.detail}</small><ArrowIcon /></Link>)}
        </div>
        <div className="hallway-close"><Link href="/">Back to TheraGurus <ArrowIcon /></Link><button onClick={()=>replay.current?.()} type="button">Walk through again <ArrowIcon diagonal={false} /></button></div>
      </section>
      )}
      <noscript><style>{`.hallway-root{height:auto!important}.hallway-stage{height:auto!important;overflow:visible!important}.hallway-room,.hallway-outside,.hallway-scroll-hint,.hallway-ending,.hallway-intro-actions button{display:none!important}.hallway-intro{position:relative!important;inset:auto!important;width:auto!important;padding:140px 24px 48px!important}.hallway-gallery{position:relative!important;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:50px 24px;padding:24px}.hallway-card{position:relative!important;inset:auto!important;transform:none!important;width:100%!important;height:340px!important;margin:0!important}.hallway-caption{opacity:1!important}.hallway-reflection{display:none!important}`}</style></noscript>
    </div>
    </>
  );
}
