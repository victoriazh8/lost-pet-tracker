import 'dotenv/config';
import { generateImageEmbedding } from "./utils/embeddings.js";
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { mkdirSync } from 'fs';
import rateLimit from 'express-rate-limit';
import db from './db.js';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
const PORT = process.env.PORT || 3001;

// Anthropic client is created lazily so the server starts fine when USE_AI=false
// and ANTHROPIC_API_KEY is not set.
let _anthropic = null;
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}

import { calculateMatch } from './utils/matching.js';
import { cosineSimilarity } from "./utils/similarity.js";
import { fetchRedditLostFound, mapPostToPet } from './services/reddit.js';
import { fetchCraigslistLostFound, mapItemToPet } from './services/craigslist.js';
import { detectPetType, detectLostOrFound, extractBreed, extractColor, extractLocation, extractDate } from './utils/extractors.js';

function getReadyEmbeddingForPetId(db, petId) {
  const row = db.prepare(`
    SELECT embedding
    FROM pet_embeddings
    WHERE pet_id = ? AND status = 'ready' AND embedding IS NOT NULL
  `).get(petId);

  if (!row?.embedding) return null;

  try {
    return JSON.parse(row.embedding);
  } catch {
    return null;
  }
}


// In production, set ALLOWED_ORIGIN to your Vercel URL (e.g. https://lost-pet-tracker.vercel.app)
// Chrome extensions have a chrome-extension:// origin so we always allow those too
const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? [process.env.ALLOWED_ORIGIN]
  : [];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    // Always allow Chrome extensions
    if (origin.startsWith('chrome-extension://')) return callback(null, true);
    // Allow listed origins, or all origins if none configured
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  }
}));
app.use(express.json());

// Rate limiting
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
const syncLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
app.use('/api/', apiLimiter);

// In production DATA_DIR points to the Fly.io persistent volume (/data)
const DATA_DIR = process.env.DATA_DIR || '.';
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
mkdirSync(UPLOADS_DIR, { recursive: true }); // no-op if already exists

