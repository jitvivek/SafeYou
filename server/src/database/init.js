import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';

let db = null;
let dbPath = '';

// Wrapper class to provide better-sqlite3-like synchronous API over sql.js
class PreparedStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
  }

  get(...params) {
    const stmt = this.database.prepare(this.sql);
    if (params.length > 0) stmt.bind(params);
    const result = stmt.step() ? stmt.getAsObject() : undefined;
    stmt.free();
    return result;
  }

  all(...params) {
    const results = [];
    const stmt = this.database.prepare(this.sql);
    if (params.length > 0) stmt.bind(params);
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  run(...params) {
    this.database.run(this.sql, params);
    return { changes: this.database.getRowsModified() };
  }
}

class DatabaseWrapper {
  constructor(sqliteDb, filePath) {
    this.sqliteDb = sqliteDb;
    this.filePath = filePath;
  }

  prepare(sql) {
    return new PreparedStatement(this.sqliteDb, sql);
  }

  exec(sql) {
    this.sqliteDb.run(sql);
    this._save();
  }

  transaction(fn) {
    return (...args) => {
      this.sqliteDb.exec('BEGIN TRANSACTION;');
      try {
        fn(...args);
        this.sqliteDb.exec('COMMIT;');
        this._save();
      } catch (err) {
        try { this.sqliteDb.exec('ROLLBACK;'); } catch { /* ignore */ }
        throw err;
      }
    };
  }

  pragma(value) {
    try {
      this.sqliteDb.run(`PRAGMA ${value}`);
    } catch {
      // Some pragmas may not be supported in sql.js
    }
  }

  _save() {
    if (this.filePath) {
      try {
        const data = this.sqliteDb.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(this.filePath, buffer);
      } catch (err) {
        console.error('Failed to save database:', err.message);
      }
    }
  }

  // Override prepare's run to auto-save
  runAndSave(sql, params = []) {
    this.sqliteDb.run(sql, params);
    this._save();
  }
}

// Patch PreparedStatement to auto-save on run
const origRun = PreparedStatement.prototype.run;
PreparedStatement.prototype.run = function (...params) {
  const result = origRun.call(this, ...params);
  if (this.database._wrapper) {
    this.database._wrapper._save();
  }
  return result;
};

let initPromise = null;

async function initSqlite() {
  dbPath = process.env.DB_PATH || './data/safeyou.db';
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const SQL = await initSqlJs();

  let sqliteDb;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    sqliteDb = new SQL.Database(fileBuffer);
  } else {
    sqliteDb = new SQL.Database();
  }

  const wrapper = new DatabaseWrapper(sqliteDb, dbPath);
  sqliteDb._wrapper = wrapper;
  db = wrapper;

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return db;
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first and await it.');
  }
  return db;
}

export async function initDatabase() {
  if (!initPromise) {
    initPromise = initSqlite();
  }
  await initPromise;

  db.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      scan_limit INTEGER NOT NULL DEFAULT 3,
      full_reports INTEGER NOT NULL DEFAULT 0,
      ai_remediation INTEGER NOT NULL DEFAULT 0,
      pdf_export INTEGER NOT NULL DEFAULT 0,
      priority_support INTEGER NOT NULL DEFAULT 0,
      features TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'trial',
      trial_scans_remaining INTEGER NOT NULL DEFAULT 3,
      scans_this_month INTEGER NOT NULL DEFAULT 0,
      month_reset TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plan) REFERENCES plans(id)
    );

    CREATE TABLE IF NOT EXISTS repositories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      url TEXT,
      type TEXT NOT NULL DEFAULT 'git',
      language TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      file_name TEXT,
      file_size INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      repo_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      scan_type TEXT NOT NULL DEFAULT 'full',
      started_at DATETIME,
      completed_at DATETIME,
      duration_ms INTEGER,
      total_files_scanned INTEGER DEFAULT 0,
      total_vulnerabilities INTEGER DEFAULT 0,
      summary TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS vulnerabilities (
      id TEXT PRIMARY KEY,
      scan_id TEXT NOT NULL,
      cve_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL,
      cvss_score REAL NOT NULL,
      affected_component TEXT NOT NULL,
      affected_version TEXT,
      fixed_version TEXT,
      remediation TEXT NOT NULL,
      patch_guidance TEXT NOT NULL,
      ai_fix TEXT,
      references_json TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE
    )
  `);

  // Create indexes separately (sql.js exec doesn't handle multiple statements with IF NOT EXISTS well in one block)
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_repos_user ON repositories(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_scans_user ON scans(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_scans_repo ON scans(repo_id)',
    'CREATE INDEX IF NOT EXISTS idx_vulns_scan ON vulnerabilities(scan_id)',
    'CREATE INDEX IF NOT EXISTS idx_vulns_severity ON vulnerabilities(severity)',
  ];

  for (const idx of indexes) {
    try { db.exec(idx); } catch { /* index may already exist */ }
  }

  console.log('✅ Database initialized');
}
