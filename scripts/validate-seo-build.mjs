import { access, readFile, readdir } from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  GUIDE_SCHEMA_FILES,
  REMOVED_CITY_SERVICE_REDIRECTS,
  SITE_ORIGIN,
  SITEMAP_EXCLUDED_PATHS,
} from "./seo-config.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(projectRoot, "dist");
const errors = [];

function toPosix(value) {
  return value.split(sep).join("/");
}

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(absolutePath)));
    else if (entry.isFile()) files.push(absolutePath);
  }
  return files;
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function canonicalHref(html) {
  const match =
    /<link\b(?=[^>]*\brel=["']canonical["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/i.exec(html) ||
    /<link\b(?=[^>]*\bhref=["']([^"']+)["'])(?=[^>]*\brel=["']canonical["'])[^>]*>/i.exec(html);
  return match?.[1] ?? "";
}

function htmlVariants(urlPath, { includeCanonical = false } = {}) {
  const stem = urlPath.slice(0, -".html".length);
  const variants = [stem, `${stem}/`, `${urlPath}/`];
  if (includeCanonical) variants.unshift(urlPath);
  return variants;
}

function parseRedirects(source) {
  const redirects = new Map();
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const [from, to, status] = line.split(/\s+/);
    assert(Boolean(from && to && status), `Malformed redirect line: ${line}`);
    assert(!redirects.has(from), `Duplicate redirect source: ${from}`);
    assert(status === "301!", `Redirect is not a forced 301: ${line}`);
    redirects.set(from, to);
  }
  return redirects;
}

function extractJsonLd(html) {
  return [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
}

function sitemapUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

function localPathFromUrl(rawUrl, fromHtml) {
  if (
    !rawUrl ||
    rawUrl.startsWith("#") ||
    rawUrl.startsWith("//") ||
    /^(?:mailto:|tel:|javascript:|data:)/i.test(rawUrl)
  ) {
    return null;
  }
  let pathname = rawUrl;
  if (/^https?:\/\//i.test(rawUrl)) {
    const url = new URL(rawUrl);
    if (url.origin !== SITE_ORIGIN) return null;
    pathname = url.pathname;
  }
  pathname = pathname.split(/[?#]/)[0];
  if (!pathname || pathname.startsWith("/.netlify/")) return null;
  const base = `/${toPosix(dirname(fromHtml))}/`.replace(/\/+/g, "/");
  return new URL(pathname, `${SITE_ORIGIN}${base}`).pathname;
}

await access(outputDir);
const outputFiles = await walkFiles(outputDir);
const relativeOutputFiles = outputFiles.map((path) => toPosix(relative(outputDir, path)));
const outputFileSet = new Set(relativeOutputFiles);

const forbiddenFiles = relativeOutputFiles.filter((path) =>
  /(^|\/)(?:README|VERSION|.*SETUP|INTEGRATION_README|LAUNCH-INTEGRATIONS)|\.(?:md|toml)$/i.test(path),
);
assert(forbiddenFiles.length === 0, `Internal documentation/config leaked into dist: ${forbiddenFiles.join(", ")}`);
assert(!relativeOutputFiles.some((path) => path.endsWith("HOMEPAGE_SECTION.html")), "Homepage fragment leaked into dist");
assert(!outputFileSet.has("package.json"), "package.json leaked into dist");

const sourcePdfs = (await walkFiles(resolve(projectRoot, "downloads")))
  .filter((path) => extname(path).toLowerCase() === ".pdf")
  .map((path) => toPosix(relative(resolve(projectRoot, "downloads"), path)))
  .sort();
const outputDownloadFiles = relativeOutputFiles
  .filter((path) => path.startsWith("downloads/"))
  .map((path) => path.slice("downloads/".length))
  .sort();
assert(
  JSON.stringify(sourcePdfs) === JSON.stringify(outputDownloadFiles),
  "dist/downloads must contain all and only the intended PDF files",
);
assert(
  !relativeOutputFiles.some((path) => path.startsWith("project-rescue/") && extname(path).toLowerCase() === ".html"),
  "Duplicate project-rescue HTML leaked into dist",
);
for (const removedPage of REMOVED_CITY_SERVICE_REDIRECTS.keys()) {
  assert(!outputFileSet.has(removedPage), `Removed city-service page leaked into dist: ${removedPage}`);
}

const sourceSitemap = await readFile(resolve(projectRoot, "sitemap.xml"), "utf8");
const outputSitemap = await readFile(resolve(outputDir, "sitemap.xml"), "utf8");
assert(sourceSitemap === outputSitemap, "dist sitemap differs from the committed sitemap");
const sitemap = sitemapUrls(sourceSitemap);
assert(sitemap.length === new Set(sitemap).size, "Sitemap contains duplicate URLs");
for (const excludedPath of SITEMAP_EXCLUDED_PATHS) {
  assert(!sitemap.includes(`${SITE_ORIGIN}${excludedPath}`), `Excluded URL remains in sitemap: ${excludedPath}`);
}
for (const urlValue of sitemap) {
  const url = new URL(urlValue);
  assert(url.origin === SITE_ORIGIN, `Sitemap URL uses a non-canonical origin: ${urlValue}`);
  const relativePath = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\//, "");
  assert(outputFileSet.has(relativePath), `Sitemap URL has no file in dist: ${urlValue}`);
  if (outputFileSet.has(relativePath) && extname(relativePath).toLowerCase() === ".html") {
    const html = await readFile(resolve(outputDir, relativePath), "utf8");
    assert(!/<meta\b[^>]*noindex[^>]*>/i.test(html), `Noindex page remains in sitemap: ${urlValue}`);
  }
}

const sitemapSet = new Set(sitemap);

let jsonLdBlocks = 0;
let invalidJsonLd = 0;
let indexableHtml = 0;
const titles = new Map();
const canonicals = new Map();
const htmlFiles = relativeOutputFiles.filter((path) => extname(path).toLowerCase() === ".html");

for (const relativePath of htmlFiles) {
  const html = await readFile(resolve(outputDir, relativePath), "utf8");
  for (const match of extractJsonLd(html)) {
    jsonLdBlocks += 1;
    try {
      JSON.parse(match[1]);
    } catch {
      invalidJsonLd += 1;
      errors.push(`Invalid JSON-LD in ${relativePath}`);
    }
  }

  if (!/<meta\b[^>]*noindex[^>]*>/i.test(html)) {
    indexableHtml += 1;
    const title = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? "";
    const canonical = canonicalHref(html);
    assert(Boolean(title), `Missing title on indexable page: ${relativePath}`);
    assert(Boolean(canonical), `Missing canonical on indexable page: ${relativePath}`);
    if (title) {
      const prior = titles.get(title);
      assert(!prior, `Duplicate indexable title: ${prior} and ${relativePath}`);
      titles.set(title, relativePath);
    }
    if (canonical) {
      assert(canonical.startsWith(`${SITE_ORIGIN}/`), `Non-www canonical in ${relativePath}: ${canonical}`);
      assert(sitemapSet.has(canonical), `Indexable canonical is missing from sitemap: ${canonical}`);
      const prior = canonicals.get(canonical);
      assert(!prior, `Duplicate indexable canonical: ${prior} and ${relativePath}`);
      canonicals.set(canonical, relativePath);
    }
  }
}

for (const relativePath of GUIDE_SCHEMA_FILES) {
  const html = await readFile(resolve(outputDir, relativePath), "utf8");
  const articleSchemas = extractJsonLd(html).flatMap((match) => {
    try {
      const schema = JSON.parse(match[1]);
      return schema?.["@type"] === "Article" ? [schema] : [];
    } catch {
      return [];
    }
  });
  assert(articleSchemas.length === 1, `${relativePath} must contain exactly one valid Article schema`);
  assert(
    articleSchemas[0]?.mainEntityOfPage === `${SITE_ORIGIN}/${relativePath}`,
    `${relativePath} Article schema must use its canonical www URL`,
  );
}

const redirects = parseRedirects(await readFile(resolve(outputDir, "_redirects"), "utf8"));
const sourceArtifactPaths = [
  "HOMEPAGE_SECTION.html",
  ...REMOVED_CITY_SERVICE_REDIRECTS.keys(),
  ...(await walkFiles(resolve(projectRoot, "downloads")))
    .filter((path) => extname(path).toLowerCase() === ".html")
    .map((path) => toPosix(relative(projectRoot, path))),
  ...(await walkFiles(resolve(projectRoot, "project-rescue")))
    .filter((path) => extname(path).toLowerCase() === ".html")
    .map((path) => toPosix(relative(projectRoot, path))),
];
for (const artifactPath of sourceArtifactPaths) {
  for (const variant of htmlVariants(`/${artifactPath}`, { includeCanonical: true })) {
    assert(redirects.has(variant), `Missing artifact redirect: ${variant}`);
  }
}
for (const relativePath of htmlFiles.filter((path) => path !== "404.html")) {
  if (relativePath === "index.html") {
    for (const variant of ["/index.html", "/index", "/index/", "/index.html/"]) {
      assert(redirects.get(variant) === "/", `Missing homepage variant redirect: ${variant}`);
    }
  } else {
    for (const variant of htmlVariants(`/${relativePath}`)) {
      assert(redirects.get(variant) === `/${relativePath}`, `Missing canonical variant redirect: ${variant}`);
    }
  }
}

const unresolvedLinks = [];
for (const relativePath of htmlFiles) {
  const html = await readFile(resolve(outputDir, relativePath), "utf8");
  for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
    const pathname = localPathFromUrl(match[1], relativePath);
    if (!pathname) continue;
    if (pathname === "/") continue;
    const targetPath = decodeURIComponent(pathname.replace(/^\//, ""));
    if (!outputFileSet.has(targetPath) && !redirects.has(pathname)) {
      unresolvedLinks.push(`${relativePath} -> ${match[1]}`);
    }
  }
}
assert(unresolvedLinks.length === 0, `Unresolved local links: ${unresolvedLinks.slice(0, 20).join(", ")}`);

const notFound = await readFile(resolve(outputDir, "404.html"), "utf8");
assert(/<meta\b[^>]*noindex[^>]*>/i.test(notFound), "404.html must be noindex,follow");
for (const requiredLink of ["/", "/services.html", "/areas.html", "/resources.html", "/contact.html"]) {
  assert(notFound.includes(`href="${requiredLink}"`), `404.html is missing recovery link: ${requiredLink}`);
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify(
      {
        files: outputFiles.length,
        html: htmlFiles.length,
        indexableHtml,
        sitemapUrls: sitemap.length,
        downloads: outputDownloadFiles.length,
        redirects: redirects.size,
        jsonLdBlocks,
        invalidJsonLd,
        unresolvedLocalLinks: unresolvedLinks.length,
      },
      null,
      2,
    ),
  );
}
