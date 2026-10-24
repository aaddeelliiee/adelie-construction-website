import fs from 'node:fs';
import path from 'node:path';
import {articles,sources} from './academy-batch-content.mjs';
import {ACADEMY_REDIRECTS,laterGroups,standaloneNotes} from './academy-consolidation.mjs';
const root=path.resolve(import.meta.dirname,'..');
const origin='https://www.adelieconstruction.com';
const date='2026-10-24';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const write=(f,s)=>fs.writeFileSync(path.join(root,f),s);
const inventory=JSON.parse(read('scripts/academy-original-inventory.json'));
const originalMedia=JSON.parse(read('scripts/academy-original-media.json'));
if(inventory.length!==126)throw new Error('Expected the original 126 archived articles');
const bySlug=new Map(articles.map(a=>[a.slug,a]));
const future=new Map(laterGroups.flatMap(([target,slugs,note])=>slugs.map(slug=>[slug,{target,note}])));
const paragraphFrequency=new Map();
for(const a of inventory)for(const p of new Set(a.originalParagraphs))paragraphFrequency.set(p,(paragraphFrequency.get(p)||0)+1);
const audit=inventory.map(a=>{
  const replacement=ACADEMY_REDIRECTS.get(a.url.slice(1));
  const later=future.get(a.slug);
  const note=standaloneNotes[a.slug];
  if(!bySlug.has(a.slug)&&!replacement&&!later&&!note)throw new Error('Unreviewed topic: '+a.slug);
  return {title:a.title,url:a.url,originalWords:a.originalWordCount,repeatedParagraphs:a.originalParagraphs.filter(p=>p.length>80&&paragraphFrequency.get(p)>1).length,
    action:bySlug.has(a.slug)?'Rewritten in batch 1':replacement?'Merged in batch 1':later&&later.target!==a.slug?'Keep noindex; merge in a later batch':'Keep noindex; rewrite in a later batch',
    destination:replacement||(later?'/academy/'+later.target+'.html':a.url),
    rationale:bySlug.has(a.slug)?'Distinct homeowner decision; rewritten with specific planning steps, primary sources and related guides.':replacement?'Useful intent is covered by the destination; consolidate the repetitive standalone version.':later?.note||note,
    originalScope:a.description};
});

for(const a of articles){
  const original=inventory.find(x=>x.slug===a.slug);
  const file='academy/'+a.slug+'.html';let h=read(file);
  const photos=originalMedia[a.slug]||[];
  const sectionHtml=a.sections.map(([heading,body],i)=>`<section${i===0?' class="answer-first"':''} id="section-${i+1}"><h2>${esc(heading)}</h2>${body}</section>${i===1&&photos[0]?photos[0]:i===3&&photos[1]?photos[1]:''}`).join('\n');
  const main=`<main id="main-content"><article class="academy-article"><div class="container academy-article-wrap">
<nav aria-label="Breadcrumb" class="academy-breadcrumb"><a href="../index.html">Home</a><span>›</span><a href="../academy.html">Academy</a><span>›</span><span>${esc(original.category)}</span></nav>
<header class="academy-article-header"><p class="eyebrow dark">${esc(original.category)}</p><h1>${esc(a.title)}</h1><p class="academy-dek">${esc(a.intro)}</p><div class="academy-meta">Updated October 24, 2026 · ADELIE Construction · Sources below</div></header>
<nav aria-label="In this guide"><strong>In this guide</strong><ul>${a.sections.map(([heading],i)=>`<li><a href="#section-${i+1}">${esc(heading)}</a></li>`).join('')}</ul></nav>
${sectionHtml}
<section><h2>Questions homeowners ask</h2>${a.faq.map(([q,answer])=>`<h3>${esc(q)}</h3><p>${esc(answer)}</p>`).join('\n')}</section>
<section id="sources"><h2>Sources and local requirements</h2><p>References checked October 24, 2026. City of San Diego guidance applies within that city; other cities and unincorporated areas have their own authorities. Product instructions apply to the specified system.</p><ul>${a.sources.map(k=>`<li><a href="${esc(sources[k][1])}">${esc(sources[k][0])}</a></li>`).join('')}</ul></section>
<section class="related-reading"><h2>Continue planning your project</h2><ul>${a.links.map(([label,url])=>`<li><a href="${esc(url)}">${esc(label)}</a></li>`).join('')}</ul><a href="../academy.html#new-guides">Explore the updated Academy guides</a></section>
<section aria-label="Discuss your remodel" class="academy-contact-cta"><p class="eyebrow dark">Your next step</p><h2>Bring your questions and the details of your home.</h2><p>Share the property location, your goals and any drawings or records you already have. We can discuss project fit and the next steps toward a defined construction scope.</p><a class="button primary" href="../contact.html#lead-form">Discuss Your Project</a></section>
<aside class="academy-disclaimer">General homeowner planning guidance. Confirm property-specific requirements with the responsible authority and qualified project professionals.</aside>
</div></article></main>`;
  h=h.replace(/<main\b[\s\S]*?<\/main>/,main).replace(/<title>[\s\S]*?<\/title>/,`<title>${esc(a.title)} | ADELIE</title>`);
  h=h.replace(/<meta\b[^>]*name="robots"[^>]*>/gi,'');
  h=h.replace(/<meta\b[^>]*name="description"[^>]*>/,`<meta name="description" content="${esc(a.description)}"/>`);
  h=h.replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g,'');
  h=h.replace(/<meta\b[^>]*(?:property="og:[^"]+"|name="twitter:[^"]+")[^>]*>/g,'');
  const url=origin+'/'+file;
  const schema={'@context':'https://schema.org','@graph':[
    {'@type':'Article',headline:a.title,description:a.description,dateModified:date,inLanguage:'en-US',mainEntityOfPage:url,url,author:{'@type':'Organization',name:'ADELIE Construction',url:origin+'/about.html'},publisher:{'@type':'Organization',name:'ADELIE Construction',url:origin+'/'},citation:a.sources.map(k=>sources[k][1])},
    {'@type':'BreadcrumbList',itemListElement:[{ '@type':'ListItem',position:1,name:'Home',item:origin+'/'},{'@type':'ListItem',position:2,name:'Academy',item:origin+'/academy.html'},{'@type':'ListItem',position:3,name:a.title,item:url}]}
  ]};
  h=h.replace('</head>',`<meta property="og:type" content="article"/><meta property="og:title" content="${esc(a.title)}"/><meta property="og:description" content="${esc(a.description)}"/><meta property="og:url" content="${url}"/><meta name="twitter:card" content="summary"/><meta name="twitter:title" content="${esc(a.title)}"/><meta name="twitter:description" content="${esc(a.description)}"/><script type="application/ld+json">${JSON.stringify(schema).replaceAll('<','\\u003c')}</script></head>`);
  write(file,h);
}

