import type { Metadata } from "next";
import { HallwayExperience } from "@/components/hallway/HallwayExperience";

export const metadata: Metadata = {
  title: "A space for your wellbeing — Hallway preview",
  description: "Explore TheraGurus care through an immersive hallway preview.",
  robots: { index: false, follow: false },
};

export default function HallwayTestPage() {
  return <HallwayExperience />;
}
