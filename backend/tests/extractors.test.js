import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapPostToPet } from '../services/reddit.js';
import { mapItemToPet } from '../services/craigslist.js';
import { extractDate } from '../utils/extractors.js';

describe('Reddit mapPostToPet', () => {
  const basePost = {
    id: 'abc123',
    title: 'Lost golden retriever in Brooklyn, NY',
    selftext: 'Very friendly, wearing a red collar. Answers to Buddy.',
    created_utc: new Date('2026-03-01').getTime() / 1000,
    preview: null,
    thumbnail: '',
  };

  it('detects lost type from title', () => {
    const pet = mapPostToPet(basePost);
    assert.equal(pet.type, 'lost');
  });

  it('detects found type', () => {
    const post = { ...basePost, title: 'Found stray cat near park' };
    const pet = mapPostToPet(post);
    assert.equal(pet.type, 'found');
  });

  it('detects dog pet type', () => {
    const pet = mapPostToPet(basePost);
    assert.equal(pet.petType, 'dog');
  });

  it('detects cat pet type', () => {
    const post = { ...basePost, title: 'Lost kitten in Queens' };
    const pet = mapPostToPet(post);
    assert.equal(pet.petType, 'cat');
  });

  it('extracts breed from text', () => {
    const pet = mapPostToPet(basePost);
    assert.equal(pet.breed, 'Golden retriever');
  });

  it('extracts color from text', () => {
    const post = { ...basePost, title: 'Lost black and white dog - Seattle, WA' };
    const pet = mapPostToPet(post);
    assert.equal(pet.color, 'Black and white');
  });

  it('extracts location from "in City, ST" pattern', () => {
    const pet = mapPostToPet(basePost);
    assert.equal(pet.location, 'Brooklyn, NY');
  });

  it('extracts location from dash pattern', () => {
    const post = { ...basePost, title: 'Lost dog - Austin, TX' };
    const pet = mapPostToPet(post);
    assert.equal(pet.location, 'Austin, TX');
  });

  it('extracts location from bracket pattern', () => {
    const post = { ...basePost, title: '[Chicago] Lost puppy please help' };
    const pet = mapPostToPet(post);
    assert.equal(pet.location, 'Chicago');
  });

  it('returns Unknown when no location found', () => {
    const post = { ...basePost, title: 'lost my dog please help' };
    const pet = mapPostToPet(post);
    assert.equal(pet.location, 'Unknown');
  });

  it('converts created_utc to date string', () => {
    const pet = mapPostToPet(basePost);
    assert.equal(pet.dateLost, '2026-03-01');
  });

  it('sets source to reddit', () => {
    const pet = mapPostToPet(basePost);
    assert.equal(pet.source, 'reddit');
    assert.equal(pet.externalId, 'abc123');
  });

  it('extracts preview image URL', () => {
    const post = {
      ...basePost,
      preview: { images: [{ source: { url: 'https://i.redd.it/photo.jpg?width=1024&amp;quality=80' } }] },
    };
    const pet = mapPostToPet(post);
    assert.equal(pet.imageUrl, 'https://i.redd.it/photo.jpg?width=1024&quality=80');
  });
});

describe('Craigslist mapItemToPet', () => {
  it('maps a basic item correctly', () => {
    const item = {
      title: 'Lost Dog Cat?',
      link: 'https://newyork.craigslist.org/que/laf/d/elmhurst-lost-dog-cat/7926350819.html',
      location: 'queens',
    };
    const pet = mapItemToPet(item, 'New York');
    assert.equal(pet.type, 'lost');
    assert.equal(pet.petType, 'dog');
    assert.equal(pet.source, 'craigslist');
    assert.equal(pet.externalId, '7926350819');
    assert.equal(pet.location, 'queens, New York');
  });

  it('detects found type', () => {
    const item = {
      title: 'Found dove',
      link: 'https://newyork.craigslist.org/brx/laf/d/bronx-found-dove/7927211519.html',
      location: 'Bronx',
    };
    const pet = mapItemToPet(item, 'New York');
    assert.equal(pet.type, 'found');
  });

  it('extracts breed from title', () => {
    const item = {
      title: 'Lost golden retriever near park',
      link: 'https://newyork.craigslist.org/brk/laf/d/lost-retriever/1234567890.html',
      location: 'Brooklyn',
    };
    const pet = mapItemToPet(item, 'New York');
    assert.equal(pet.breed, 'Golden retriever');
  });

  it('extracts color from title', () => {
    const item = {
      title: 'Found black cat wandering',
      link: 'https://newyork.craigslist.org/mnh/laf/d/found-cat/1234567890.html',
      location: 'Manhattan',
    };
    const pet = mapItemToPet(item, 'New York');
    assert.equal(pet.color, 'Black');
    assert.equal(pet.petType, 'cat');
  });

  it('uses city label when location matches', () => {

    const item = {
      title: 'Lost dog',
      link: 'https://sfbay.craigslist.org/sfc/laf/d/lost-dog/1234567890.html',
      location: 'San Francisco',
    };
    const pet = mapItemToPet(item, 'San Francisco');
    assert.equal(pet.location, 'San Francisco');
  });
});

describe('extractDate', () => {
  it('extracts ISO date', () => {
    assert.equal(extractDate('Lost on 2026-03-15 near park'), '2026-03-15');
  });

  it('extracts named month date', () => {
    const result = extractDate('Missing since March 15th');
    assert.ok(result?.startsWith('2'));
  });

  it('returns null when no date found', () => {
    assert.equal(extractDate('lost dog no date here'), null);
  });
});
