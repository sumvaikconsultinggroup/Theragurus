import { mkdir, writeFile, readFile } from "node:fs/promises";
const assets = [
  {
    file: "yoga-portrait.jpg",
    source: "https://images.unsplash.com/photo-1545389336-cf090694435e",
    page: "https://unsplash.com/photos/woman-standing-on-rock-facing-forest-Dqx4XWuXu7w",
    photographer: "Yannic Läderach",
  },
  {
    file: "woodland-portrait.jpg",
    source: "https://images.unsplash.com/photo-1536579031226-1444346d8c23",
    page: "https://unsplash.com/photos/a-path-in-the-middle-of-a-forest-surrounded-by-tall-trees-t8tzs7SYooE",
    photographer: "Kevin Bosc",
  },
  {
    file: "workplace-portrait.jpg",
    source: "https://images.unsplash.com/photo-1737574821698-862e77f044c1",
    page: "https://unsplash.com/photos/a-man-in-a-suit-sitting-at-a-desk-9A2u8LwCpVE",
    photographer: "litoon dev",
  },
  {
    file: "coast-portrait.jpg",
    source: "https://images.unsplash.com/photo-1767487018487-dce44274fb07",
    page: "https://unsplash.com/photos/person-standing-on-a-rocky-beach-by-the-ocean-H7MqdjTEAFs",
    photographer: "Ansis Kančs",
  },
  {
    file: "mindful-portrait.jpg",
    source: "https://images.unsplash.com/photo-1506126613408-eca07ce68773",
  },
];
await mkdir("public/mobile", { recursive: true });
const prepared = await Promise.all(
  assets.map(async (asset) => {
    let source = asset.source;
    if (!source) {
      const response = await fetch(asset.page);
      if (!response.ok)
        throw new Error(`Photo page unavailable: ${asset.page}`);
      const html = await response.text();
      source = html
        .match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/)?.[1]
        ?.replaceAll("&amp;", "&");
      if (!source) throw new Error(`No source image found: ${asset.page}`);
    }
    const url = new URL(source);
    if (url.hostname !== "images.unsplash.com")
      throw new Error("Unexpected photo host");
    url.search = "";
    url.searchParams.set("auto", "format");
    url.searchParams.set("fm", "jpg");
    url.searchParams.set("fit", "max");
    url.searchParams.set("w", "960");
    url.searchParams.set("q", "85");
    const image = await fetch(url);
    if (!image.ok || !image.headers.get("content-type")?.startsWith("image/"))
      throw new Error(`Photo download failed: ${url}`);
    await writeFile(
      `public/mobile/${asset.file}`,
      new Uint8Array(await image.arrayBuffer()),
    );
    console.log(`Saved ${asset.file}`);
    return {
      ...asset,
      file: `mobile/${asset.file}`,
      source: `${url.origin}${url.pathname}`,
      download: url.href,
      treatment: "Natural aspect ratio; no crop parameters.",
    };
  }),
);
const provenance = JSON.parse(
  await readFile("public/image-sources.json", "utf8"),
);
provenance.assets = [
  ...provenance.assets.filter(
    (item) => !prepared.some((next) => next.file === item.file),
  ),
  ...prepared,
];
await writeFile(
  "public/image-sources.json",
  JSON.stringify(provenance, null, 2) + "\n",
);
