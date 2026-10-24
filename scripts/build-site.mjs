import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  EXCLUDED_ROOT_HTML,
  REMOVED_CITY_SERVICE_REDIRECTS,
  SITE_ORIGIN,
} from "./seo-config.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(projectRoot, "dist");
const publicRootDataFiles = new Set([
  "academy-index.json",
  "ai-index.json",
  "knowledge-base.json",
  "llms-full.txt",
  "llms.txt",
  "robots.txt",
  "sitemap.xml",
]);
const publicRootExtensions = new Set([".css", ".js"]);

function toPosix(value) {
  return value.split(sep).join("/");
}

function assertSafeOutputDirectory(directory) {
  const relativeOutput = relative(projectRoot, directory);
  if (!relativeOutput || relativeOutput.startsWith("..") || resolve(directory) === projectRoot) {
    throw new Error(`Refusing to clear unsafe output directory: ${directory}`);
  }
}

async function copy(relativePath) {
  const source = resolve(projectRoot, relativePath);
  const destination = resolve(outputDir, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
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

async function copyTree(relativeDirectory, predicate = () => true) {
  const sourceDirectory = resolve(projectRoot, relativeDirectory);
  for (const sourcePath of await walkFiles(sourceDirectory)) {
    const relativePath = toPosix(relative(projectRoot, sourcePath));
    if (predicate(relativePath)) await copy(relativePath);
  }
}

function canonicalHref(html) {
  const match =
    /<link\b(?=[^>]*\brel=["']canonical["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/i.exec(html) ||
    /<link\b(?=[^>]*\bhref=["']([^"']+)["'])(?=[^>]*\brel=["']canonical["'])[^>]*>/i.exec(html);
  return match?.[1] ?? "";
}

function normalizeRedirectTarget(pathname) {
  if (!pathname || pathname === "/index.html") return "/";
  const filename = pathname.replace(/^\//, "");
  return REMOVED_CITY_SERVICE_REDIRECTS.get(filename) ?? pathname;
}

function fallbackArtifactTarget(relativePath) {
  const filename = relativePath.split("/").at(-1);
  if (filename === "HOMEPAGE_SECTION.html") return "/";
  if (filename === "project-rescue-thank-you.html") return "/project-rescue.html";
  if (filename === "form-definitions.html") return "/contact.html";
  if (filename === "project-rescue.html" || relativePath === "project-rescue/index.html") {
    return "/project-rescue.html";
  }
  return REMOVED_CITY_SERVICE_REDIRECTS.get(filename) ?? `/${filename}`;
}

async function artifactTarget(relativePath) {
  const html = await readFile(resolve(projectRoot, relativePath), "utf8");
  const href = canonicalHref(html);
  if (href) {
    const url = new URL(href, SITE_ORIGIN);
    if (url.origin === SITE_ORIGIN) return normalizeRedirectTarget(url.pathname);
  }
  return fallbackArtifactTarget(relativePath);
}

function htmlVariants(urlPath, { includeCanonical = false } = {}) {
  const stem = urlPath.slice(0, -".html".length);
  // Netlify ignores trailing slashes when matching rules. A /page.html/
  // redirect to /page.html also matches /page.html and creates a loop.
  const variants = [stem];
  if (includeCanonical) variants.unshift(urlPath);
  return variants;
}

function addRedirect(redirects, from, to) {
  if (from.replace(/\/+$/, '') === to.replace(/\/+$/, '')) {
    throw new Error(`Redirect loops after Netlify path normalization: ${from}`);
  }
  const existing = redirects.get(from);
  if (existing && existing !== to) {
    throw new Error(`Conflicting redirect for ${from}: ${existing} vs ${to}`);
  }
  redirects.set(from, to);
}

assertSafeOutputDirectory(outputDir);
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const entry of await readdir(projectRoot, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const extension = extname(entry.name).toLowerCase();
  const isPublishedHtml = extension === ".html" && !EXCLUDED_ROOT_HTML.has(entry.name);
  if (isPublishedHtml || publicRootExtensions.has(extension) || publicRootDataFiles.has(entry.name)) {
    await copy(entry.name);
  }
}

await copyTree("academy");
await copyTree("assets");
await copyTree("vendor");
await copyTree("project-rescue", (path) => [".css", ".js"].includes(extname(path).toLowerCase()));
await copyTree("downloads", (path) => extname(path).toLowerCase() === ".pdf");

const artifactPaths = [
  "HOMEPAGE_SECTION.html",
  ...REMOVED_CITY_SERVICE_REDIRECTS.keys(),
  ...(await walkFiles(resolve(projectRoot, "downloads")))
    .filter((path) => extname(path).toLowerCase() === ".html")
    .map((path) => toPosix(relative(projectRoot, path))),
  ...(await walkFiles(resolve(projectRoot, "project-rescue")))
    .filter((path) => extname(path).toLowerCase() === ".html")
    .map((path) => toPosix(relative(projectRoot, path))),
].sort();

const redirects = new Map();
for (const relativePath of artifactPaths) {
  const urlPath = `/${relativePath}`;
  const target = await artifactTarget(relativePath);
  for (const variant of htmlVariants(urlPath, { includeCanonical: true })) {
    addRedirect(redirects, variant, target);
  }
}

const publishedHtml = (await walkFiles(outputDir))
  .filter((path) => extname(path).toLowerCase() === ".html")
  .map((path) => toPosix(relative(outputDir, path)))
  .filter((path) => path !== "404.html")
  .sort();

for (const relativePath of publishedHtml) {
  const urlPath = `/${relativePath}`;
  if (relativePath === "index.html") {
    for (const variant of ["/index.html", "/index", "/index/", "/index.html/"]) {
      addRedirect(redirects, variant, "/");
    }
    continue;
  }
  for (const variant of htmlVariants(urlPath)) {
    addRedirect(redirects, variant, urlPath);
  }
}

const redirectLines = [
  "# Generated by scripts/build-site.mjs. Do not edit the dist copy by hand.",
  "# Removed artifacts and consolidated city-service pages.",
  ...[...redirects.entries()].map(([from, to]) => `${from}  ${to}  301!`),
  "",
];
await writeFile(resolve(outputDir, "_redirects"), redirectLines.join("\n"), "utf8");

const outputFiles = await walkFiles(outputDir);
const pdfCount = outputFiles.filter((path) => extname(path).toLowerCase() === ".pdf").length;
console.log(
  JSON.stringify(
    {
      output: toPosix(relative(projectRoot, outputDir)),
      files: outputFiles.length,
      html: publishedHtml.length + 1,
      pdfs: pdfCount,
      redirects: redirects.size,
      excludedCityServicePages: REMOVED_CITY_SERVICE_REDIRECTS.size,
    },
    null,
    2,
  ),
);
