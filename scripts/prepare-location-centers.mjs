import { writeFile } from "node:fs/promises";

const places = [
  "Santa Clarita",
  "Los Angeles",
  "Bakersfield",
  "Palmdale",
  "Lancaster",
  "Northridge",
  "Stevenson Ranch",
  "Acton",
  "Chatsworth",
  "Granada Hills",
  "Mission Hills",
  "Porter Ranch",
  "Burbank",
  "Malibu",
  "Hollywood",
  "Bel Air",
  "Beverly Hills",
];
const queries = places.map((name) => ({
  name,
  query: `${name}${name === "Mission Hills" ? ", Los Angeles" : ""}, California, United States`,
}));
queries.push(
  { name: "India", query: "New Delhi, India" },
  { name: "Dubai", query: "Dubai, United Arab Emirates" },
  { name: "Saudi Arabia", query: "Riyadh, Saudi Arabia" },
);
const centers = {};
for (const { name, query } of queries) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
  }).toString();
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "TheraGurus-location-preview/1.0 (one-time public city-center lookup)",
    },
  });
  if (!response.ok)
    throw new Error(`City-center lookup failed: ${name} (${response.status})`);
  const [result] = await response.json();
  if (!result) throw new Error(`No city center found for ${name}`);
  centers[name] = {
    lat: Number(result.lat),
    lng: Number(result.lon),
    source: `https://www.openstreetmap.org/${result.osm_type}/${result.osm_id}`,
  };
  console.log(`Located ${name}`);
  // Respect the public Nominatim service's one-request-per-second limit.
  await new Promise((resolve) => setTimeout(resolve, 1100));
}
await writeFile(
  "src/data/location-centers.json",
  `${JSON.stringify(centers, null, 2)}\n`,
);
