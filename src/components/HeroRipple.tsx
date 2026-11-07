"use client";

import dynamic from "next/dynamic";
import {
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";

const RippleDistortion = dynamic(() => import("./RippleDistortion"), {
  ssr: false,
});

function subscribePreferences(update: () => void) {
  const queries = [
    window.matchMedia("(max-width: 760px)"),
    window.matchMedia("(prefers-reduced-motion: reduce)"),
  ];
  queries.forEach((query) => query.addEventListener("change", update));
  return () =>
    queries.forEach((query) => query.removeEventListener("change", update));
}

function getPhotoMode() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return "static";
  return window.matchMedia("(max-width: 760px)").matches
    ? "portrait"
    : "landscape";
}

type Props = { heroRef: RefObject<HTMLElement | null> };

function RippleLayer({ heroRef, portrait }: Props & { portrait: boolean }) {
  const [active, setActive] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div
      aria-hidden="true"
      data-hero-ripple={active && !failed ? "active" : "idle"}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: -2,
        pointerEvents: "none",
        opacity: active && !failed ? 1 : 0,
      }}
    >
      {!failed && (
        <RippleDistortion
          src={portrait ? "/mobile/yoga-portrait.jpg" : "/hero-wellness.jpg"}
          imageRoot={heroRef}
          strength={0.05}
          brushSize={portrait ? 100 : 150}
          rings={3}
          spread={4}
          fade={1.8}
          spacing={20}
          swirl={0.45}
          grayscale={false}
          tintAmount={0}
          dispersion={0}
          glint={0}
          trigger="both"
          clickStrength={1}
          quality="low"
          onActivity={setActive}
          onError={() => setFailed(true)}
          // The original photo stays visible beneath this optional effect.
          style={{
            background: "transparent",
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        />
      )}
    </div>
  );
}

export function HeroRipple({ heroRef }: Props) {
  const mode = useSyncExternalStore(
    subscribePreferences,
    getPhotoMode,
    () => "static",
  );
  if (mode === "static") return null;
  return (
    <RippleLayer key={mode} heroRef={heroRef} portrait={mode === "portrait"} />
  );
}
