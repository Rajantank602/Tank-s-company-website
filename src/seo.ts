import logoUrl from '../assets/logo.svg';
import terrainSocialImage from '../assets/terrain/1 (1).jpeg';
import tinySocialImage from '../assets/tiny/00.png';
import seoConfig from './seo.json';

type SeoPage = keyof typeof seoConfig.pages;
type MetaAttribute = 'name' | 'property';

const socialImages: Record<SeoPage, string> = {
  home: tinySocialImage,
  tiny: tinySocialImage,
  terrain: terrainSocialImage,
};

function setMetaContent(attribute: MetaAttribute, name: string, content: string) {
  let meta = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, name);
    document.head.append(meta);
  }
  meta.content = content;
}

export function updateSeoMetadata(pageName: SeoPage) {
  const page = seoConfig.pages[pageName];
  const canonicalUrl = new URL(page.path, seoConfig.siteUrl).href;
  const imageUrl = new URL(socialImages[pageName], window.location.origin).href;
  const logoImageUrl = new URL(logoUrl, window.location.origin).href;
  const organizationId = new URL('#organization', seoConfig.siteUrl).href;
  const websiteId = new URL('#website', seoConfig.siteUrl).href;

  document.title = page.title;
  setMetaContent('name', 'description', page.description);
  setMetaContent('name', 'keywords', seoConfig.keywords);
  setMetaContent('property', 'og:type', 'website');
  setMetaContent('property', 'og:site_name', seoConfig.siteName);
  setMetaContent('property', 'og:title', page.title);
  setMetaContent('property', 'og:description', page.description);
  setMetaContent('property', 'og:url', canonicalUrl);
  setMetaContent('property', 'og:image', imageUrl);
  setMetaContent('property', 'og:image:alt', page.imageAlt);
  setMetaContent('name', 'twitter:card', 'summary_large_image');
  setMetaContent('name', 'twitter:title', page.title);
  setMetaContent('name', 'twitter:description', page.description);
  setMetaContent('name', 'twitter:image', imageUrl);
  setMetaContent('name', 'twitter:image:alt', page.imageAlt);

  let canonicalLink = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.rel = 'canonical';
    document.head.append(canonicalLink);
  }
  canonicalLink.href = canonicalUrl;

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: seoConfig.siteName,
        alternateName: seoConfig.alternateNames,
        url: seoConfig.siteUrl,
        logo: logoImageUrl,
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
        '@id': `${canonicalUrl}#webpage`,
        name: page.title,
        description: page.description,
        url: canonicalUrl,
        isPartOf: { '@id': websiteId },
        primaryImageOfPage: {
          '@type': 'ImageObject',
          url: imageUrl,
        },
      },
    ],
  };
  let structuredDataScript = document.head.querySelector<HTMLScriptElement>('#structured-data');
  if (!structuredDataScript) {
    structuredDataScript = document.createElement('script');
    structuredDataScript.id = 'structured-data';
    structuredDataScript.type = 'application/ld+json';
    document.head.append(structuredDataScript);
  }
  structuredDataScript.textContent = JSON.stringify(structuredData);
}
