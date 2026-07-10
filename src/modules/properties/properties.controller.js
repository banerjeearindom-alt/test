'use strict';

/** Properties module — create, read, update, delete, list/search. */

const { db } = require('../../config/db');
const { ApiError, ok, required, oneOf, toInt } = require('../../lib/http');
const { hydrate, search } = require('./properties.repo');

const PURPOSES = ['sale', 'rent'];
const TYPES = ['apartment', 'villa', 'plot', 'office', 'shop', 'pg'];
const FURNISHING = ['unfurnished', 'semi', 'furnished'];

function setAmenities(propertyId, names) {
  if (!Array.isArray(names)) return;
  db.prepare('DELETE FROM property_amenities WHERE property_id = ?').run(propertyId);
  const insAmenity = db.prepare('INSERT OR IGNORE INTO amenities (name) VALUES (?)');
  const getAmenity = db.prepare('SELECT id FROM amenities WHERE name = ?');
  const link = db.prepare('INSERT OR IGNORE INTO property_amenities (property_id, amenity_id) VALUES (?, ?)');
  for (const name of names) {
    const clean = String(name).trim();
    if (!clean) continue;
    insAmenity.run(clean);
    link.run(propertyId, getAmenity.get(clean).id);
  }
}

function setImages(propertyId, urls) {
  if (!Array.isArray(urls)) return;
  db.prepare('DELETE FROM property_images WHERE property_id = ?').run(propertyId);
  const ins = db.prepare('INSERT INTO property_images (property_id, url, sort_order) VALUES (?, ?, ?)');
  urls.forEach((url, i) => { if (String(url).trim()) ins.run(propertyId, String(url).trim(), i); });
}

// ---- Handlers -----------------------------------------------------------------

function list(req, res) {
  const q = req.query;
  const result = search({
    purpose: q.purpose,
    property_type: q.property_type,
    city: q.city,
    locality: q.locality,
    furnishing: q.furnishing,
    q: q.q,
    bhk: toInt(q.bhk),
    min_price: toInt(q.min_price),
    max_price: toInt(q.max_price),
    featured: q.featured === 'true' || q.featured === '1',
    sort: q.sort,
    page: toInt(q.page, 1),
    limit: toInt(q.limit, 12),
    userId: req.user?.id,
  });
  ok(res, result);
}

function getOne(req, res) {
  const row = db.prepare('SELECT * FROM properties WHERE id = ?').get(toInt(req.params.id));
  if (!row) throw new ApiError(404, 'Property not found');
  db.prepare('UPDATE properties SET views = views + 1 WHERE id = ?').run(row.id);
  row.views += 1;
  ok(res, { property: hydrate(row, req.user?.id) });
}

function create(req, res) {
  const b = req.body;
  required(b, ['title', 'purpose', 'property_type', 'price', 'city', 'locality']);
  oneOf(b.purpose, PURPOSES, 'purpose');
  oneOf(b.property_type, TYPES, 'property_type');
  oneOf(b.furnishing, FURNISHING, 'furnishing');

  const price = toInt(b.price);
  if (!price || price <= 0) throw new ApiError(400, 'Price must be a positive number');

  const images = Array.isArray(b.images) ? b.images : [];
  const cover = b.cover_image || images[0] || null;

  const info = db
    .prepare(
      `INSERT INTO properties
       (owner_id, title, description, purpose, property_type, bhk, bathrooms, furnishing,
        price, area_sqft, city, locality, address, latitude, longitude, cover_image, status, featured)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      req.user.id, b.title, b.description || null, b.purpose, b.property_type,
      toInt(b.bhk) ?? null, toInt(b.bathrooms) ?? null, b.furnishing || null,
      price, toInt(b.area_sqft) ?? null, b.city, b.locality, b.address || null,
      b.latitude ?? null, b.longitude ?? null, cover, 'active', b.featured ? 1 : 0
    );

  setImages(info.lastInsertRowid, images);
  setAmenities(info.lastInsertRowid, b.amenities);

  const row = db.prepare('SELECT * FROM properties WHERE id = ?').get(info.lastInsertRowid);
  ok(res, { property: hydrate(row, req.user.id) }, 201);
}

function ensureOwnerOrAdmin(row, user) {
  if (!row) throw new ApiError(404, 'Property not found');
  if (row.owner_id !== user.id && user.role !== 'admin') {
    throw new ApiError(403, 'You can only modify your own listings');
  }
}

function update(req, res) {
  const row = db.prepare('SELECT * FROM properties WHERE id = ?').get(toInt(req.params.id));
  ensureOwnerOrAdmin(row, req.user);

  const b = req.body;
  oneOf(b.purpose, PURPOSES, 'purpose');
  oneOf(b.property_type, TYPES, 'property_type');
  oneOf(b.furnishing, FURNISHING, 'furnishing');
  oneOf(b.status, ['active', 'sold', 'inactive', 'pending'], 'status');

  const fields = ['title', 'description', 'purpose', 'property_type', 'bhk', 'bathrooms',
    'furnishing', 'price', 'area_sqft', 'city', 'locality', 'address', 'latitude', 'longitude',
    'cover_image', 'status'];
  const sets = [];
  const params = [];
  for (const f of fields) {
    if (b[f] !== undefined) { sets.push(`${f} = ?`); params.push(b[f]); }
  }
  if (sets.length) {
    sets.push(`updated_at = datetime('now')`);
    db.prepare(`UPDATE properties SET ${sets.join(', ')} WHERE id = ?`).run(...params, row.id);
  }
  if (b.images !== undefined) setImages(row.id, b.images);
  if (b.amenities !== undefined) setAmenities(row.id, b.amenities);

  const updated = db.prepare('SELECT * FROM properties WHERE id = ?').get(row.id);
  ok(res, { property: hydrate(updated, req.user.id) });
}

function remove(req, res) {
  const row = db.prepare('SELECT * FROM properties WHERE id = ?').get(toInt(req.params.id));
  ensureOwnerOrAdmin(row, req.user);
  db.prepare('DELETE FROM properties WHERE id = ?').run(row.id);
  ok(res, { deleted: true, id: row.id });
}

/** Listings owned by the current user (any status). */
function mine(req, res) {
  const result = search({ owner_id: req.user.id, status: req.query.status || null, userId: req.user.id, limit: 50 });
  ok(res, result);
}

module.exports = { list, getOne, create, update, remove, mine, PURPOSES, TYPES, FURNISHING };
