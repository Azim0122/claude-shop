// Сборка: JS и CSS через esbuild, страницы из src/pages + общие части из src/partials.
// npm run build  → docs/ (готовый сайт, его же отдаёт GitHub Pages)   |   npm run dev → пересборка при изменениях
import * as esbuild from "esbuild";
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, watch } from "node:fs";

const DIST = "docs";
const part = (n) => readFileSync(`src/partials/${n}.html`, "utf8");

function pages() {
  const tg = part("tg").trim().replace(/\.svg$/, "");
  for (const f of readdirSync("src/pages").filter((f) => f.endsWith(".html"))) {
    let src = readFileSync(`src/pages/${f}`, "utf8");
    const m = src.match(/^<!--@meta\s+(\{[\s\S]*?\})\s*-->\s*/);
    const meta = m ? JSON.parse(m[1]) : {};
    if (m) src = src.slice(m[0].length);
    let head = part("head");
    for (const [k, v] of Object.entries({ hero: "dark", ...meta })) head = head.replaceAll(`{{${k}}}`, v);
    const html = (head + part("header") + src + part("footer")).replaceAll("{{tg}}", tg);
    writeFileSync(`${DIST}/${f}`, html);
  }
}

const opts = {
  entryPoints: [{ in: "src/js/main.js", out: "app" }, { in: "src/css/main.css", out: "app" }],
  outdir: `${DIST}/assets`,
  bundle: true,
  minify: !process.env.DEBUG,
  sourcemap: !!process.env.DEBUG,
  format: "iife",
  target: ["es2020", "safari14"],
  loader: { ".woff2": "file" },
  assetNames: "fonts/[name]",
  legalComments: "none",
  logLevel: "info",
};

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
pages();
writeFileSync(`${DIST}/.nojekyll`, "");
if (process.argv.includes("--watch")) {
  const ctx = await esbuild.context(opts);
  await ctx.watch();
  watch("src/pages", pages);
  watch("src/partials", pages);
  const { port } = await ctx.serve({ servedir: DIST, port: 8080 });
  console.log(`http://localhost:${port}`);
} else {
  await esbuild.build(opts);
}
