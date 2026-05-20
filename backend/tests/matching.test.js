import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateMatch } from '../utils/matching.js';

describe('calculateMatch', () => {
  const basePet = {
    type: 'lost', petType: 'dog', name: 'Buddy',
    breed: 'Golden Retriever', color: 'Golden',
    location: 'Brooklyn, NY', dateLost: '2026-03-01',
    description: 'Friendly golden retriever wearing red collar, very playful',
  };

  const baseCandidate = {
    type: 'found', petType: 'dog', name: null,
    breed: 'Golden Retriever', color: 'Golden',
    location: 'Brooklyn, NY', dateReported: '2026-03-03',
    description: 'Found friendly golden wearing collar, very playful dog',
  };

  it('returns max score for a perfect match', () => {
    const { score, reasons } = calculateMatch(basePet, baseCandidate);
    assert.equal(score, 100);
    assert.ok(reasons.length > 0);
  });

  it('scores 0 when nothing matches', () => {
    const candidate = {
      type: 'found', petType: 'dog',
      breed: 'Chihuahua', color: 'Black',
      location: 'Miami, FL', dateReported: '2025-01-01',
      description: 'tiny nervous shaking',
    };
    const { score } = calculateMatch(basePet, candidate);
    assert.equal(score, 0);
  });

  // Breed scoring
  it('gives 25 pts for exact breed match', () => {
    const pet = { ...basePet, color: null, location: null, description: null, dateLost: null };
    const cand = { ...baseCandidate, color: null, location: null, description: null, dateReported: null };
    const { score } = calculateMatch(pet, cand);
    assert.equal(score, 25);
  });

  it('gives 12 pts for partial breed match', () => {
    const pet = { ...basePet, breed: 'Retriever', color: null, location: null, description: null, dateLost: null };
    const cand = { ...baseCandidate, breed: 'Golden Retriever', color: null, location: null, description: null, dateReported: null };
    const { score } = calculateMatch(pet, cand);
    assert.equal(score, 12);
  });

  // Color scoring
  it('gives 25 pts for exact color match', () => {
    const pet = { breed: null, color: 'Black and white', location: null, description: null, dateLost: null };
    const cand = { breed: null, color: 'Black and white', location: null, description: null, dateReported: null };
    const { score } = calculateMatch(pet, cand);
    assert.equal(score, 25);
  });

  it('gives 12 pts for partial color overlap', () => {
    const pet = { breed: null, color: 'Black and white', location: null, description: null, dateLost: null };
    const cand = { breed: null, color: 'Mostly black', location: null, description: null, dateReported: null };
    const { score } = calculateMatch(pet, cand);
    assert.equal(score, 12);
  });

  // Location scoring
  it('gives 20 pts for exact location', () => {
    const pet = { breed: null, color: null, location: 'Brooklyn, NY', description: null, dateLost: null };
    const cand = { breed: null, color: null, location: 'Brooklyn, NY', description: null, dateReported: null };
    const { score } = calculateMatch(pet, cand);
    assert.equal(score, 20);
  });

  it('gives 10 pts for partial location overlap', () => {
    const pet = { breed: null, color: null, location: 'Brooklyn', description: null, dateLost: null };
    const cand = { breed: null, color: null, location: 'Brooklyn, NY', description: null, dateReported: null };
    const { score } = calculateMatch(pet, cand);
    assert.equal(score, 10);
  });

  it('skips location scoring when location is Unknown', () => {
    const pet = { breed: null, color: null, location: 'Unknown', description: null, dateLost: null };
    const cand = { breed: null, color: null, location: 'Unknown', description: null, dateReported: null };
    const { score } = calculateMatch(pet, cand);
    assert.equal(score, 0);
  });

  // Description scoring
  it('gives 20 pts for 3+ keyword overlap in description', () => {
    const pet = { breed: null, color: null, location: null, dateLost: null,
      description: 'friendly playful collar wearing leash' };
    const cand = { breed: null, color: null, location: null, dateReported: null,
      description: 'friendly playful collar spotted nearby' };
    const { score } = calculateMatch(pet, cand);
    assert.equal(score, 20);
  });

  it('gives 8 pts for 1-2 keyword overlap', () => {
    const pet = { breed: null, color: null, location: null, dateLost: null,
      description: 'friendly dog with collar' };
    const cand = { breed: null, color: null, location: null, dateReported: null,
      description: 'collar spotted near park' };
    const { score } = calculateMatch(pet, cand);
    assert.equal(score, 8);
  });

  it('filters out stop words from description comparison', () => {
    const pet = { breed: null, color: null, location: null, dateLost: null,
      description: 'lost dog found pet cat missing please help contact reward' };
    const cand = { breed: null, color: null, location: null, dateReported: null,
      description: 'lost dog found pet cat missing please help contact reward' };
    const { score } = calculateMatch(pet, cand);
    assert.equal(score, 0);
  });

  // Date scoring
  it('gives 10 pts when dates are within 7 days', () => {
    const pet = { breed: null, color: null, location: null, description: null,
      dateLost: '2026-03-01' };
    const cand = { breed: null, color: null, location: null, description: null,
      dateReported: '2026-03-05' };
    const { score } = calculateMatch(pet, cand);
    assert.equal(score, 10);
  });

  it('gives 5 pts when dates are within 30 days', () => {
    const pet = { breed: null, color: null, location: null, description: null,
      dateLost: '2026-03-01' };
    const cand = { breed: null, color: null, location: null, description: null,
      dateReported: '2026-03-25' };
    const { score } = calculateMatch(pet, cand);
    assert.equal(score, 5);
  });

  it('gives 0 pts when dates are more than 30 days apart', () => {
    const pet = { breed: null, color: null, location: null, description: null,
      dateLost: '2026-01-01' };
    const cand = { breed: null, color: null, location: null, description: null,
      dateReported: '2026-06-01' };
    const { score } = calculateMatch(pet, cand);
    assert.equal(score, 0);
  });

  // Score cap
  it('caps score at 100', () => {
    const { score } = calculateMatch(basePet, baseCandidate);
    assert.ok(score <= 100);
  });
});
