"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Globe3D, type GlobeMarker } from "@/components/ui/3d-globe";
import { ButtonLink } from "@/components/Ui";
import { SiteFade } from "@/components/SiteFade";

const PLACES = [
  {
    name: "United States",
    note: "Santa Clarita and Los Angeles.",
    href: "/pelvic-floor-therapists-in-los-angeles",
    lat: 34.4128,
    lng: -118.5538,
    flag: "us",
  },
  {
    name: "India",
    note: "Online, by arrangement.",
    href: "/india",
    lat: 28.6139,
    lng: 77.209,
    flag: "in",
  },
  {
    name: "Dubai",
    note: "Virtual care, around your day.",
    href: "/dubai",
    lat: 25.0743,
    lng: 55.1886,
    flag: "ae",
  },
  {
    name: "Saudi Arabia",
    note: "Online, confirmed with you.",
    href: "/saudi-arabia",
    lat: 24.6389,
    lng: 46.716,
    flag: "sa",
  },
] as const;

type Place = (typeof PLACES)[number];

function placeFromMarker(marker: GlobeMarker | null) {
  if (!marker?.label) return null;
  return PLACES.find((place) => place.name === marker.label) ?? null;
}

export function LocationGlobe() {
  const router = useRouter();
  const [notice, setNotice] = useState<Place | null>(null);
  const [open, setOpen] = useState(false);
  const ready = useRef(false);
  const paused = useRef(false);
  const holding = useRef(false);
  const dismissed = useRef<string | null>(null);
  const showing = useRef<string | null>(null);
  const openRef = useRef(false);
  const latest = useRef<Place | null>(null);
  const timer = useRef<number | null>(null);
  const markers = useMemo<GlobeMarker[]>(
    () =>
      PLACES.map((place) => ({
        lat: place.lat,
        lng: place.lng,
        label: place.name,
        src: `https://flagcdn.com/w80/${place.flag}.png`,
      })),
    [],
  );

  const clearTimer = useCallback(() => {
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const present = useCallback(
    (place: Place, hold: boolean) => {
      if (!ready.current && !hold) return;
      if (!hold && dismissed.current === place.name) return;
      if (!hold && showing.current === place.name && openRef.current) return;
      if (dismissed.current && dismissed.current !== place.name) dismissed.current = null;
      showing.current = place.name;
      openRef.current = true;
      setNotice(place);
      setOpen(true);
      clearTimer();
      if (hold || paused.current) return;
      timer.current = window.setTimeout(() => {
        if (paused.current || holding.current) return;
        showing.current = null;
        openRef.current = false;
        setOpen(false);
      }, 5200);
    },
    [clearTimer],
  );

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setTimeout(() => {
      ready.current = true;
      if (latest.current) present(latest.current, false);
    }, reduce ? 400 : 2500);
    return () => window.clearTimeout(id);
  }, [present]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return (
    <section className="location-globe" aria-labelledby="location-globe-title">
      <div className="tg-container location-globe-grid">
        <div className="location-globe-copy">
          <SiteFade>
            <h2 id="location-globe-title">
              A local connection.
              <br />
              A wider reach.
            </h2>
          </SiteFade>
          <p>
            Rooted in Santa Clarita and connected beyond. Pelvic health and
            workplace wellness in greater Los Angeles, with online conversations
            across India, Dubai, and Saudi Arabia.
          </p>
          <ButtonLink href="/book">Book a visit</ButtonLink>
          <ul className="location-globe-places">
            {PLACES.map((place) => (
              <li key={place.href}>
                <Link href={place.href}>
                  <img
                    src={`https://flagcdn.com/w80/${place.flag}.png`}
                    alt=""
                    width={40}
                    height={27}
                  />
                  <span>{place.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="location-globe-stage">
          <div className="location-globe-travel">
          <Globe3D
            className="location-globe-canvas"
            markers={markers}
            config={{
              showAtmosphere: false,
              autoRotateSpeed: 0.35,
              backgroundColor: null,
              enableZoom: false,
              enablePan: false,
            }}
            onMarkerClick={(marker) => {
              const place = placeFromMarker(marker);
              if (place) router.push(place.href);
            }}
            onMarkerHover={(marker) => {
              const place = placeFromMarker(marker);
              holding.current = Boolean(place);
              if (!place) {
                if (openRef.current) {
                  clearTimer();
                  timer.current = window.setTimeout(() => {
                    if (paused.current || holding.current) return;
                    showing.current = null;
                    openRef.current = false;
                    setOpen(false);
                  }, 1600);
                }
                return;
              }
              present(place, true);
            }}
            onLeadMarker={(marker) => {
              const place = placeFromMarker(marker);
              latest.current = place;
              if (!place || holding.current || paused.current) return;
              present(place, false);
            }}
          />
          </div>
          <div className="location-toast-slot" aria-live="polite">
            {open && notice ? (
              <div
                className="location-toast"
                key={notice.name}
                role="status"
                onMouseEnter={() => {
                  paused.current = true;
                  clearTimer();
                }}
                onMouseLeave={() => {
                  paused.current = false;
                  clearTimer();
                  timer.current = window.setTimeout(() => {
                    if (paused.current || holding.current) return;
                    showing.current = null;
                    openRef.current = false;
                    setOpen(false);
                  }, 1600);
                }}
              >
                <Link className="location-toast-body" href={notice.href}>
                  <img
                    src={`https://flagcdn.com/w80/${notice.flag}.png`}
                    alt=""
                    width={28}
                    height={28}
                  />
                  <span className="location-toast-copy">
                    <span className="location-toast-name">{notice.name}</span>
                    <span className="location-toast-note">{notice.note}</span>
                  </span>
                  <span className="location-toast-open">View care</span>
                </Link>
                <button
                  type="button"
                  className="location-toast-close"
                  aria-label="Dismiss"
                  onClick={() => {
                    dismissed.current = notice.name;
                    showing.current = null;
                    openRef.current = false;
                    clearTimer();
                    setOpen(false);
                  }}
                >
                  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                    <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
                <span className="location-toast-life" aria-hidden="true" />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
