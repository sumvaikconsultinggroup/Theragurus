import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  AboutPage,
  ArticlePage,
  ConditionsPage,
  ContactPage,
  FounderPage,
  InformationPage,
  JournalPage,
  LocationsPage,
  PortalPage,
  ServiceDetailPage,
  ServicesPage,
  SiteMapPage,
} from "@/components/ContentPages";
import { JsonLd } from "@/components/JsonLd";
import {
  careServices,
  conditions,
  findArticle,
  getPageTitle,
  locations,
  portalSlugs,
  routePaths,
} from "@/lib/content";
import { absoluteUrl, pageDescription, pageGraph } from "@/lib/seo";

export const dynamicParams = false;

function normalizedPath(segments: string[]) {
  return segments
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join("/");
}
export function generateStaticParams() {
  return routePaths.map((path) => ({ slug: path.split("/") }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const path = normalizedPath(slug);
  const article = findArticle(path);
  const title = path === "blog" ? "The TheraGurus journal" : getPageTitle(path);
  const description = pageDescription(path);
  const url = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical: `/${path}` },
    robots: portalSlugs.includes(path)
      ? { index: false, follow: true }
      : undefined,
    openGraph: {
      title,
      description,
      url,
      type: article ? "article" : "website",
      publishedTime: article?.date,
      modifiedTime: article?.date,
      images: ["https://theragurus.com/hero-wellness.jpg"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://theragurus.com/hero-wellness.jpg"],
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const path = normalizedPath(slug);
  if (!routePaths.includes(path)) notFound();
  if (["my-account", "customer-cabinet"].includes(path)) redirect("/account");
  if (path === "checkout") redirect("/book");
  if (path === "contact") redirect("/contact-us");
  if (path === "pelvic-floor-therapy-in-los-angeles")
    redirect("/pelvic-floor-therapists-in-los-angeles");

  const page = pageFor(path);
  if (!page) notFound();
  return (
    <>
      <JsonLd data={pageGraph(path)} />
      {page}
    </>
  );
}

function pageFor(path: string) {
  if (path === "blog") return <JournalPage />;
  if (path === "blog/pelvic-floor-therapy")
    return <JournalPage category="pelvic" />;
  if (path === "blog/corporate-wellness-solutions")
    return <JournalPage category="workplace" />;
  const article = findArticle(path);
  if (article) return <ArticlePage article={article} />;
  if (path === "our-services" || path === "what-we-offer")
    return <ServicesPage slug={path} />;
  if (careServices.some((s) => s.slug === path))
    return <ServiceDetailPage slug={path} />;
  if (path === "about-us") return <AboutPage />;
  if (path === "meet-the-owner" || path === "founders-message")
    return <FounderPage message={path === "founders-message"} />;
  if (path === "contact-us" || path === "speak-with-a-provider")
    return <ContactPage />;
  if (path === "conditions" || conditions.some((c) => c.slug === path))
    return <ConditionsPage slug={path === "conditions" ? undefined : path} />;
  if (
    path === "locations" ||
    ["india", "dubai", "saudi-arabia"].includes(path) ||
    locations.some((l) => l.slug === path)
  )
    return <LocationsPage slug={path === "locations" ? undefined : path} />;
  if (["faq", "how-it-works", "reviews"].includes(path))
    return <InformationPage slug={path} />;
  if (portalSlugs.includes(path)) return <PortalPage slug={path} />;
  if (path === "sitemap") return <SiteMapPage />;
  return null;
}
