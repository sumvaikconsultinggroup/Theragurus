import nextEnv from "@next/env";
import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

nextEnv.loadEnvConfig(process.cwd());
const uri = process.env.MONGODB_URI;
if (!uri)
  throw new Error("Configure MONGODB_URI before checking secret isolation.");
const parsed = new URL(uri);
const privateValues = [
  ...new Set(
    [
      uri,
      process.env.CLERK_SECRET_KEY,
      process.env.RESEND_API_KEY,
      parsed.username,
      parsed.password,
      decodeURIComponent(parsed.username),
      decodeURIComponent(parsed.password),
    ].filter(Boolean),
  ),
];
const ignored = spawnSync("git", ["check-ignore", "--quiet", ".env.local"], {
  windowsHide: true,
});
if (ignored.status !== 0)
  throw new Error(".env.local must remain ignored by Git.");
const candidates = spawnSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8", windowsHide: true },
);
if (candidates.status !== 0)
  throw new Error("Could not inspect repository file paths.");
const extensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".json",
  ".md",
  ".css",
  ".txt",
  ".example",
]);
const sourcePaths = candidates.stdout
  .split("\0")
  .filter((file) => file && extensions.has(path.extname(file)));
let sourceFilesChecked = 0;
for (const file of sourcePaths) {
  const content = await readFile(file, "utf8");
  if (privateValues.some((value) => content.includes(value)))
    throw new Error(
      `A private database credential is present in a repository file: ${file}`,
    );
  sourceFilesChecked++;
}
let clientBundlesChecked = 0;
async function checkDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await checkDirectory(file);
    else if ([".js", ".json", ".map"].includes(path.extname(file))) {
      const content = await readFile(file, "utf8");
      if (privateValues.some((value) => content.includes(value)))
        throw new Error(
          `A private database credential is present in a client bundle: ${file}`,
        );
      clientBundlesChecked++;
    }
  }
}
await checkDirectory(".next/static");
console.log(
  JSON.stringify({
    envLocalIgnored: true,
    sourceFilesChecked,
    clientBundlesChecked,
    privateCredentialMatches: 0,
  }),
);
