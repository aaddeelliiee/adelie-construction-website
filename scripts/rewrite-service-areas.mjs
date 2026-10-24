import fs from 'node:fs';
import path from 'node:path';
import { areas, supplemental } from './service-area-content.mjs';
const root = path.resolve(import.meta.dirname, '..');
const origin = 'https://www.adelieconstruction.com/';
const esc = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const pages = [...areas.map(p=>({...p,file:p.slug+'-remodeling.html'})), ...supplemental];
const titles = new Set();
for (const p of pages) {
  if (titles.has(p.title)) throw new Error('Duplicate title');
  titles.add(p.title);
  const file = path.join(root,p.file);
  let html = fs.readFileSync(file,'utf8');
  const originalMain = html.match(/<main\b[^>]*>[\s\S]*?<\/main>/)?.[0];
  if (!originalMain) throw new Error('Missing main: '+p.file);
  const hero = originalMain.match(/<section\b[^>]*class="[^"]*page-hero[^>]*>/)?.[0];
  if (!hero) throw new Error('Missing hero: '+p.file);
  const landmark = originalMain.match(/<section class="section soft city-photo-section">[\s\S]*?<\/section>/)?.[0] || '';
  const refs = ids => ids.map(i=>{
    if(!p.sources[i]) throw new Error('Missing source '+p.file);
    return `<a href="${esc(p.sources[i][1])}">${esc(p.sources[i][0])}</a>`;
  }).join('; ');
  const sections = p.sections.map(([heading,text,...sources],i)=>`<section class="section${i%2?' soft':''}" id="local-${i+1}"><div class="container narrow"><h2>${esc(heading)}</h2><p>${esc(text)}</p>${sources.length?`<p class="source-note">Local reference: ${refs(sources)}.</p>`:''}</div></section>`).join('\n');
  const directory = p.file==='san-diego-county-remodeling.html' ? `<section class="section"><div class="container"><h2>Find the planning guide for your community</h2><div class="county-city-grid">${areas.map(a=>`<a href="${a.slug}-remodeling.html"><strong>${esc(a.name)}</strong><span>${esc(a.title.split(': ')[1])}</span></a>`).join('')}</div></div></section>` : '';
  const main = `<main id="main-content">
${hero}<div class="hero-overlay"></div><div class="container reveal visible"><p class="eyebrow">ADELIE Construction · ${esc(p.name)}</p><h1>${esc(p.title)}</h1><p class="hero-copy">${esc(p.intro)}</p><div class="button-row"><a class="button primary" href="contact.html">Discuss Your ${esc(p.name)} Project</a><a class="button ghost" href="#local-resources">Local Planning Resources</a></div></div></section>
${sections}
${landmark}
<section class="section soft"><div class="container narrow"><h2>Bring these details to the first project conversation</h2><ul>${p.checklist.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><p>Use this list to prepare for a discussion with ADELIE. Site conditions and the responsible permitting authority determine the final scope.</p></div></section>
<section class="section"><div class="container narrow"><h2>${esc(p.question)}</h2><p>${esc(p.answer)}</p></div></section>
${directory}
<section class="section soft" id="local-resources"><div class="container narrow"><h2>${esc(p.name)} planning resources</h2><p>Official references checked October 24, 2026. Follow the linked authority for current requirements. Planning examples on this page describe options to evaluate; they are not completed ADELIE projects or property-specific approvals.</p><ul>${p.sources.map(([name,url])=>`<li><a href="${esc(url)}">${esc(name)}</a></li>`).join('')}</ul></div></section>
<section class="section" id="services"><div class="container narrow"><h2>Develop the scope for your home</h2><div class="related-guides">${p.links.map(([name,url])=>`<a href="${url}">${esc(name)}</a>`).join('')}<a href="areas.html">Explore other service areas</a></div></div></section>
<section class="section final-cta"><div class="container"><p class="eyebrow">Your ${esc(p.name)} Project</p><h2>Start with the property and the problem you want to solve.</h2><p>Share your address, the rooms or outdoor areas involved, and any plans or permit information you already have. We will discuss project fit, available scope and next steps.</p><a class="button primary" href="contact.html">Request a Consultation</a></div></section>
</main>`;
  html = html.replace(originalMain,main);
  const title = esc(p.title.length < 53 ? p.title+' | ADELIE' : p.title);
  const description = esc(`${p.title}. Explore local requirements, property planning questions and official resources with ADELIE Construction.`);
  html = html.replace(/<title>[\s\S]*?<\/title>/,`<title>${title}</title>`);
  html = html.replace(/<meta\b[^>]*(?:name="description"|property="og:description"|name="twitter:description")[^>]*>/g,tag=>tag.replace(/content="[^"]*"/,`content="${description}"`));
  html = html.replace(/<meta\b[^>]*(?:property="og:title"|name="twitter:title")[^>]*>/g,tag=>tag.replace(/content="[^"]*"/,`content="${title}"`));
  // Retain the business identity; replace old service/page facts with this page's scope.
  html = html.replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g,tag=>tag.includes('data-schema="business-v43"')?tag:'');
  const url = origin+p.file;
  const placeType = p.name==='San Diego County'?'AdministrativeArea':['Fallbrook','Rancho Bernardo'].includes(p.name)?'Place':'City';
  const schema = {'@context':'https://schema.org','@graph':[
    {'@type':'WebPage','@id':url,name:p.title,url,description:p.intro,dateModified:'2026-10-24',about:{'@type':placeType,name:p.name},citation:p.sources.map(s=>s[1])},
    {'@type':'Service',name:`Residential remodeling in ${p.name}`,url,areaServed:{'@type':placeType,name:p.name},provider:{'@id':origin+'#business'}},
    {'@type':'BreadcrumbList',itemListElement:[{ '@type':'ListItem',position:1,name:'Home',item:origin},{'@type':'ListItem',position:2,name:'Service Areas',item:origin+'areas.html'},{'@type':'ListItem',position:3,name:p.title,item:url}]}
  ]};
  html=html.replace('</head>',`<script type="application/ld+json" data-schema="local-guidance">${JSON.stringify(schema).replaceAll('<','\\u003c')}</script></head>`);
  fs.writeFileSync(file,html);
}
console.log(`Rewrote ${pages.length} service-area pages, preserving each existing header, footer and hero image.`);
