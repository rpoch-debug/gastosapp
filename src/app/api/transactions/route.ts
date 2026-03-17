import { NextRequest, NextResponse } from "next/server";
import {
  getTransactionsByRange,
  getCategoryTotalsByRange,
  getMonthlyTotals, updateTransactionCategory,
  getBillingPeriod,
  getSetting,
} from "@/lib/db";
import { CATEGORIES } from "@/lib/categorize";

export type ViewMode = "daily" | "weekly" | "monthly" | "billing";

const DEFAULT_USD_RATE = 950;

function getUsdRate(): number {
  const saved = getSetting("usd_rate");
  return saved ? parseFloat(saved) : DEFAULT_USD_RATE;
}

/** Convert USD transactions (stored as cents) to CLP using configurable rate */
function applyUsdConversion<T extends { amount: number; currency: string; original_amount: number | null }>(
  items: T[],
  rate: number
): T[] {
  return items.map((item) => {
    if (item.currency === "USD") {
      // amount is stored as USD cents, convert to CLP
      const usdAmount = item.amount / 100;
      return { ...item, amount: Math.round(usdAmount * rate) };
    }
    return item;
  });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = (params.get("mode") || "monthly") as ViewMode;
  const ref = params.get("ref") || undefined;

  const { from, to, label } = computeRange(mode, ref);
  const usdRate = getUsdRate();

  const rawTransactions = getTransactionsByRange(from, to);
  const transactions = applyUsdConversion(rawTransactions, usdRate);
  const monthlyTotals = getMonthlyTotals();
  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  // Recalculate category totals with converted amounts
  const catMap = new Map<string, number>();
  for (const tx of transactions) {
    catMap.set(tx.category, (catMap.get(tx.category) || 0) + tx.amount);
  }
  const categoryTotals = Array.from(catMap.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  // Aggregate by card
  const cardMap = new Map<string, { count: number; total: number }>();
  for (const tx of transactions) {
    const key = tx.card_last4 || "sin tarjeta";
    const entry = cardMap.get(key) || { count: 0, total: 0 };
    entry.count++;
    entry.total += tx.amount;
    cardMap.set(key, entry);
  }
  const cardTotals = Array.from(cardMap.entries())
    .map(([card, data]) => ({ card, ...data }))
    .sort((a, b) => b.total - a.total);

  return NextResponse.json({
    transactions,
    categoryTotals,
    monthlyTotals,
    cardTotals,
    total,
    usdRate,
    categories: CATEGORIES,
    period: { from, to, label, mode },
  });
}

export async function PATCH(request: NextRequest) {
  const { id, category } = await request.json();

  if (!id || !category) {
    return NextResponse.json({ error: "id and category required" }, { status: 400 });
  }

  // This also saves a merchant_rule for future auto-categorization
  updateTransactionCategory(id, category);

  // Also re-categorize all other transactions from the same merchant
  const { getDb } = await import("@/lib/db");
  const db = getDb();
  const tx = db.prepare("SELECT merchant FROM transactions WHERE id = ?").get(id) as { merchant: string } | undefined;
  let updated = 0;
  if (tx) {
    const result = db.prepare(
      "UPDATE transactions SET category = ? WHERE merchant = ? AND id != ?"
    ).run(category, tx.merchant, id);
    updated = result.changes;
  }

  return NextResponse.json({ status: "ok", updated });
}

function computeRange(mode: ViewMode, ref?: string): { from: string; to: string; label: string } {
  const now = ref ? new Date(ref + "T00:00:00") : new Date();

  switch (mode) {
    case "daily": {
      const ds = toDateStr(now);
      const next = addDays(ds, 1);
      const label = new Intl.DateTimeFormat("es-CL", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      }).format(now);
      return { from: ds, to: next, label };
    }

    case "weekly": {
      const day = now.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const from = toDateStr(monday);
      const to = addDays(toDateStr(sunday), 1);
      const label = `${fmtShort(from)} — ${fmtShort(toDateStr(sunday))}`;
      return { from, to, label };
    }

    case "monthly": {
      const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const to = toDateStr(nextMonth);
      const label = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(now);
      return { from, to, label };
    }

    case "billing": {
      return getBillingPeriod(ref || toDateStr(now));
    }
  }
}

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
