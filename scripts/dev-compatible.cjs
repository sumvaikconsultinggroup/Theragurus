// Keep the normal production compiler and its cache separate from this fallback.
/* eslint-disable @typescript-eslint/no-require-imports -- Launch Next through its CommonJS CLI entry. */
process.env.THERAGURUS_CSS_COMPILER = "javascript";
process.argv = [process.execPath, require.resolve("next/dist/bin/next"), "dev", ...process.argv.slice(2)];
require("next/dist/bin/next");
