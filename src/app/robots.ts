import type { MetadataRoute } from "next";

const privatePaths = [
  "/admin",
  "/account",
  "/book",
  "/booking/",
  "/api/",
  "/sign-in",
  "/sign-up",
  "/newsletter",
  "/shop",
  "/cart",
  "/checkout",
  "/my-account",
  "/customer-cabinet",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: privatePaths,
    },
    sitemap: "https://theragurus.com/sitemap.xml",
    host: "https://theragurus.com",
  };
}
