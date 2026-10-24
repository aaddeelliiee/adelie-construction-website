import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const pages = [
  ['Is $100K Enough to Remodel a House?','is-100k-enough-to-remodel-a-house-san-diego.html','A realistic look at what a six-figure budget can cover in San Diego.'],
  ['Home Remodeling Cost in San Diego','home-remodeling-cost-san-diego.html','Planning ranges, inclusions and the limits of cost-per-square-foot estimates.'],
  ['Kitchen Remodel Cost in San Diego','kitchen-remodel-cost-san-diego.html','How cabinetry, appliances, layout and systems shape a kitchen budget.'],
  ['Bathroom Remodel Cost in San Diego','bathroom-remodel-cost-san-diego.html','Scope-based guidance for waterproofing, tile, plumbing and fixtures.'],
  ['What Can You Remodel With $50K?','what-can-you-remodel-with-50k.html','Focused project options and the choices that protect a $50,000 budget.'],
  ['Is It Cheaper to Remodel or Rebuild?','remodel-or-rebuild.html','Compare retained structure, approvals, uncertainty, time and total cost.'],
  ['Whole-Home Remodel Cost per Square Foot','whole-home-remodel-cost-per-square-foot-san-diego.html','Use square-foot benchmarks without overlooking room mix and soft costs.'],
  ['ADU Cost in San Diego','adu-cost-san-diego.html','Budget around ADU type, utilities, site access and professional services.'],
  ['Bathroom Remodel Permits in California','bathroom-remodel-permit-california.html','Which changes commonly require permits and how to verify locally.'],
  ['How Long Does a Whole-House Remodel Take?','how-long-does-a-whole-house-remodel-take.html','Plan design, permits, procurement, construction, inspections and closeout.']
];

const hub = `<section class="section" id="remodel-cost-guides"><div class="container"><p class="eyebrow dark">Remodeling Cost &amp; FAQ Hub</p><h2>Start with the questions homeowners ask most.</h2><p class="section-intro">These locally focused guides use scope, inclusions and current official requirements to turn broad online estimates into better planning questions.</p><div class="guide-card-grid">${pages.map(([title,href,description],i)=>`<article class="guide-card"><span class="guide-type">${i < 4 ? 'Priority Cost Guide' : 'Planning FAQ'}</span><h3>${title}</h3><p>${description}</p><a href="${href}">Read guide →</a></article>`).join('')}</div></div></section>`;

const resourcesPath = path.join(root,'resources.html');
let resources = fs.readFileSync(resourcesPath,'utf8');
if (!resources.includes('id="remodel-cost-guides"')) {
  const marker = '<section class="section authority-tools"><div class="container"><p class="eyebrow dark">Planning Tools &amp; Deeper Guides</p>';
  if (!resources.includes(marker)) throw new Error('Resources insertion marker not found');
  resources = resources.replace(marker, hub + marker);
  fs.writeFileSync(resourcesPath,resources);
}

const homePath = path.join(root,'index.html');
let home = fs.readFileSync(homePath,'utf8');
home = home.replace('<h3>Kitchen Remodel Cost Guide</h3><p>Build a realistic budget around scope, selections and existing conditions.</p><a href="kitchen-remodel-cost-guide.html">Read guide →</a>', '<h3>Is $100K Enough to Remodel?</h3><p>See what a six-figure remodeling budget can realistically cover in San Diego.</p><a href="is-100k-enough-to-remodel-a-house-san-diego.html">Read guide →</a>');
home = home.replace('<h3>Choosing a Contractor</h3><p>Compare scopes, communication and change-order processes with confidence.</p><a href="choosing-a-contractor-guide.html">Read guide →</a>', '<h3>Home Remodeling Cost in San Diego</h3><p>Understand planning ranges, inclusions and the choices that change the total.</p><a href="home-remodeling-cost-san-diego.html">Read guide →</a>');
fs.writeFileSync(homePath,home);

const sitemapPath = path.join(root,'sitemap.xml');
let sitemap = fs.readFileSync(sitemapPath,'utf8');
const urls = pages.map(([,href],i)=>`<url><loc>https://www.adelieconstruction.com/${href}</loc><lastmod>2026-10-24</lastmod><priority>${i < 4 ? '0.9' : '0.8'}</priority></url>`).join('\n');
if (!sitemap.includes('is-100k-enough-to-remodel-a-house-san-diego.html')) {
  sitemap = sitemap.replace('</urlset>', `${urls}\n</urlset>`);
  fs.writeFileSync(sitemapPath,sitemap);
}

console.log('Integrated SEO hub into resources, homepage and sitemap.');
