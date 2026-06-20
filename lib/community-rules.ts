// Bundled community rules - the seed list, ported from the original per-site
// stylesheets. Contributors add/improve these via PR (see docs/DESIGN.md §5).
// Some sites' originally hand-tuned partial overlays are approximated here as
// whole-element blur/scratchcard; refine via PR as needed.

import type { Effect } from "./types";

export interface CommunityRule {
  /** Comma-separated CSS selector group. */
  selector: string;
  effect: Effect;
  /** Blur radius px; defaults to 8. */
  intensity?: number;
  grayscale?: boolean;
  /** Regex source to redact only matching text inside the match. See lib/text.ts. */
  text?: string;
}

export interface CommunitySite {
  id: string;
  /** Hostname suffixes this site matches. */
  hosts: string[];
  /** Default scratchcard overlay color for the site's theme. */
  bg?: string;
  rules: CommunityRule[];
}

const GOOGLE_TLDS = [
  "com",
  "co.uk",
  "ca",
  "com.au",
  "de",
  "fr",
  "es",
  "it",
  "nl",
  "co.in",
  "co.jp",
  "com.br",
  "ru",
  "pl",
];

export const COMMUNITY_SITES: CommunitySite[] = [
  {
    id: "imdb",
    hosts: ["imdb.com"],
    bg: "#e0e0e0",
    rules: [
      {
        selector:
          '.ratings-bar, .ratings_wrapper, .titleReviewBar, .rating, .rating-list, .tinystarbar, .ipl-rating-widget, .ratings-metascore, .rating_txt, .rating-other-user-rating, .imdbRatingPlugin, .ipc-poster-card__rating-star-group, .ipc-reaction-summary, .metacritic-score-label, .ipc-voting__label__count, [class*="TitleBlock__RatingContainer"], [class*="RatingBar__RatingContainer"], [data-testid="hero-rating-bar__aggregate-rating"], [data-testid="reviewContent-all-reviews"]',
        effect: "blur",
      },
      { selector: ".ipc-rating-star--imdb", effect: "blur", intensity: 24 },
      {
        selector:
          '[data-testid="hero-rating-bar__popularity"], .metacritic-score-box',
        effect: "blur",
        grayscale: true,
      },
      { selector: '[data-testid="rating-histogram-chart"]', effect: "both" },
    ],
  },
  {
    id: "mal",
    hosts: ["myanimelist.net"],
    rules: [
      {
        selector:
          '[itemprop="aggregateRating"], .bottom-navi .icon-reaction, .mal-ratings-wrapper, #myinfo_score, td .js-top-ranking-score-col, .information .scormem, .anime-detail-header-stats .stats-block .score',
        effect: "blur",
      },
      { selector: ".ranking-unit .info", effect: "blur", intensity: 5 },
      { selector: "td.friend-score-cell", effect: "blur" },
      {
        selector: "#topSearchResultList .extra-info",
        effect: "blur",
        intensity: 6,
      },
    ],
  },
  {
    id: "letterboxd",
    hosts: ["letterboxd.com"],
    bg: "#2c2c2c",
    rules: [
      {
        selector:
          ".poster-meta, .poster-views, .poster-likes, .filmstat-watches, .filmstat-lists, .filmstat-likes, .filmstat-top250, .rating",
        effect: "blur",
      },
      { selector: ".inline-rating, .rating-histogram", effect: "both" },
      { selector: "span.rating", effect: "scratchcard" },
    ],
  },
  {
    id: "goodreads",
    hosts: ["goodreads.com"],
    bg: "#ddd",
    rules: [
      {
        selector:
          '#bookMeta, .staticStars, .communityRating, .AverageRating, .AggregateRating, .RatingStatistics, .BookStatistics__ratingStatistics, .BookStatistics__histogram, [itemprop="aggregateRating"], .avg_rating, th.rating',
        effect: "blur",
      },
      {
        selector: ".RatingStars, .RatingsHistogram, .minirating",
        effect: "both",
      },
    ],
  },
  {
    id: "trakt",
    hosts: ["trakt.tv"],
    bg: "#1a1a2e",
    rules: [
      {
        selector:
          ".trakt-summary-card-rating, .trakt-summary-ratings, .trakt-user-rating, .metadata .percentage, li.trakt-rating, .corner-rating, .sentiments-wrapper",
        effect: "blur",
      },
    ],
  },
  {
    id: "anilist",
    hosts: ["anilist.co"],
    bg: "#1e2535",
    rules: [
      { selector: ".chart.media-score-distribution", effect: "both" },
      {
        selector: ".score, .scoreLabel, .follow > span, .score-value",
        effect: "blur",
        grayscale: true,
      },
    ],
  },
  {
    id: "hardcover",
    hosts: ["hardcover.app"],
    bg: "#1e2030",
    rules: [
      { selector: "p:has(svg.fill-accent)", effect: "scratchcard" },
      {
        selector:
          "div.flex.flex-wrap:has(p.inline svg.fill-yellow-400), div:has(> div.mt-2 svg rect[data-tooltip-id]), div.relative.flex.flex-row:has(svg.text-yellow-400)",
        effect: "both",
      },
    ],
  },
  {
    id: "google",
    hosts: GOOGLE_TLDS.map((tld) => `google.${tld}`),
    rules: [
      {
        selector:
          'g-review-stars, g-review-stars ~ span, .a19vA, .uo4vr, .tsAqzf, [data-attrid="kc:/ugc:user_reviews"], [data-attrid="kc:/film/film:reviews"], [data-attrid="kc:/book/book:reviews"], [data-attrid="kc:/tv/tv_program:reviews"]',
        effect: "blur",
        intensity: 15,
      },
    ],
  },
];
