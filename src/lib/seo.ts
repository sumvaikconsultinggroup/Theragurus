import { clinic } from "@/lib/booking-catalog";
import {
  articles,
  careServices,
  conditions,
  findArticle,
  getPageTitle,
  locations,
  portalSlugs,
  regions,
} from "@/lib/content";
import { faqs } from "@/lib/faqs";

export const siteUrl = "https://theragurus.com";

export const ids = {
  clinic: `${siteUrl}/#clinic`,
  founder: `${siteUrl}/#trapti-agarwal`,
  website: `${siteUrl}/#website`,
  logo: `${siteUrl}/theragurus-logo.png`,
};

const privatePaths = new Set([
  ...portalSlugs,
  "contact",
  "pelvic-floor-therapy-in-los-angeles",
]);

export function absoluteUrl(path = "/") {
  if (path === "/") return `${siteUrl}/`;
  return `${siteUrl}/${path.replace(/^\/+|\/+$/g, "")}`;
}

export function isIndexablePath(path: string) {
  return !privatePaths.has(path);
}

export function pageDescription(path: string) {
  const article = findArticle(path);
  if (article) return clip(article.excerpt);
  const service = careServices.find((item) => item.slug === path);
  if (service) return clip(service.intro);
  const condition = conditions.find((item) => item.slug === path);
  if (condition) return clip(condition.detail);
  const region = regions.find((item) => item.slug === path);
  if (region) return clip(region.description);
  const place = locations.find((item) => item.slug === path);
  if (place) return clip(`${place.name}. Pelvic health care with TheraGurus, in person in Santa Clarita and online by arrangement.`);
  const known: Record<string, string> = {
    "about-us":
      "TheraGurus offers personalized pelvic floor therapy and workplace wellness with Trapti Agarwal, OTR/L, in Santa Clarita and online.",
    "contact-us":
      "Contact TheraGurus in Santa Clarita. Call +1-661-625-6322 or send a note. Visits are by appointment, in person and online.",
    "speak-with-a-provider":
      "Speak with a TheraGurus provider about pelvic health, movement, pregnancy, postpartum, or workplace wellbeing.",
    "meet-the-owner":
      "Meet Trapti Agarwal, OTR/L, founder of TheraGurus and pelvic health occupational therapist in Santa Clarita.",
    "founders-message":
      "A note from Trapti Agarwal, founder of TheraGurus, on pelvic health, listening, and care that fits your life.",
    faq: "Answers to common questions about pelvic floor therapy, visits, referrals, and what to expect at TheraGurus.",
    "how-it-works":
      "See how care at TheraGurus begins: a conversation, the right fit, a personal plan, and support you can use every day.",
    reviews: "Client stories about pelvic health care, postpartum recovery, and working with TheraGurus.",
    conditions: "Pelvic health concerns TheraGurus can talk through with you, from bladder leaks to pregnancy and pelvic pain.",
    locations:
      "TheraGurus is based in Santa Clarita, with online care conversations for Los Angeles, India, Dubai, and Saudi Arabia.",
    "our-services":
      "Pelvic floor therapy, concierge care, pelvic yoga, online consultations, and workplace wellness from TheraGurus.",
    "what-we-offer":
      "Explore TheraGurus care for individuals and workplaces, in the Santa Clarita clinic and online.",
    blog: "The TheraGurus journal: pelvic health, movement, pregnancy, postpartum, and workplace wellbeing.",
    sitemap: "Find pages across the TheraGurus site, from care options to locations and the journal.",
  };
  return known[path] ?? clip(`Explore ${getPageTitle(path)} with TheraGurus. Personalized pelvic health, movement, and workplace wellbeing.`);
}

function clip(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 160) return clean;
  const cut = clean.slice(0, 157);
  const last = cut.lastIndexOf(" ");
  return `${cut.slice(0, last > 80 ? last : 157)}…`;
}

const address = {
  "@type": "PostalAddress",
  streetAddress: "24355 Lyons Ave, Suite 130",
  addressLocality: "Santa Clarita",
  addressRegion: "CA",
  postalCode: "91321",
  addressCountry: "US",
};

const geo = {
  "@type": "GeoCoordinates",
  latitude: 34.3784254,
  longitude: -118.5605372,
};

const areaServed = [
  { "@type": "City", name: "Santa Clarita" },
  { "@type": "City", name: "Los Angeles" },
  { "@type": "Country", name: "India" },
  { "@type": "City", name: "Dubai" },
  { "@type": "Country", name: "Saudi Arabia" },
];

