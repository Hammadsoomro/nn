/**
 * SEO utilities for managing meta tags dynamically
 */

interface SEOConfig {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  keywords?: string[];
}

/**
 * Update document title and meta tags for SEO
 */
export function updateSEO(config: SEOConfig): void {
  // Update title
  if (config.title) {
    document.title = config.title;

    // Update Open Graph title
    updateMetaTag("property", "og:title", config.title);
    updateMetaTag("name", "twitter:title", config.title);
  }

  // Update description
  if (config.description) {
    updateMetaTag("name", "description", config.description);
    updateMetaTag("property", "og:description", config.description);
    updateMetaTag("name", "twitter:description", config.description);
  }

  // Update image
  if (config.image) {
    updateMetaTag("property", "og:image", config.image);
    updateMetaTag("name", "twitter:image", config.image);
  }

  // Update URL
  if (config.url) {
    updateMetaTag("property", "og:url", config.url);
    updateMetaTag("name", "twitter:url", config.url);
    updateCanonicalLink(config.url);
  }

  // Update type
  if (config.type) {
    updateMetaTag("property", "og:type", config.type);
  }

  // Update keywords
  if (config.keywords && config.keywords.length > 0) {
    updateMetaTag("name", "keywords", config.keywords.join(", "));
  }
}

/**
 * Update or create a meta tag
 */
function updateMetaTag(
  attrName: "name" | "property",
  attrValue: string,
  content: string,
): void {
  let tag = document.querySelector(`meta[${attrName}="${attrValue}"]`);

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attrName, attrValue);
    document.head.appendChild(tag);
  }

  tag.setAttribute("content", content);
}

/**
 * Update canonical link
 */
function updateCanonicalLink(url: string): void {
  let link = document.querySelector('link[rel="canonical"]');

  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }

  link.setAttribute("href", url);
}

/**
 * Set structured data (JSON-LD) for search engines
 */
export function setStructuredData(data: Record<string, any>): void {
  let script = document.querySelector('script[type="application/ld+json"]');

  if (!script) {
    script = document.createElement("script");
    script.setAttribute("type", "application/ld+json");
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(data);
}

/**
 * Organization schema markup
 */
export function setOrganizationSchema(): void {
  setStructuredData({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "TaskFlow",
    description:
      "Professional team management platform with queue tracking features",
    url: "https://taskflow.app",
    logo: "https://taskflow.app/icon-192x192.png",
    sameAs: [
      "https://twitter.com/taskflow",
      "https://facebook.com/taskflow",
      "https://linkedin.com/company/taskflow",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Support",
      email: "support@taskflow.app",
    },
  });
}

/**
 * WebApplication schema markup
 */
export function setWebApplicationSchema(): void {
  setStructuredData({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "TaskFlow",
    description:
      "Professional team management platform with queue tracking features",
    url: "https://taskflow.app",
    applicationCategory: "BusinessApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    screenshot: [
      "https://taskflow.app/screenshot-1.png",
      "https://taskflow.app/screenshot-2.png",
    ],
  });
}

/**
 * Breadcrumb schema markup
 */
export function setBreadcrumbSchema(
  items: Array<{ name: string; url: string }>,
): void {
  setStructuredData({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  });
}

/**
 * Reset SEO to default values
 */
export function resetSEO(): void {
  updateSEO({
    title: "TaskFlow - Team Management &amp; Queue Tracking Platform",
    description:
      "Professional team management platform with queued line tracking, claims management, and advanced features for teams.",
    url: window.location.href,
    type: "website",
    keywords: [
      "team management",
      "collaboration",
      "task tracking",
      "queue management",
    ],
  });
}
