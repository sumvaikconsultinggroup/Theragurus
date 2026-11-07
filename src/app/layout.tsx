import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Playfair_Display, Poppins } from "next/font/google";
import { CustomerAuthProvider } from "@/components/CustomerAuthProvider";
import { JsonLd } from "@/components/JsonLd";
import { ToastViewport } from "@/components/Toast";
import { siteGraph } from "@/lib/seo";
import { SiteFrame } from "@/components/SiteFrame";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { clerkUiReady } from "@/lib/clerk-public";
import { articlePreviews } from "@/lib/content";
import "./globals.css";
import "./site.css";
import "./booking.css";
import "@/components/ReactBits.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["500", "600", "700"],
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const title = "TheraGurus — Pelvic Health & Workplace Wellness";
const description =
  "Personalized pelvic floor therapy and workplace wellness with Trapti Agarwal, OTR/L, in Santa Clarita and online.";

export const metadata: Metadata = {
  metadataBase: new URL("https://theragurus.com"),
  title: {
    default: title,
    template: "%s | TheraGurus",
  },
  description,
  applicationName: "TheraGurus",
  authors: [{ name: "Trapti Agarwal, OTR/L", url: "https://theragurus.com/meet-the-owner" }],
  creator: "TheraGurus",
  publisher: "TheraGurus",
  category: "health",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://theragurus.com",
    siteName: "TheraGurus",
    title,
    description,
    images: [
      {
        url: "https://theragurus.com/hero-wellness.jpg",
        alt: "TheraGurus pelvic health and workplace wellness",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/hero-wellness.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

function shell(children: ReactNode) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <SiteFrame header={<SiteHeader journalSlugs={articlePreviews.map((article) => article.slug)} />} footer={<SiteFooter />}>
        <main id="main-content">{children}</main>
      </SiteFrame>
    </>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${poppins.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body>
        <JsonLd data={siteGraph()} />
        {clerkUiReady ? (
          <CustomerAuthProvider>{shell(children)}</CustomerAuthProvider>
        ) : (
          shell(children)
        )}
        <ToastViewport />
      </body>
    </html>
  );
}
