import fs from "node:fs/promises";

// Verify the generated site against real HTTP responses, including the links
// actually rendered in those responses. Run after `npm run build` + `npm start`.
const origin = process.argv[2] ?? "http://127.0.0.1:3001";
const manifest = JSON.parse(
  await fs.readFile(".next/prerender-manifest.json", "utf8"),
);
const paths = [...new Set([...Object.keys(manifest.routes), "/book"])].filter(
  (path) => !path.startsWith("/_") && !/\.(?:xml|ico|png|svg|jpg)$/.test(path),
);
const knownPaths = new Set([...paths, "/sitemap.xml"]);
const failures = [];
let linkCount = 0;

for (let start = 0; start < paths.length; start += 8) {
  await Promise.all(
    paths.slice(start, start + 8).map(async (path) => {
      try {
        const response = await fetch(new URL(encodeURI(path), origin), {
          signal: AbortSignal.timeout(20000),
        });
        const html = await response.text();
        if (!response.ok)
          failures.push({ path, reason: `HTTP ${response.status}` });
        const headings = [...html.matchAll(/<h1(?:\s|>)/g)].length;
        if (headings !== 1)
          failures.push({ path, reason: `${headings} h1 headings` });
        if (!html.includes('id="main-content"'))
          failures.push({ path, reason: "Missing main content landmark" });
        for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
          const href = match[1].replaceAll("&amp;", "&");
          if (!href.startsWith("/") || href.startsWith("//")) continue;
          const target =
            decodeURIComponent(new URL(href, origin).pathname).replace(
              /\/$/,
              "",
            ) || "/";
          linkCount++;
          if (!knownPaths.has(target))
            failures.push({ path, reason: `Unknown internal link: ${target}` });
        }
      } catch (error) {
        failures.push({ path, reason: error.message });
      }
    }),
  );
}

const missing = await fetch(new URL("/this-page-does-not-exist", origin));
if (missing.status !== 404)
  failures.push({
    path: "/this-page-does-not-exist",
    reason: `Expected 404, got ${missing.status}`,
  });
const sitemap = await fetch(new URL("/sitemap.xml", origin));
if (!sitemap.ok || !(await sitemap.text()).includes("<urlset"))
  failures.push({ path: "/sitemap.xml", reason: "Invalid XML sitemap" });
console.log(
  JSON.stringify(
    {
      pagesChecked: paths.length,
      internalLinksChecked: linkCount,
      missingPageStatus: missing.status,
      failures,
    },
    null,
    2,
  ),
);
if (failures.length) process.exitCode = 1;
