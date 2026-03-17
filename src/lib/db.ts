import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "gastos.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    migrate(db);
  }
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount INTEGER NOT NULL,
      merchant TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Otros',
      date TEXT NOT NULL,
      card_last4 TEXT,
      source TEXT NOT NULL DEFAULT 'email',
      raw_text TEXT,
      email_id TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

    CREATE TABLE IF NOT EXISTS gmail_tokens (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expiry_date INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS billing_cycles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      close_date TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_billing_close ON billing_cycles(close_date);

    CREATE TABLE IF NOT EXISTS merchant_rules (
      merchant TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fixed_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      category TEXT NOT NULL DEFAULT 'Otros',
      day_of_month INTEGER,
      num_installments INTEGER,
      current_installment INTEGER DEFAULT 1,
      start_date TEXT NOT NULL,
      end_date TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS incomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      day_of_month INTEGER,
      recurring INTEGER NOT NULL DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Default billing day = 20
  db.prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES ('billing_day', '20')"
  ).run();

  // Add currency columns if they don't exist
  try {
    db.exec(`ALTER TABLE transactions ADD COLUMN currency TEXT NOT NULL DEFAULT 'CLP'`);
  } catch { /* column already exists */ }
  try {
    db.exec(`ALTER TABLE transactions ADD COLUMN original_amount INTEGER`);
  } catch { /* column already exists */ }
}

export interface Transaction {
  id: number;
  amount: number;
  merchant: string;
  category: string;
  date: string;
  card_last4: string | null;
  source: string;
  raw_text: string | null;
  email_id: string | null;
  currency: string;
  original_amount: number | null;
  created_at: string;
}

