export function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB)) return null;
  if (vecA.length === 0 || vecB.length === 0) return null;
  if (vecA.length !== vecB.length) return null;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i];
    const b = vecB[i];
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }

  if (magA === 0 || magB === 0) return null;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
