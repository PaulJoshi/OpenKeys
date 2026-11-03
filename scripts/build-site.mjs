// Writes the static info pages (site/pages.mjs) into dist/ after `vite build`, plus sitemap.xml.
// The pages are plain HTML so search engines read them without running the app. They reuse the app's
// design tokens and the fonts Vite already emitted into dist/assets.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGES, SITE, COMPARED_ON, UPDATED, FEATURES } from '../site/pages.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const base = process.env.BASE ?? '/';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const url = (slug) => `${SITE}/${slug ? slug + '/' : ''}`;
const href = (slug) => `${base}${slug ? slug + '/' : ''}`;

// CSS: tokens with font URLs pointed at Vite's hashed copies, then the page styles.
const assets = readdirSync(join(dist, 'assets'));
const tokens = readFileSync(join(root, 'src/ui/design/tokens.css'), 'utf8').replace(/url\("\.\/fonts\/([^".]+)\.woff2"\)/g, (m, name) => {
  const file = assets.find((f) => f.startsWith(name + '-') && f.endsWith('.woff2'));
  if (!file) throw new Error(`build-site: no emitted font for ${name}; run vite build first`);
  return `url("${base}assets/${file}")`;
});
writeFileSync(join(dist, 'site.css'), tokens + '\n' + readFileSync(join(root, 'site/site.css'), 'utf8'));

const CHEVRON =
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const stripTags = (s) => s.replace(/<[^>]+>/g, '');

const header = (page) => `<header class="top"><div class="wrap">
<a class="brand" href="${href('')}">OpenKeys</a>
<nav aria-label="Main">
<a class="hide-sm" href="${href('learn-piano-free')}"${page.slug === 'learn-piano-free' ? ' aria-current="page"' : ''}>How it works</a>
<a class="hide-sm" href="${href('alternatives')}"${page.slug === 'alternatives' ? ' aria-current="page"' : ''}>Compare</a>
<a class="btn sm" href="${href('')}">Open app</a>
</nav></div></header>`;

const footer = () => `<footer><div class="wrap">
<div class="cols">
<div><b>OpenKeys</b><a href="${href('')}">Open the app</a><a href="${href('learn-piano-free')}">Learn piano free</a><a href="https://github.com/PaulJoshi/OpenKeys">Source code on GitHub</a></div>
<div><b>Compare</b><a href="${href('alternatives')}">All piano apps</a>${PAGES.filter((p) => p.them).map((p) => `<a href="${href(p.slug)}">${esc(p.them.name)} alternative</a>`).join('')}</div>
<div><b>Project</b><a href="https://github.com/PaulJoshi/OpenKeys/blob/main/LICENSE">MIT licence</a><a href="https://github.com/PaulJoshi/OpenKeys/blob/main/docs/ACCURACY.md">Microphone accuracy</a><a href="https://github.com/PaulJoshi/OpenKeys/issues">Report a problem</a></div>
</div>
<p class="legal">OpenKeys is free and open source, made by Paul Joshi and contributors. Yousician, Synthesia, Simply Piano and flowkey are trademarks of their owners; OpenKeys is not affiliated with or endorsed by them. Comparisons reflect public information as of ${COMPARED_ON} and may change.</p>
</div></footer>`;

const table = (t) => `<div class="table-scroll"><table>
<thead><tr><th scope="col"></th>${t.cols.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead>
<tbody>${t.rows.map(([label, ...cells]) => `<tr><th scope="row">${esc(label)}</th>${cells.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('\n')}</tbody>
</table></div>
<p class="note">Compared in ${COMPARED_ON} from each app's public information. Prices and features change, so check their sites.</p>`;

const faq = (items) => `<div class="faq">${items
  .map(([q, a]) => `<details><summary>${esc(q)}${CHEVRON}</summary><div class="a"><p>${esc(a)}</p></div></details>`)
  .join('\n')}</div>`;

const tiles = () => `<div class="tiles">${FEATURES.map(([h, p]) => `<div class="tile"><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`).join('')}</div>`;

const related = (page) => {
  const others = PAGES.filter((p) => p.slug !== page.slug);
  return `<div class="links">${others.map((p) => `<a href="${href(p.slug)}">${esc(p.h1)}<span>${esc(p.title.split(' · ')[0])}</span></a>`).join('')}</div>`;
};

