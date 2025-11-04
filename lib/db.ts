import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import logger from '../logger';

const configDir = process.env.CONFIG_DIRECTORY || path.join(__dirname, '../config');
const dbDir = path.join(configDir, 'db');
const dbPath = path.join(dbDir, 'abr-readarr.sqlite');

function ensureDirs() {
  try {
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  } catch (e) {
    logger.error('Failed to ensure DB directories', {
      label: 'DB',
      errorMessage: e instanceof Error ? e.message : String(e),
      configDir,
      dbDir,
    });
    throw e;
  }
}

ensureDirs();

export const db = new Database(dbPath);

// Initialize schema
db.exec(`
CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receivedAt TEXT NOT NULL,
  bookTitle TEXT NOT NULL,
  bookAuthors TEXT NOT NULL,
  requestBody TEXT NOT NULL,
  status TEXT NOT NULL,
  errorMessage TEXT,
  addedBookId INTEGER,
  addedBookTitle TEXT,
  monitored INTEGER,
  responseJson TEXT,
  processedAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_requests_receivedAt ON requests(receivedAt);
`);

export interface RequestRow {
  id: number;
  receivedAt: string;
  bookTitle: string;
  bookAuthors: string;
  requestBody: string;
  status: 'pending' | 'succeeded' | 'failed';
  errorMessage?: string | null;
  addedBookId?: number | null;
  addedBookTitle?: string | null;
  monitored?: number | null;
  responseJson?: string | null;
  processedAt?: string | null;
}

export function insertRequest(params: {
  bookTitle: string;
  bookAuthors: string;
  requestBody: unknown;
}): number {
  const stmt = db.prepare(
    `INSERT INTO requests (receivedAt, bookTitle, bookAuthors, requestBody, status)
     VALUES (@receivedAt, @bookTitle, @bookAuthors, @requestBody, @status)`
  );
  const info = stmt.run({
    receivedAt: new Date().toISOString(),
    bookTitle: params.bookTitle,
    bookAuthors: params.bookAuthors,
    requestBody: JSON.stringify(params.requestBody),
    status: 'pending',
  });
  return Number(info.lastInsertRowid);
}

export function updateRequestSuccess(id: number, data: {
  addedBookId: number;
  addedBookTitle: string;
  monitored: boolean;
  response: unknown;
}) {
  const stmt = db.prepare(
    `UPDATE requests SET status=@status, addedBookId=@addedBookId, addedBookTitle=@addedBookTitle,
     monitored=@monitored, responseJson=@responseJson, processedAt=@processedAt WHERE id=@id`
  );
  stmt.run({
    id,
    status: 'succeeded',
    addedBookId: data.addedBookId,
    addedBookTitle: data.addedBookTitle,
    monitored: data.monitored ? 1 : 0,
    responseJson: JSON.stringify(data.response),
    processedAt: new Date().toISOString(),
  });
}

export function updateRequestFailure(id: number, errorMessage: string) {
  const stmt = db.prepare(
    `UPDATE requests SET status=@status, errorMessage=@errorMessage, processedAt=@processedAt WHERE id=@id`
  );
  stmt.run({
    id,
    status: 'failed',
    errorMessage,
    processedAt: new Date().toISOString(),
  });
}

export function markRequestPending(id: number) {
  const stmt = db.prepare(
    `UPDATE requests SET status=@status, errorMessage=NULL, processedAt=NULL WHERE id=@id`
  );
  stmt.run({ id, status: 'pending' });
}

export function getRequests(): RequestRow[] {
  const stmt = db.prepare(
    `SELECT * FROM requests ORDER BY datetime(receivedAt) DESC`
  );
  return stmt.all() as RequestRow[];
}

export function getRequestById(id: number): RequestRow | undefined {
  const stmt = db.prepare(`SELECT * FROM requests WHERE id = ?`);
  const row = stmt.get(id) as RequestRow | undefined;
  return row;
}


