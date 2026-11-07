import type { MetadataRoute } from "next";
import { routePaths } from "@/lib/content";
import { absoluteUrl, articleLastModified, isIndexablePath } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = routePaths.filter(isIndexablePath);
  return [
    { url: absoluteUrl("/") },
    ...pages.map((path) => {
      const lastModified = articleLastModified(path);
      return lastModified
        ? { url: absoluteUrl(path), lastModified }
        : { url: absoluteUrl(path) };
    }),
  ];
}
