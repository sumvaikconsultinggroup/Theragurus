import centers from "@/data/location-centers.json";

export type CareLocation = {
  id: string;
  name: string;
  scope: "local" | "worldwide";
  lat: number;
  lng: number;
  href: string;
  care: string;
  description: string;
  address?: string;
};

const localPlaces = [
  ["Santa Clarita", "santa-clarita", "pelvic-floor-therapists-in-los-angeles"],
  ["Los Angeles", "los-angeles", "pelvic-floor-therapists-in-los-angeles"],
  ["Bakersfield", "bakersfield", "pelvic-floor-therapy-in-bakersfield"],
  ["Palmdale", "palmdale", "pelvic-floor-therapy-in-palmdale"],
  ["Lancaster", "lancaster", "pelvic-floor-therapy-in-lancaster"],
  ["Northridge", "northridge", "pelvic-floor-therapy-in-northridge"],
  [
    "Stevenson Ranch",
    "stevenson-ranch",
    "pelvic-floor-therapy-in-stevenson-ranch",
  ],
  ["Acton", "acton", "pelvic-floor-therapy-in-acton"],
  ["Chatsworth", "chatsworth", "pelvic-floor-therapy-in-chatsworth"],
  ["Granada Hills", "granada-hills", "pelvic-floor-therapy-in-granada-hills"],
  ["Mission Hills", "mission-hills", "pelvic-floor-therapy-in-mission-hills"],
  ["Porter Ranch", "porter-ranch", "pelvic-floor-therapy-in-porter-ranch"],
  ["Burbank", "burbank", "pelvic-floor-pain-treatment-in-burbank"],
  ["Malibu", "malibu", "pelvic-floor-pain-treatment-in-malibu"],
  ["Hollywood", "hollywood", "pelvic-floor-pain-treatment-in-hollywood"],
  ["Bel Air", "bel-air", "pelvic-floor-therapy-service-in-bel-air"],
  [
    "Beverly Hills",
    "beverly-hills",
    "pelvic-floor-therapy-services-in-beverly-hills",
  ],
] as const;

export const careLocations: CareLocation[] = [
  ...localPlaces.map(([name, id, slug]) => ({
    id,
    name,
    scope: "local" as const,
    lat: centers[name].lat,
    lng: centers[name].lng,
    href: `/${slug}`,
    care:
      name === "Santa Clarita"
        ? "In person & online"
        : "Local care, by arrangement",
    description:
      name === "Santa Clarita"
        ? "Our home in Santa Clarita. Start a conversation about personalized pelvic health, movement, or workplace wellbeing. Visits are by appointment."
        : `Looking for support in ${name}? Our practice is based in Santa Clarita. We’ll discuss your goals and confirm the in-person or virtual options available to you.`,
    ...(name === "Santa Clarita"
      ? { address: "24355 Lyons Ave, Suite 130, Santa Clarita, CA 91321" }
      : {}),
  })),
  {
    id: "world-us",
    name: "United States",
    scope: "worldwide",
    lat: centers["Santa Clarita"].lat,
    lng: centers["Santa Clarita"].lng,
    href: "/pelvic-floor-therapists-in-los-angeles",
    care: "In person & online",
    description:
      "Personalized care in Santa Clarita and the greater Los Angeles area, with virtual options by arrangement.",
    address: "24355 Lyons Ave, Suite 130, Santa Clarita, CA 91321",
  },
  {
    id: "india",
    name: "India",
    scope: "worldwide",
    lat: centers.India.lat,
    lng: centers.India.lng,
    href: "/india",
    care: "Online guidance",
    description:
      "Connect with us to discuss online pelvic wellness guidance and corporate wellbeing programs. Availability and suitable support are confirmed with our team.",
  },
  {
    id: "dubai",
    name: "Dubai",
    scope: "worldwide",
    lat: centers.Dubai.lat,
    lng: centers.Dubai.lng,
    href: "/dubai",
    care: "Online guidance",
    description:
      "Start a conversation about virtual care and wellbeing support that works around your day. Our team will confirm the options available for your location.",
  },
  {
    id: "saudi-arabia",
    name: "Saudi Arabia",
    scope: "worldwide",
    lat: centers["Saudi Arabia"].lat,
    lng: centers["Saudi Arabia"].lng,
    href: "/saudi-arabia",
    care: "Online guidance",
    description:
      "Explore online consultations and workplace wellness support, with availability confirmed when you contact us.",
  },
];

export function locationForSlug(slug?: string) {
  return (
    careLocations.find((location) => location.id === slug) ||
    careLocations.find(
      (location) =>
        location.id !== "santa-clarita" && location.href === `/${slug}`,
    ) ||
    careLocations[0]
  );
}
