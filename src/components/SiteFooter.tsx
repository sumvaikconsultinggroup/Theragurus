import Image from "next/image";
import Link from "next/link";
import { Cormorant_Garamond, Poppins } from "next/font/google";
import type { ReactNode } from "react";
import "./SiteFooter.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-footer-sans",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-footer-serif",
  display: "swap",
});

function FooterIcon({ children }: { children: ReactNode }) {
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
      {children}
    </svg>
  );
}

const supportLinks = [
  { href: "/faq", label: "FAQ" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/our-services", label: "Care Options" },
  { href: "/meet-the-owner", label: "Meet Your Therapist" },
  { href: "tel:+16616256322", label: "Free Consultation" },
  { href: "/customer-cabinet", label: "Patient Portal" },
  { href: "/contact-us", label: "Contact us" },
];

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/about-us", label: "About TheraGurus" },
  { href: "/our-services", label: "Our Services" },
  { href: "/meet-the-owner", label: "Meet the Founder" },
  { href: "/reviews", label: "Client Reviews" },
  { href: "tel:+16616256322", label: "Book Appointment" },
];

export function SiteFooter() {
  return (
    <footer
      id="book"
      className={`site-footer ${poppins.variable} ${cormorant.variable}`}
    >
      <section
        className="site-footer__journey"
        aria-labelledby="footer-journey-title"
      >
        <div className="site-footer__landscape" aria-hidden="true">
          <Image
            src="/footer-meadow.jpg"
            alt=""
            fill
            sizes="100vw"
            className="site-footer__landscapeImage"
          />
          <div className="site-footer__landscapeShade" />
          <div className="site-footer__progressiveBlur">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="site-footer__landscapeFade" />
        </div>

        <div className="site-footer__journeyContent">
          <h2 id="footer-journey-title" className="site-footer__journeyTitle">
            <span>Start your journey to </span>
            <span>a healthier body.</span>
          </h2>
          <p className="site-footer__journeyDescription">
            You do not have to wait until leakage, pain, or recovery feels too
            heavy. Pelvic floor therapy and workplace wellness are here in
            person and online.
          </p>
          <div className="site-footer__actions">
            <a href="tel:+16616256322" className="site-footer__primaryAction">
              Book an Appointment
              <span className="site-footer__actionArrow">
                <FooterIcon>
                  <path d="M6 18 18 6M6 6h12v12" />
                </FooterIcon>
              </span>
            </a>
            <Link href="/our-services" className="site-footer__secondaryAction">
              View Our Services
            </Link>
          </div>
        </div>
      </section>

      <div className="site-footer__information">
        <div className="site-footer__columns">
          <div className="site-footer__brandColumn">
            <Link
              href="/"
              className="site-footer__brand"
              aria-label="TheraGurus home"
            >
              <span className="site-footer__brandMark" aria-hidden="true">
                <Image
                  src="/theragurus-logo.png"
                  alt=""
                  width={1489}
                  height={1056}
                  sizes="72px"
                  className="site-footer__brandLogo"
                />
              </span>
              <span className="site-footer__brandName">TheraGurus</span>
            </Link>
            <p className="site-footer__brandDescription">
              Pelvic floor therapy and corporate wellness for individuals, new
              parents, and workplaces. Personalized care to help you feel
              supported, in person and online.
            </p>
            <h3 className="site-footer__hoursHeading">Opening Hours:</h3>
            <p className="site-footer__hours">
              By appointment
              <br />
              In-person and virtual sessions
              <br />
              <a href="tel:+16616256322">Call to schedule your visit</a>
            </p>
          </div>

          <div className="site-footer__contactColumn">
            <h3 className="site-footer__columnHeading">Contact Us:</h3>
            <address className="site-footer__contactDetails">
              <a href="tel:+16616256322" className="site-footer__contactItem">
                <FooterIcon>
                  <rect x="6" y="2" width="12" height="20" rx="3" />
                  <path d="M11 18h2" />
                </FooterIcon>
                <span>+1-661-625-6322</span>
              </a>
              <a
                href="mailto:theragurus@gmail.com"
                className="site-footer__contactItem"
              >
                <FooterIcon>
                  <rect x="2" y="4" width="20" height="16" rx="5" />
                  <path d="m3 6 9 6 9-6" />
                </FooterIcon>
                <span>theragurus@gmail.com</span>
              </a>
              <div className="site-footer__contactItem">
                <FooterIcon>
                  <path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                  <path d="M7 22h10" />
                </FooterIcon>
                <span>
                  Santa Clarita &amp;
                  <br />
                  Greater Los Angeles
                  <br />
                  Virtual care worldwide
                </span>
              </div>
            </address>
          </div>

          <nav aria-label="Footer support">
            <h3 className="site-footer__columnHeading">Support:</h3>
            <ul className="site-footer__linkList">
              {supportLinks.map(({ href, label }) => (
                <li key={label}>
                  <Link href={href}>{label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Footer quick links">
            <h3 className="site-footer__columnHeading">Quick Links:</h3>
            <ul className="site-footer__linkList">
              {quickLinks.map(({ href, label }) => (
                <li key={label}>
                  <Link href={href}>{label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="site-footer__socialColumn">
            <h3 className="site-footer__columnHeading">Follow Us on</h3>
            <div className="site-footer__socialLinks">
              <a
                href="https://www.instagram.com/thera_gurus/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TheraGurus on Instagram (opens in a new tab)"
              >
                <FooterIcon>
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <path d="M17.5 6.5h.01" />
                </FooterIcon>
              </a>
            </div>
          </div>
        </div>

        <p className="site-footer__copyright">
          © {new Date().getFullYear()} TheraGurus. All rights reserved.
          <Link href="/sitemap" className="site-footer__sitemap">
            Site map
          </Link>
        </p>
      </div>
    </footer>
  );
}
