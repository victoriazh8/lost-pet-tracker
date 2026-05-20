const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were', 'be', 'been',
  'has', 'have', 'had', 'he', 'she', 'it', 'they', 'we', 'i', 'my', 'his',
  'her', 'our', 'their', 'this', 'that', 'very', 'so', 'if', 'as', 'not',
  'no', 'up', 'out', 'about', 'last', 'seen', 'please', 'any', 'call',
  'contact', 'reward', 'help', 'lost', 'found', 'missing', 'pet', 'dog', 'cat',
]);

export function calculateMatch(pet, candidate) {
  let score = 0;
  const reasons = [];

  // 1. Breed (25 pts) — most specific identifier after image
  if (pet.breed && candidate.breed) {
    const petBreed = pet.breed.toLowerCase();
    const candBreed = candidate.breed.toLowerCase();

    if (petBreed === candBreed) {
      score += 25;
      reasons.push(`Same breed (${pet.breed})`);
    } else if (petBreed.includes(candBreed) || candBreed.includes(petBreed)) {
      score += 12;
      reasons.push(`Similar breed (${pet.breed} / ${candidate.breed})`);
    }
  }

  // 2. Color (25 pts) — second-most useful physical identifier
  if (pet.color && candidate.color) {
    const petColor = pet.color.toLowerCase();
    const candColor = candidate.color.toLowerCase();

    if (petColor === candColor) {
      score += 25;
      reasons.push(`Same color (${pet.color})`);
    } else {
      // Check for word-level overlap (e.g. "black and white" vs "mostly black")
      const petColorWords = petColor.split(/\s+/);
      const candColorWords = candColor.split(/\s+/);
      const colorOverlap = petColorWords.filter(w => w.length > 2 && candColorWords.includes(w));
      if (colorOverlap.length > 0) {
        score += 12;
        reasons.push(`Similar color (${pet.color} / ${candidate.color})`);
      }
    }
  }

  // 3. Location (20 pts) — skip if either side has no real location
  const knownLocation = (loc) => loc && loc.toLowerCase() !== 'unknown';
  if (knownLocation(pet.location) && knownLocation(candidate.location)) {
    const petLoc = pet.location.toLowerCase();
    const candLoc = candidate.location.toLowerCase();

    if (petLoc === candLoc) {
      score += 20;
      reasons.push(`Same location (${pet.location})`);
    } else if (petLoc.includes(candLoc) || candLoc.includes(petLoc)) {
      score += 10;
      reasons.push(`Nearby location (${candidate.location})`);
    }
  }

  // 4. Description similarity (20 pts) — with stop word filtering
  if (pet.description && candidate.description) {
    const petWords = pet.description.toLowerCase().split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w));
    const candWords = new Set(
      candidate.description.toLowerCase().split(/\s+/)
        .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    );

    const overlap = petWords.filter(w => candWords.has(w));

    if (overlap.length >= 3) {
      score += 20;
      reasons.push(`Similar description keywords`);
    } else if (overlap.length >= 1) {
      score += 8;
      reasons.push(`Some description overlap`);
    }
  }

  // 5. Date proximity (10 pts)
  const petDate = pet.dateLost || pet.dateReported;
  const candDate = candidate.dateLost || candidate.dateReported;
  if (petDate && candDate) {
    const diffDays = Math.abs((new Date(petDate) - new Date(candDate)) / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) {
      score += 10;
      reasons.push(`Reported within the same week`);
    } else if (diffDays <= 30) {
      score += 5;
      reasons.push(`Reported within the same month`);
    }
  }

  return {
    score: Math.min(score, 100),
    reasons
  };
}
