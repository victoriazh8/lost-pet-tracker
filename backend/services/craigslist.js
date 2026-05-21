// Craigslist Lost & Found HTML scraper
// Parses the static no-JS fallback from https://{city}.craigslist.org/search/laf
// RSS feed was blocked (403) as of early 2026

import { detectPetType, detectLostOrFound, isPetRelated, extractBreed, extractColor } from '../utils/extractors.js';

const CITY_SUBDOMAINS = {
  'new york':      'newyork',
  'nyc':           'newyork',
  'brooklyn':      'newyork',
  'queens':        'newyork',
  'san francisco': 'sfbay',
  'sf':            'sfbay',
  'los angeles':   'losangeles',
  'la':            'losangeles',
  'chicago':       'chicago',
  'seattle':       'seattle',
  'boston':        'boston',
  'miami':         'miami',
  'austin':        'austin',
  'denver':        'denver',
  'portland':      'portland',
  'atlanta':       'atlanta',
  'phoenix':       'phoenix',
};

function decodeHtmlEntities(str) {
  return str
    ?.replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .trim() || '';
}

function extractPostId(link) {
  const match = link.match(/\/(\d{10,})\.html/);
  return match ? match[1] : link;
}

export async function fetchCraigslistLostFound({ city = 'newyork', limit = 25 } = {}) {
  const subdomain = CITY_SUBDOMAINS[city.toLowerCase()] ?? city.toLowerCase().replace(/\s+/g, '');
  const url = `https://${subdomain}.craigslist.org/search/laf`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  if (!res.ok) {
    throw new Error(`Craigslist fetch failed (${res.status}) for city "${subdomain}"`);
  }

  const html = await res.text();

  const listingRegex = /<li\s+class="cl-static-search-result"\s+title="([^"]*)">\s*<a\s+href="([^"]*)">\s*<div class="title">([^<]*)<\/div>\s*[\s\S]*?<div class="location">\s*([\s\S]*?)\s*<\/div>/g;

  const items = [];
  let match;
  while ((match = listingRegex.exec(html)) !== null) {
    const title = decodeHtmlEntities(match[1]);
    const link = match[2];
    const location = decodeHtmlEntities(match[4]).trim();

    if (isPetRelated(title)) {
      items.push({ title, link, location });
    }

    if (items.length >= limit) break;
  }

  return { items, subdomain };
}

export function mapItemToPet(item, cityLabel) {
  const text = item.title;

  const location = item.location && item.location !== cityLabel
    ? `${item.location}, ${cityLabel}`
    : cityLabel;

  return {
    type:        detectLostOrFound(text),
    petType:     detectPetType(text),
    name:        null,
    breed:       extractBreed(text),
    color:       extractColor(text),
    location,
    dateLost:    null,
    description: item.title,
    imageUrl:    null,
    source:      'craigslist',
    externalId:  extractPostId(item.link),
    sourceUrl:   item.link,
  };
}
