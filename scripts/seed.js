'use strict';

/** Seed the database with demo users, amenities, and property listings. Idempotent-ish: wipes data first. */

const { db } = require('../src/config/db');
const { hashPassword } = require('../src/lib/auth');

console.log('Seeding database…');

db.exec(`
  DELETE FROM property_amenities;
  DELETE FROM property_images;
  DELETE FROM favorites;
  DELETE FROM leads;
  DELETE FROM properties;
  DELETE FROM amenities;
  DELETE FROM users;
  DELETE FROM sqlite_sequence;
`);

// ---- Users --------------------------------------------------------------------
const insUser = db.prepare('INSERT INTO users (name, email, phone, password_hash, role, user_type) VALUES (?,?,?,?,?,?)');
const admin = insUser.run('Site Admin', 'admin@acreo.in', '9000000000', hashPassword('admin123'), 'admin', 'builder');
const priya = insUser.run('Priya Sharma', 'priya@example.com', '9812345678', hashPassword('password'), 'user', 'owner');
const rahul = insUser.run('Rahul Verma', 'rahul@example.com', '9876543210', hashPassword('password'), 'user', 'dealer');
const skyline = insUser.run('Skyline Builders', 'sales@skyline.in', '9800011122', hashPassword('password'), 'user', 'builder');

const owners = [priya.lastInsertRowid, rahul.lastInsertRowid, skyline.lastInsertRowid];

// ---- Amenities ----------------------------------------------------------------
const AMEN = ['Lift', 'Power Backup', 'Car Parking', 'Gym', 'Swimming Pool', 'Security',
  'Club House', "Children's Play Area", 'Gated Community', 'Piped Gas', 'Rain Water Harvesting', 'Garden'];

// ---- Properties ---------------------------------------------------------------
const img = (id) => `https://picsum.photos/seed/acreo${id}/800/500`;

