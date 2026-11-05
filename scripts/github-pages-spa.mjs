import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const index = resolve(dist, 'index.html');
const seoConfig = JSON.parse(readFileSync(resolve(root, 'src', 'seo.json'), 'utf8'));
const assets = resolve(dist, 'assets');

function findBuiltAsset(sourcePath) {
  const sourceName = basename(sourcePath);
  const extension = extname(sourceName);
  const prefix = `${sourceName.slice(0, -extension.length)}-`;
  const matches = readdirSync(assets).filter(
    (name) => name.startsWith(prefix) && name.endsWith(extension),
  );
  if (matches.length !== 1) {
    throw new Error(`Expected one built asset for "${sourcePath}", found ${matches.length}`);
  }
  return new URL(`assets/${matches[0]}`, seoConfig.siteUrl).href;
}

function escapeAttribute(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function replaceSeoAttribute(html, marker, attribute, value) {
  const tagPattern = new RegExp(`<[^>]*data-seo="${marker}"[^>]*>`);
  const tag = html.match(tagPattern)?.[0];
  if (!tag) throw new Error(`Missing SEO metadata marker "${marker}"`);

  const attributePattern = new RegExp(`\\b${attribute}="[^"]*"`);
  if (!attributePattern.test(tag)) throw new Error(`Missing ${attribute} attribute for "${marker}"`);
  const updatedTag = tag.replace(
    attributePattern,
    `${attribute}="${escapeAttribute(value)}"`,
  );
  return html.replace(tag, updatedTag);
}

function replaceStructuredData(html, data) {
  const pattern = /(<script\b[^>]*data-seo="structured-data"[^>]*>)[\s\S]*?(<\/script>)/;
  if (!pattern.test(html)) throw new Error('Missing structured data script marker');
  const serializedData = JSON.stringify(data).replace(/</g, '\\u003c');
  return html.replace(pattern, (_match, prefix, suffix) => `${prefix}${serializedData}${suffix}`);
}

function buildStructuredData(page, pageUrl, imageUrl, logoUrl) {
  const organizationId = new URL('#organization', seoConfig.siteUrl).href;
  const websiteId = new URL('#website', seoConfig.siteUrl).href;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: seoConfig.siteName,
        alternateName: seoConfig.alternateNames,
        url: seoConfig.siteUrl,
        logo: logoUrl,
        email: seoConfig.email,
        address: { '@type': 'PostalAddress', ...seoConfig.address },
      },
      {
        '@type': 'WebSite',
        '@id': websiteId,
        name: seoConfig.siteName,
        alternateName: seoConfig.alternateNames,
        url: seoConfig.siteUrl,
        publisher: { '@id': organizationId },
      },
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        name: page.title,
        description: page.description,
        url: pageUrl,
        isPartOf: { '@id': websiteId },
        primaryImageOfPage: {
          '@type': 'ImageObject',
          url: imageUrl,
        },
      },
    ],
  };
}

function applySeoMetadata(html, pageName) {
  const page = seoConfig.pages[pageName];
  const pageUrl = new URL(page.path, seoConfig.siteUrl).href;
  const imageUrl = findBuiltAsset(page.image);
  const logoUrl = findBuiltAsset(seoConfig.logo);
  const attributeValues = {
    description: ['content', page.description],
    keywords: ['content', seoConfig.keywords],
    canonical: ['href', pageUrl],
    sitemap: ['href', new URL('sitemap.xml', seoConfig.siteUrl).href],
    'og-type': ['content', 'website'],
    'og-site-name': ['content', seoConfig.siteName],
    'og-title': ['content', page.title],
    'og-description': ['content', page.description],
    'og-url': ['content', pageUrl],
    'og-image': ['content', imageUrl],
    'og-image-alt': ['content', page.imageAlt],
    'twitter-card': ['content', 'summary_large_image'],
    'twitter-title': ['content', page.title],
    'twitter-description': ['content', page.description],
    'twitter-image': ['content', imageUrl],
    'twitter-image-alt': ['content', page.imageAlt],
  };
  const titlePattern = /(<title\b[^>]*data-seo="title"[^>]*>)[\s\S]*?(<\/title>)/;
  if (!titlePattern.test(html)) throw new Error('Missing SEO title marker');
  let pageHtml = html.replace(
    titlePattern,
    (_match, prefix, suffix) => `${prefix}${escapeAttribute(page.title)}${suffix}`,
  );
  for (const [marker, [attribute, value]] of Object.entries(attributeValues)) {
    pageHtml = replaceSeoAttribute(pageHtml, marker, attribute, value);
  }
  pageHtml = replaceStructuredData(
    pageHtml,
    buildStructuredData(page, pageUrl, imageUrl, logoUrl),
  );
  return pageHtml.replace(/\sdata-seo="[^"]*"/g, '');
}

const sourceHtml = readFileSync(index, 'utf8');
const homeHtml = applySeoMetadata(sourceHtml, 'home');
writeFileSync(index, homeHtml);
copyFileSync(index, resolve(dist, '404.html'));

for (const pageName of Object.keys(seoConfig.pages).filter((name) => name !== 'home')) {
  const pageDirectory = resolve(dist, pageName);
  mkdirSync(pageDirectory, { recursive: true });
  writeFileSync(resolve(pageDirectory, 'index.html'), applySeoMetadata(sourceHtml, pageName));
}

const sitemapEntries = Object.values(seoConfig.pages)
  .map((page) => `  <url>\n    <loc>${new URL(page.path, seoConfig.siteUrl).href}</loc>\n  </url>`)
  .join('\n');
writeFileSync(
  resolve(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`,
);
writeFileSync(
  resolve(dist, 'robots.txt'),
  `User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap.xml', seoConfig.siteUrl).href}\n`,
);
