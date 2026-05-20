// Content script — injected into the active tab to extract page text and image.
// Only runs when triggered by the popup via chrome.scripting.executeScript.

(() => {
  const host = location.hostname;

  // --- Extract text ---

  const selected = window.getSelection()?.toString()?.trim();
  let text = '';

  if (selected && selected.length > 20) {
    text = selected.slice(0, 3000);
  } else {
    // Site-specific text selectors
    const siteTextSelectors = {
      'reddit.com':     ['[data-testid="post-container"]', '.Post', 'shreddit-post', '.thing .entry'],
      'nextdoor.com':   ['[data-testid="post-body"]', '.post-detail-content', '.content-body'],
      'facebook.com':   ['[data-ad-preview="message"]', '[data-testid="post_message"]', '.userContent'],
      'craigslist.org': ['#postingbody', '.posting-body'],
      'citizen.com':    ['.incident-description', '.detail-text'],
    };

    let found = false;
    for (const [domain, selectors] of Object.entries(siteTextSelectors)) {
      if (host.includes(domain)) {
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) {
            const t = el.innerText?.trim();
            if (t && t.length > 20) { text = t.slice(0, 3000); found = true; break; }
          }
        }
        break;
      }
    }

    // Generic fallback
    if (!found) {
      const genericSelectors = ['article', '[role="main"]', 'main', '.post-content', '.post-body', '.entry-content', '#content'];
      for (const sel of genericSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          const t = el.innerText?.trim();
          if (t && t.length > 30) { text = t.slice(0, 3000); break; }
        }
      }
    }

    if (!text) text = (document.body.innerText || '').slice(0, 3000);
  }

  // Also grab the page title — often has key info like "Lost dog in Brooklyn"
  const title = document.title || '';
  if (title && !text.includes(title)) {
    text = title + '\n' + text;
  }

  // --- Extract image ---

  let imageUrl = null;

  // 1. Site-specific image selectors (most reliable)
  const siteImageSelectors = {
    'reddit.com': [
      '[data-testid="post-container"] img[src*="i.redd.it"]',
      '[data-testid="post-container"] img[src*="preview.redd.it"]',
      'shreddit-post img[src*="i.redd.it"]',
      'shreddit-post img[src*="preview.redd.it"]',
      '.Post img[src*="i.redd.it"]',
      '.Post img[src*="preview.redd.it"]',
      '.thing .entry img[src*="i.redd.it"]',
    ],
    'nextdoor.com': [
      '.post-detail-content img',
      '[data-testid="post-body"] img',
      '.media-attachment img',
    ],
    'facebook.com': [
      '.userContent img',
      '[data-testid="post_message"] img',
      'img[data-visualcompletion="media-vc-image"]',
    ],
    'craigslist.org': [
      '.slide img',
      '.gallery img',
      '#thumbs img',
      '.iw img',
    ],
  };

  for (const [domain, selectors] of Object.entries(siteImageSelectors)) {
    if (host.includes(domain)) {
      for (const sel of selectors) {
        const img = document.querySelector(sel);
        const src = img?.src || img?.dataset?.src;
        if (src && src.startsWith('http')) {
          imageUrl = src.replace(/&amp;/g, '&');
          break;
        }
      }
      break;
    }
  }

  // 2. Open Graph / Twitter card (good fallback, but can be site logos)
  if (!imageUrl) {
    const ogImage = document.querySelector('meta[property="og:image"]')?.content
      || document.querySelector('meta[name="twitter:image"]')?.content;
    if (ogImage && ogImage.startsWith('http')) {
      // Skip obvious site logos/icons
      const lower = ogImage.toLowerCase();
      const isLikelyLogo = lower.includes('logo') || lower.includes('icon') || lower.includes('favicon')
        || lower.includes('brand') || lower.includes('/static/') || lower.endsWith('.svg');
      if (!isLikelyLogo) {
        imageUrl = ogImage;
      }
    }
  }

  // 3. Largest real image in content area
  if (!imageUrl) {
    const contentEl = document.querySelector('article, [role="main"], main') || document.body;
    const imgs = Array.from(contentEl.querySelectorAll('img'));

    const skipPatterns = [
      /logo/i, /icon/i, /favicon/i, /avatar/i, /profile/i, /badge/i,
      /emoji/i, /button/i, /arrow/i, /spinner/i, /loading/i,
      /ad[s]?[_-]/i, /tracking/i, /pixel/i, /beacon/i,
      /\.svg$/i, /data:image/i, /1x1/i,
    ];

    const candidate = imgs
      .map(img => {
        const src = img.src || img.dataset?.src || img.dataset?.lazySrc || img.dataset?.original || '';
        return { img, src };
      })
      .filter(({ src }) => {
        if (!src || !src.startsWith('http')) return false;
        if (skipPatterns.some(p => p.test(src))) return false;
        return true;
      })
      .filter(({ img }) => {
        const w = img.naturalWidth || img.width || parseInt(img.getAttribute('width')) || 0;
        const h = img.naturalHeight || img.height || parseInt(img.getAttribute('height')) || 0;
        return w >= 150 && h >= 150;
      })
      .sort((a, b) => {
        const aSize = (a.img.naturalWidth || a.img.width) * (a.img.naturalHeight || a.img.height);
        const bSize = (b.img.naturalWidth || b.img.width) * (b.img.naturalHeight || b.img.height);
        return bSize - aSize;
      })[0];

    if (candidate) {
      imageUrl = candidate.src.replace(/&amp;/g, '&');
    }
  }

  // --- Scan feed posts (for bulk import on group/feed pages) ---
  // Collect post elements across all known feed layouts, deduplicating nested matches.
  const feedPosts = [];
  const seen = new Set();
  const articles = [
    'shreddit-post',                  // New Reddit
    '[data-testid="post-container"]', // Reddit (older redesign)
    '[role="article"]',               // Facebook, Nextdoor, generic
    'article',                        // Generic fallback
  ].flatMap(sel => Array.from(document.querySelectorAll(sel)))
   .filter(el => {
     // Skip if we've already seen this element or an ancestor of it
     if (seen.has(el)) return false;
     seen.add(el);
     return true;
   });

  // Domains that serve site chrome / avatars / mascots — never actual pet photos
  const skipImageDomains = [
    'redditstatic.com',    // Reddit static assets (Snoo mascot, icons)
    'redditmedia.com',     // Reddit community/user avatars
    'redd.it/snoo',        // Snoo avatar variants
  ];

  for (const article of articles) {
    // Prefer a specific post-body element; fall back to the whole article
    const bodyEl = article.querySelector(
      '[data-ad-comet-preview="message"], [data-testid="post_message"], ' +
      '.userContent, [data-ad-preview="message"]'
    ) || article;

    const postText = (bodyEl.innerText || '').trim();
    if (postText.length < 50) continue;

    // Extract a reliable external ID if available (Reddit post IDs, etc.)
    // shreddit-post exposes data-fullname="t3_abc123"
    const externalId = article.dataset?.fullname
      || article.dataset?.postId
      || article.id
      || null;

    // Grab the first real content image, skipping site chrome
    const imgEl = Array.from(article.querySelectorAll('img')).find(img => {
      const src = img.src || '';
      if (!src.startsWith('http')) return false;
      if (skipImageDomains.some(d => src.includes(d))) return false;
      return img.naturalWidth > 100 && img.naturalHeight > 100;
    });
    const postImage = imgEl?.src || null;

    feedPosts.push({
      text: postText.slice(0, 2000),
      imageUrl: postImage,
      externalId,
    });
  }

  return { text: text.slice(0, 3000), imageUrl, feedPosts };
})();
