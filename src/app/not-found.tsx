import type { Metadata } from "next";
import Link from "next/link";
import FuzzyText from "@/components/FuzzyText";
import { ButtonLink } from "@/components/Ui";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <section className="not-found">
      <div className="tg-container not-found-copy">
        <h1>
          <FuzzyText
            color="currentColor"
            fontFamily="inherit"
            fontWeight={600}
            fontSize="clamp(11rem, 38vw, 30rem)"
            fuzzRange={48}
            colorSplit={0}
            trigger="hover"
            direction="horizontal"
            baseIntensity={0.2}
            hoverIntensity={0.5}
            sliceSize={1}
            fps={60}
            transitionDuration={0}
            intro
            introDuration={1400}
            letterSpacing={0}
            enableHover
            clickEffect={false}
            glitchMode={false}
            glitchInterval={2000}
            glitchDuration={200}
          >
            404
          </FuzzyText>
        </h1>
        <div className="button-row">
          <ButtonLink href="/">Back home</ButtonLink>
          <ButtonLink href="/book" variant="light">
            Book a visit
          </ButtonLink>
        </div>
        <p>
          A little off the path. This address isn’t a page on TheraGurus. The
          care you’re looking for is still here.
        </p>
        <nav className="not-found-links" aria-label="Other places to go">
          <Link href="/our-services">Services</Link>
          <Link href="/contact-us">Contact</Link>
          <Link href="/sitemap">Site map</Link>
        </nav>
      </div>
    </section>
  );
}
