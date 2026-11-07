import imported from "@/data/legacy-content.json";

export type ContentBlock = { type: string; text: string };
export type LegacyPage = {
  slug: string;
  title: string;
  source: string;
  blocks: ContentBlock[];
};
export type Article = LegacyPage & {
  category: "pelvic" | "workplace";
  date: string;
  excerpt: string;
  minutes: number;
};
export type ArticlePreview = Omit<Article, "blocks" | "source">;
export const legacyPages = imported.pages as LegacyPage[];
export const articles = imported.articles as Article[];
export const articlePreviews: ArticlePreview[] = articles.map((entry) => ({
  slug: entry.slug,
  title: entry.title,
  category: entry.category,
  date: entry.date,
  excerpt: entry.excerpt,
  minutes: entry.minutes,
}));

export const careServices = [
  {
    slug: "holistic-pelvic-floor-therapy",
    title: "Pelvic floor therapy",
    description:
      "Personal care for the parts of your health that deserve more attention.",
    image: "/movement-wellness.jpg",
    audience: "personal",
    features: [
      "Bladder and bowel concerns",
      "Pelvic pain and muscle coordination",
      "Pregnancy and postpartum support",
      "Core strength and everyday movement",
    ],
    intro:
      "Your symptoms are part of a bigger story. We take time to understand your pelvic health, movement, breath, and daily life, then work with you on a plan that fits your needs.",
  },
  {
    slug: "premium-concierge-services",
    title: "Premium concierge care",
    description:
      "Unhurried, one-to-one support, with care that fits around your life.",
    image: "/mindful-wellness.jpg",
    audience: "personal",
    features: [
      "Private, personalized sessions",
      "Postpartum recovery programs",
      "Breathwork and movement guidance",
      "Home and studio options by arrangement",
    ],
    intro:
      "A more personal way to begin feeling at home in your body. Our concierge services bring focused pelvic wellness support, ongoing guidance, and flexible appointments together in one thoughtful care experience.",
  },
  {
    slug: "pelvic-yoga-classes",
    title: "Pelvic yoga classes",
    description:
      "Gentle movement, thoughtful breathwork, and a community that understands.",
    image: "/hero-wellness.jpg",
    audience: "personal",
    features: [
      "Founder-led group sessions",
      "Pelvic-aware movement",
      "Breath and body awareness",
      "A welcoming, supportive setting",
    ],
    intro:
      "Move with care, at your own pace. Led by Trapti Agarwal, our group classes bring pelvic-aware yoga and breathwork together, helping you build a more comfortable connection with your body.",
  },
  {
    slug: "full-spectrum-corporate-wellness-solutions",
    title: "Corporate wellness",
    description:
      "Healthier workdays start with looking after the whole person.",
    image: "/workplace-wellness.jpg",
    audience: "workplace",
    features: [
      "Ergonomic assessments and posture",
      "Mindfulness and stress management",
      "Movement and wellbeing workshops",
      "On-site, virtual, and hybrid delivery",
    ],
    intro:
      "Your people bring their whole selves to work. Our customized programs support physical, mental, and emotional wellbeing through practical workshops, movement, ergonomics, and ongoing wellness partnerships.",
  },
  {
    slug: "corporate-pelvic-health-extension",
    title: "Workplace pelvic health",
    description:
      "Make room for the conversations and support your people need.",
    image: "/mindful-wellness.jpg",
    audience: "workplace",
    features: [
      "Pelvic health education",
      "Postpartum return-to-work support",
      "Inclusive wellbeing workshops",
      "Breath, posture, and mobility programs",
    ],
    intro:
      "Pelvic health belongs in workplace wellbeing. We help organizations support employees through education, practical movement sessions, and thoughtful postpartum return-to-work programs.",
  },
  {
    slug: "virtual-consultations",
    title: "Online consultations",
    description:
      "A thoughtful connection to care, wherever your day takes you.",
    image: "/footer-meadow.jpg",
    audience: "personal",
    features: [
      "A free first phone conversation",
      "One-to-one virtual guidance",
      "Movement and home-program support",
      "Availability confirmed for your location",
    ],
    intro:
      "Distance should not stop a conversation about your wellbeing. Connect with TheraGurus to discuss virtual care, your goals, and the options available where you live.",
  },
] as const;

export const conditions = [
  {
    slug: "urinary-incontinence",
    title: "Bladder leaks & urgency",
    description:
      "When laughing, sneezing, or exercising brings an unwelcome worry.",
    detail:
      "Talk with us about leakage, urgency, and the way bladder symptoms affect your daily life. Your care begins with understanding your symptoms and the support that may be appropriate for you.",
  },
  {
    slug: "anxious-about-your-pelvic-pain",
    title: "Pelvic pain",
    description:
      "Support for discomfort that deserves to be heard and understood.",
    detail:
      "Pelvic pain can affect movement, work, and the way you feel in your body. We take a whole-person approach to understanding your experience and planning your care.",
  },
  {
    slug: "pregnancy-and-postpartum-care",
    title: "Pregnancy & postpartum",
    description: "Care for your changing body, before and after birth.",
    detail:
      "Pregnancy and postpartum care can include education, movement, breath awareness, and support for pelvic and core function. We tailor each conversation and session to your stage of recovery.",
  },
  {
    slug: "pelvic-organ-prolapse",
    title: "Pelvic heaviness & prolapse",
    description:
      "A supportive space to discuss pressure, heaviness, and your next steps.",
    detail:
      "If pelvic heaviness or pressure is affecting your comfort, an assessment can help you understand your options. We work with your goals and coordinate with other healthcare professionals when needed.",
  },
  {
    slug: "anxious-during-intimacy",
    title: "Pain during intimacy",
    description: "Private, compassionate care that starts by listening.",
    detail:
      "Pain or anxiety during intimacy can be difficult to talk about. Your comfort and consent guide the conversation, with care focused on understanding what you are experiencing.",
  },
  {
    slug: "diastasis-recti",
    title: "Core weakness & diastasis",
    description: "Reconnect with your core and the movement of everyday life.",
    detail:
      "Core and abdominal changes can affect confidence in movement. We help you explore your symptoms, breathing, posture, and individual goals for recovery.",
  },
  {
    slug: "bladder-never-fully-empties",
    title: "Bladder emptying concerns",
    description:
      "Make space to talk about the symptoms that interrupt your day.",
    detail:
      "Discuss changes in bladder habits with a qualified healthcare professional. We can talk through pelvic floor care and the assessment or referral that may be suitable for you.",
  },
  {
    slug: "workplace-ergonomics",
    title: "Workplace aches & posture",
    description:
      "Feel more comfortable at your desk and throughout your workday.",
    detail:
      "A better fit between your body and your workspace can support your workday. Our ergonomic approach considers your workstation, movement habits, and the demands of your role.",
  },
] as const;

