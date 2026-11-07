import { ContentGuide } from "@/components/ContentGuide";
import { ReadingReveal } from "@/components/ReadingReveal";
import { ParticlePortrait } from "@/components/ParticlePortrait";
import { ResponsivePhoto } from "@/components/ResponsivePhoto";
import { LocationGlobe } from "@/components/LocationGlobe";
import { LocationMap } from "@/components/LocationMap";
import Link from "next/link";
import { FaqList } from "@/components/FaqList";
import { StoryCarousel } from "@/components/StoryCarousel";
import {
  ContactForm,
  JourneySection,
  JournalBrowser,
} from "@/components/InteractiveSections";
import { clinic } from "@/lib/booking-catalog";
import {
  ArrowIcon,
  ButtonLink,
  CareInvitation,
  JournalCard,
  PageHero,
  SectionHeading,
  TextBlocks,
} from "@/components/Ui";
import {
  articlePreviews,
  articles,
  careServices,
  conditions,
  findLegacy,
  getPageTitle,
  journey,
  locations,
  regions,
} from "@/lib/content";
import type { Article, ContentBlock } from "@/lib/content";

function OriginalContent({ slug }: { slug: string }) {
  return <ContentGuide slug={slug} />;
}

export function ServicesPage({ slug = "our-services" }: { slug?: string }) {
  return (
    <>
      <PageHero
        title="A little more care. A little more you."
        description="Personalized pelvic health, gentle movement, and thoughtful workplace wellness. Explore support for your body and the way you live."
        image="/hero-wellness.jpg"
      >
        <ButtonLink href="/contact-us">Find your next step</ButtonLink>
      </PageHero>
      <section className="tg-section">
        <div className="tg-container service-directory">
          {careServices.map((s) => (
            <article key={s.slug}>
              <div className="service-directory-image">
                <ResponsivePhoto
                  src={s.image}
                  alt=""
                  fill
                  sizes="(min-width:760px) 45vw,100vw"
                />
              </div>
              <div className="service-directory-copy">
                <h2>{s.title}</h2>
                <p>{s.description}</p>
                <ButtonLink href={`/${s.slug}`} variant="outline">
                  Explore this service
                </ButtonLink>
              </div>
            </article>
          ))}
        </div>
      </section>
      <OriginalContent slug={slug} />
      <CareInvitation />
    </>
  );
}