// Use final URLs in published navigation and related links, without changing anchor meaning.
for(const file of [...fs.readdirSync(root).filter(f=>f.endsWith('.html')),...fs.readdirSync(path.join(root,'academy')).filter(f=>f.endsWith('.html')).map(f=>'academy/'+f)]){
  if(ACADEMY_REDIRECTS.has(file))continue;
  let h=read(file);let changed=false;
  h=h.replace(/href="([^"]+)"/g,(match,href)=>{
    if(/^(?:mailto:|tel:|#|javascript:)/i.test(href))return match;
    let u;try{u=new URL(href,origin+'/'+file)}catch{return match}
    if(u.origin!==origin)return match;
    const target=ACADEMY_REDIRECTS.get(u.pathname.slice(1));if(!target)return match;
    changed=true;return `href="${target}${u.search}${u.hash}"`;
  });if(changed)write(file,h);
}

const allEntries=fs.readdirSync(path.join(root,'academy')).filter(f=>f.endsWith('.html')&&!ACADEMY_REDIRECTS.has('academy/'+f)).map(f=>{
  const slug=f.slice(0,-5), old=inventory.find(a=>a.slug===slug), current=bySlug.get(slug), h=read('academy/'+f);
  const noindex=/<meta\b[^>]*noindex[^>]*>/i.test(h);
  return {title:current?.title||old?.title||h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1],slug,url:'/academy/'+f,category:old?.category||'High-End Details & Modern Finishes',category_slug:old?.category_slug||'high-end-modern-finishes',description:current?.description||old?.description||h.match(/<p class="academy-dek">([\s\S]*?)<\/p>/)?.[1]||'',dateModified:current?date:old?.dateModified||'2026-07-11',status:noindex?'archived':'current'};
});
const archiveCount=allEntries.filter(a=>a.status==='archived').length;
let hub=read('academy.html');
const listItem=a=>`<li><a href="${a.url}">${esc(a.title)}</a><p>${esc(a.description)}</p>${a.status==='archived'?'<small>Archived reference · Awaiting rewrite</small>':''}</li>`;
const featured=articles.map(a=>allEntries.find(e=>e.slug===a.slug));
const categories=[...new Set(allEntries.filter(a=>!bySlug.has(a.slug)).map(a=>a.category))];
const library=`<div class="container academy-library"><section class="academy-category" id="new-guides" data-category="updated-guides"><div class="academy-category-heading"><p class="eyebrow dark">12 updated guides</p><h2>Start with a decision you need to make.</h2><p>Practical planning guidance with official references, specific questions to ask and links to the next step.</p></div><ol class="academy-article-list">${featured.map(listItem).join('')}</ol></section>${categories.map(cat=>{const entries=allEntries.filter(a=>a.category===cat&&!bySlug.has(a.slug));return `<section class="academy-category" data-category="${entries[0].category_slug}" id="${entries[0].category_slug}"><div class="academy-category-heading"><p class="eyebrow dark">${entries.length} guides and references</p><h2>${esc(cat)}</h2></div><ol class="academy-article-list">${entries.map(listItem).join('')}</ol></section>`}).join('')}</div>`;
hub=hub.replace(/<div class="container academy-library">[\s\S]*?(?=<section class="section soft"><div class="container split-grid">)/,library);
hub=hub.replace(/<section class="academy-hero">[\s\S]*?<\/section>/,`<section class="academy-hero"><div class="container"><p class="eyebrow">ADELIE Remodeling Academy</p><h1>Make the next remodeling decision with better information.</h1><p>Start with 12 updated guides on project planning, approvals and construction details. Explore the existing guides to modern finishes, or search the reference library below.</p><div class="academy-stat-row"><strong>12 updated planning guides</strong><span>13 modern-finish guides</span><span>Searchable by topic</span><span>Free planning tools</span></div><a class="button primary" href="#new-guides">Read the Updated Guides</a> <a class="button secondary" href="downloads.html">Download Workbooks</a></div></section>`);
hub=hub.replace(/<section class="section soft"><div class="container narrow"><p class="eyebrow dark">Library status[\s\S]*?<\/section>/,`<section class="section soft"><div class="container narrow"><p class="eyebrow dark">Using the library</p><h2>Guidance for your next conversation.</h2><p>The updated guides explain decisions to make before ordering, demolition or final approval. Older references are labeled as archived while they await rewriting; confirm their details before relying on them.</p></div></section>`);
hub=hub.replace(/<p aria-live="polite" id="academy-results">[\s\S]*?<\/p>/,`<p aria-live="polite" id="academy-results">Showing ${allEntries.length} guides and references.</p>`);
hub=hub.replace(/<nav aria-label="Academy categories"[\s\S]*?<\/nav>/,`<nav aria-label="Academy categories" class="academy-category-nav"><a href="#new-guides">Updated Guides</a>${categories.map(cat=>{const a=allEntries.find(a=>a.category===cat);return `<a href="#${a.category_slug}">${esc(cat)}</a>`}).join('')}</nav>`);
hub=hub.replace(/<title>[\s\S]*?<\/title>/,'<title>Remodeling Academy: San Diego Homeowner Guides | ADELIE</title>');
hub=hub.replace(/<meta\b[^>]*name="description"[^>]*>/,'<meta name="description" content="Plan your remodel with ADELIE’s guides to condo renovations, ADUs, permits, kitchen layouts, shower waterproofing and project budgets."/>');
hub=hub.replace('Use the sourced cornerstone guides as current educational starting points.','Start with the updated planning guides and sourced modern-finish guides.');
const collection={'@context':'https://schema.org','@type':'CollectionPage',name:'ADELIE Remodeling Academy',description:'Updated homeowner planning guides, modern-finish guides and clearly labeled archived references.',url:origin+'/academy.html',dateModified:date,mainEntity:{'@type':'ItemList',numberOfItems:25,itemListElement:allEntries.filter(a=>a.status==='current').map((a,i)=>({'@type':'ListItem',position:i+1,url:origin+a.url,name:a.title}))}};
hub=hub.replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g,'');
hub=hub.replace('</head>',`<script type="application/ld+json">${JSON.stringify(collection).replaceAll('<','\\u003c')}</script></head>`);
write('academy.html',hub);
write('academy-index.json',JSON.stringify({name:'ADELIE Remodeling Academy',articleCount:allEntries.length,currentArticleCount:25,archivedArticleCount:archiveCount,lastModified:date,articles:allEntries},null,2)+'\n');
const ai=JSON.parse(read('ai-index.json'));ai.remodelingAcademy.articleCount=allEntries.length;ai.remodelingAcademy.currentArticleCount=25;ai.remodelingAcademy.archivedArticleCount=archiveCount;write('ai-index.json',JSON.stringify(ai,null,2)+'\n');
write('llms.txt',read('llms.txt').replace(/- 126 articles across[^\n]+/,`- ${allEntries.length} guides and references: 25 current guides and ${archiveCount} archived references awaiting rewriting. Check each article's status before citing it.`));
write('llms-full.txt',read('llms-full.txt').replace(/- 126 articles across[^\n]+/,`- ${allEntries.length} guides and references: 25 current guides and ${archiveCount} archived references awaiting rewriting. Check each article's status before citing it.`));
const knowledge=JSON.parse(read('knowledge-base.json'));
knowledge.academy.articleCount=allEntries.length;
knowledge.academy.currentArticleCount=25;
knowledge.academy.archivedArticleCount=archiveCount;
knowledge.academy.categories=[...new Set(allEntries.map(a=>a.category))].map(category=>({name:category,slug:allEntries.find(a=>a.category===category).category_slug,articleCount:allEntries.filter(a=>a.category===category).length}));
write('knowledge-base.json',JSON.stringify(knowledge,null,2)+'\n');
let sitemap=read('sitemap.xml');for(const a of articles){const url=origin+'/academy/'+a.slug+'.html';if(!sitemap.includes('<loc>'+url+'</loc>'))sitemap=sitemap.replace('</urlset>',`<url><loc>${url}</loc><lastmod>${date}</lastmod></url>\n</urlset>`);}
sitemap=sitemap.replace(/(<loc>https:\/\/www.adelieconstruction.com\/academy.html<\/loc><lastmod>)[^<]+/,`$1${date}`);write('sitemap.xml',sitemap);

