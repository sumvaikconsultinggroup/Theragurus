"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { TiltedGridHero } from "@/components/ui/tilted-grid-hero";
import { instagramReels } from "@/data/instagram-reels";
import "./InstagramReels.css";

const covers = instagramReels.map((reel) => ({ src: reel.poster, alt: reel.title, duration: reel.duration }));

function PlayIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 10 7-10 7Z" fill="currentColor" /></svg>;
}

function ExternalArrow() {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12" /></svg>;
}

export function InstagramReels() {
  const root = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(element);
    const update = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    update();
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);

  useEffect(() => {
    if (selected === null) return;
    const element = dialog.current;
    if (!element) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      trigger.current?.focus({ preventScroll: true });
    };
  }, [selected]);

  const open = (index: number) => {
    trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setFailed(false);
    setSelected(index);
  };
  const close = () => { video.current?.pause(); setSelected(null); };
  const reel = selected === null ? null : instagramReels[selected];

  return (
    <section ref={root} id="reels" className="instagram-reels" aria-labelledby="reels-heading">
      <div className="tg-container reels-heading-row">
        <div>
          <h2 id="reels-heading">A little guidance.<br /><em>In motion.</em></h2>
          <p>Pelvic health conversations and personal stories,<br className="reels-desktop-break" /> straight from TheraGurus.</p>
        </div>
        <a className="reels-profile" href="https://www.instagram.com/thera_gurus/" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" /></svg>
          <span>@thera_gurus</span><ExternalArrow />
        </a>
      </div>
      <div className="reels-stage">
        <TiltedGridHero images={covers} aspectRatio={9 / 16} tileHeight={72} curve={42} axis={47} gap={5} speed={8} fade={5}
          className="reels-curved" paused={!visible || !pageVisible || selected !== null} onSelect={open} />
      </div>
      <div className="tg-container reels-still" aria-label="Choose a reel to watch">
        {instagramReels.map((item, index) => <button type="button" key={item.id} onClick={() => open(index)} aria-label={`Watch reel: ${item.title}`}>
          <Image src={item.poster} alt="" width={360} height={640} sizes="200px" /><span className="reels-tile-play"><PlayIcon /></span>
        </button>)}
      </div>
      {reel && <dialog ref={dialog} className="reels-dialog" aria-labelledby="reels-player-title" onCancel={(event) => { event.preventDefault(); close(); }} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
        <div className="reels-player">
          <button type="button" className="reels-close" onClick={close} aria-label="Close reel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
          <video ref={video} key={reel.id} src={reel.video} poster={reel.poster} controls playsInline autoPlay preload="metadata" onError={() => setFailed(true)} aria-label={reel.title} />
          <div className="reels-player-copy"><h3 id="reels-player-title">{reel.title}</h3>
            {failed && <p role="status">This video couldn’t load. You can watch the original on Instagram.</p>}
            <a href={reel.url} target="_blank" rel="noopener noreferrer">Watch on Instagram <ExternalArrow /></a>
          </div>
        </div>
      </dialog>}
    </section>
  );
}
