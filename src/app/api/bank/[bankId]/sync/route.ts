import { NextResponse } from "next/server";
import {
  insertTransaction,
  smartCategorize,
  getSetting,
  setSetting,
  addBillingCycleDate,
} from "@/lib/db";
import { BANK_CONFIGS } from "@/lib/bank-configs";

export const runtime = "nodejs";
export const maxDuration = 120;

// ─── Helpers ─────────────────────────────────────────────────────

function normalizeDate(raw: string): string {
  const sep = raw.includes("-") ? "-" : "/";
  const parts = raw.split(sep);
  if (parts.length !== 3) return raw;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

const MONTHS_ES: Record<string, string> = {
  enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
  julio: "07", agosto: "08", septiembre: "09", octubre: "10", noviembre: "11", diciembre: "12",
};

function parseBillingDate(raw: string): string | null {
  const clean = raw.trim().toLowerCase();
  const match = clean.match(/(\d{1,2})\s+de\s+(\w+)(?:\s+de\s+(\d{4}))?/);
  if (!match) return null;
  const day = match[1].padStart(2, "0");
  const monthNum = MONTHS_ES[match[2]];
  if (!monthNum) return null;
  if (match[3]) {
    return `${parseInt(match[3])}-${monthNum}-${day}`;
  }
  const today = new Date();
  let year = today.getFullYear();
  const candidate = new Date(`${year}-${monthNum}-${day}`);
  if (candidate <= today) year++;
  return `${year}-${monthNum}-${day}`;
}

function cleanMerchant(raw: string): string {
  return raw
    .replace(/\s+COMPRAS\s+INT\.\w*/i, "")
    .replace(/\s+COMPRAS\b/i, "")
    .replace(/\s+\d{1,2}\/\d{1,2}\s*$/, "")
    .replace(/\s+(CHL|CL|US)\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Detecta si un movimiento es de tarjeta de crédito.
 * Para bancos con allMovementsAreTC=true, siempre retorna true.
 */
function isTCMovement(description: string, allMovementsAreTC: boolean): boolean {
  if (allMovementsAreTC) return true;
  return description.startsWith("[TC ");
}

/**
 * Detecta si es una transacción internacional (USD).
 * - intInTag=true: el INT viene dentro del tag: "[TC No Facturado INT]"
 * - intInTag=false: busca [INT] separado o COMPRAS INT en el merchant (bchile)
 */
function isInternational(description: string, intInTag: boolean): boolean {
  if (intInTag) return /\sINT\]/i.test(description);
  return /\[INT\]|COMPRAS\s+INT/i.test(description);
}

/**
 * Extrae card_last4 del description si viene en el tag:
 *   "[TC Mastercard Black ****5824] ..." → "5824"  (bchile)
 * Fallback: primer creditCard del resultado con last4 extraída de su label.
 */
function extractCardLast4(
  description: string,
  creditCardLabels: string[]
): string | null {
  // Desde el tag del movimiento (bchile)
  const tagMatch = description.match(/\[TC [^\]]*\*{4}(\d{4})\]/);
  if (tagMatch) return tagMatch[1];

  // Fallback: si hay una sola tarjeta, usar su last4
  if (creditCardLabels.length === 1) {
    const labelMatch = creditCardLabels[0].match(/\*{4}\s*(\d{4})/);
    if (labelMatch) return labelMatch[1];
  }

  return null;
}

/** Limpia el tag [TC ...] y el prefijo [INT] del description para obtener el merchant */
function extractMerchant(description: string): string {
  const withoutTag = description
    .replace(/^\[TC [^\]]+\]\s*/, "")
    .replace(/^\[INT\]\s*/, "")
    .trim();
  return cleanMerchant(withoutTag) || "Sin descripcion";
}

