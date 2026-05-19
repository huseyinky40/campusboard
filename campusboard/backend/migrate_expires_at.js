/**
 * One-time migration: assign expires_at to existing listings that don't have one.
 * Based on category logic relative to each listing's created_at date.
 *
 * Run: node migrate_expires_at.js
 */

const { createDb } = require('./src/db');

const DAYS_BY_CATEGORY = {
  'etkinlik':      14,   // events expire fast
  'kayip-bulundu': 21,   // lost & found — moderate urgency
  'ikinci-el':     30,   // second-hand items
  'genel':         30,   // general
  'staj':          45,   // internship posts stay relevant longer
  'ders-notu':     60,   // notes are useful for a whole semester
};

const db = createDb();

const listings = db.prepare(`
  SELECT id, category, created_at, status, expires_at
  FROM listings
  WHERE expires_at IS NULL
`).all();

console.log(`Found ${listings.length} listing(s) without expires_at.\n`);

const stmt = db.prepare(`
  UPDATE listings SET expires_at = ? WHERE id = ?
`);

const updateMany = db.transaction((rows) => {
  for (const l of rows) {
    const days = DAYS_BY_CATEGORY[l.category] ?? 30;
    const base = new Date(l.created_at);
    base.setDate(base.getDate() + days);
    const expiresAt = base.toISOString().slice(0, 10); // YYYY-MM-DD
    stmt.run(expiresAt, l.id);
    console.log(`  [${l.id}] ${l.category.padEnd(16)} created: ${l.created_at.slice(0,10)}  →  expires: ${expiresAt}  (${days}d)`);
  }
});

updateMany(listings);

console.log(`\n✓ Done. ${listings.length} listing(s) updated.`);
