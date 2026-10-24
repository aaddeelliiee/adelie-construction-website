import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const cities = ['carlsbad', 'del-mar', 'encinitas', 'escondido', 'fallbrook', 'oceanside', 'rancho-bernardo', 'san-marcos', 'vista'];
const replacements = [
  [/href="[^"]+-kitchen-remodeling\.html"/g, 'href="kitchen-remodeling.html"'],
  [/href="[^"]+-bathroom-remodeling\.html"/g, 'href="bathroom-remodeling.html"'],
  [/href="[^"]+-whole-home-remodeling\.html"/g, 'href="whole-home-remodeling.html"']
];

for (const city of cities) {
  const file = path.join(root, `${city}-remodeling.html`);
  let html = fs.readFileSync(file, 'utf8');
  for (const [pattern, replacement] of replacements) html = html.replace(pattern, replacement);
  html = html.replace(/<section class="section(?: soft)?">(?=\s*<div class="container">\s*<div class="section-heading centered"><p class="eyebrow dark">Popular Services<\/p>)/, match => match.replace('>', ' id="services">'));
  fs.writeFileSync(file, html);
}

console.log(`Consolidated internal links on ${cities.length} city hubs.`);
