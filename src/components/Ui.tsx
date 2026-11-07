import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { ArticlePreview, ContentBlock } from "@/lib/content";
import { SiteFade } from "@/components/SiteFade";
import { ResponsivePhoto } from "@/components/ResponsivePhoto";
import { ReadingReveal } from "@/components/ReadingReveal";

export function ArrowIcon({ diagonal = true }: { diagonal?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {diagonal ? (
        <path d="m6 18 12-12M6 6h12v12" />
      ) : (
        <path d="M4 12h16m-6-6 6 6-6 6" />
      )}
    </svg>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "outline" | "light";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`tg-button tg-button--${variant} ${className}`}
    >
      {children}
      <span>
        <ArrowIcon />
      </span>
    </Link>
  );
}

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`tg-brand ${light ? "tg-brand--light" : ""}`}
      aria-label="TheraGurus home"
    >
      <span className="tg-brand-mark">
        <Image
          src="/theragurus-logo.png"
          alt=""
          width={1489}
          height={1056}
          sizes="76px"
        />
      </span>
      <span>
        Thera<span>Gurus</span>
      </span>
    </Link>
  );
}

function PageHeroCopy({ animated, children }: { animated: boolean; children: ReactNode }) {
  return animated ? <div>{children}</div> : <SiteFade trigger="mount">{children}</SiteFade>;
}

export function PageHero({
  title,
  description,
  image = "/movement-wellness.jpg",
  imageAlt = "A peaceful moment of movement and wellbeing",
  animateTitle = false,
  children,
}: {
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
  animateTitle?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className="page-hero">
      <div className="tg-container page-hero-grid">
        <PageHeroCopy animated={animateTitle}>
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span>{title}</span>
          </nav>
          {animateTitle ? <ReadingReveal as="h1" mode="enter" baseRotation={0}>{title}</ReadingReveal> : <h1>{title}</h1>}
          <p className="page-intro">{description}</p>
          <div className="button-row">
            {children ?? (
              <ButtonLink href="/book">Let’s talk about your care</ButtonLink>
            )}
          </div>
        </PageHeroCopy>
        <div className="page-hero-image">
          <ResponsivePhoto
            src={image}
            alt={imageAlt}
            fill
            sizes="(min-width: 900px) 45vw, 100vw"
            loading="eager"
          />
          <span className="image-caption">
            A little care. A little more you.
          </span>
        </div>
      </div>
    </section>
  );
}

export function SectionHeading({
  title,
  description,
  centered = true,
}: {
  title: ReactNode;
  description?: string;
  centered?: boolean;
}) {
  return (
    <SiteFade
      className={`section-heading ${centered ? "section-heading--center" : ""}`}
    >
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </SiteFade>
  );
}

export function JournalCard({
  article,
  index = 0,
}: {
  article: ArticlePreview;
  index?: number;
}) {
  const image =
    article.category === "workplace"
      ? "/workplace-wellness.jpg"
      : index % 2
        ? "/mindful-wellness.jpg"
        : "/movement-wellness.jpg";
  return (
    <article className="journal-card">
      <Link
        href={`/${article.slug}`}
        className="journal-image"
        tabIndex={-1}
        aria-hidden="true"
      >
        <ResponsivePhoto
          src={image}
          alt=""
          fill
          sizes="(min-width: 1000px) 30vw, (min-width: 600px) 50vw, 100vw"
        />
      </Link>
      <SiteFade className="journal-card-content">
        <div className="article-meta">
          <span>
            {article.category === "workplace"
              ? "Workplace wellbeing"
              : "Pelvic health"}
          </span>
          <span>{article.minutes} min read</span>
        </div>
        <h3>
          <Link href={`/${article.slug}`}>{article.title}</Link>
        </h3>
        <p>{article.excerpt}</p>
        <Link className="text-link" href={`/${article.slug}`}>
          Read the article
          <ArrowIcon diagonal={false} />
        </Link>
      </SiteFade>
    </article>
  );
}

export function TextBlocks({ blocks, reveal = false }: { blocks: ContentBlock[]; reveal?: boolean }) {
  const groups: ContentBlock[][] = [];
  for (const block of blocks) {
    if (block.type === "list" && groups.at(-1)?.[0].type === "list")
      groups.at(-1)!.push(block);
    else groups.push([block]);
  }
  return (
    <>
      {groups.map((group, i) => {
        const b = group[0];
        return b.type === "heading" ? (
          reveal ? <ReadingReveal key={i} as="h2" id={`section-${i}`}>{b.text}</ReadingReveal> : <h2 key={i} id={`section-${i}`}>
            {b.text}
          </h2>
        ) : b.type === "list" ? (
          <ul key={i}>
            {group.map((item, j) => (
              <li key={j}>{item.text}</li>
            ))}
          </ul>
        ) : b.type === "quote" ? (
          reveal ? <ReadingReveal key={i} as="blockquote">{b.text}</ReadingReveal> : <blockquote key={i}>{b.text}</blockquote>
        ) : (
          reveal && b.text.length > 50 ? <ReadingReveal key={i} as="p">{b.text}</ReadingReveal> : <p key={i}>{b.text}</p>
        );
      })}
    </>
  );
}

export function CareInvitation() {
  return (
    <section className="tg-section">
      <div className="tg-container">
        <div className="care-invitation">
          <SiteFade>
            <h2>
              You don’t have to figure
              <br />
              it all out alone.
            </h2>
            <p>
              A free phone conversation is a good place to start. Tell us what
              you need, ask your questions, and explore the next step together.
            </p>
          </SiteFade>
          <ButtonLink href="/book?service=free-consultation" variant="light">
            Book a free consultation
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
