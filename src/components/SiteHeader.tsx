"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { ArrowIcon, Brand } from "@/components/Ui";
import GooeyNav from "./GooeyNav";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/about-us", label: "About us" },
  { href: "/our-services", label: "Services" },
  { href: "/locations", label: "Locations" },
  { href: "/blog", label: "Journal" },
  { href: "/contact-us", label: "Contact" },
  { href: "/account", label: "My bookings" },
];
const serviceNavigation = [
  {
    href: "/holistic-pelvic-floor-therapy",
    label: "Pelvic floor therapy",
    detail: "Personalized, whole-person care",
  },
  {
    href: "/premium-concierge-services",
    label: "Premium concierge care",
    detail: "Support that fits around your life",
  },
  {
    href: "/pelvic-yoga-classes",
    label: "Pelvic yoga classes",
    detail: "Mindful movement, together",
  },
  {
    href: "/full-spectrum-corporate-wellness-solutions",
    label: "Corporate wellness",
    detail: "A healthier way to work",
  },
  {
    href: "/corporate-pelvic-health-extension",
    label: "Workplace pelvic health",
    detail: "Support beyond the everyday",
  },
  {
    href: "/virtual-consultations",
    label: "Online consultations",
    detail: "Start a conversation from home",
  },
];

export function SiteHeader({ journalSlugs = [] }: { journalSlugs?: string[] }) {
  const pathname = usePathname();
  const root = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState<"mobile" | "services" | null>(null);
  const reduced = useReducedMotion();
  const locationSection =
    ["/india", "/dubai", "/saudi-arabia"].includes(pathname) ||
    /^\/pelvic-floor-(?:therapy(?:-services?)?|therapists|pain-treatment)-in-/.test(
      pathname,
    );
  const journalSection = pathname === "/blog" || pathname.startsWith("/category/") || journalSlugs.includes(pathname.slice(1));
  const currentHref = journalSection ? "/blog" : serviceNavigation.some((item) => item.href === pathname)
    ? "/our-services"
    : locationSection
      ? "/locations"
      : pathname === "/contact" ||
          pathname === "/contact-us" ||
          pathname === "/speak-with-a-provider"
        ? "/contact-us"
        : pathname.startsWith("/booking/")
          ? "/account"
          : pathname;
  useEffect(() => {
    const scroll = () =>
      setScrolled((compact) => window.scrollY > (compact ? 48 : 96));
    scroll();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  useEffect(() => {
    if (!menu) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(null);
        root.current
          ?.querySelector<HTMLButtonElement>(
            `[aria-controls="${menu}-navigation"]`,
          )
          ?.focus();
      }
    };
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", outside);
    };
  }, [menu]);
  return (
    <header
      ref={root}
      className={`site-header ${scrolled ? "site-header--scrolled" : ""}`}
    >
      <div className="site-header-bar">
        <Brand />
        <GooeyNav
          className="desktop-navigation gooey-main-navigation"
          items={navigation.map((item) => item.label === "Services" ? {
            label: item.label,
            expanded: menu === "services",
            controls: "services-navigation",
            icon: <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>,
          } : item)}
          activeIndex={navigation.findIndex((item) => item.href === (menu === "services" ? "/our-services" : currentHref))}
          onChange={(_, item) => setMenu(item.label === "Services" ? menu === "services" ? null : "services" : null)}
          theme="light" frame={false} color="#d7edb0" activeTextColor="#2e4856"
          colors={["#d7edb0", "#c8e995"]} contrastOverlay={false}
          particleCount={12} spread={22} animationTime={650} timeVariance={160} gooeyness={0.45} wobble={0.3}
          style={{ "--gn-ink": "#2e4856", "--gn-muted": "#2e4856", "--gn-font": "13px", "--gn-x": "14px", "--gn-y": "12px", "--gn-gap": "2px" }}
        />
        <div className="header-actions">
          <Link
            href="/book"
            className="header-book"
            onClick={() => setMenu(null)}
          >
            <span>Let’s talk</span>
            <span className="header-book-long">Book a consultation</span>
            <span className="header-book-arrow">
              <ArrowIcon />
            </span>
          </Link>
          <button
            className="header-menu-button"
            type="button"
            aria-label={
              menu === "mobile" ? "Close navigation" : "Open navigation"
            }
            aria-expanded={menu === "mobile"}
            aria-controls="mobile-navigation"
            onClick={() => setMenu(menu === "mobile" ? null : "mobile")}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              {menu === "mobile" ? (
                <path d="m6 6 12 12M6 18 18 6" />
              ) : (
                <path d="M4 8h16M4 16h16" />
              )}
            </svg>
          </button>
        </div>
      </div>
      <AnimatePresence>
        {menu && (
          <motion.nav
            id={`${menu}-navigation`}
            aria-label={
              menu === "mobile" ? "Mobile navigation" : "Our services"
            }
            className={`header-dropdown header-dropdown--${menu}`}
            initial={{ opacity: 0, y: reduced ? 0 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : -6 }}
            transition={{ duration: 0.18 }}
          >
            {menu === "mobile" && (
              <div className="mobile-primary-links">
                {navigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={pathname === item.href ? "page" : undefined}
                    onClick={() => setMenu(null)}
                  >
                    {item.label}
                    <ArrowIcon diagonal={false} />
                  </Link>
                ))}
              </div>
            )}
            <div className="dropdown-services">
              {serviceNavigation.map((item) => (
                <Link
                  href={item.href}
                  key={item.href}
                  onClick={() => setMenu(null)}
                >
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </span>
                  <ArrowIcon />
                </Link>
              ))}
            </div>
            <div className="dropdown-footer">
              <Link href="/conditions" onClick={() => setMenu(null)}>
                Find support for your symptoms
              </Link>
              <Link href="/meet-the-owner" onClick={() => setMenu(null)}>
                Meet Trapti Agarwal
              </Link>
              <a href="tel:+16616256322">Call +1-661-625-6322</a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
