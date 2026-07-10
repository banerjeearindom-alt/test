'use strict';

/**
 * Database module.
 * Uses Node 22's built-in `node:sqlite` — no native compilation, no external DB server.
 * Exposes a single shared connection plus the schema bootstrap.
 */

const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'acreo.db');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

/** Create tables if they don't exist. Idempotent — safe to call on every boot. */
function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      phone         TEXT,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'user',   -- user | admin
      user_type     TEXT    NOT NULL DEFAULT 'owner',  -- owner | dealer | builder
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS properties (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title         TEXT    NOT NULL,
      description   TEXT,
      purpose       TEXT    NOT NULL,                   -- sale | rent
      property_type TEXT    NOT NULL,                   -- apartment | villa | plot | office | shop | pg
      bhk           INTEGER,                            -- bedrooms; NULL for plot/commercial
      bathrooms     INTEGER,
      furnishing    TEXT,                               -- unfurnished | semi | furnished
      price         INTEGER NOT NULL,                   -- absolute INR (sale) or per-month (rent)
      area_sqft     INTEGER,
      city          TEXT    NOT NULL,
      locality      TEXT    NOT NULL,
      address       TEXT,
      latitude      REAL,
      longitude     REAL,
      cover_image   TEXT,
      status        TEXT    NOT NULL DEFAULT 'active',  -- active | sold | inactive | pending
      featured      INTEGER NOT NULL DEFAULT 0,
      views         INTEGER NOT NULL DEFAULT 0,
      posted_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS property_images (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      url         TEXT    NOT NULL,
      sort_order  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS amenities (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT    NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS property_amenities (
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      amenity_id  INTEGER NOT NULL REFERENCES amenities(id)  ON DELETE CASCADE,
      PRIMARY KEY (property_id, amenity_id)
    );

    CREATE TABLE IF NOT EXISTS favorites (
      user_id     INTEGER NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, property_id)
    );

    CREATE TABLE IF NOT EXISTS leads (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      name        TEXT    NOT NULL,
      email       TEXT    NOT NULL,
      phone       TEXT    NOT NULL,
      message     TEXT,
      status      TEXT    NOT NULL DEFAULT 'new',        -- new | contacted | closed
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_prop_city     ON properties(city);
    CREATE INDEX IF NOT EXISTS idx_prop_purpose  ON properties(purpose);
    CREATE INDEX IF NOT EXISTS idx_prop_type     ON properties(property_type);
    CREATE INDEX IF NOT EXISTS idx_prop_price    ON properties(price);
    CREATE INDEX IF NOT EXISTS idx_prop_owner    ON properties(owner_id);
    CREATE INDEX IF NOT EXISTS idx_leads_prop    ON leads(property_id);
  `);
}

migrate();

module.exports = { db, migrate, DB_PATH };
