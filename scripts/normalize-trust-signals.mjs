import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === 'downloads' || entry.name === 'dist' || entry.name === 'node_modules' || entry.name === '.git') return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? htmlFiles(full) : entry.name.endsWith('.html') ? [full] : [];
  });
}

for (const file of htmlFiles(root)) {
  let html = fs.readFileSync(file, 'utf8');
  html = html
    .replaceAll('info@adelieconstruction.com', 'agustin@adelieconstruction.com')
    .replaceAll('hello@adelieconstruction.com', 'agustin@adelieconstruction.com')
    .replaceAll('https://adelieconstruction.com', 'https://www.adelieconstruction.com')
    .replaceAll('North County San Diego', 'San Diego County')
    .replaceAll('<a href="image-credits.html">Image Credits</a>', '<a href="image-credits.html">Image Credits</a>  ·  <a href="privacy.html">Privacy</a>')
    .replaceAll('<a href="../image-credits.html">Image Credits</a>', '<a href="../image-credits.html">Image Credits</a>  ·  <a href="../privacy.html">Privacy</a>')
    .replaceAll('<a href="privacy.html">Privacy</a>  ·  <a href="privacy.html">Privacy</a>', '<a href="privacy.html">Privacy</a>')
    .replaceAll('<a href="../privacy.html">Privacy</a>  ·  <a href="../privacy.html">Privacy</a>', '<a href="../privacy.html">Privacy</a>')
    .replaceAll('California Contractor License #1157923', 'California Contractor License <a href="https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/LicenseDetail.aspx?LicNum=1157923" rel="noopener" target="_blank">#1157923</a>');
  while (html.includes('<a href="privacy.html">Privacy</a>  ·  <a href="privacy.html">Privacy</a>')) html = html.replaceAll('<a href="privacy.html">Privacy</a>  ·  <a href="privacy.html">Privacy</a>', '<a href="privacy.html">Privacy</a>');
  while (html.includes('<a href="../privacy.html">Privacy</a>  ·  <a href="../privacy.html">Privacy</a>')) html = html.replaceAll('<a href="../privacy.html">Privacy</a>  ·  <a href="../privacy.html">Privacy</a>', '<a href="../privacy.html">Privacy</a>');
  fs.writeFileSync(file, html);
}

const reviews = path.join(root, 'reviews.html');
let reviewHtml = fs.readFileSync(reviews, 'utf8');
if (!reviewHtml.includes('name="robots"')) reviewHtml = reviewHtml.replace(/(<meta content="width=device-width, initial-scale=1(?:\.0)?" name="viewport"\/>)/, '$1<meta name="robots" content="noindex,follow"/>');
reviewHtml = reviewHtml
  .replace('Read and share customer feedback about ADELIE Construction\'s transparent remodeling process and craftsmanship.', 'Review verification information and ADELIE Construction’s published working standards. Verified customer feedback will be added only with a confirmed source.')
  .replace('Read and share customer feedback about ADELIE Construction\'s transparent remodeling process and craftsmanship.', 'Review verification information and ADELIE Construction’s published working standards. Verified customer feedback will be added only with a confirmed source.');
fs.writeFileSync(reviews, reviewHtml);

console.log('Normalized public contact, canonical entity URLs, license verification and privacy links.');
