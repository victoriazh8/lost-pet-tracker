// Client-side pet data extraction — mirrors backend/utils/extractors.js
// Runs entirely in the extension popup, no API calls needed.

const DOG_KEYWORDS = ['dog', 'puppy', 'pup', 'canine', 'hound', 'retriever', 'shepherd', 'terrier', 'poodle', 'labrador', 'beagle', 'bulldog', 'pitbull', 'dachshund', 'chihuahua', 'corgi', 'husky', 'pomeranian', 'maltese'];
const CAT_KEYWORDS = ['cat', 'kitten', 'kitty', 'feline', 'tabby', 'calico', 'siamese', 'persian', 'bengal'];
const PET_KEYWORDS = [...DOG_KEYWORDS, ...CAT_KEYWORDS, 'pet', 'animal', 'bird', 'rabbit', 'bunny', 'hamster', 'parrot'];

const BREED_KEYWORDS = [
  'labrador', 'lab', 'golden retriever', 'retriever', 'german shepherd', 'shepherd',
  'bulldog', 'french bulldog', 'frenchie', 'pitbull', 'pit bull', 'poodle',
  'beagle', 'rottweiler', 'dachshund', 'boxer', 'husky', 'siberian husky',
  'corgi', 'great dane', 'doberman', 'shih tzu', 'pomeranian', 'chihuahua',
  'maltese', 'yorkshire', 'yorkie', 'border collie', 'collie', 'australian shepherd',
  'cocker spaniel', 'spaniel', 'jack russell', 'terrier', 'schnauzer',
  'tabby', 'calico', 'siamese', 'persian', 'bengal', 'maine coon', 'ragdoll',
  'sphynx', 'british shorthair', 'abyssinian', 'tuxedo',
].sort((a, b) => b.length - a.length);

const COLOR_KEYWORDS = [
  'black and white', 'brown and white', 'black and tan',
  'black', 'white', 'brown', 'tan', 'golden', 'red', 'orange', 'cream',
  'grey', 'gray', 'silver', 'brindle', 'merle', 'spotted', 'tricolor',
  'bi-color', 'sable', 'fawn', 'chocolate', 'blue', 'blonde', 'ginger',
].sort((a, b) => b.length - a.length);

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function detectPetType(text) {
  const lower = text.toLowerCase();
  if (DOG_KEYWORDS.some(k => lower.includes(k))) return 'dog';
  if (CAT_KEYWORDS.some(k => lower.includes(k))) return 'cat';
  return 'other';
}

function detectLostOrFound(text) {
  const lower = text.toLowerCase();
  if (lower.includes('found') || lower.includes('stray')) return 'found';
  return 'lost';
}

function isPetRelated(text) {
  const lower = text.toLowerCase();
  return PET_KEYWORDS.some(k => lower.includes(k));
}

function extractBreed(text) {
  const lower = text.toLowerCase();
  for (const breed of BREED_KEYWORDS) {
    if (lower.includes(breed)) return capitalize(breed);
  }
  return null;
}

function extractColor(text) {
  const lower = text.toLowerCase();
  for (const color of COLOR_KEYWORDS) {
    if (lower.includes(color)) return capitalize(color);
  }
  return null;
}

function extractLocation(text) {
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

function extractDate(text) {
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  const months = 'january|february|march|april|may|june|july|august|september|october|november|december';
  const namedMatch = text.match(new RegExp(`\\b(${months})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i'))
    || text.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${months})\\b`, 'i'));
  if (namedMatch) {
    const attempt = new Date(namedMatch[0]);
    if (!isNaN(attempt)) return attempt.toISOString().split('T')[0];
  }

  return null;
}

// Main entry: extract everything from raw text, no AI needed
function parsePost(text) {
  return {
    type:        detectLostOrFound(text),
    petType:     detectPetType(text),
    name:        null,
    breed:       extractBreed(text),
    color:       extractColor(text),
    location:    extractLocation(text),
    dateLost:    extractDate(text),
    description: text.slice(0, 300).trim() || null,
  };
}
