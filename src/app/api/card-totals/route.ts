import { NextResponse } from "next/server";
import { getDb, getSetting } from "@/lib/db";

const DEFAULT_USD_RATE = 950;

export async function GET() {
  const db = getDb();
  const usdRate = parseFloat(getSetting("usd_rate") || String(DEFAULT_USD_RATE));

  const rows = db.prepare(`
    SELECT
      card_last4,
      currency,
      SUM(amount) as total,
      COUNT(*) as count
    FROM transactions
    WHERE card_last4 IS NOT NULL
    GROUP BY card_last4, currency
    ORDER BY card_last4
  `).all() as { card_last4: string; currency: string; total: number; count: number }[];

  // Group by card
  const cardMap = new Map<string, { clp: number; usdCents: number; usdCLP: number; count: number }>();
  for (const row of rows) {
    const entry = cardMap.get(row.card_last4) || { clp: 0, usdCents: 0, usdCLP: 0, count: 0 };
    entry.count += row.count;
    if (row.currency === "USD") {
      entry.usdCents += row.total;
      entry.usdCLP += Math.round((row.total / 100) * usdRate);
    } else {
      entry.clp += row.total;
    }
    cardMap.set(row.card_last4, entry);
  }

  const cards = Array.from(cardMap.entries()).map(([card_last4, data]) => ({
    card_last4,
    clp: data.clp,
    usdCents: data.usdCents,
    usdCLP: data.usdCLP,
    total: data.clp + data.usdCLP,
    count: data.count,
  })).sort((a, b) => b.total - a.total);

  return NextResponse.json({ cards, usdRate });
}
