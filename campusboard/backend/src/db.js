const { Pool } = require('pg');
const Database = require('better-sqlite3');

async function createDb(connectionString) {
  if (connectionString === ':memory:') return createSqliteAdapter();
  return createPgAdapter(connectionString || process.env.DATABASE_URL);
}

// ── PostgreSQL adapter ────────────────────────────────────────────────────────

async function createPgAdapter(connectionString) {
  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  function toPositional(sql, params = []) {
    let i = 0;
    return { text: sql.replace(/\?/g, () => `$${++i}`), values: params };
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id                   SERIAL PRIMARY KEY,
      email                TEXT NOT NULL UNIQUE,
      password             TEXT NOT NULL,
      name                 TEXT NOT NULL,
      avatar               TEXT,
      department           TEXT,
      faculty              TEXT,
      phone                TEXT,
      student_no           TEXT,
      email_verified       BOOLEAN NOT NULL DEFAULT FALSE,
      verify_token         TEXT,
      verify_token_expires TIMESTAMPTZ,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified       BOOLEAN     NOT NULL DEFAULT FALSE`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token         TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token_expires TIMESTAMPTZ`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS listings (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      description TEXT NOT NULL,
      category    TEXT NOT NULL,
      faculty     TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'aktif',
      contact     TEXT NOT NULL,
      expires_at  TIMESTAMPTZ,
      closed_at   TIMESTAMPTZ,
      view_count  INTEGER NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS listing_views (
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, listing_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS favorites (
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, listing_id)
    )
  `);

  return {
    async get(sql, params = []) {
      const { rows } = await pool.query(toPositional(sql, params));
      return rows[0] || null;
    },
    async all(sql, params = []) {
      const { rows } = await pool.query(toPositional(sql, params));
      return rows;
    },
    async run(sql, params = []) {
      return pool.query(toPositional(sql, params));
    },
  };
}

// ── SQLite adapter (tests only) ───────────────────────────────────────────────

function createSqliteAdapter() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      email                TEXT NOT NULL UNIQUE,
      password             TEXT NOT NULL,
      name                 TEXT NOT NULL,
      avatar               TEXT,
      department           TEXT,
      faculty              TEXT,
      phone                TEXT,
      student_no           TEXT,
      email_verified       INTEGER NOT NULL DEFAULT 0,
      verify_token         TEXT,
      verify_token_expires TEXT,
      created_at           TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS listings (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      description TEXT NOT NULL,
      category    TEXT NOT NULL,
      faculty     TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'aktif',
      contact     TEXT NOT NULL,
      expires_at  TEXT,
      closed_at   TEXT,
      view_count  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS listing_views (
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, listing_id)
    );
    CREATE TABLE IF NOT EXISTS favorites (
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, listing_id)
    );
  `);

  function translate(sql) {
    let s = sql;
    if (/ON CONFLICT DO NOTHING/i.test(s)) {
      s = s.replace(/\bINSERT INTO\b/i, 'INSERT OR IGNORE INTO');
      s = s.replace(/\s*ON CONFLICT DO NOTHING/gi, '');
    }
    return s
      .replace(/\$\d+/g, '?')
      .replace(/NOW\(\)\s*-\s*INTERVAL\s*'(\d+)\s*days?'/gi, "datetime('now', '-$1 days')")
      .replace(/\bNOW\(\)/gi, "datetime('now')")
      .replace(/\bILIKE\b/gi, 'LIKE')
      .replace(/\s+RETURNING\s+\w+/gi, '');
  }

  return {
    async get(sql, params = []) {
      return db.prepare(translate(sql)).get(params) || null;
    },
    async all(sql, params = []) {
      return db.prepare(translate(sql)).all(params);
    },
    async run(sql, params = []) {
      const hasReturning = /RETURNING\s+\w+/i.test(sql);
      const result = db.prepare(translate(sql)).run(params);
      if (hasReturning) {
        return { rows: [{ id: result.lastInsertRowid }], rowCount: result.changes };
      }
      return { rows: [], rowCount: result.changes };
    },
  };
}

module.exports = { createDb };