export const locations = legacyPages
  .filter(
    (p) =>
      /^(pelvic-floor-(therapy|therapists|pain))/.test(p.slug) &&
      p.slug !== "pelvic-floor-therapy-in-los-angeles",
  )
  .map((p) => ({
    slug: p.slug,
    name: p.title
      .replace(
        /^Pelvic floor (?:therapy services|therapy service|therapy|therapists|pain treatment) in /i,
        "",
      )
      .replace(/\b\w/g, (c) => c.toUpperCase()),
  }));
export const regions = [
  {
    slug: "pelvic-floor-therapists-in-los-angeles",
    name: "United States",
    description:
      "Personalized care in Santa Clarita and the greater Los Angeles area, with virtual options by arrangement.",
  },
  {
    slug: "india",
    name: "India",
    description:
      "Connect with us to discuss online pelvic wellness guidance and corporate wellbeing programs.",
  },
  {
    slug: "dubai",
    name: "Dubai",
    description:
      "Start a conversation about virtual care and wellbeing support that works around your day.",
  },
  {
    slug: "saudi-arabia",
    name: "Saudi Arabia",
    description:
      "Explore online consultations and workplace wellness support, with availability confirmed when you contact us.",
  },
];

export const journey = [
  {
    title: "Start with a conversation.",
    text: "Tell us what is on your mind in a free phone consultation. There is no need to have all the answers before you call.",
  },
  {
    title: "Find the right fit.",
    text: "Together, we discuss your goals and whether in-person care, a virtual session, a group class, or a workplace program fits your needs.",
  },
  {
    title: "Make a plan, together.",
    text: "Your care is personal. We take time to understand your experience and build a plan around your body, routine, and priorities.",
  },
  {
    title: "Bring care into everyday life.",
    text: "Build understanding, practice what you learn, and stay connected as your goals and needs evolve.",
  },
];

export const portalSlugs = [
  "my-account",
  "customer-cabinet",
  "shop",
  "cart",
  "checkout",
];
export const extraSlugs = [
  "how-it-works",
  "faq",
  "reviews",
  "conditions",
  "india",
  "dubai",
  "sitemap",
  "contact",
  "virtual-consultations",
  ...conditions.map((c) => c.slug),
  ...portalSlugs,
];
export const routePaths = Array.from(
  new Set([
    ...legacyPages.map((p) => p.slug),
    ...articles.map((p) => p.slug),
    ...extraSlugs,
    "blog/pelvic-floor-therapy",
    "blog/corporate-wellness-solutions",
  ]),
);

export function findLegacy(slug: string) {
  return legacyPages.find((p) => p.slug === slug);
}
export function findArticle(slug: string) {
  return articles.find((p) => p.slug === slug);
}
export function getPageTitle(slug: string) {
  return (
    careServices.find((p) => p.slug === slug)?.title ??
    conditions.find((p) => p.slug === slug)?.title ??
    regions.find((p) => p.slug === slug)?.name ??
    findArticle(slug)?.title ??
    findLegacy(slug)?.title ??
    (
      {
        "how-it-works": "Your care journey",
        "blog/pelvic-floor-therapy": "Pelvic health journal",
        "blog/corporate-wellness-solutions": "Workplace wellbeing journal",
        faq: "Frequently asked questions",
        reviews: "Client stories",
        conditions: "How we can help",
        sitemap: "Explore TheraGurus",
        "my-account": "Your patient account",
        "customer-cabinet": "Patient portal",
        shop: "TheraGurus shop",
        cart: "Your cart",
        checkout: "Secure checkout",
      } as Record<string, string>
    )[slug] ??
    "TheraGurus"
  );
}

export function contentSections(blocks: ContentBlock[]) {
  const sections: {
    title: string;
    paragraphs: ContentBlock[];
    disclosure: boolean;
  }[] = [];
  for (const block of blocks) {
    if (block.type === "heading" || block.type === "question") {
      const previous = sections.at(-1);
      if (previous && !previous.paragraphs.length && /^\(/.test(block.text)) {
        previous.title = `${previous.title} ${block.text}`;
        continue;
      }
      sections.push({
        title: block.text,
        paragraphs: [],
        disclosure:
          block.type === "question" || /^Q\d+[.:]?\s/i.test(block.text),
      });
    } else {
      if (!sections.length)
        sections.push({
          title: "A little more understanding.",
          paragraphs: [],
          disclosure: false,
        });
      sections[sections.length - 1].paragraphs.push(block);
    }
  }
  return sections.filter(
    (s) => s.paragraphs.length && s.paragraphs.some((p) => p.text.length > 25),
  );
}
