import { absoluteUrl } from "./metadata";

/**
 * BreadcrumbList schema -- gives Google (and AI answer engines pulling
 * structured facts rather than crawling prose) an explicit "where does this
 * page sit" signal, which is also what drives the breadcrumb trail
 * sometimes shown under a search result instead of the raw URL.
 */
export function getBreadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