export function siteGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MedicalClinic",
        "@id": ids.clinic,
        name: clinic.name,
        url: `${siteUrl}/`,
        image: `${siteUrl}/hero-wellness.jpg`,
        logo: {
          "@type": "ImageObject",
          url: ids.logo,
        },
        description:
          "Personalized pelvic floor therapy and workplace wellness with Trapti Agarwal, OTR/L, in Santa Clarita, California, and online by arrangement.",
        telephone: clinic.phone,
        email: clinic.email,
        paymentAccepted: "Cash",
        currenciesAccepted: "USD",
        address,
        geo,
        hasMap: `https://maps.google.com/?q=${encodeURIComponent(clinic.address)}`,
        areaServed,
        knowsAbout: [
          "Pelvic floor therapy",
          "Pregnancy and postpartum care",
          "Workplace wellness",
        ],
        founder: { "@id": ids.founder },
        employee: { "@id": ids.founder },
        sameAs: ["https://www.instagram.com/thera_gurus/"],
        contactPoint: {
          "@type": "ContactPoint",
          telephone: clinic.phone,
          email: clinic.email,
          contactType: "customer service",
          areaServed: "US",
          availableLanguage: "English",
        },
      },
      {
        "@type": "Person",
        "@id": ids.founder,
        name: "Trapti Agarwal",
        honorificSuffix: "OTR/L",
        jobTitle: "Pelvic health occupational therapist",
        url: `${siteUrl}/meet-the-owner`,
        worksFor: { "@id": ids.clinic },
        sameAs: ["https://www.instagram.com/thera_gurus/"],
      },
      {
        "@type": "WebSite",
        "@id": ids.website,
        url: `${siteUrl}/`,
        name: clinic.name,
        description:
          "Pelvic floor therapy and workplace wellness in Santa Clarita and online.",
        publisher: { "@id": ids.clinic },
        inLanguage: "en-US",
      },
    ],
  };
}

function crumb(path: string, name: string) {
  const items = [
    { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
  ];
  if (path.startsWith("blog/") && path !== "blog") {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: "Journal",
      item: `${siteUrl}/blog`,
    });
    items.push({
      "@type": "ListItem",
      position: 3,
      name,
      item: absoluteUrl(path),
    });
  } else if (path) {
    items.push({
      "@type": "ListItem",
      position: 2,
      name,
      item: absoluteUrl(path),
    });
  }
  return { "@type": "BreadcrumbList", itemListElement: items };
}

export function pageGraph(path: string) {
  const title = path === "blog" ? "The TheraGurus journal" : getPageTitle(path);
  const url = absoluteUrl(path || "/");
  const description = pageDescription(path);
  const graph: Record<string, unknown>[] = [crumb(path, title)];
  const article = findArticle(path);
  const service = careServices.find((item) => item.slug === path);

  if (!path) {
    graph.push({
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: "TheraGurus — Pelvic Health & Workplace Wellness",
      description,
      isPartOf: { "@id": ids.website },
      about: { "@id": ids.clinic },
      primaryImageOfPage: `${siteUrl}/hero-wellness.jpg`,
      inLanguage: "en-US",
    });
  } else if (article) {
    graph.push({
      "@type": "BlogPosting",
      "@id": `${url}#article`,
      headline: article.title,
      description: article.excerpt,
      datePublished: article.date,
      dateModified: article.date,
      author: { "@id": ids.founder },
      publisher: { "@id": ids.clinic },
      mainEntityOfPage: url,
      image: `${siteUrl}/hero-wellness.jpg`,
      url,
      inLanguage: "en-US",
    });
  } else if (service) {
    graph.push({
      "@type": "Service",
      "@id": `${url}#service`,
      name: service.title,
      description: service.intro,
      url,
      provider: { "@id": ids.clinic },
      areaServed,
      serviceType: service.title,
    });
  } else if (path === "contact-us" || path === "speak-with-a-provider") {
    graph.push({
      "@type": "ContactPage",
      "@id": `${url}#webpage`,
      url,
      name: title,
      description,
      about: { "@id": ids.clinic },
      mainEntity: { "@id": ids.clinic },
    });
  } else if (path === "meet-the-owner" || path === "founders-message") {
    graph.push({
      "@type": "ProfilePage",
      "@id": `${url}#webpage`,
      url,
      name: title,
      description,
      mainEntity: { "@id": ids.founder },
    });
  } else if (path === "faq") {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      url,
      name: title,
      description,
      isPartOf: { "@id": ids.website },
      mainEntity: faqs.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    });
  } else {
    graph.push({
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: title,
      description,
      isPartOf: { "@id": ids.website },
      about: { "@id": ids.clinic },
      inLanguage: "en-US",
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

export function articleLastModified(path: string) {
  return articles.find((item) => item.slug === path)?.date;
}
