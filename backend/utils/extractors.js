export const DOG_KEYWORDS = ['dog', 'puppy', 'pup', 'canine', 'hound', 'retriever', 'shepherd', 'terrier', 'poodle', 'labrador', 'beagle', 'bulldog', 'pitbull', 'dachshund', 'chihuahua', 'corgi', 'husky', 'pomeranian', 'maltese'];
export const CAT_KEYWORDS = ['cat', 'kitten', 'kitty', 'feline', 'tabby', 'calico', 'siamese', 'persian', 'bengal'];
export const PET_KEYWORDS = [...DOG_KEYWORDS, ...CAT_KEYWORDS, 'pet', 'animal', 'bird', 'rabbit', 'bunny', 'hamster', 'parrot'];

export const BREED_KEYWORDS = [
  'labrador', 'lab', 'golden retriever', 'retriever', 'german shepherd', 'shepherd',
  'bulldog', 'french bulldog', 'frenchie', 'pitbull', 'pit bull', 'poodle',
  'beagle', 'rottweiler', 'dachshund', 'boxer', 'husky', 'siberian husky',
  'corgi', 'great dane', 'doberman', 'shih tzu', 'pomeranian', 'chihuahua',
  'maltese', 'yorkshire', 'yorkie', 'border collie', 'collie', 'australian shepherd',
  'cocker spaniel', 'spaniel', 'jack russell', 'terrier', 'schnauzer',
  'tabby', 'calico', 'siamese', 'persian', 'bengal', 'maine coon', 'ragdoll',
  'sphynx', 'british shorthair', 'abyssinian', 'tuxedo',
];

export const COLOR_KEYWORDS = [
  'black', 'white', 'brown', 'tan', 'golden', 'red', 'orange', 'cream',
  'grey', 'gray', 'silver', 'brindle', 'merle', 'spotted', 'tricolor',
  'bi-color', 'sable', 'fawn', 'chocolate', 'blue', 'blonde', 'ginger',
  'black and white', 'brown and white', 'black and tan',
];

export function detectPetType(text) {
  const lower = text.toLowerCase();
  if (DOG_KEYWORDS.some(k => lower.includes(k))) return 'dog';
  if (CAT_KEYWORDS.some(k => lower.includes(k))) return 'cat';
  return 'other';
}

export function detectLostOrFound(text) {
  const lower = text.toLowerCase();
  if (lower.includes('found') || lower.includes('stray')) return 'found';
  return 'lost';
}

export function isPetRelated(text) {
  const lower = text.toLowerCase();
  return PET_KEYWORDS.some(k => lower.includes(k));
}

export function extractBreed(text) {
  const lower = text.toLowerCase();
  const sorted = [...BREED_KEYWORDS].sort((a, b) => b.length - a.length);
  for (const breed of sorted) {
    if (lower.includes(breed)) return breed.charAt(0).toUpperCase() + breed.slice(1);
  }
  return null;
}

export function extractColor(text) {
  const lower = text.toLowerCase();
  const sorted = [...COLOR_KEYWORDS].sort((a, b) => b.length - a.length);
  for (const color of sorted) {
    if (lower.includes(color)) return color.charAt(0).toUpperCase() + color.slice(1);
  }
  return null;
}

export function extractLocation(text) {
  if (!text) return null;

  const dashMatch = text.match(/-\s*([A-Z][A-Za-z\s]+(?:,\s*[A-Z]{2})?)\s*$/);
  if (dashMatch) return dashMatch[1].trim();

  const prepMatch = text.match(/\b(?:in|near)\s+([A-Z][A-Za-z\s]+(?:,\s*[A-Z]{2})?)\b/i);
  if (prepMatch) return prepMatch[1].trim();

  const bracketMatch = text.match(/\[([A-Za-z\s,]+)\]/);
  if (bracketMatch) return bracketMatch[1].trim();

  const cityStateMatch = text.match(/\b([A-Z][a-z]+(?: [A-Z][a-z]+)*,\s*[A-Z]{2})\b/);
  if (cityStateMatch) return cityStateMatch[1].trim();

  return null;
}

export function extractDate(text) {
  // ISO date: 2026-03-15
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  // Month name: "March 15" or "March 15th" or "15 March"
  const months = 'january|february|march|april|may|june|july|august|september|october|november|december';
  const namedMatch = text.match(new RegExp(`\\b(${months})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i'))
    || text.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${months})\\b`, 'i'));
  if (namedMatch) {
    // Strip ordinal suffix ("15th" → "15") then add current year so JS can parse it
    const clean = namedMatch[0].replace(/\b(\d+)(st|nd|rd|th)\b/i, '$1').trim();
    const attempt = new Date(`${clean} ${new Date().getFullYear()}`);
    if (!isNaN(attempt)) return attempt.toISOString().split('T')[0];
  }

  return null;
}
