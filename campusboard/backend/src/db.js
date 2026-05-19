const Database = require('better-sqlite3');
const path = require('path');

function createDb(dbPath = path.join(__dirname, '../database.db')) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      email      TEXT    NOT NULL UNIQUE,
      password   TEXT    NOT NULL,
      name       TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Migrations — add profile columns if they don't exist
  const existingCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!existingCols.includes('avatar'))     db.exec("ALTER TABLE users ADD COLUMN avatar     TEXT");
  if (!existingCols.includes('department')) db.exec("ALTER TABLE users ADD COLUMN department TEXT");
  if (!existingCols.includes('faculty'))    db.exec("ALTER TABLE users ADD COLUMN faculty    TEXT");
  if (!existingCols.includes('phone'))      db.exec("ALTER TABLE users ADD COLUMN phone      TEXT");
  if (!existingCols.includes('student_no')) db.exec("ALTER TABLE users ADD COLUMN student_no TEXT");

  db.exec(`

    CREATE TABLE IF NOT EXISTS listings (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title       TEXT    NOT NULL,
      description TEXT    NOT NULL,
      category    TEXT    NOT NULL,
      faculty     TEXT    NOT NULL,
      status      TEXT    NOT NULL DEFAULT 'aktif',
      contact     TEXT    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Migrations — listings table
  const listingCols = db.prepare("PRAGMA table_info(listings)").all().map(c => c.name);
  // expires_at: optional ISO date string set by user; NULL = indefinite
  if (!listingCols.includes('expires_at'))  db.exec("ALTER TABLE listings ADD COLUMN expires_at  TEXT");
  // closed_at: set automatically when status flips to kapandı
  if (!listingCols.includes('closed_at'))   db.exec("ALTER TABLE listings ADD COLUMN closed_at   TEXT");
  if (!listingCols.includes('view_count'))  db.exec("ALTER TABLE listings ADD COLUMN view_count  INTEGER NOT NULL DEFAULT 0");

  db.exec(`
    CREATE TABLE IF NOT EXISTS listing_views (
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, listing_id)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS favorites (
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      created_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
      PRIMARY KEY (user_id, listing_id)
    );
  `);

  return db;
}

module.exports = { createDb };
