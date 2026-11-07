import Link from "next/link";
import { contentSections, findLegacy, getPageTitle } from "@/lib/content";
import { TextBlocks, ArrowIcon } from "./Ui";
import "./ContentGuide.css";
import { ReadingReveal } from "./ReadingReveal";

export function ContentGuide({ slug }: { slug: string }) {
  const page = findLegacy(slug);
  if (!page) return null;
  const sections = contentSections(page.blocks).filter(
    (s) => !/^book your free phone/i.test(s.title),
  );
  const chapters = sections.filter((s) => !s.disclosure);
  const disclosures = sections.filter((s) => s.disclosure);
  if (!sections.length) return null;
  const lengthOf = (paragraphs: { text: string }[]) =>
    paragraphs.reduce((total, block) => total + block.text.length, 0);
  const links = (
    <>
      {chapters.map((s, i) => (
        <a href={`#guide-${i}`} key={i}>
          {s.title}
        </a>
      ))}
      {disclosures.length > 0 && (
        <a href="#guide-questions">Details & common questions</a>
      )}
    </>
  );
  return (
    <section
      className="tg-section content-guide"
      aria-label={`${getPageTitle(slug)} guide`}
    >
      <div className="tg-container">
        <nav className="guide-topics" aria-label="In this guide">
          {links}
        </nav>
        <details className="guide-mobile-nav">
          <summary>
            In this guide <ArrowIcon diagonal={false} />
          </summary>
          <nav aria-label="Guide topics">{links}</nav>
        </details>
        <div className="guide-posts">
          {chapters.map((s, i) => {
            const feature =
              i === 0 ||
              lengthOf(s.paragraphs) > 480 ||
              s.paragraphs.length > 5;
            return (
              <article
                id={`guide-${i}`}
                className={feature ? "guide-post guide-post-feature" : "guide-post"}
                key={i}
              >
                <ReadingReveal as="h2">{s.title}</ReadingReveal>
                <TextBlocks blocks={s.paragraphs} reveal />
              </article>
            );
          })}
        </div>
        {disclosures.length > 0 && (
          <section id="guide-questions" className="guide-questions">
            <h2>Details & common questions.</h2>
            {disclosures.map((s, i) => (
              <details key={i}>
                <summary>
                  {s.title.replace(/^Q\d+[.:]?\s*/, "")}
                  <span aria-hidden="true" className="guide-plus" />
                </summary>
                <div>
                  <TextBlocks blocks={s.paragraphs} />
                </div>
              </details>
            ))}
          </section>
        )}
        <div className="guide-help">
          <p>Have a question about your care?</p>
          <Link href="/book" className="text-link">
            Start a conversation <ArrowIcon diagonal={false} />
          </Link>
        </div>
      </div>
    </section>
  );
}
