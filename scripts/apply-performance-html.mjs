#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const shouldWrite = process.argv.includes("--write");
const shouldCheck = process.argv.includes("--check");

const stats = {
  filesChanged: 0,
  stylesheetLinksNormalized: 0,
  imageAttributesAdded: 0,
  responsiveImagesAdded: 0,
  optimizedLogosAdded: 0,
  heroPreloadsAdded: 0,
};

const missingImages = new Set();
const metadataCache = new Map();

function readPngDimensions(buffer) {
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readGifDimensions(buffer) {
  const signature = buffer.toString("ascii", 0, 6);
  if (signature !== "GIF87a" && signature !== "GIF89a") return null;
  return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
}

function readJpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > buffer.length) break;
    const blockLength = buffer.readUInt16BE(offset);
    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isStartOfFrame && offset + 7 < buffer.length) {
      return {
        width: buffer.readUInt16BE(offset + 5),
        height: buffer.readUInt16BE(offset + 3),
      };
    }
    if (blockLength < 2) break;
    offset += blockLength;
  }
  return null;
}

function readWebpDimensions(buffer) {
  if (
    buffer.length < 30 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) return null;

  const chunkType = buffer.toString("ascii", 12, 16);
  if (chunkType === "VP8X") {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  if (chunkType === "VP8 " && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunkType === "VP8L" && buffer.length >= 25 && buffer[20] === 0x2f) {
    const bits = buffer.readUInt32LE(21);
    return {
      width: 1 + (bits & 0x3fff),
      height: 1 + ((bits >>> 14) & 0x3fff),
    };
  }
  return null;
}

function readSvgDimensions(filePath) {
  const source = fs.readFileSync(filePath, "utf8").slice(0, 8192);
  const svg = source.match(/<svg\b[^>]*>/i)?.[0];
  if (!svg) return null;
  const width = Number.parseFloat(svg.match(/\bwidth=["']([\d.]+)/i)?.[1] || "");
  const height = Number.parseFloat(svg.match(/\bheight=["']([\d.]+)/i)?.[1] || "");
  if (Number.isFinite(width) && Number.isFinite(height)) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const viewBox = svg.match(/\bviewBox=["']\s*[-\d.]+[ ,]+[-\d.]+[ ,]+([\d.]+)[ ,]+([\d.]+)\s*["']/i);
  if (!viewBox) return null;
  return {
    width: Math.round(Number.parseFloat(viewBox[1])),
    height: Math.round(Number.parseFloat(viewBox[2])),
  };
}

function imageDimensions(filePath) {
  if (metadataCache.has(filePath)) return metadataCache.get(filePath);
  const extension = path.extname(filePath).toLowerCase();
  let dimensions = null;
  if (extension === ".svg") {
    dimensions = readSvgDimensions(filePath);
  } else {
    const buffer = fs.readFileSync(filePath);
    if (extension === ".png") dimensions = readPngDimensions(buffer);
    else if (extension === ".gif") dimensions = readGifDimensions(buffer);
    else if (extension === ".jpg" || extension === ".jpeg") dimensions = readJpegDimensions(buffer);
    else if (extension === ".webp") dimensions = readWebpDimensions(buffer);
  }
  metadataCache.set(filePath, dimensions);
  return dimensions;
}

function attributeValue(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1] || "";
}

function setAttribute(tag, name, value) {
  const pattern = new RegExp(`\\s${name}\\s*=\\s*(?:["'][^"']*["']|[^\\s>]+)`, "i");
  const attribute = ` ${name}="${value}"`;
  if (pattern.test(tag)) return tag.replace(pattern, attribute);
  return tag.replace(/\s*\/?>(?=\s*$)/, match => `${attribute}${match.trimStart()}`);
}

function optimizeKnownImage(tag) {
  const source = attributeValue(tag, "src");
  let updated = tag;

  if (/^assets\/(?:customer-portal\/portal-desktop-showcase\.png|optimized\/portal-desktop-\d+\.webp)$/i.test(source)) {
    updated = setAttribute(updated, "src", "assets/optimized/portal-desktop-800.webp");
    updated = setAttribute(updated, "srcset", [
      "assets/optimized/portal-desktop-480.webp 480w",
      "assets/optimized/portal-desktop-800.webp 800w",
      "assets/optimized/portal-desktop-1200.webp 1200w",
      "assets/optimized/portal-desktop-1586.webp 1586w",
    ].join(", "));
    updated = setAttribute(updated, "sizes", "(max-width: 900px) calc(100vw - 28px), 55vw");
    if (updated !== tag) stats.responsiveImagesAdded += 1;
  } else if (/^assets\/(?:customer-portal\/portal-mobile-showcase\.png|optimized\/portal-mobile-\d+\.webp)$/i.test(source)) {
    updated = setAttribute(updated, "src", "assets/optimized/portal-mobile-640.webp");
    updated = setAttribute(updated, "srcset", [
      "assets/optimized/portal-mobile-360.webp 360w",
      "assets/optimized/portal-mobile-640.webp 640w",
      "assets/optimized/portal-mobile-960.webp 960w",
      "assets/optimized/portal-mobile-1122.webp 1122w",
    ].join(", "));
    updated = setAttribute(updated, "sizes", "(max-width: 600px) 330px, 430px");
    if (updated !== tag) stats.responsiveImagesAdded += 1;
  } else if (/^assets\/(?:adelie-logo\.png|optimized\/adelie-logo-512\.webp)$/i.test(source)) {
    updated = setAttribute(updated, "src", "assets/optimized/adelie-logo-512.webp");
    if (updated !== tag) stats.optimizedLogosAdded += 1;
  } else if (/^assets\/(?:adelie-logo-transparent\.png|optimized\/adelie-logo-transparent-512\.webp)$/i.test(source)) {
    updated = setAttribute(updated, "src", "assets/optimized/adelie-logo-transparent-512.webp");
    if (updated !== tag) stats.optimizedLogosAdded += 1;
  }

  return updated;
}

function addImageDimensions(html, htmlFile) {
  return html.replace(/<img\b[^>]*>/gi, originalTag => {
    let tag = optimizeKnownImage(originalTag);
    const source = attributeValue(tag, "src");
    if (!source || /^(?:data:|https?:|\/\/)/i.test(source)) return tag;

    const cleanSource = decodeURIComponent(source.split(/[?#]/, 1)[0]);
    const imagePath = cleanSource.startsWith("/")
      ? path.resolve(repositoryRoot, cleanSource.slice(1).replaceAll("/", path.sep))
      : path.resolve(path.dirname(htmlFile), cleanSource.replaceAll("/", path.sep));
    if (!imagePath.startsWith(repositoryRoot + path.sep) || !fs.existsSync(imagePath)) {
      missingImages.add(path.relative(repositoryRoot, imagePath).replaceAll(path.sep, "/"));
      return tag;
    }

    const dimensions = imageDimensions(imagePath);
    if (!dimensions?.width || !dimensions?.height) return tag;
    if (!/\bwidth\s*=/i.test(tag)) {
      tag = setAttribute(tag, "width", dimensions.width);
      stats.imageAttributesAdded += 1;
    }
    if (!/\bheight\s*=/i.test(tag)) {
      tag = setAttribute(tag, "height", dimensions.height);
      stats.imageAttributesAdded += 1;
    }
    return tag;
  });
}

function ensureEnhancementStylesheet(html) {
  if (!/<script\b[^>]*\bsrc=["']script\.js["'][^>]*>/i.test(html)) return html;

  const stylesheetPattern = /<link\b(?=[^>]*\bhref=["']adelie-enhancements\.css["'])[^>]*>\s*/gi;
  const existingLinks = html.match(stylesheetPattern)?.length || 0;
  if (existingLinks === 1) return html;

  let updated = html.replace(stylesheetPattern, "");
  const link = '<link href="adelie-enhancements.css" rel="stylesheet"/>\n';

  const baseStylesheet = /<link\b(?=[^>]*\bhref=["']styles\.css["'])[^>]*>/i;
  if (baseStylesheet.test(updated)) {
    updated = updated.replace(baseStylesheet, match => `${match}\n${link.trimEnd()}`);
  } else {
    updated = updated.replace(/<\/head>/i, `${link}</head>`);
  }

  if (updated !== html) stats.stylesheetLinksNormalized += 1;
  return updated;
}

function ensureHomepageHeroPreload(html, fileName) {
  if (fileName !== "index.html") return html;
  const preloadPattern = /<link\b(?=[^>]*\brel=["']preload["'])(?=[^>]*(?:home-hero-(?:960|1600)\.webp))[^>]*>\s*/gi;
  const withoutOldPreload = html.replace(preloadPattern, "");
  const preload = '<link rel="preload" as="image" href="assets/optimized/home-hero-1600.webp" imagesrcset="assets/optimized/home-hero-960.webp 960w, assets/optimized/home-hero-1600.webp 1600w" imagesizes="100vw" fetchpriority="high"/>\n';
  const baseStylesheet = /<link\b(?=[^>]*\bhref=["']styles\.css["'])[^>]*>/i;
  const updated = baseStylesheet.test(withoutOldPreload)
    ? withoutOldPreload.replace(baseStylesheet, match => `${preload}${match}`)
    : withoutOldPreload.replace(/<\/head>/i, `${preload}</head>`);
  if (updated !== html) stats.heroPreloadsAdded += 1;
  return updated;
}

const htmlFiles = fs.readdirSync(repositoryRoot, { withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith(".html"))
  .map(entry => path.join(repositoryRoot, entry.name))
  .sort();

for (const htmlFile of htmlFiles) {
  const original = fs.readFileSync(htmlFile, "utf8");
  let updated = ensureEnhancementStylesheet(original);
  updated = ensureHomepageHeroPreload(updated, path.basename(htmlFile));
  updated = addImageDimensions(updated, htmlFile);

  if (updated === original) continue;
  stats.filesChanged += 1;
  if (shouldWrite) fs.writeFileSync(htmlFile, updated, "utf8");
}

const mode = shouldWrite ? "updated" : shouldCheck ? "check" : "preview";
console.log(`[performance-html] mode=${mode}`);
for (const [key, value] of Object.entries(stats)) console.log(`${key}: ${value}`);
if (missingImages.size) {
  console.warn(`missing image files: ${missingImages.size}`);
  for (const image of [...missingImages].sort()) console.warn(`- ${image}`);
}

if (shouldCheck && stats.filesChanged > 0) process.exitCode = 1;
