import type { Metadata } from "next";
import { HomeHero } from "@/components/InteractiveSections";

export const metadata: Metadata = {
  title: "Homepage hero",
  robots: { index: false, follow: false },
};

export default function PreviousHeroPage() {
  return <HomeHero />;
}
