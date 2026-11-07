import type { Metadata } from "next";
import { ParticlePortrait } from "@/components/ParticlePortrait";
import { Newsletter } from "@/components/Newsletter";
import { ResponsivePhoto } from "@/components/ResponsivePhoto";
import { SiteFade } from "@/components/SiteFade";
import Link from "next/link";
import { FaqList } from "@/components/FaqList";
import { StoryCarousel } from "@/components/StoryCarousel";
import { CareMarquee } from "@/components/CareMarquee";
import { InstagramReels } from "@/components/InstagramReels";
import { PelvicAnatomyJourney } from "@/components/PelvicAnatomyJourney";
import {
  CareSelector,
  JourneySection,
  BreathingPause,
} from "@/components/InteractiveSections";
import { HallwayExperience } from "@/components/hallway/HallwayExperience";
import { SelectedWork } from "@/components/SelectedWork";
import {
  ArrowIcon,
  ButtonLink,
  JournalCard,
  SectionHeading,
} from "@/components/Ui";
import { JsonLd } from "@/components/JsonLd";
import {
  articlePreviews,
  careServices,
  conditions,
  journey,
  regions,
} from "@/lib/content";
import { pageGraph } from "@/lib/seo";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={pageGraph("")} />
      <HallwayExperience asHero />
      <SelectedWork />
      <CareMarquee />
      <section id="home-care" className="tg-section home-introduction">
        <div className="tg-container introduction-grid">
          <div className="experience-orbits">
            <div>
              <strong>15+</strong>
              <span>
                years of clinical
                <br />
                experience
              </span>
            </div>
            <div>
              <strong>1:1</strong>
              <span>
                care, centered
                <br />
                around you
              </span>
            </div>
          </div>
          <SiteFade>
            <h2>
              Your body has a story.
              <br />
              We’re here to listen.
            </h2>
            <p>
              Feeling better begins with feeling understood. At TheraGurus, we
              look at the whole person: your movement, your breath, your
              everyday life, and what matters to you.
            </p>
            <p>
              From pelvic health to workplace wellbeing, our care is thoughtful,
              personal, and built around your next chapter.
            </p>
            <Link href="/about-us" className="text-link">
              A little more about us
              <ArrowIcon diagonal={false} />
            </Link>
          </SiteFade>
        </div>
      </section>
      <PelvicAnatomyJourney />
      <CareSelector services={careServices} />
      <section className="tg-section conditions-section">
        <div className="tg-container">
          <div className="section-heading-row">
            <SectionHeading
              centered={false}
              title={
                <>
                  Some things are common.
                  <br />
                  You don’t have to face them alone.
                </>
              }
              description="The worries you have been working around deserve a conversation. Start with what feels familiar."
            />
            <Link href="/conditions" className="text-link">
              How we can help
              <ArrowIcon diagonal={false} />
            </Link>
          </div>
          <div className="conditions-grid">
            {conditions.slice(0, 6).map((c) => (
              <Link key={c.slug} href={`/${c.slug}`} className="condition-link">
                <span>
                  <strong>{c.title}</strong>
                  <small>{c.description}</small>
                </span>
                <span className="condition-arrow">
                  <ArrowIcon />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <JourneySection steps={journey} />
      <section id="founder" className="tg-section founder-section">
        <div className="tg-container founder-grid">
          <div className="founder-portrait">
            <ParticlePortrait src="/trapti.png" alt="Trapti Agarwal, founder and pelvic health occupational therapist" />
            <div className="founder-signature">
              Science, care,
              <br />
              and a human connection.
            </div>
          </div>
          <SiteFade className="founder-copy">
            <h2>
              A real person.
              <br />
              In your corner.
            </h2>
            <p className="founder-name">Meet Trapti Agarwal, OTR/L</p>
            <p>
              Founder, pelvic health occupational therapist, and a believer in
              caring for the whole person. Trapti brings clinical experience,
              thoughtful listening, and a personal approach to every
              conversation.
            </p>
            <ul className="check-list">
              <li>Pelvic health occupational therapist</li>
              <li>Certified Ergonomics Assessment Specialist</li>
              <li>Certified Kinesio Taping Practitioner</li>
              <li>NLP coach and whole-person care advocate</li>
            </ul>
            <ButtonLink href="/meet-the-owner">Get to know Trapti</ButtonLink>
            <Link href="/founders-message" className="text-link">
              A note from our founder
              <ArrowIcon diagonal={false} />
            </Link>
          </SiteFade>
        </div>
      </section>
      <InstagramReels />
      <section id="stories" className="tg-section stories-section">
        <div className="tg-container">
          <SectionHeading
            title={
              <>
                Small steps.
                <br />
                Meaningful stories.
              </>
            }
            description="Every person’s experience is their own. Here’s what clients have shared about feeling heard, supported, and cared for."
          />
          <StoryCarousel />
          <div className="center-action">
            <Link className="text-link" href="/reviews">
              More client stories
              <ArrowIcon diagonal={false} />
            </Link>
          </div>
        </div>
      </section>
      <BreathingPause />
      <section className="tg-section">
        <div className="tg-container">
          <div className="section-heading-row">
            <SectionHeading
              centered={false}
              title={
                <>
                  A little understanding
                  <br />
                  goes a long way.
                </>
              }
              description="Thoughtful reads on pelvic health, recovery, and feeling better at work."
            />
            <Link className="text-link" href="/blog">
              Explore the journal
              <ArrowIcon diagonal={false} />
            </Link>
          </div>
          <div className="journal-grid">
            {articlePreviews.slice(0, 3).map((article, i) => (
              <JournalCard key={article.slug} article={article} index={i} />
            ))}
          </div>
        </div>
      </section>
      <section className="tg-section reach-section">
        <div className="tg-container reach-grid">
          <div>
            <h2>
              Close to home.
              <br />
              Connected across the world.
            </h2>
            <p>
              Rooted in Santa Clarita, with care conversations reaching Los
              Angeles, India, Dubai, and Saudi Arabia. Let’s talk about the
              options available where you are.
            </p>
            <ButtonLink href="/locations" variant="outline">
              Find care near you
            </ButtonLink>
          </div>
          <div className="region-links">
            {regions.map((r) => (
              <Link href={`/${r.slug}`} key={r.slug}>
                <span>{r.name}</span>
                <span>
                  {r.name === "United States"
                    ? "In-person & online"
                    : "Online guidance"}
                </span>
                <ArrowIcon />
              </Link>
            ))}
          </div>
        </div>
      </section>
      <Newsletter />
      <section id="faq" className="tg-section faq-section">
        <div className="tg-container faq-grid">
          <div>
            <SectionHeading
              centered={false}
              title={
                <>
                  A few answers.
                  <br />A little more ease.
                </>
              }
              description="It’s natural to have questions before you begin. We’re here to help you feel comfortable taking the next step."
            />
            <div className="faq-image">
              <ResponsivePhoto
                src="/mindful-wellness.jpg"
                alt="A quiet moment of mindful movement"
                fill
                sizes="(min-width:900px) 30vw, 90vw"
              />
            </div>
            <Link className="text-link" href="/contact-us">
              Still have a question? Let’s talk
              <ArrowIcon diagonal={false} />
            </Link>
          </div>
          <FaqList />
        </div>
      </section>
    </>
  );
}