const DATA = [
  { title: '3 BHK Apartment in Whitefield', purpose: 'sale', property_type: 'apartment', bhk: 3, bathrooms: 3, furnishing: 'semi', price: 9500000, area_sqft: 1650, city: 'Bengaluru', locality: 'Whitefield', featured: 1, amenities: ['Lift', 'Gym', 'Swimming Pool', 'Security', 'Car Parking'] },
  { title: '2 BHK Flat for Rent near Koramangala', purpose: 'rent', property_type: 'apartment', bhk: 2, bathrooms: 2, furnishing: 'furnished', price: 42000, area_sqft: 1150, city: 'Bengaluru', locality: 'Koramangala', featured: 0, amenities: ['Lift', 'Power Backup', 'Car Parking'] },
  { title: 'Luxury 4 BHK Villa in Gachibowli', purpose: 'sale', property_type: 'villa', bhk: 4, bathrooms: 5, furnishing: 'furnished', price: 32500000, area_sqft: 3800, city: 'Hyderabad', locality: 'Gachibowli', featured: 1, amenities: ['Gated Community', 'Club House', 'Swimming Pool', 'Garden', 'Security'] },
  { title: '2 BHK Apartment in Wakad', purpose: 'sale', property_type: 'apartment', bhk: 2, bathrooms: 2, furnishing: 'unfurnished', price: 7200000, area_sqft: 980, city: 'Pune', locality: 'Wakad', featured: 0, amenities: ['Lift', 'Power Backup', "Children's Play Area"] },
  { title: 'Residential Plot in Sarjapur Road', purpose: 'sale', property_type: 'plot', bhk: null, bathrooms: null, furnishing: null, price: 6800000, area_sqft: 2400, city: 'Bengaluru', locality: 'Sarjapur Road', featured: 0, amenities: ['Gated Community', 'Rain Water Harvesting'] },
  { title: 'Office Space for Rent in BKC', purpose: 'rent', property_type: 'office', bhk: null, bathrooms: 2, furnishing: 'furnished', price: 185000, area_sqft: 2200, city: 'Mumbai', locality: 'Bandra Kurla Complex', featured: 1, amenities: ['Lift', 'Power Backup', 'Security', 'Car Parking'] },
  { title: '1 BHK Studio for Rent in Andheri', purpose: 'rent', property_type: 'apartment', bhk: 1, bathrooms: 1, furnishing: 'semi', price: 28000, area_sqft: 550, city: 'Mumbai', locality: 'Andheri West', featured: 0, amenities: ['Lift', 'Security'] },
  { title: '3 BHK Builder Floor in Dwarka', purpose: 'sale', property_type: 'apartment', bhk: 3, bathrooms: 3, furnishing: 'semi', price: 11500000, area_sqft: 1450, city: 'Delhi', locality: 'Dwarka Sector 12', featured: 0, amenities: ['Power Backup', 'Car Parking', 'Piped Gas'] },
  { title: 'Retail Shop for Rent in Connaught Place', purpose: 'rent', property_type: 'shop', bhk: null, bathrooms: 1, furnishing: 'unfurnished', price: 95000, area_sqft: 650, city: 'Delhi', locality: 'Connaught Place', featured: 0, amenities: ['Security'] },
  { title: 'Co-living PG for Rent in HSR Layout', purpose: 'rent', property_type: 'pg', bhk: 1, bathrooms: 1, furnishing: 'furnished', price: 15000, area_sqft: 250, city: 'Bengaluru', locality: 'HSR Layout', featured: 0, amenities: ['Power Backup', 'Security'] },
  { title: 'Premium 3 BHK in Hinjewadi Phase 1', purpose: 'sale', property_type: 'apartment', bhk: 3, bathrooms: 3, furnishing: 'furnished', price: 10800000, area_sqft: 1580, city: 'Pune', locality: 'Hinjewadi', featured: 1, amenities: ['Gym', 'Swimming Pool', 'Club House', 'Lift', 'Security'] },
  { title: '4 BHK Villa in Jubilee Hills', purpose: 'sale', property_type: 'villa', bhk: 4, bathrooms: 4, furnishing: 'furnished', price: 45000000, area_sqft: 4200, city: 'Hyderabad', locality: 'Jubilee Hills', featured: 0, amenities: ['Garden', 'Swimming Pool', 'Gated Community', 'Club House', 'Security'] },
];

const insProp = db.prepare(`
  INSERT INTO properties (owner_id, title, description, purpose, property_type, bhk, bathrooms, furnishing,
    price, area_sqft, city, locality, address, cover_image, status, featured, views)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const insImg = db.prepare('INSERT INTO property_images (property_id, url, sort_order) VALUES (?,?,?)');
const insAmen = db.prepare('INSERT OR IGNORE INTO amenities (name) VALUES (?)');
const getAmen = db.prepare('SELECT id FROM amenities WHERE name = ?');
const linkAmen = db.prepare('INSERT OR IGNORE INTO property_amenities (property_id, amenity_id) VALUES (?,?)');

AMEN.forEach((a) => insAmen.run(a));

DATA.forEach((p, i) => {
  const owner = owners[i % owners.length];
  const desc = `A well-maintained ${p.property_type} located in the heart of ${p.locality}, ${p.city}. `
    + `Close to schools, IT parks, malls and public transport. Ready to move.`;
  const info = insProp.run(
    owner, p.title, desc, p.purpose, p.property_type, p.bhk, p.bathrooms, p.furnishing,
    p.price, p.area_sqft, p.city, p.locality, `${p.locality}, ${p.city}`, img(i + 1), 'active',
    p.featured, Math.floor(Math.random() * 400)
  );
  const pid = info.lastInsertRowid;
  [0, 1, 2].forEach((n) => insImg.run(pid, `https://picsum.photos/seed/acreo${i + 1}_${n}/800/500`, n));
  (p.amenities || []).forEach((a) => { insAmen.run(a); linkAmen.run(pid, getAmen.get(a).id); });
});

console.log(`Seeded ${DATA.length} properties, 4 users (admin@acreo.in / admin123).`);
console.log('Demo login → priya@example.com / password');
