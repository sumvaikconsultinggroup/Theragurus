"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
} from "react-leaflet";
import { divIcon, latLngBounds } from "leaflet";
import Link from "next/link";
import type { CareLocation } from "@/lib/location-data";
import "leaflet/dist/leaflet.css";

type Props = {
  places: CareLocation[];
  selected: CareLocation;
  view: { mode: "selected" | "all"; revision: number };
  reducedMotion: boolean;
  onSelect: (id: string) => void;
  onFocused: (id: string) => void;
};

function locationZoom(place: CareLocation) {
  if (place.scope === "local") return 11;
  if (place.id === "dubai") return 9;
  return place.id === "world-us" || place.id === "india" ? 3 : 4;
}

function Viewport({ selected, places, view, reducedMotion, onFocused }: Props) {
  const map = useMap();
  useEffect(() => {
    map
      .getContainer()
      .setAttribute(
        "aria-label",
        `Care locations map. Selected: ${selected.name}. Use arrow keys to pan, and plus or minus to zoom.`,
      );
    const done = () => {
      if (
        view.mode === "selected" &&
        (!map.getCenter().equals([selected.lat, selected.lng]) ||
          map.getZoom() !== locationZoom(selected))
      )
        return;
      if (
        view.mode === "all" &&
        !places.every((place) =>
          map.getBounds().contains([place.lat, place.lng]),
        )
      )
        return;
      map.off("moveend", done);
      onFocused(view.mode === "all" ? "all" : selected.id);
    };
    map.stop();
    map.invalidateSize({ pan: false });
    map.on("moveend", done);
    if (view.mode === "all") {
      map.fitBounds(
        latLngBounds(places.map((place) => [place.lat, place.lng])),
        {
          padding: [36, 36],
          maxZoom: selected.scope === "local" ? 9 : 3,
          animate: !reducedMotion,
        },
      );
    } else {
      const target = [selected.lat, selected.lng] as [number, number];
      if (reducedMotion)
        map.setView(target, locationZoom(selected), { animate: false });
      else map.flyTo(target, locationZoom(selected), { duration: 0.8 });
      if (
        map.getCenter().equals(target) &&
        map.getZoom() === locationZoom(selected)
      )
        done();
    }
    return () => {
      map.off("moveend", done);
    };
  }, [map, selected, places, view, reducedMotion, onFocused]);
  useEffect(() => {
    const exploring = () => onFocused("");
    map.on("dragstart", exploring);
    map.on("zoomstart", exploring);
    return () => {
      map.off("dragstart", exploring);
      map.off("zoomstart", exploring);
    };
  }, [map, onFocused]);
  useEffect(() => {
    const resize = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    resize.observe(map.getContainer());
    return () => resize.disconnect();
  }, [map]);
  return null;
}

const normalIcon = divIcon({
  className: "location-map-marker",
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  html: '<span class="location-map-pin"></span>',
});
const selectedIcon = divIcon({
  className: "location-map-marker location-map-marker-selected",
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  html: '<span class="location-map-pin"></span>',
});

export default function LocationMapCanvas(props: Props) {
  const { selected, places, onSelect } = props;
  const [loaded, setLoaded] = useState(false);
  const [tileError, setTileError] = useState(false);
  const tileEvents = useMemo(
    () => ({
      tileload: () => setLoaded(true),
      tileerror: () => setTileError(true),
    }),
    [],
  );
  return (
    <>
      <MapContainer
        center={[selected.lat, selected.lng]}
        zoom={locationZoom(selected)}
        minZoom={0.5}
        zoomSnap={0.25}
        maxZoom={18}
        // Keep the Mercator poles outside the frame while allowing wrapped worlds.
        maxBounds={[
          [-85.05112878, -540],
          [85.05112878, 540],
        ]}
        maxBoundsViscosity={1}
        zoomControl={false}
        zoomAnimation={false}
        scrollWheelZoom={false}
        worldCopyJump
        keyboard
        className="location-map-leaflet"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
          eventHandlers={tileEvents}
        />
        <Viewport {...props} />
        <ZoomControl position="topright" />
        {places.map((place) => (
          <Marker
            key={place.id}
            position={[place.lat, place.lng]}
            keyboard
            title={`Show ${place.name} on map`}
            alt={`Show ${place.name} on map`}
            icon={place.id === selected.id ? selectedIcon : normalIcon}
            zIndexOffset={place.id === selected.id ? 1000 : 0}
            eventHandlers={{ click: () => onSelect(place.id) }}
          >
            <Tooltip
              key={`${place.id}-${place.id === selected.id}-${props.view.mode}`}
              permanent={place.id === selected.id}
              direction={props.view.mode === "all" ? "auto" : "top"}
              offset={props.view.mode === "all" ? [12, 0] : [0, -15]}
              className="location-map-tooltip"
            >
              {place.name}
            </Tooltip>
            <Popup>
              <strong>{place.name}</strong>
              <p>{place.care}</p>
              <Link href={place.href}>Explore care options</Link>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {!loaded && (
        <div className="location-map-loading-overlay" role="status">
          {tileError
            ? "Map imagery is unavailable right now. You can still choose an area and explore care options."
            : "Loading map…"}
        </div>
      )}
    </>
  );
}
