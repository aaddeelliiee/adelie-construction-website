import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { GUIDE_SCHEMA_FILES, SITE_ORIGIN } from "./seo-config.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const jsonLdPattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function decodeHtml(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function attributeContent(html, attributeName, attributeValue, contentAttribute = "content") {
  const tagPattern = new RegExp(
    `<(?:meta|link)\\b(?=[^>]*\\b${attributeName}=["']${attributeValue}["'])(?=[^>]*\\b${contentAttribute}=["']([^"']*)["'])[^>]*>`,
    "i",
  );
  return tagPattern.exec(html)?.[1] ?? "";
}

function extractCanonical(html) {
  return (
    attributeContent(html, "rel", "canonical", "href") ||
    /<link\b(?=[^>]*\bhref=["']([^"']+)["'])(?=[^>]*\brel=["']canonical["'])[^>]*>/i.exec(html)?.[1] ||
    ""
  );
}

function extractH1(html) {
  const inner = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ?? "";
  return decodeHtml(inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function isArticleBlock(rawJson) {
  return /["']@type["']\s*:\s*["']Article["']/.test(rawJson);
}

for (const relativePath of GUIDE_SCHEMA_FILES) {
  const filePath = resolve(projectRoot, relativePath);
  const source = await readFile(filePath, "utf8");
  const articleBlocks = [...source.matchAll(jsonLdPattern)].filter((match) => isArticleBlock(match[1]));

  if (articleBlocks.length === 0) {
    throw new Error(`${relativePath}: no Article JSON-LD block found`);
  }

  const validArticles = articleBlocks.flatMap((match) => {
    try {
      const parsed = JSON.parse(match[1]);
      return parsed?.["@type"] === "Article" ? [parsed] : [];
    } catch {
      return [];
    }
  });
  const existing = validArticles.at(-1) ?? {};

  const canonical = extractCanonical(source);
  if (!canonical.startsWith(`${SITE_ORIGIN}/`)) {
    throw new Error(`${relativePath}: canonical must use ${SITE_ORIGIN}`);
  }

  const headline = extractH1(source);
  const description = decodeHtml(attributeContent(source, "name", "description"));
  const image = attributeContent(source, "property", "og:image");

  if (!headline || !description || !image) {
    throw new Error(`${relativePath}: missing headline, description, or social image`);
  }

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    image,
    datePublished: existing.datePublished ?? existing.dateModified,
    dateModified: existing.dateModified ?? existing.datePublished,
    mainEntityOfPage: canonical,
    author: existing.author ?? {
      "@type": "Organization",
      name: "ADELIE Construction",
      url: `${SITE_ORIGIN}/`,
    },
    publisher: existing.publisher ?? {
      "@type": "Organization",
      name: "ADELIE Construction",
      url: `${SITE_ORIGIN}/`,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_ORIGIN}/assets/adelie-logo-transparent.png`,
      },
    },
    about: existing.about ?? ["residential remodeling", "San Diego County", "homeowner planning"],
  };

  if (!article.datePublished || !article.dateModified) {
    throw new Error(`${relativePath}: Article publication dates are missing`);
  }

  const replacement = `<script type="application/ld+json">${JSON.stringify(article)}</script>`;
  let seenArticle = false;
  const updated = source
    .replace(jsonLdPattern, (full, rawJson) => {
      if (!isArticleBlock(rawJson)) return full;
      if (seenArticle) return "";
      seenArticle = true;
      return replacement;
    })
    .replace(/<!--\s*ADELIE-RAG-SCHEMA\s*-->/g, "");

  await writeFile(filePath, updated, "utf8");
  console.log(`${relativePath}: consolidated ${articleBlocks.length} Article blocks into 1`);
}