// ─── Route handlers ───────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bankId: string }> }
) {
  const { bankId } = await params;
  const cfg = BANK_CONFIGS[bankId];
  if (!cfg) {
    return NextResponse.json({ error: "Banco no soportado" }, { status: 404 });
  }
  const configured = !!(
    (getSetting(`cred_${bankId}_rut`) || process.env[cfg.rutEnv]) &&
    (getSetting(`cred_${bankId}_password`) || process.env[cfg.passwordEnv])
  );
  const lastSync = getSetting(`last_sync_${bankId}`) ?? null;
  return NextResponse.json({ configured, lastSync, name: cfg.name });
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ bankId: string }> }
) {
  const { bankId } = await params;
  const cfg = BANK_CONFIGS[bankId];
  if (!cfg) {
    return NextResponse.json({ error: "Banco no soportado" }, { status: 404 });
  }

  // Credentials: DB takes priority over env vars
  const rut = getSetting(`cred_${bankId}_rut`) ?? process.env[cfg.rutEnv];
  const password = getSetting(`cred_${bankId}_password`) ?? process.env[cfg.passwordEnv];

  if (!rut || !password) {
    return NextResponse.json(
      {
        error: `Credenciales no configuradas. Agrega ${cfg.rutEnv} y ${cfg.passwordEnv} en .env.local`,
      },
      { status: 400 }
    );
  }

  try {
    const { banks } = await import("open-banking-chile");
    const scraper = banks[bankId as keyof typeof banks];

    if (!scraper) {
      return NextResponse.json(
        { error: `${cfg.name} no disponible en open-banking-chile` },
        { status: 500 }
      );
    }

    const result = await scraper.scrape({ rut, password });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Error al conectar con el banco" },
        { status: 500 }
      );
    }

    // Extraer y guardar fechas de facturación
    const creditCardLabels = (result.creditCards ?? []).map((c) => c.label ?? "");
    const billingDatesFound: string[] = [];

    for (const card of result.creditCards ?? []) {
      if (card.nextBillingDate) {
        const parsed = parseBillingDate(card.nextBillingDate);
        if (parsed) {
          addBillingCycleDate(parsed);
          billingDatesFound.push(parsed);
          if (billingDatesFound.length === 1) {
            const day = parseInt(parsed.split("-")[2], 10);
            setSetting("billing_day", String(day));
          }
        }
      }
    }

    let imported = 0;
    let skipped = 0;

    for (const movement of result.movements ?? []) {
      if (!isTCMovement(movement.description ?? "", cfg.allMovementsAreTC ?? false)) {
        skipped++;
        continue;
      }

      // Solo cargos (amount negativo = gasto)
      if (movement.amount >= 0) {
        skipped++;
        continue;
      }

      const card_last4 = extractCardLast4(movement.description, creditCardLabels);
      const merchant = extractMerchant(movement.description);
      const date = normalizeDate(movement.date);
      const international = isInternational(movement.description, cfg.intInTag ?? false);
      const category = smartCategorize(merchant);

      let tx;
      if (international) {
        const usdCents = Math.round(Math.abs(movement.amount) * 100);
        tx = insertTransaction({
          amount: usdCents,
          merchant,
          category,
          date,
          card_last4,
          source: bankId,
          raw_text: JSON.stringify(movement).substring(0, 500),
          email_id: null,
          currency: "USD",
          original_amount: usdCents,
        });
      } else {
        tx = insertTransaction({
          amount: Math.abs(Math.round(movement.amount)),
          merchant,
          category,
          date,
          card_last4,
          source: bankId,
          raw_text: JSON.stringify(movement).substring(0, 500),
          email_id: null,
          currency: "CLP",
          original_amount: null,
        });
      }

      if (tx) imported++;
      else skipped++;
    }

    setSetting(`last_sync_${bankId}`, new Date().toISOString());

    return NextResponse.json({
      imported,
      skipped,
      total: result.movements?.length ?? 0,
      balance: result.balance,
      billingDates: billingDatesFound,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
