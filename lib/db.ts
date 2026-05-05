import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import path from 'path'
import fs from 'fs'

const DATA_DIR = path.join(process.cwd(), 'data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const DB_PATH = path.join(DATA_DIR, 'dl-sms.db')

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (_db) return _db
  _db = new Database(DB_PATH)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  initDb(_db)
  return _db
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      ivasms_email TEXT,
      ivasms_password TEXT,
      telegram_bot_token TEXT,
      telegram_chat_id TEXT,
      mobile_token TEXT,
      has_whatsapp INTEGER DEFAULT 0,
      whatsapp_number TEXT,
      whatsapp_data TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS numbers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      ivasms_id TEXT,
      phone TEXT NOT NULL,
      country TEXT,
      flag TEXT,
      status TEXT DEFAULT 'active',
      sms_count INTEGER DEFAULT 0,
      last_received TEXT,
      whatsapp_created INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sms_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      number_id TEXT,
      phone_number TEXT,
      sender TEXT,
      body TEXT,
      otp TEXT,
      service TEXT,
      received_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS verification_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      number_id TEXT,
      phone_number TEXT,
      service TEXT,
      status TEXT DEFAULT 'waiting',
      otp TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT
    );

    CREATE TABLE IF NOT EXISTS status_events (
      id TEXT PRIMARY KEY,
      component TEXT,
      status TEXT,
      message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)

  // Seed admin user
  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@dlsms.com')
  if (!adminExists) {
    db.prepare(`INSERT INTO users (id, name, email, password_hash, mobile_token) VALUES (?, ?, ?, ?, ?)`)
      .run(uuid(), 'Admin', 'admin@dlsms.com', bcrypt.hashSync('admin123', 10), `dl_${uuid().replace(/-/g,'')}`)
  }
}

export default getDb
