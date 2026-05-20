import Database from 'better-sqlite3';
import path from 'path';

// In production (Fly.io), DATA_DIR points to the persistent volume (/data).
// Locally it defaults to the current directory so nothing changes.
const DATA_DIR = process.env.DATA_DIR || '.';
const DB_PATH = path.join(DATA_DIR, 'pets.db');

const db = new Database(DB_PATH);

// Create table if it doesn't exist
db.prepare(`
  CREATE TABLE IF NOT EXISTS pets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    petType TEXT NOT NULL,
    name TEXT,
    breed TEXT,
    location TEXT NOT NULL,
    dateLost TEXT,
    description TEXT,
    imageUrl TEXT,
    source TEXT,
    externalId TEXT,
    dateReported TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )
`).run();

// Migrations for existing databases
for (const col of [
  'source TEXT', 'externalId TEXT', 'color TEXT',
  'contactName TEXT', 'contactInfo TEXT',
  'size TEXT', 'coatPattern TEXT',
]) {
  try { db.prepare(`ALTER TABLE pets ADD COLUMN ${col}`).run(); } catch {}
}

db.prepare(`
  CREATE TABLE IF NOT EXISTS pet_embeddings (
    pet_id INTEGER PRIMARY KEY,
    model TEXT NOT NULL,
    embedding TEXT,            -- JSON string of number[]
    status TEXT NOT NULL,      -- 'pending' | 'ready' | 'error'
    error TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (pet_id) REFERENCES pets(id)
  )
`).run();

export default db;
