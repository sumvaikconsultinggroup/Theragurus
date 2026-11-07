import Link from "next/link";

const works = [
  { href: "/holistic-pelvic-floor-therapy", project: "Pelvic floor therapy", place: "Santa Clarita", type: "In person", year: "Now" },
  { href: "/premium-concierge-services", project: "Premium concierge care", place: "Santa Clarita", type: "Private", year: "Now" },
  { href: "/pelvic-yoga-classes", project: "Pelvic yoga classes", place: "Santa Clarita", type: "Group", year: "Now" },
  { href: "/pregnancy-and-postpartum-care", project: "Pregnancy & postpartum", place: "Santa Clarita", type: "In person", year: "Now" },
  { href: "/diastasis-recti", project: "Core & abdominal recovery", place: "Santa Clarita", type: "In person", year: "Now" },
  { href: "/virtual-consultations", project: "Online consultations", place: "Online", type: "Virtual", year: "Now" },
  { href: "/full-spectrum-corporate-wellness-solutions", project: "Corporate wellness", place: "Workplace", type: "On site", year: "Now" },
  { href: "/corporate-pelvic-health-extension", project: "Workplace pelvic health", place: "Workplace", type: "Program", year: "Now" },
] as const;

export function SelectedWork() {
  return (
    <section id="selected-work" className="selected-work" aria-labelledby="selected-work-title">
      <div className="tg-container">
        <h2 id="selected-work-title">Selected work</h2>
        <ol>
          <li className="selected-work-head" aria-hidden="true">
            <span>Project</span>
            <span>Place</span>
            <span>Type</span>
            <span>Year</span>
          </li>
          {works.map((work) => (
            <li key={work.href + work.project}>
              <Link href={work.href}>
                <span className="selected-work-name">{work.project}</span>
                <span className="selected-work-place">{work.place}</span>
                <span className="selected-work-type">{work.type}</span>
                <span className="selected-work-year">{work.year}</span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
