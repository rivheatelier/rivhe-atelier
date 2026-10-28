/** Product categories, in the order the shop lists them. Products store the label. */
export const CATEGORIES = [
  { slug: "bags", label: "Bags" },
  { slug: "table-runners", label: "Table Runners" },
  { slug: "scrunchies", label: "Scrunchies" },
  { slug: "tissue-box-covers", label: "Tissue Box Covers" },
  { slug: "pouches", label: "Pouches" },
  { slug: "blankets", label: "Blankets" },
  { slug: "others", label: "Others" },
] as const;

export type Category = (typeof CATEGORIES)[number];

/** The category a `?category=` value names: its slug, or its label as older links used. */
export function findCategory(value: string | undefined): Category | undefined {
  const key = value?.trim().toLowerCase();
  return key ? CATEGORIES.find((c) => c.slug === key || c.label.toLowerCase() === key) : undefined;
}

export function isCategoryLabel(label: string): boolean {
  return CATEGORIES.some((c) => c.label === label);
}

export const categoryHref = (category: Category) => `/shop?category=${category.slug}`;