export function ServiceDetailPage({ slug }: { slug: string }) {
  const service = careServices.find((s) => s.slug === slug)!;
  return (
    <>
      <PageHero
        title={service.title}
        description={service.intro}
        image={service.image}
      />
      <section className="tg-section">
        <div className="tg-container detail-grid">
          <div>
            <h2>
              Thoughtful support.
              <br />
              Made personal.
            </h2>
            <p>
              {service.description} Your goals, comfort, and everyday life guide
              the next step.
            </p>
            <Link
              href="/how-it-works"
              className="text-link"
              style={{ marginTop: 24 }}
            >
              What getting started looks like
              <ArrowIcon diagonal={false} />
            </Link>
          </div>
          <div className="feature-list">
            {service.features.map((f, i) => (
              <article key={f}>
                <h3>{f}</h3>
                <p>
                  {
                    [
                      "Start with a conversation about what matters most to you.",
                      "Explore practical guidance that considers your individual needs.",
                      "Build understanding in a respectful, supportive setting.",
                      "Discuss a plan and delivery options that fit your routine.",
                    ][i]
                  }
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
      {findLegacy(slug) ? (
        <OriginalContent slug={slug} />
      ) : (
        <JourneySection steps={journey} />
      )}
      <section className="tg-section conditions-section">
        <div className="tg-container">
          <SectionHeading title="There’s more than one way to feel supported." />
          <div className="service-link-row">
            {careServices
              .filter((s) => s.slug !== slug && s.audience === service.audience)
              .slice(0, 3)
              .map((s) => (
                <Link href={`/${s.slug}`} key={s.slug}>
                  {s.title}
                  <ArrowIcon />
                </Link>
              ))}
          </div>
        </div>
      </section>
      <CareInvitation />
    </>
  );
}

export function AboutPage() {
  return (
    <>
      <PageHero
        title="The whole person. The whole story."
        animateTitle
        description="TheraGurus began with a simple belief: care should make you feel heard, understood, and involved. We bring that belief to pelvic health, movement, and workplace wellbeing."
        image="/mindful-wellness.jpg"
      />
      <section className="tg-section">
        <div className="tg-container detail-grid">
          <div>
            <ReadingReveal as="h2">{"More than symptoms.\nSomeone with a story."}</ReadingReveal>
            <ReadingReveal>We take time to understand how your body, daily life, and personal goals connect. That understanding is the starting point for individualized care.</ReadingReveal>
          </div>
          <div className="feature-list">
            {[
              {
                title: "Personal attention",
                text: "One-to-one conversations and a plan built around your needs.",
              },
              {
                title: "Whole-person care",
                text: "Movement, breath, physical comfort, and emotional wellbeing all deserve consideration.",
              },
              {
                title: "Practical understanding",
                text: "Education and guidance that help you take an active part in your care.",
              },
              {
                title: "A welcoming connection",
                text: "A supportive space for the questions you may not have felt comfortable asking.",
              },
            ].map((v) => (
              <article key={v.title}>
                <h3>{v.title}</h3>
                <p>{v.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <OriginalContent slug="about-us" />
      <section className="tg-section founder-section">
        <div className="tg-container founder-grid">
          <div className="founder-portrait">
            <ParticlePortrait src="/trapti.png" alt="Trapti Agarwal" />
          </div>
          <div className="founder-copy">
            <ReadingReveal as="h2">{"Meet the person\nbehind the care."}</ReadingReveal>
            <p className="founder-name">Trapti Agarwal, OTR/L</p>
            <p>
              A pelvic health occupational therapist, certified ergonomics
              specialist, and founder of TheraGurus. Get to know her approach
              and the values that shape your care.
            </p>
            <div className="button-row">
              <ButtonLink href="/meet-the-owner">Meet Trapti</ButtonLink>
              <Link href="/founders-message" className="text-link">
                Read her message
                <ArrowIcon diagonal={false} />
              </Link>
            </div>
          </div>
        </div>
      </section>
      <CareInvitation />
    </>
  );
}

export function FounderPage({ message = false }: { message?: boolean }) {
  return (
    <>
      <PageHero
        title={message ? "A note from our founder." : "Meet Trapti Agarwal."}
        description="Pelvic health occupational therapist. Certified Ergonomics Assessment Specialist. Founder of TheraGurus. A believer in caring for the person behind the symptoms."
        image="/trapti.jpg"
        imageAlt="Trapti Agarwal, OTR/L"
      />
      <section className="tg-section">
        <div className="tg-container editorial-grid">
          <div className="editorial-copy">
            {message ? (
              <>
                <h2>Care that helps you feel at home in your body.</h2>
                <TextBlocks reveal
                  blocks={(findLegacy("founders-message")?.blocks ?? []).filter(
                    (b) => b.type !== "heading" && !/book now/i.test(b.text),
                  )}
                />
                <p style={{ marginTop: 28, color: "var(--brand-blue)" }}>
                  Trapti Agarwal
                  <br />
                  Founder &amp; CEO, TheraGurus
                </p>
              </>
            ) : (
              <>
                <section>
                  <h2>
                    Clinical experience.
                    <br />A personal connection.
                  </h2>
                  <p>
                    Trapti Agarwal, OTR/L is a pelvic health occupational
                    therapist who takes a holistic approach to care. Her
                    experience spans acute care, outpatient therapy, aquatic
                    therapy, pediatric, geriatric, and home health settings.
                  </p>
                  <p>
                    She brings together pelvic health, movement, ergonomic
                    support, and thoughtful listening. Her goal is to understand
                    the whole person and involve you in the decisions that shape
                    your care.
                  </p>
                </section>
                <section>
                  <h2>Expertise that meets everyday life.</h2>
                  <ul className="check-list">
                    <li>Pelvic health occupational therapy</li>
                    <li>Certified Ergonomics Assessment Specialist</li>
                    <li>Certified Kinesio Taping Practitioner (CKTP)</li>
                    <li>Corporate and one-to-one ergonomic consultations</li>
                    <li>Certified NLP coach</li>
                  </ul>
                </section>
                <section>
                  <h2>More than a treatment plan.</h2>
                  <p>
                    Rooted in Eastern values and spirituality, Trapti’s approach
                    considers physical and emotional wellbeing. Away from work,
                    she enjoys dance, meditation, nutrition, music, and
                    traveling with her family.
                  </p>
                  <p>
                    At TheraGurus, your care begins with a respectful
                    conversation about your needs, your comfort, and what you
                    want to work toward.
                  </p>
                  <Link
                    href="/founders-message"
                    className="text-link"
                    style={{ marginTop: 24 }}
                  >
                    Read a note from Trapti
                    <ArrowIcon diagonal={false} />
                  </Link>
                </section>
              </>
            )}
          </div>
          <aside className="editorial-aside">
            <h3>
              You can start
              <br />
              with a question.
            </h3>
            <p>
              Connect with Trapti and explore whether TheraGurus is the right
              fit for your next step.
            </p>
            <ButtonLink href="/contact-us">Book a conversation</ButtonLink>
          </aside>
        </div>
      </section>
      {!message && <OriginalContent slug="meet-the-owner" />}
      <CareInvitation />
    </>
  );
}

export function ConditionsPage({ slug }: { slug?: string }) {
  const condition = conditions.find((c) => c.slug === slug);
  const original = slug ? findLegacy(slug) : undefined;
  return (
    <>
      <PageHero
        title={
          condition ? condition.title : "The support you’ve been looking for."
        }
        description={
          condition
            ? condition.detail
            : "Some concerns are easy to put off or difficult to talk about. Find a place to begin a conversation about your pelvic health, movement, or everyday comfort."
        }
        image="/mindful-wellness.jpg"
      />
      {original ? (
        <OriginalContent slug={slug!} />
      ) : condition ? (
        <section className="tg-section">
          <div className="tg-container detail-grid">
            <div>
              <h2>
                Your experience
                <br />
                deserves attention.
              </h2>
              <p>{condition.description}</p>
              <p>
                We begin with a conversation and an individual assessment.
                Contact us to discuss what care may be suitable for your needs.
              </p>
            </div>
            <div>
              <SectionHeading
                centered={false}
                title="What your care may include"
              />
              <ul className="check-list">
                <li>A conversation about your symptoms and goals</li>
                <li>Education about pelvic health and everyday movement</li>
                <li>Individualized movement and breath awareness</li>
                <li>Guidance on appropriate next steps and follow-up</li>
              </ul>
              <ButtonLink href="/holistic-pelvic-floor-therapy">
                Explore pelvic floor therapy
              </ButtonLink>
            </div>
          </div>
        </section>
      ) : null}
      <section className="tg-section conditions-section">
        <div className="tg-container">
          <SectionHeading
            title={
              condition
                ? "Explore more ways we can help."
                : "Start with what feels familiar."
            }
          />
          <div className="conditions-grid">
            {conditions
              .filter((c) => c.slug !== slug)
              .map((c) => (
                <Link
                  className="condition-link"
                  href={`/${c.slug}`}
                  key={c.slug}
                >
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
      <CareInvitation />
    </>
  );
}

export function ContactPage() {
  return (
    <>
      <PageHero
        title="Your next chapter starts with a hello."
        description="A question, a concern, or simply a feeling that it’s time for some support. We’re here to listen. Start with a free phone conversation."
        image="/footer-meadow.jpg"
      >
        <ButtonLink href="/book">Book your care</ButtonLink>
        <ButtonLink href="tel:+16616256322">Call +1-661-625-6322</ButtonLink>
      </PageHero>
      <section className="tg-section">
        <div className="tg-container contact-grid">
          <div className="contact-details">
            <div>
              <h3>A real conversation.</h3>
              <p>
                <a href="tel:+16616256322">+1-661-625-6322</a>
                <br />
                <a href="mailto:theragurus@gmail.com">theragurus@gmail.com</a>
              </p>
            </div>
            <div>
              <h3>The clinic.</h3>
              <p>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(clinic.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  24355 Lyons Ave, Suite 130
                  <br />
                  Santa Clarita, CA 91321
                </a>
              </p>
              <p>
                {clinic.hours}
                <br />
                In person by appointment, and online when that fits better.
              </p>
            </div>
            <div>
              <h3>Wherever you are.</h3>
              <p>
                Ask about online options in India, Dubai, and Saudi Arabia.
                We’ll confirm availability and the right next step for your
                location.
              </p>
              <Link
                href="/locations"
                className="text-link"
                style={{ marginTop: 20 }}
              >
                Explore our locations
                <ArrowIcon diagonal={false} />
              </Link>
            </div>
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  );
}

export function LocationsPage({ slug }: { slug?: string }) {
  const city = locations.find((l) => l.slug === slug);
  const region = regions.find((r) => r.slug === slug);
  const title = slug
    ? `Care that connects with ${city?.name ?? region?.name ?? "Los Angeles"}.`
    : "Near you. Here for you.";
  return (
    <>
      {slug ? (
        <PageHero
          title={title}
          description={
            region?.description ??
            `Explore pelvic health and wellbeing support for ${city?.name ?? "Los Angeles"}. Contact us to confirm in-person or virtual options for your location.`
          }
          image="/footer-meadow.jpg"
        />
      ) : (
        <LocationGlobe />
      )}
      <section className="tg-section">
        <div className="tg-container">
          <SectionHeading
            title="Care starts with a conversation."
            description="We’ll discuss your goals, your location, and which care options are available. Reach out before planning an in-person visit."
          />
          <div className="feature-list region-cards">
            {regions.map((r) => (
              <article key={r.slug}>
                <h3>{r.name}</h3>
                <p>{r.description}</p>
                <Link
                  href={`/${r.slug}`}
                  className="text-link"
                  style={{ marginTop: 22 }}
                >
                  Explore care options
                  <ArrowIcon diagonal={false} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="tg-section location-explore-section">
        <div className="tg-container">
          <SectionHeading
            title="Find your care on the map."
            description="Choose an area or select a pin to explore your options."
          />
          <LocationMap key={slug || "locations"} initialSlug={slug} />
        </div>
      </section>
      <section className="tg-section conditions-section">
        <div className="tg-container">
          <SectionHeading
            title="Supporting greater Los Angeles & beyond."
            description="Explore our local service areas. Appointment setting and availability are confirmed when you contact us."
          />
          <div className="location-directory">
            {locations.map((l) => (
              <Link href={`/${l.slug}`} key={l.slug}>
                {l.name}
                <ArrowIcon />
              </Link>
            ))}
          </div>
        </div>
      </section>
      {slug && <OriginalContent slug={slug} />}
      <CareInvitation />
    </>
  );
}

export function JournalPage({ category = "all" }: { category?: string }) {
  return (
    <>
      <PageHero
        title="A little understanding. A lot of possibility."
        description="Explore pelvic health, thoughtful movement, and feeling better at work. Our journal brings together practical perspectives from TheraGurus."
        image="/mindful-wellness.jpg"
      >
        <ButtonLink href="/contact-us">Talk through your questions</ButtonLink>
      </PageHero>
      <section className="tg-section">
        <div className="tg-container">
          <JournalBrowser
            entries={articlePreviews}
            initialCategory={category}
          />
        </div>
      </section>
    </>
  );
}

export function ArticlePage({ article }: { article: Article }) {
  const related = articlePreviews
    .filter((a) => a.category === article.category && a.slug !== article.slug)
    .slice(0, 3);
  const body: ContentBlock[] = article.blocks.filter(
    (b, i) => !(i === 0 && b.type === "heading" && b.text === article.title),
  );
  return (
    <>
      <header className="article-header">
        <div className="tg-container">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <Link href="/blog">Journal</Link>
            <span>/</span>
            <span>
              {article.category === "workplace"
                ? "Workplace wellbeing"
                : "Pelvic health"}
            </span>
          </nav>
          <div className="article-meta">
            <span>
              {article.category === "workplace"
                ? "Workplace wellbeing"
                : "Pelvic health"}
            </span>
            <time dateTime={article.date}>
              {new Date(`${article.date}T12:00:00Z`).toLocaleDateString(
                "en-US",
                {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                },
              )}
            </time>
            <span>{article.minutes} min read</span>
          </div>
          <ReadingReveal as="h1" mode="enter" baseRotation={0}>{article.title}</ReadingReveal>
          <p className="article-byline">
            From the TheraGurus journal ·{" "}
            <Link href="/meet-the-owner">Meet our founder</Link>
          </p>
        </div>
      </header>
      <section className="tg-section">
        <div className="tg-container editorial-grid">
          <article className="editorial-copy">
            <TextBlocks blocks={body} reveal />
            <p style={{ marginTop: 40, fontSize: 12 }}>
              This article is for general education. Talk with a qualified
              healthcare professional about your own symptoms and care.
            </p>
          </article>
          <aside className="editorial-aside">
            <h3>
              A question
              <br />
              worth asking?
            </h3>
            <p>
              Let’s connect the information you’re reading with the questions
              that matter to you.
            </p>
            <ButtonLink href="/contact-us">Start a conversation</ButtonLink>
            <div style={{ marginTop: 24 }}>
              <Link href="/blog">Back to the journal</Link>
              <Link href="/our-services">Explore our services</Link>
            </div>
          </aside>
        </div>
      </section>
      <section className="tg-section conditions-section">
        <div className="tg-container">
          <SectionHeading title="A little more to explore." />
          <div className="journal-grid">
            {related.map((a, i) => (
              <JournalCard key={a.slug} article={a} index={i} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function InformationPage({ slug }: { slug: string }) {
  if (slug === "how-it-works")
    return (
      <>
        <PageHero
          title="Your pace. Your path. Your care."
          description="Getting started shouldn’t feel overwhelming. From your first conversation to your ongoing care, we’ll work through the next steps together."
          image="/hero-wellness.jpg"
        />
        <JourneySection steps={journey} />
        <CareInvitation />
      </>
    );
  if (slug === "reviews")
    return (
      <>
        <PageHero
          title="Stories of feeling supported."
          description="Every person’s experience is individual. Read what clients have shared about their time with TheraGurus."
          image="/footer-meadow.jpg"
        />
        <section className="tg-section stories-section">
          <div className="tg-container">
            <StoryCarousel />
          </div>
        </section>
        <CareInvitation />
      </>
    );
  return (
    <>
      <PageHero
        title="Questions are a good place to start."
        description="A little clarity can make the next step feel easier. Explore a few common questions, or reach out to talk about your own."
        image="/mindful-wellness.jpg"
      />
      <section className="tg-section">
        <div className="tg-container faq-grid">
          <div>
            <h2>
              We’re here
              <br />
              to help you feel at ease.
            </h2>
            <p style={{ marginTop: 24 }}>
              These answers offer a starting point. Your care, timing, and
              options are discussed individually with your provider.
            </p>
            <div className="button-row">
              <ButtonLink href="/contact-us">Ask us a question</ButtonLink>
            </div>
          </div>
          <FaqList />
        </div>
      </section>
    </>
  );
}

export function PortalPage({ slug }: { slug: string }) {
  return (
    <>
      <PageHero
        title={getPageTitle(slug)}
        description="Continue to TheraGurus’ existing secure service to manage your account or purchase. Your existing account and transaction are handled there."
        image="/footer-meadow.jpg"
      >
        <a
          className="tg-button tg-button--primary"
          href={`https://theragurus.com/${slug}/`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Continue to{" "}
          {slug === "shop"
            ? "the shop"
            : slug === "cart"
              ? "your cart"
              : slug === "checkout"
                ? "checkout"
                : "your account"}
          <span>
            <ArrowIcon />
          </span>
        </a>
      </PageHero>
      <CareInvitation />
    </>
  );
}

export function SiteMapPage() {
  const groups = [
    {
      title: "Get to know us",
      links: [
        { slug: "", title: "Home" },
        { slug: "about-us", title: "About TheraGurus" },
        { slug: "meet-the-owner", title: "Meet Trapti Agarwal" },
        { slug: "founders-message", title: "Founder’s message" },
        { slug: "contact-us", title: "Contact us" },
        { slug: "how-it-works", title: "How it works" },
        { slug: "faq", title: "FAQs" },
        { slug: "reviews", title: "Client stories" },
        { slug: "blog", title: "Journal" },
      ],
    },
    {
      title: "Care & wellbeing",
      links: careServices.map((s) => ({ slug: s.slug, title: s.title })),
    },
    {
      title: "How we can help",
      links: conditions.map((c) => ({ slug: c.slug, title: c.title })),
    },
    {
      title: "Our regions",
      links: regions.map((r) => ({ slug: r.slug, title: r.name })),
    },
    {
      title: "Local service areas",
      links: locations.map((l) => ({ slug: l.slug, title: l.name })),
    },
    {
      title: "From the journal",
      links: articles.map((a) => ({ slug: a.slug, title: a.title })),
    },
  ];
  return (
    <>
      <PageHero
        title="Find your way to a little more care."
        description="Explore every part of TheraGurus, from personalized services and local support to our complete health and wellbeing journal."
        image="/footer-meadow.jpg"
      />
      <section className="tg-section">
        <div className="tg-container sitemap-grid">
          {groups.map((g) => (
            <div key={g.title}>
              <h2>{g.title}</h2>
              <ul>
                {g.links.map((l) => (
                  <li key={l.slug}>
                    <Link href={`/${l.slug}`}>{l.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
