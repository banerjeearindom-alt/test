'use strict';

/** Data-access helpers for properties: hydration and filtered queries. */

const { db } = require('../../config/db');

/** Attach owner, images and amenities to a raw property row. */
function hydrate(row, userId) {
  if (!row) return null;
  const images = db
    .prepare('SELECT url FROM property_images WHERE property_id = ? ORDER BY sort_order, id')
    .all(row.id)
    .map((r) => r.url);
  const amenities = db
    .prepare(
      `SELECT a.name FROM amenities a
       JOIN property_amenities pa ON pa.amenity_id = a.id
       WHERE pa.property_id = ? ORDER BY a.name`
    )
    .all(row.id)
    .map((r) => r.name);
  const owner = db.prepare('SELECT id, name, phone, email, user_type FROM users WHERE id = ?').get(row.owner_id);
  const favorited = userId
    ? !!db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND property_id = ?').get(userId, row.id)
    : false;

  return {
    ...row,
    featured: !!row.featured,
    images: images.length ? images : row.cover_image ? [row.cover_image] : [],
    amenities,
    owner,
    favorited,
  };
}

/**
 * Build and run a filtered, paginated property query.
 * Supported filters: purpose, property_type, city, locality, q (text),
 * min_price, max_price, bhk, furnishing, status, featured, owner_id, sort.
 */
function search(filters = {}) {
  const where = [];
  const params = [];

  const eq = (col, val) => {
    if (val !== undefined && val !== null && val !== '') {
      where.push(`${col} = ?`);
      params.push(val);
    }
  };

  eq('purpose', filters.purpose);
  eq('property_type', filters.property_type);
  eq('furnishing', filters.furnishing);
  eq('owner_id', filters.owner_id);
  // Public searches only see active listings. An owner-scoped query (or an explicit
  // status) may see any status — this powers the "my listings" dashboard.
  if (filters.status) {
    eq('status', filters.status);
  } else if (!filters.owner_id) {
    where.push("status = 'active'");
  }

  if (filters.city) { where.push('LOWER(city) = LOWER(?)'); params.push(filters.city); }
  if (filters.locality) { where.push('LOWER(locality) LIKE LOWER(?)'); params.push(`%${filters.locality}%`); }
  if (filters.bhk) { where.push('bhk = ?'); params.push(filters.bhk); }
  if (filters.min_price) { where.push('price >= ?'); params.push(filters.min_price); }
  if (filters.max_price) { where.push('price <= ?'); params.push(filters.max_price); }
  if (filters.featured) { where.push('featured = 1'); }
  if (filters.q) {
    where.push('(LOWER(title) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?) OR LOWER(locality) LIKE LOWER(?) OR LOWER(city) LIKE LOWER(?))');
    const like = `%${filters.q}%`;
    params.push(like, like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sortMap = {
    newest: 'posted_at DESC',
    price_asc: 'price ASC',
    price_desc: 'price DESC',
    area_desc: 'area_sqft DESC',
    popular: 'views DESC',
  };
  const orderSql = `ORDER BY featured DESC, ${sortMap[filters.sort] || sortMap.newest}`;

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(50, Math.max(1, filters.limit || 12));
  const offset = (page - 1) * limit;

  const total = db.prepare(`SELECT COUNT(*) AS c FROM properties ${whereSql}`).get(...params).c;
  const rows = db
    .prepare(`SELECT * FROM properties ${whereSql} ${orderSql} LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);

  return {
    items: rows.map((r) => hydrate(r, filters.userId)),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
}

module.exports = { hydrate, search };
