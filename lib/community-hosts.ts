// Match patterns for the bundled community sites. These are granted as static
// host_permissions at install so the built-in rating rules work out of the box.
// Arbitrary user-picked sites go through optional_host_permissions instead.

// A handful of common Google TLDs. Other ccTLDs can be added by the user via the
// picker (which requests the optional permission for that origin on demand).
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

export const COMMUNITY_MATCHES: string[] = [
  "*://*.imdb.com/*",
  "*://*.myanimelist.net/*",
  "*://*.letterboxd.com/*",
  "*://*.goodreads.com/*",
  "*://*.trakt.tv/*",
  "*://*.anilist.co/*",
  "*://*.hardcover.app/*",
  ...GOOGLE_TLDS.map((tld) => `*://www.google.${tld}/search*`),
];