const output=path.resolve(root,'../../outputs');fs.mkdirSync(output,{recursive:true});
const fields=['title','url','action','destination','rationale','originalScope','originalWords','repeatedParagraphs'];
const csvCell=v=>'"'+String(v).replaceAll('"','""')+'"';
fs.writeFileSync(path.join(output,'academy-126-page-review.csv'),'\ufeff'+[fields.map(csvCell).join(','),...audit.map(row=>fields.map(f=>csvCell(row[f])).join(','))].join('\r\n'));
fs.writeFileSync(path.join(output,'academy-126-page-review.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>ADELIE Academy Content Review</title><style>body{font:16px/1.5 system-ui;margin:40px auto;max-width:1250px;padding:0 24px;color:#202626}h1{font-size:36px}input{font:inherit;padding:12px;width:min(90%,600px)}table{border-collapse:collapse;width:100%;margin-top:24px}th,td{text-align:left;padding:14px;border-bottom:1px solid #ddd;vertical-align:top}th{background:#f5edd5}small{display:block;color:#555}td:first-child{min-width:190px}td:nth-child(2){min-width:150px}code{overflow-wrap:anywhere}a{color:#745300}</style><h1>ADELIE Academy: review of all 126 archived pages</h1><p>Prepared October 24, 2026. Draft changes only; not deployed. Prioritization uses topic intent, relevance to ADELIE services, overlap and content quality. It is not a search-volume ranking; Search Console and conversion data were not available.</p><p><strong>12 rewritten guides · ${ACADEMY_REDIRECTS.size} pages consolidated · ${archiveCount} archived pages retained for later work.</strong> The 13 existing modern-finish guides are outside this 126-page review and remain available.</p><p>Each original article was checked for its question, scope, body content, repeated paragraphs and fit with other pages. Original wording often repeats a generic decision/price template; several technical notes discuss the wrong subject. New guides retain the site layout, use primary references and do not invent projects, prices or expert-review credentials.</p><p>“Merged in batch 1” means a permanent redirect is prepared to the listed completed destination. “Merge in a later batch” is a recommendation only: the old URL stays noindex until that destination is ready. “Repeated paragraphs” counts body paragraphs longer than 80 characters shared verbatim with another original article; it excludes headers but can include shared calls to action. This is a diagnostic, not a Google scoring metric.</p><label for="filter">Find a page, topic or action</label><br><input id="filter" type="search" placeholder="Try permits, rewritten, condo, later"><p id="count">126 pages</p><table><thead><tr><th>Original page</th><th>Action / destination</th><th>Editorial finding and next step</th></tr></thead><tbody>${audit.map(a=>`<tr><td><strong>${esc(a.title)}</strong><small>${esc(a.url)}</small><small>${a.originalWords} original words; ${a.repeatedParagraphs} repeated paragraphs</small></td><td>${esc(a.action)}<small>${esc(a.destination)}</small></td><td>${esc(a.rationale)}<small>Original scope: ${esc(a.originalScope)}</small></td></tr>`).join('')}</tbody></table><script>document.querySelector('#filter').addEventListener('input',e=>{let n=0;for(const row of document.querySelectorAll('tbody tr')){row.hidden=!row.textContent.toLowerCase().includes(e.target.value.toLowerCase());if(!row.hidden)n++}document.querySelector('#count').textContent=n+' pages';});</script></html>`);
console.log(JSON.stringify({reviewed:audit.length,rewritten:articles.length,merged:ACADEMY_REDIRECTS.size,remainingArchived:archiveCount,libraryEntries:allEntries.length},null,2));
