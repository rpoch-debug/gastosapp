import { NextRequest, NextResponse } from "next/server";
import { fetchBankEmails, getEmailContent, getAuthUrl } from "@/lib/gmail";
import { getGmailTokens, insertTransaction, smartCategorize, getSetting, setSetting } from "@/lib/db";
import { parseBancoEdwardsEmail, extractEmailText } from "@/lib/parse-email";

/** Determine how far back to search based on sync history */
function getSearchWindow(): { monthsBack: number; isFirstSync: boolean } {
  const lastSync = getSetting("last_gmail_sync");
  if (!lastSync) {
    return { monthsBack: 3, isFirstSync: true };
  }
  // Subsequent sync: only go back 7 days to catch recent emails
  // (using days instead of "since last sync" to handle edge cases)
  return { monthsBack: 0, isFirstSync: false };
}

export async function POST(request: NextRequest) {
  const tokens = getGmailTokens();
  if (!tokens) {
    return NextResponse.json({
      error: "Gmail not connected",
      authUrl: getAuthUrl(),
    }, { status: 401 });
  }

  // Check if user is forcing a full re-sync
  let forceFullSync = false;
  let customMonths: number | null = null;
  try {
    const body = await request.json();
    if (body.fullSync) forceFullSync = true;
    if (body.monthsBack) customMonths = Math.min(body.monthsBack, 24);
  } catch {
    // No body or invalid JSON
  }

  const { monthsBack: autoMonths, isFirstSync } = getSearchWindow();

  // Priority: user custom > force full > auto
  let finalMonths: number;
  let searchDays: number | null = null;

  if (customMonths !== null) {
    finalMonths = customMonths;
  } else if (forceFullSync) {
    finalMonths = 3;
  } else if (isFirstSync) {
    finalMonths = autoMonths; // 3 months
  } else {
    finalMonths = 0;
    searchDays = 7; // just last 7 days
  }

  try {
    const messages = await fetchBankEmails(finalMonths, searchDays);
    let imported = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const msg of messages) {
      if (!msg.id) continue;

      try {
        const email = await getEmailContent(msg.id);
        if (!email.payload) continue;

        const text = extractEmailText(email.payload as unknown as Record<string, unknown>);
        const parsed = parseBancoEdwardsEmail(text);

        if (!parsed) {
          failed++;
          if (errors.length < 3) {
            errors.push(text.substring(0, 200));
          }
          continue;
        }

        const category = smartCategorize(parsed.merchant);
        const tx = insertTransaction({
          amount: parsed.amount,
          merchant: parsed.merchant,
          category,
          date: parsed.date,
          card_last4: parsed.card_last4,
          source: "email",
          raw_text: text.substring(0, 500),
          email_id: msg.id,
          currency: parsed.currency,
          original_amount: parsed.original_amount ? Math.round(parsed.original_amount * 100) : null,
        });

        if (tx) imported++;
        else skipped++;
      } catch {
        failed++;
      }
    }

    // Save last sync timestamp
    setSetting("last_gmail_sync", new Date().toISOString());

    return NextResponse.json({
      imported,
      skipped,
      failed,
      total: messages.length,
      isFirstSync,
      searchScope: searchDays ? `últimos ${searchDays} días` : `${finalMonths} meses`,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const tokens = getGmailTokens();
  const lastSync = getSetting("last_gmail_sync");
  return NextResponse.json({
    connected: !!tokens,
    authUrl: tokens ? null : getAuthUrl(),
    lastSync,
  });
}
