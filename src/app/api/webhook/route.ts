import { NextRequest, NextResponse } from "next/server";
import { insertTransaction, smartCategorize } from "@/lib/db";

/**
 * Apple Wallet webhook — receives transaction data from iPhone Shortcut.
 *
 * Expected POST body:
 * {
 *   "amount": 1790,          // amount in CLP (integer)
 *   "merchant": "LIDER",     // merchant name
 *   "date": "2026-03-16T13:45:00",
 *   "card_last4": "5280",    // optional
 *   "secret": "..."          // webhook secret for auth
 * }
 *
 * Also supports GET with query params for simpler Shortcut setup:
 * /api/webhook?amount=1790&merchant=LIDER&date=2026-03-16T13:45:00&secret=...
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return handleWebhook(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const body = {
    amount: params.get("amount"),
    merchant: params.get("merchant"),
    date: params.get("date"),
    card_last4: params.get("card_last4"),
    secret: params.get("secret"),
  };
  return handleWebhook(body);
}

function handleWebhook(body: Record<string, unknown>) {
  const secret = process.env.WEBHOOK_SECRET;
  if (secret && body.secret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const amount = typeof body.amount === "number" ? body.amount : parseInt(String(body.amount), 10);
  const merchant = String(body.merchant || "").trim();
  const date = String(body.date || new Date().toISOString());

  if (!amount || !merchant) {
    return NextResponse.json({ error: "amount and merchant are required" }, { status: 400 });
  }

  const category = smartCategorize(merchant);

  const tx = insertTransaction({
    amount,
    merchant,
    category,
    date,
    card_last4: body.card_last4 ? String(body.card_last4) : null,
    source: "webhook",
    raw_text: JSON.stringify(body),
    email_id: null,
    currency: "CLP",
    original_amount: null,
  });

  if (!tx) {
    return NextResponse.json({ status: "duplicate", message: "Transaction already exists" });
  }

  return NextResponse.json({ status: "ok", transaction: tx });
}