export function insertTransaction(tx: Omit<Transaction, "id" | "created_at">): Transaction | null {
  const db = getDb();

  if (tx.email_id) {
    const existing = db.prepare("SELECT id FROM transactions WHERE email_id = ?").get(tx.email_id);
    if (existing) return null;
  }

  const duplicate = db.prepare(
    "SELECT id FROM transactions WHERE amount = ? AND date = ? AND merchant = ?"
  ).get(tx.amount, tx.date, tx.merchant);
  if (duplicate) return null;

  const stmt = db.prepare(`
    INSERT INTO transactions (amount, merchant, category, date, card_last4, source, raw_text, email_id, currency, original_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    tx.amount, tx.merchant, tx.category, tx.date,
    tx.card_last4, tx.source, tx.raw_text, tx.email_id,
    tx.currency || "CLP", tx.original_amount ?? null
  );

  return db.prepare("SELECT * FROM transactions WHERE id = ?").get(result.lastInsertRowid) as Transaction;
}

// ---------- Date-range based queries ----------

export function getTransactionsByRange(from: string, to: string): Transaction[] {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM transactions WHERE date >= ? AND date < ? ORDER BY date DESC"
  ).all(from, to) as Transaction[];
}

export function getCategoryTotalsByRange(from: string, to: string): { category: string; total: number }[] {
  const db = getDb();
  return db.prepare(`
    SELECT category, SUM(amount) as total
    FROM transactions
    WHERE date >= ? AND date < ?
    GROUP BY category
    ORDER BY total DESC
  `).all(from, to) as { category: string; total: number }[];
}

export function getTransactions(month?: string): Transaction[] {
  const db = getDb();
  if (month) {
    return db.prepare(
      "SELECT * FROM transactions WHERE date LIKE ? ORDER BY date DESC"
    ).all(`${month}%`) as Transaction[];
  }
  return db.prepare("SELECT * FROM transactions ORDER BY date DESC").all() as Transaction[];
}

export function getMonthlyTotals(): { month: string; total: number }[] {
  const db = getDb();
  return db.prepare(`
    SELECT substr(date, 1, 7) as month, SUM(amount) as total
    FROM transactions
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `).all() as { month: string; total: number }[];
}

export function getCategoryTotals(month?: string): { category: string; total: number }[] {
  const db = getDb();
  const filter = month ? "WHERE date LIKE ?" : "";
  const params = month ? [`${month}%`] : [];
  return db.prepare(`
    SELECT category, SUM(amount) as total
    FROM transactions
    ${filter}
    GROUP BY category
    ORDER BY total DESC
  `).all(...params) as { category: string; total: number }[];
}

export function updateTransactionCategory(id: number, category: string) {
  const db = getDb();
  const tx = db.prepare("SELECT merchant FROM transactions WHERE id = ?").get(id) as { merchant: string } | undefined;
  db.prepare("UPDATE transactions SET category = ? WHERE id = ?").run(category, id);

  // Remember this merchant → category rule for future transactions
  if (tx) {
    saveMerchantRule(tx.merchant, category);
  }
}

// ---------- Merchant rules (learned from user) ----------

export function saveMerchantRule(merchant: string, category: string) {
  const db = getDb();
  db.prepare(
    "INSERT OR REPLACE INTO merchant_rules (merchant, category) VALUES (?, ?)"
  ).run(merchant.toUpperCase(), category);
}

export function getMerchantRule(merchant: string): string | null {
  const db = getDb();
  // Exact match first
  const exact = db.prepare(
    "SELECT category FROM merchant_rules WHERE merchant = ?"
  ).get(merchant.toUpperCase()) as { category: string } | undefined;
  if (exact) return exact.category;

  // Check if the merchant contains any known rule (partial match)
  const rules = db.prepare("SELECT merchant, category FROM merchant_rules").all() as { merchant: string; category: string }[];
  const upper = merchant.toUpperCase();
  for (const rule of rules) {
    if (upper.includes(rule.merchant) || rule.merchant.includes(upper)) {
      return rule.category;
    }
  }
  return null;
}

export function getAllMerchantRules(): { merchant: string; category: string }[] {
  const db = getDb();
  return db.prepare("SELECT merchant, category FROM merchant_rules ORDER BY merchant").all() as { merchant: string; category: string }[];
}

// ---------- Settings ----------

export function getSetting(key: string): string | null {
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string) {
  const db = getDb();
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
}

// ---------- Billing cycles ----------

export function addBillingCycleDate(closeDate: string) {
  const db = getDb();
  db.prepare("INSERT OR IGNORE INTO billing_cycles (close_date) VALUES (?)").run(closeDate);
}

export function removeBillingCycleDate(closeDate: string) {
  const db = getDb();
  db.prepare("DELETE FROM billing_cycles WHERE close_date = ?").run(closeDate);
}

export function getBillingCycleDates(): string[] {
  const db = getDb();
  const rows = db.prepare("SELECT close_date FROM billing_cycles ORDER BY close_date DESC").all() as { close_date: string }[];
  return rows.map((r) => r.close_date);
}

/**
 * Get the close date for a given month.
 * Uses explicit billing_cycles entry if available, otherwise falls back to billing_day.
 */
function getCloseForMonth(year: number, month: number): string {
  const db = getDb();
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const row = db.prepare(
    "SELECT close_date FROM billing_cycles WHERE close_date LIKE ? LIMIT 1"
  ).get(`${prefix}%`) as { close_date: string } | undefined;

  if (row) return row.close_date;

  const billingDay = parseInt(getSetting("billing_day") || "20", 10);
  return `${prefix}-${String(billingDay).padStart(2, "0")}`;
}

/**
 * Gets the billing period that contains the reference date.
 *
 * Strategy: find the close date for the ref's month and the surrounding months,
 * then determine which period bracket the ref falls into.
 */
export function getBillingPeriod(referenceDate?: string): { from: string; to: string; label: string } {
  const ref = referenceDate || new Date().toISOString().slice(0, 10);
  const refD = new Date(ref + "T00:00:00");
  const refYear = refD.getFullYear();
  const refMonth = refD.getMonth();

  // Get close dates for this month, previous month, and next month
  const prevMonthD = new Date(refYear, refMonth - 1, 1);
  const nextMonthD = new Date(refYear, refMonth + 1, 1);

  const closePrev = getCloseForMonth(prevMonthD.getFullYear(), prevMonthD.getMonth());
  const closeCurr = getCloseForMonth(refYear, refMonth);
  const closeNext = getCloseForMonth(nextMonthD.getFullYear(), nextMonthD.getMonth());

  // Determine which period the ref falls into:
  // Period A: closePrev+1 to closeCurr (if ref <= closeCurr)
  // Period B: closeCurr+1 to closeNext (if ref > closeCurr)
  if (ref <= closeCurr) {
    const from = addDays(closePrev, 1);
    const to = addDays(closeCurr, 1); // exclusive
    return { from, to, label: `${fmtShort(from)} — ${fmtShort(closeCurr)}` };
  } else {
    const from = addDays(closeCurr, 1);
    const to = addDays(closeNext, 1); // exclusive
    return { from, to, label: `${fmtShort(from)} — ${fmtShort(closeNext)}` };
  }
}

export function getAdjacentBillingPeriod(currentFrom: string, direction: "prev" | "next"): { from: string; to: string; label: string } {
  if (direction === "prev") {
    return getBillingPeriod(addDays(currentFrom, -1));
  } else {
    const current = getBillingPeriod(currentFrom);
    return getBillingPeriod(current.to);
  }
}

// ---------- Helpers ----------

function addDays(ds: string, days: number): string {
  const d = new Date(ds + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtShort(ds: string): string {
  const d = new Date(ds + "T00:00:00");
  return `${d.getDate()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ---------- Fixed expenses ----------

export interface FixedExpense {
  id: number;
  name: string;
  amount: number;
  category: string;
  day_of_month: number | null;
  num_installments: number | null;
  current_installment: number;
  start_date: string;
  end_date: string | null;
  active: number;
  created_at: string;
}

export function getFixedExpenses(activeOnly = true): FixedExpense[] {
  const db = getDb();
  const filter = activeOnly ? "WHERE active = 1" : "";
  return db.prepare(`SELECT * FROM fixed_expenses ${filter} ORDER BY name`).all() as FixedExpense[];
}

export function addFixedExpense(exp: {
  name: string;
  amount: number;
  category: string;
  day_of_month?: number;
  num_installments?: number;
  current_installment?: number;
  start_date: string;
  end_date?: string;
}): FixedExpense {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO fixed_expenses (name, amount, category, day_of_month, num_installments, current_installment, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    exp.name, exp.amount, exp.category,
    exp.day_of_month ?? null, exp.num_installments ?? null,
    exp.current_installment ?? 1, exp.start_date, exp.end_date ?? null
  );
  return db.prepare("SELECT * FROM fixed_expenses WHERE id = ?").get(result.lastInsertRowid) as FixedExpense;
}

export function updateFixedExpense(id: number, fields: Partial<Omit<FixedExpense, "id" | "created_at">>) {
  const db = getDb();
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, val] of Object.entries(fields)) {
    sets.push(`${key} = ?`);
    values.push(val);
  }
  if (sets.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE fixed_expenses SET ${sets.join(", ")} WHERE id = ?`).run(...values);
}

export function deleteFixedExpense(id: number) {
  const db = getDb();
  db.prepare("DELETE FROM fixed_expenses WHERE id = ?").run(id);
}

// ---------- Incomes ----------

export interface Income {
  id: number;
  name: string;
  amount: number;
  day_of_month: number | null;
  recurring: number;
  active: number;
  created_at: string;
}

export function getIncomes(activeOnly = true): Income[] {
  const db = getDb();
  const filter = activeOnly ? "WHERE active = 1" : "";
  return db.prepare(`SELECT * FROM incomes ${filter} ORDER BY name`).all() as Income[];
}

export function addIncome(inc: { name: string; amount: number; day_of_month?: number; recurring?: number }): Income {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO incomes (name, amount, day_of_month, recurring)
    VALUES (?, ?, ?, ?)
  `).run(inc.name, inc.amount, inc.day_of_month ?? null, inc.recurring ?? 1);
  return db.prepare("SELECT * FROM incomes WHERE id = ?").get(result.lastInsertRowid) as Income;
}

export function updateIncome(id: number, fields: Partial<Omit<Income, "id" | "created_at">>) {
  const db = getDb();
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, val] of Object.entries(fields)) {
    sets.push(`${key} = ?`);
    values.push(val);
  }
  if (sets.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE incomes SET ${sets.join(", ")} WHERE id = ?`).run(...values);
}

export function deleteIncome(id: number) {
  const db = getDb();
  db.prepare("DELETE FROM incomes WHERE id = ?").run(id);
}

/**
 * Categorize using user-defined merchant rules first, then keyword rules.
 * This function is server-only (depends on db).
 */
export function smartCategorize(merchant: string): string {
  const userRule = getMerchantRule(merchant);
  if (userRule) return userRule;

  // Fall back to keyword-based categorization
  const { categorize } = require("./categorize");
  return categorize(merchant);
}

// ---------- Gmail tokens ----------

export function saveGmailTokens(tokens: { access_token: string; refresh_token: string; expiry_date: number }) {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO gmail_tokens (id, access_token, refresh_token, expiry_date)
    VALUES (1, ?, ?, ?)
  `).run(tokens.access_token, tokens.refresh_token, tokens.expiry_date);
}

export function getGmailTokens() {
  const db = getDb();
  return db.prepare("SELECT * FROM gmail_tokens WHERE id = 1").get() as {
    access_token: string;
    refresh_token: string;
    expiry_date: number;
  } | undefined;
}