function jsonLd(page) {
  const crumbs = [{ name: 'OpenKeys', item: url('') }];
  if (page.slug !== 'alternatives' && page.them) crumbs.push({ name: 'Compare', item: url('alternatives') });
  crumbs.push({ name: page.nav, item: url(page.slug) });
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: page.title,
      description: page.description,
      url: url(page.slug),
      dateModified: UPDATED,
      inLanguage: 'en',
      isPartOf: { '@type': 'WebSite', name: 'OpenKeys', url: url('') },
      about: { '@type': 'WebApplication', name: 'OpenKeys', url: url(''), applicationCategory: 'EducationalApplication', operatingSystem: 'Any', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.item })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: page.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: stripTags(a) } })),
    },
  ];
}

function render(page) {
  const them = page.them;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}" />
<link rel="canonical" href="${url(page.slug)}" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<meta name="theme-color" content="#111111" />
<link rel="icon" type="image/svg+xml" href="${base}icon.svg" />
<link rel="apple-touch-icon" href="${base}icon-192.png" />
<link rel="preload" href="${base}site.css" as="style" />
<link rel="stylesheet" href="${base}site.css" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="OpenKeys" />
<meta property="og:url" content="${url(page.slug)}" />
<meta property="og:title" content="${esc(page.h1)}" />
<meta property="og:description" content="${esc(page.description)}" />
<meta property="og:image" content="${SITE}/og-image.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(page.h1)}" />
<meta name="twitter:description" content="${esc(page.description)}" />
<meta name="twitter:image" content="${SITE}/og-image.jpg" />
${jsonLd(page).map((d) => `<script type="application/ld+json">${JSON.stringify(d)}</script>`).join('\n')}
</head>
<body>
${header(page)}
<main><div class="wrap">
<p class="crumbs"><a href="${href('')}">OpenKeys</a>${them ? ` / <a href="${href('alternatives')}">Compare</a>` : ''} / ${esc(page.nav)}</p>
<section>
<h1 class="display">${esc(page.h1)}</h1>
<p class="lede">${esc(page.lede)}</p>
<div class="row"><a class="btn primary" href="${href('')}">Start playing</a><a class="btn" href="https://github.com/PaulJoshi/OpenKeys">View source</a></div>
<figure class="shot"><img src="${base}img/practice.jpg" width="1280" height="780" alt="OpenKeys practice screen: sheet music with notes marked right and wrong, falling notes and an on-screen piano keyboard" /><figcaption>Practising in OpenKeys: sheet music, falling notes and the keyboard, in a browser.</figcaption></figure>
</section>
<section>
${page.intro.map((p) => `<p>${esc(p)}</p>`).join('\n')}
</section>
${page.table ? `<section><h2>${them ? `OpenKeys and ${esc(them.name)} side by side` : 'At a glance'}</h2>${table(page.table)}</section>` : ''}
${them ? `<section><h2>When OpenKeys is the better fit</h2><ul class="plain">${page.better.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></section>
<section><h2>When ${esc(them.name)} is the better fit</h2><ul class="plain">${page.worse.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></section>` : ''}
${(page.sections ?? []).map((s) => `<section><h2>${esc(s.h2)}</h2>${s.html}</section>`).join('\n')}
<section><h2>What OpenKeys does</h2>${tiles()}</section>
<section><h2>Questions</h2>${faq(page.faq)}</section>
<section><h2>Try it now</h2><p>OpenKeys opens in your browser in a few seconds. No account, nothing to install.</p><div class="row"><a class="btn primary" href="${href('')}">Start playing</a></div></section>
<section><h2>More</h2>${related(page)}</section>
</div></main>
${footer()}
</body>
</html>
`;
}

for (const page of PAGES) {
  const dir = join(dist, page.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), render(page));
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${['', ...PAGES.map((p) => p.slug)].map((s) => `  <url><loc>${url(s)}</loc><lastmod>${UPDATED}</lastmod></url>`).join('\n')}
</urlset>
`;
writeFileSync(join(dist, 'sitemap.xml'), sitemap);
console.log(`build-site: ${PAGES.length} pages and sitemap.xml written to dist/`);
