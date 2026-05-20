import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cosineSimilarity } from '../utils/similarity.js';

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const vec = [1, 2, 3, 4, 5];
    const result = cosineSimilarity(vec, vec);
    assert.ok(Math.abs(result - 1) < 1e-10);
  });

  it('returns -1 for opposite vectors', () => {
    const a = [1, 0, 0];
    const b = [-1, 0, 0];
    const result = cosineSimilarity(a, b);
    assert.ok(Math.abs(result - (-1)) < 1e-10);
  });

  it('returns 0 for orthogonal vectors', () => {
    const a = [1, 0];
    const b = [0, 1];
    const result = cosineSimilarity(a, b);
    assert.ok(Math.abs(result) < 1e-10);
  });

  it('returns null for empty arrays', () => {
    assert.equal(cosineSimilarity([], []), null);
  });

  it('returns null for mismatched lengths', () => {
    assert.equal(cosineSimilarity([1, 2], [1, 2, 3]), null);
  });

  it('returns null for non-array inputs', () => {
    assert.equal(cosineSimilarity(null, [1, 2]), null);
    assert.equal(cosineSimilarity('abc', [1]), null);
  });

  it('returns null for zero vectors', () => {
    assert.equal(cosineSimilarity([0, 0, 0], [1, 2, 3]), null);
  });
});
