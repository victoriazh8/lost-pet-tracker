// Reddit r/lostpets — no API key required
// Uses Reddit's public JSON endpoint with a custom User-Agent

import { detectPetType, detectLostOrFound, isPetRelated, extractBreed, extractColor, extractLocation } from '../utils/extractors.js';

function extractImage(post) {
  if (post.preview?.images?.[0]?.source?.url) {
    return post.preview.images[0].source.url.replace(/&amp;/g, '&');
  }
  if (post.thumbnail && post.thumbnail.startsWith('http')) {
    return post.thumbnail;
  }
  return null;
}

export async function fetchRedditLostFound({ query = '', subreddit = 'lostpets', limit = 25 } = {}) {
  const url = query
    ? `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&sort=new&restrict_sr=1&limit=${limit}`
    : `https://www.reddit.com/r/${subreddit}/new.json?limit=${limit}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'lost-pet-tracker/1.0 (portfolio project)' },
  });

  if (!res.ok) throw new Error(`Reddit fetch failed (${res.status}) for query "${query}"`);

  const json = await res.json();
  const posts = json.data.children.map(c => c.data);

  return posts.filter(p => isPetRelated(p.title + ' ' + (p.selftext || '')));
}

export function mapPostToPet(post) {
  const text = post.title + ' ' + (post.selftext || '');

  return {
    type:        detectLostOrFound(text),
    petType:     detectPetType(text),
    name:        null,
    breed:       extractBreed(text),
    color:       extractColor(text),
    location:    extractLocation(post.title) ?? 'Unknown',
    dateLost:    new Date(post.created_utc * 1000).toISOString().split('T')[0],
    description: post.selftext?.trim() || post.title,
    imageUrl:    extractImage(post),
    source:      'reddit',
    externalId:  post.id,
    sourceUrl:   `https://www.reddit.com${post.permalink}`,
  };
}
