import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { SITE_ORIGIN, SITEMAP_EXCLUDED_PATHS } from "./seo-config.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sitemapPath = resolve(projectRoot, "sitemap.xml");
const source = await readFile(sitemapPath, "utf8");
let explicitlyRemoved = 0;
let noindexRemoved = 0;

function canonicalHref(html) {
  const match =
    /<link\b(?=[^>]*\brel=["']canonical["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/i.exec(html) ||
    /<link\b(?=[^>]*\bhref=["']([^"']+)["'])(?=[^>]*\brel=["']canonical["'])[^>]*>/i.exec(html);
  return match?.[1] ?? "";
}

const noindexPaths = new Set();
const indexableCanonicals = new Set();
const rootHtml = (await readdir(projectRoot, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
  .map((entry) => entry.name);
const academyHtml = (await readdir(resolve(projectRoot, "academy"), { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
  .map((entry) => `academy/${entry.name}`);
for (const relativePath of [...rootHtml, ...academyHtml]) {
  const html = await readFile(resolve(projectRoot, relativePath), "utf8");
  const canonical = canonicalHref(html);
  if (!canonical) continue;
  const url = new URL(canonical, SITE_ORIGIN);
  if (/<meta\b[^>]*noindex[^>]*>/i.test(html)) {
    noindexPaths.add(url.pathname);
  } else if (url.origin === SITE_ORIGIN && !SITEMAP_EXCLUDED_PATHS.has(url.pathname)) {
    indexableCanonicals.add(url.href);
  }
}

const updated = source.replace(/<url>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/g, (block, loc) => {
  const url = new URL(loc);
  if (url.origin === SITE_ORIGIN && SITEMAP_EXCLUDED_PATHS.has(url.pathname)) {
    explicitlyRemoved += 1;
    return "";
  }
  if (url.origin === SITE_ORIGIN && noindexPaths.has(url.pathname)) {
    noindexRemoved += 1;
    return "";
  }
  return block;
});

let curated = updated;
const retainedUrls = [...curated.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const missingIndexable = [...indexableCanonicals].filter((url) => !retainedUrls.includes(url)).sort();
if (missingIndexable.length) {
  const lastmod = new Date().toISOString().slice(0, 10);
  const additions = missingIndexable
    .map((url) => `<url><loc>${url}</loc><lastmod>${lastmod}</lastmod></url>`)
    .join("\n");
  curated = curated.replace(/\s*<\/urlset>\s*$/, `\n${additions}\n</urlset>\n`);
}

const remainingUrls = [...curated.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const unexpected = remainingUrls.filter((loc) => {
  const url = new URL(loc);
  return (
    url.origin === SITE_ORIGIN &&
    (SITEMAP_EXCLUDED_PATHS.has(url.pathname) || noindexPaths.has(url.pathname))
  );
});
if (unexpected.length) {
  throw new Error(`Excluded sitemap URLs remain: ${unexpected.join(", ")}`);
}

if (curated !== source) await writeFile(sitemapPath, curated, "utf8");
console.log(
  JSON.stringify(
    {
      explicitlyRemoved,
      noindexRemoved,
      addedIndexable: missingIndexable.length,
      remaining: remainingUrls.length,
    },
    null,
    2,
  ),
);
