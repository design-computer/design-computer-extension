// Fixed set of template categories. MUST stay in sync with the web copy in
// web/lib/templates.ts (TEMPLATE_CATEGORIES) — the API validates against that list.
export const TEMPLATE_CATEGORIES = [
  'Portfolio',
  'Landing',
  'SaaS',
  'E-commerce',
  'Blog',
  'Restaurant',
  'Other',
] as const

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number]