// Serve uploaded images (static files)
app.use('/uploads', express.static(UPLOADS_DIR));

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// --- API: Report a pet ---
app.post('/api/report', upload.single('image'), (req, res) => {
  try {
    const {
      type,
      petType,
      name,
      breed,
      color,
      location,
      dateLost,
      description,
      source,
      contactName,
      contactInfo
    } = req.body;

    if (!type || !petType || !location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // dateLost is optional — scraped/imported posts often don't have an explicit date

    // File upload takes priority; fall back to an external URL sent in the body (e.g. from extension)
    const imageUrl = req.file
      ? `/uploads/${req.file.filename}`
      : (req.body.imageUrl || "");

    const stmt = db.prepare(`
      INSERT INTO pets (
        type,
        petType,
        name,
        breed,
        color,
        location,
        dateLost,
        description,
        imageUrl,
        source,
        contactName,
        contactInfo,
        dateReported,
        createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();

    const result = stmt.run(
      type,
      petType,
      name || null,
      breed || null,
      color || null,
      location,
      type === 'lost' ? dateLost : null,
      description || null,
      imageUrl,
      source || null,
      contactName || null,
      contactInfo || null,
      now,
      now
    );

    const petId = result.lastInsertRowid;

    // Determine image source: uploaded file takes priority, then external URL
    const hasFile = !!req.file;
    const externalImageUrl = !hasFile ? (req.body.imageUrl || '') : '';

    // Only create an embedding row if we actually have an image to process
    if (hasFile || externalImageUrl.startsWith('http')) {
      db.prepare(`
        INSERT OR REPLACE INTO pet_embeddings (pet_id, model, embedding, status, error, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(petId, "clip", null, "pending", null, now, now);

      setImmediate(async () => {
        try {
          let imagePath;

          if (hasFile) {
            imagePath = path.resolve("uploads", req.file.filename);
          } else {
            // Download external URL to a temp file, embed it, then delete it
            const { default: https } = await import('node:https');
            const { default: http } = await import('node:http');
            const { default: fs } = await import('node:fs');
            const tmpPath = path.join(UPLOADS_DIR, `tmp-${petId}-${Date.now()}.jpg`);

            await new Promise((resolve, reject) => {
              const client = externalImageUrl.startsWith('https') ? https : http;
              const file = fs.createWriteStream(tmpPath);
              client.get(externalImageUrl, res => {
                res.pipe(file);
                file.on('finish', () => { file.close(); resolve(); });
              }).on('error', reject);
            });

            imagePath = tmpPath;
          }

          const { model, embedding, tags = {} } = await generateImageEmbedding(imagePath);

          // Clean up temp file if we downloaded one
          if (!hasFile) {
            const { default: fs } = await import('node:fs');
            fs.unlink(imagePath, () => {});
          }

          const updatedAt = new Date().toISOString();
          db.prepare(`
            UPDATE pet_embeddings
            SET model = ?, embedding = ?, status = 'ready', error = NULL, updatedAt = ?
            WHERE pet_id = ?
          `).run(model, JSON.stringify(embedding), updatedAt, petId);

          // Backfill NULL pet fields from CLIP zero-shot tags
          // Only overwrites fields that are currently empty — never overrides user data
          if (tags && Object.keys(tags).length > 0) {
            const pet = db.prepare('SELECT breed, color, size, coatPattern FROM pets WHERE id=?').get(petId);
            if (pet) {
              const updates = [];
              const values = [];
              const backfillField = (field, col) => {
                if (tags[field] && !pet[col]) {
                  updates.push(`${col} = ?`);
                  values.push(tags[field]);
                }
              };
              backfillField('breed',       'breed');
              backfillField('color',       'color');
              backfillField('size',        'size');
              backfillField('coatPattern', 'coatPattern');
              if (updates.length > 0) {
                values.push(petId);
                db.prepare(`UPDATE pets SET ${updates.join(', ')} WHERE id = ?`).run(...values);
              }
            }
          }

        } catch (err) {
          const updatedAt = new Date().toISOString();
          db.prepare(`
            UPDATE pet_embeddings
            SET status = 'error', error = ?, updatedAt = ?
            WHERE pet_id = ?
          `).run(String(err.message || err), updatedAt, petId);
        }
      });
    }


    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save pet" });
  }
});

// --- API: Stats ---
app.get('/api/stats', (req, res) => {
  try {
    const { lost } = db.prepare(`SELECT COUNT(*) as lost FROM pets WHERE type = 'lost'`).get();
    const { found } = db.prepare(`SELECT COUNT(*) as found FROM pets WHERE type = 'found'`).get();
    res.json({ lost, found });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load stats' });
  }
});

// --- API: Get all pets ---
app.get('/api/pets', (req, res) => {
  try {
    const pets = db.prepare(`
      SELECT * FROM pets ORDER BY createdAt DESC
    `).all();

    res.json(pets);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load pets" });
  }
});

// Get potential matches for a pet
app.get('/api/pets/:id/matches', (req, res) => {
  try {
    const petId = req.params.id;

    const pet = db.prepare(`
      SELECT * FROM pets WHERE id = ?
    `).get(petId);

     if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    // 2️⃣ Fetch opposite-type pets (lost ↔ found)
    const candidates = db.prepare(`
      SELECT * FROM pets
      WHERE type != ?
      AND petType = ?
      AND id != ?
    `).all(pet.type, pet.petType, pet.id);
      const sourceEmbedding = getReadyEmbeddingForPetId(db, pet.id);

    // 3️⃣ SCORE + SORT + LIMIT (your snippet)
  const matches = candidates
    .map(candidate => {
      const { score, reasons } = calculateMatch(pet, candidate);

      // --- Image similarity (optional) ---
      let imageScore = null;

      if (sourceEmbedding) {
        const candidateEmbedding = getReadyEmbeddingForPetId(db, candidate.id);
        if (candidateEmbedding) {
          const sim = cosineSimilarity(sourceEmbedding, candidateEmbedding);
          if (sim !== null) {
            imageScore = Math.round(Math.max(0, Math.min(1, sim)) * 100);

            if (imageScore >= 95) {
              reasons.push("Very high visual similarity between photos");
            } else if (imageScore >= 80) {
              reasons.push("Strong visual resemblance between photos");
            } else if (imageScore >= 65) {
              reasons.push("Images look visually similar");
            }
          }
        }
      }

      // --- Blend: image is the primary signal (70%), text confirms (30%) ---
      // Math.max ensures a strong text-only match is never penalised when image is weak.
      let blendedScore = score;

      if (imageScore !== null) {
        blendedScore = Math.max(score, Math.round(imageScore * 0.7 + score * 0.3));
      }

      return {
        ...candidate,
        matchScore: blendedScore,
        baseScore: score,       // optional but useful for debugging
        imageScore,             // 0..100 or null
        reasons
      };
  }).sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
    // 4️⃣ Respond
  res.json({ pet, matches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not calculate matches' });
  }
});

// --- API: Match a pet without saving (used by browser extension) ---
app.post('/api/match', (req, res) => {
  try {
    const pet = req.body;

    if (!pet.type || !pet.petType) {
      return res.status(400).json({ error: 'type and petType are required' });
    }

    const candidates = db.prepare(`
      SELECT * FROM pets
      WHERE type != ?
      AND petType = ?
    `).all(pet.type, pet.petType);

    const matches = candidates
      .map(candidate => {
        const { score, reasons } = calculateMatch(pet, candidate);
        return { ...candidate, matchScore: score, reasons };
      })
      .filter(m => m.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5);

    res.json({ pet, matches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not calculate matches' });
  }
});

// --- API: Batch report (used by extension bulk scan) ---
app.post('/api/batch-report', (req, res) => {
  try {
    const { pets } = req.body;
    if (!Array.isArray(pets) || pets.length === 0) {
      return res.status(400).json({ error: 'pets array required' });
    }

    const now = new Date().toISOString();
    let added = 0;
    let skipped = 0;

    const insertStmt = db.prepare(`
      INSERT INTO pets (type, petType, name, breed, color, location, dateLost,
        description, imageUrl, source, externalId, dateReported, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const pet of pets) {
      if (!pet.type || !pet.petType || !pet.location) continue;

      // Deduplicate by source + externalId (same post seen twice)
      if (pet.externalId && pet.source) {
        const existing = db.prepare(
          `SELECT id FROM pets WHERE source = ? AND externalId = ?`
        ).get(pet.source, pet.externalId);
        if (existing) { skipped++; continue; }
      }

      insertStmt.run(
        pet.type, pet.petType, pet.name || null, pet.breed || null,
        pet.color || null, pet.location, pet.dateLost || null,
        pet.description || null, pet.imageUrl || null,
        pet.source || 'extension', pet.externalId || null,
        now, now
      );
      added++;
    }

    res.json({ added, skipped, total: pets.length });
  } catch (err) {
    console.error('batch-report error:', err);
    res.status(500).json({ error: 'Batch import failed' });
  }
});

// --- API: Sync lost & found pets from Reddit r/lostpets ---
app.post('/api/sync/reddit', syncLimiter, async (req, res) => {
  try {
    const { query = '' } = req.body;

    const posts = await fetchRedditLostFound({ query });
    const now = new Date().toISOString();
    let added = 0;

    for (const post of posts) {
      const pet = mapPostToPet(post);

      // Skip duplicates by Reddit post ID
      const existing = db.prepare(
        `SELECT id FROM pets WHERE source = 'reddit' AND externalId = ?`
      ).get(pet.externalId);
      if (existing) continue;

      db.prepare(`
        INSERT INTO pets (type, petType, name, breed, color, location, dateLost, description, imageUrl, source, externalId, sourceUrl, dateReported, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        pet.type, pet.petType, pet.name, pet.breed, pet.color, pet.location,
        pet.dateLost, pet.description, pet.imageUrl,
        pet.source, pet.externalId, pet.sourceUrl || null, now, now
      );
      added++;
    }

    res.json({ added, total: posts.length });
  } catch (err) {
    console.error('reddit sync error:', err);
    res.status(500).json({ error: err.message || 'Sync failed' });
  }
});

// --- API: Sync lost & found pets from Craigslist ---
app.post('/api/sync/craigslist', syncLimiter, async (req, res) => {
  try {
    const { city = 'newyork' } = req.body;
    const { items, subdomain } = await fetchCraigslistLostFound({ city });
    const now = new Date().toISOString();
    let added = 0;

    for (const item of items) {
      const pet = mapItemToPet(item, city);

      const existing = db.prepare(
        `SELECT id FROM pets WHERE source = 'craigslist' AND externalId = ?`
      ).get(pet.externalId);
      if (existing) continue;

      db.prepare(`
        INSERT INTO pets (type, petType, name, breed, color, location, dateLost, description, imageUrl, source, externalId, sourceUrl, dateReported, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        pet.type, pet.petType, pet.name, pet.breed, pet.color, pet.location,
        pet.dateLost, pet.description, pet.imageUrl,
        pet.source, pet.externalId, pet.sourceUrl || null, now, now
      );
      added++;
    }

    res.json({ added, total: items.length });
  } catch (err) {
    console.error('craigslist sync error:', err);
    res.status(500).json({ error: err.message || 'Sync failed' });
  }
});

// --- API: Parse a social media post into structured pet data ---
// Rule-based extraction handles breed/color/type/location/date for free.
// Claude (Haiku) is called only to extract pet name and clean up description.
app.post('/api/parse-post', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ error: 'No text provided' });
    }

    // Step 1: rule-based extraction (free, instant)
    const base = {
      type:     detectLostOrFound(text),
      petType:  detectPetType(text),
      breed:    extractBreed(text),
      color:    extractColor(text),
      location: extractLocation(text),
      dateLost: extractDate(text),
    };

    // Step 2: ask Haiku only for the two things rules can't reliably get
    // Skipped when USE_AI=false — toggle in .env without code changes
    let name = null;
    let description = null;
    if (process.env.USE_AI === 'true') {
      try {
        const response = await getAnthropic().messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          system: `Extract the pet's name and a one-sentence description from the post.
Return ONLY valid JSON: {"name": string|null, "description": string|null}
name: the pet's name if explicitly mentioned, otherwise null.
description: one concise sentence summarising the pet's appearance and circumstances.`,
          messages: [{ role: 'user', content: text.slice(0, 1500) }],
        });

        const textBlock = response.content.find(b => b.type === 'text');
        const parsed = JSON.parse(textBlock.text);
        name = parsed.name ?? null;
        description = parsed.description ?? null;
      } catch {
        // Degrade gracefully — rule-based fields are still returned
      }
    }

    res.json({ ...base, name, description });

  } catch (err) {
    console.error('parse-post error:', err);
    res.status(500).json({ error: 'Could not parse post' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});



