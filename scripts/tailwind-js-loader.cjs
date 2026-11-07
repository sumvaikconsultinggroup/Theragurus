// Development fallback for machines that cannot load Tailwind's native scanner.
// Tailwind still generates the CSS; only candidate discovery uses JavaScript.
/* eslint-disable @typescript-eslint/no-require-imports -- Turbopack loads this CommonJS loader. */
const fs = require("node:fs");
const path = require("node:path");
const { compile } = require("@tailwindcss/node");

module.exports = function tailwindJavaScriptLoader(source) {
  const done = this.async();
  if (!/@(?:import|reference|apply|tailwind)\b/.test(source)) {
    done(null, source);
    return;
  }
  const candidates = new Set();
  const visit = (dir) => {
    this.addContextDependency(dir);
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const filename = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(filename);
      else if (/\.(?:[cm]?[jt]sx?|html)$/.test(entry.name)) {
        this.addDependency(filename);
        const content = fs.readFileSync(filename, "utf8");
        for (const token of content.match(/[^\s"'`{}=;]+/g) || []) candidates.add(token);
      }
    }
  };
  try {
    visit(path.join(process.cwd(), "src"));
  } catch (error) {
    done(error);
    return;
  }
  compile(source, {
    from: this.resourcePath,
    base: path.dirname(this.resourcePath),
    shouldRewriteUrls: true,
    onDependency: (file) => this.addDependency(file),
  }).then((compiler) => done(null, compiler.build([...candidates])), done);
};
