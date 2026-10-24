export const SITE_ORIGIN = "https://www.adelieconstruction.com";

export const CITY_SLUGS = [
  "carlsbad",
  "del-mar",
  "encinitas",
  "escondido",
  "fallbrook",
  "oceanside",
  "rancho-bernardo",
  "san-marcos",
  "vista",
];

export const CITY_SERVICE_SUFFIXES = [
  "kitchen-remodeling",
  "bathroom-remodeling",
  "whole-home-remodeling",
];

export const REMOVED_CITY_SERVICE_REDIRECTS = new Map(
  CITY_SLUGS.flatMap((city) =>
    CITY_SERVICE_SUFFIXES.map((service) => [
      `${city}-${service}.html`,
      `/${city}-remodeling.html`,
    ]),
  ),
);

export const EXCLUDED_ROOT_HTML = new Set([
  "HOMEPAGE_SECTION.html",
  ...REMOVED_CITY_SERVICE_REDIRECTS.keys(),
]);

export const SITEMAP_EXCLUDED_PATHS = new Set([
  "/academy-index.json",
  "/reviews.html",
  ...[...REMOVED_CITY_SERVICE_REDIRECTS.keys()].map((file) => `/${file}`),
]);

export const GUIDE_SCHEMA_FILES = [
  "bathroom-planning-guide.html",
  "bathroom-remodel-cost-guide.html",
  "change-orders-guide.html",
  "choosing-a-contractor-guide.html",
  "contractor-estimate-comparison-guide.html",
  "kitchen-planning-guide.html",
  "kitchen-remodel-cost-guide.html",
  "living-through-remodel-guide.html",
  "material-selection-guide.html",
  "quartz-vs-granite-guide.html",
  "remodel-timeline-guide.html",
  "remodeling-planning-guide.html",
  "san-diego-remodel-permit-guide.html",
  "whole-home-remodel-guide.html",
];
