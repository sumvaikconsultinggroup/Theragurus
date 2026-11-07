"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { careLocations, locationForSlug } from "@/lib/location-data";
import { cn } from "@/lib/utils";
import "./LocationMap.css";

const MapCanvas = dynamic(() => import("./LocationMapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="location-map-loading" role="status">
      Loading map…
    </div>
  ),
});

export function LocationMap({ initialSlug }: { initialSlug?: string }) {
  const initial = locationForSlug(initialSlug);
  const [selectedId, setSelectedId] = useState(initial.id);
  const [scope, setScope] = useState(initial.scope);
  const [view, setView] = useState<{
    mode: "selected" | "all";
    revision: number;
  }>({ mode: "selected", revision: 0 });
  const [focusedId, setFocusedId] = useState("");
  const reduced = useReducedMotion();
  const selected = careLocations.find(
    (location) => location.id === selectedId,
  )!;
  const choices = useMemo(
    () => careLocations.filter((location) => location.scope === scope),
    [scope],
  );
  const selectLocation = useCallback((id: string) => {
    const location = careLocations.find((place) => place.id === id);
    if (!location) return;
    setSelectedId(id);
    setScope(location.scope);
    setView((previous) => ({
      mode: "selected",
      revision: previous.revision + 1,
    }));
  }, []);
  const focused = useCallback((id: string) => setFocusedId(id), []);
  const switchScope = (next: "local" | "worldwide") => {
    if (next !== scope)
      selectLocation(next === "local" ? "santa-clarita" : "world-us");
  };
  return (
    <div className="location-map" id="care-map">
      <div
        className="location-map-shell"
        role="region"
        aria-label="Interactive care locations map"
      >
        <div className="location-map-controls">
          <div
            className="location-map-scope"
            role="group"
            aria-label="Choose local or worldwide care"
          >
            <button
              type="button"
              aria-pressed={scope === "local"}
              onClick={() => switchScope("local")}
            >
              Local care
            </button>
            <button
              type="button"
              aria-pressed={scope === "worldwide"}
              onClick={() => switchScope("worldwide")}
            >
              Worldwide
            </button>
          </div>
          <div className="location-map-select">
            <label htmlFor="map-care-location">
              {scope === "local" ? "Choose your local area" : "Choose a region"}
            </label>
            <select
              id="map-care-location"
              value={selectedId}
              onChange={(event) => selectLocation(event.target.value)}
            >
              {choices.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="location-map-canvas">
          <MapCanvas
            places={choices}
            selected={selected}
            view={view}
            reducedMotion={reduced === true}
            onSelect={selectLocation}
            onFocused={focused}
          />
        </div>
        <div className="location-map-footer">
          <div className="location-map-details">
            <div aria-live="polite" aria-atomic="true">
              <h3>{selected.name}</h3>
              <p className="location-map-care">{selected.care}</p>
            </div>
            {selected.address && (
              <p className="location-map-address">{selected.address}</p>
            )}
          </div>
          <div className="location-map-toolbar">
            <span
              className="sr-only"
              aria-live="polite"
              data-map-focused={focusedId}
            >
              {focusedId === "all"
                ? `Showing all ${scope === "local" ? "local areas" : "regions"}`
                : `Selected: ${selected.name}`}
            </span>
            <div>
              <button
                className={cn(focusedId === "all" && "is-selected")}
                type="button"
                onClick={() =>
                  setView((previous) => ({
                    mode: "all",
                    revision: previous.revision + 1,
                  }))
                }
              >
                Show all areas
              </button>
              <button
                type="button"
                onClick={() =>
                  setView((previous) => ({
                    mode: "selected",
                    revision: previous.revision + 1,
                  }))
                }
              >
                Recenter
              </button>
            </div>
          </div>
        </div>
      </div>
      <p className="location-map-note">
        Markers represent service areas, not additional clinics. In-person care
        is based in Santa Clarita; please confirm the options for your location
        with our team.
      </p>
    </div>
  );
}
