import { NextResponse } from "next/server";
import { insertTransaction, smartCategorize, getSetting, setSetting, addBillingCycleDate } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Normaliza fecha de DD-MM-YYYY o DD/MM/YYYY a YYYY-MM-DD */
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

/**
 * Parsea "19 de marzo" o "19 de marzo de 2026" → "2026-03-19"
 * Infiere el año: si el mes ya pasó respecto a hoy, asume año siguiente.
 */
function parseBillingDate(raw: string): string | null {
  const clean = raw.trim().toLowerCase();
  const match = clean.match(/(\d{1,2})\s+de\s+(\w+)(?:\s+de\s+(\d{4}))?/);
  if (!match) return null;
  const day = match[1].padStart(2, "0");
  const monthName = match[2];
  const monthNum = MONTHS_ES[monthName];
  if (!monthNum) return null;
  // Si el año viene explícito del banco, usarlo directo
  if (match[3]) {
    const year = parseInt(match[3]);
    return `${year}-${monthNum}-${day}`;
  }
  // Sin año: inferir el próximo occurrence de esa fecha
  const today = new Date();
  let year = today.getFullYear();
  const candidate = new Date(`${year}-${monthNum}-${day}`);
  if (candidate <= today) year++;
  return `${year}-${monthNum}-${day}`;
}

/** Limpia el nombre del comercio removiendo sufijos del banco */
function cleanMerchant(raw: string): string {
  return raw
    .replace(/\s+COMPRAS\s+INT\.\w*/i, "") // "COMPRAS INT.MA", "COMPRAS INT.VI"
    .replace(/\s+COMPRAS\b/i, "")           // "COMPRAS" solo
    .replace(/\s+\d{1,2}\/\d{1,2}\s*$/, "") // cuotas "01/01", "02/06" al final
    .replace(/\s+(CHL|CL|US)\s*$/i, "")     // pais al final
    .replace(/\s{2,}/g, " ")                // espacios multiples
    .trim();
}

export async function POST() {
  const rut = process.env.BANCO_CHILE_RUT;
  const password = process.env.BANCO_CHILE_PASSWORD;

  if (!rut || !password) {
    return NextResponse.json(
      {
        error:
          "Credenciales no configuradas. Agrega BANCO_CHILE_RUT y BANCO_CHILE_PASSWORD en .env.local",
      },
      { status: 400 }
    );
  }

  try {
    // Dynamic import — Puppeteer solo corre server-side
    const { banks } = await import("open-banking-chile");
    const scraper = banks["bchile"];

    if (!scraper) {
      return NextResponse.json({ error: "Banco de Chile no disponible" }, { status: 500 });
    }

    const result = await scraper.scrape({ rut, password });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Error al conectar con el banco" },
        { status: 500 }
      );
    }

    // Extraer y guardar fechas de facturación desde la API del banco
    const billingDatesFound: string[] = [];
    for (const card of result.creditCards ?? []) {
      if (card.nextBillingDate) {
        const parsed = parseBillingDate(card.nextBillingDate);
        if (parsed) {
          addBillingCycleDate(parsed);
          billingDatesFound.push(parsed);
          // Actualizar billing_day con el dia de corte de la primera tarjeta
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
      // Solo importar movimientos de tarjeta de credito (tag empieza con [TC ...)
      if (!movement.description?.startsWith("[TC ")) {
        skipped++;
        continue;
      }

      // Solo importar cargos (amount negativo = gasto)
      if (movement.amount >= 0) {
        skipped++;
        continue;
      }

      // Extraer card_last4 del tag: "[TC Mastercard Black ****5824] COMERCIO" → "5824"
      const tagMatch = movement.description.match(/^\[TC [^\]]*\*{4}(\d{4})\]/);
      const card_last4 = tagMatch ? tagMatch[1] : null;

      // Limpiar descripcion: remover tag [TC ...] y posible [INT]
      const withoutTag = movement.description.replace(/^\[TC [^\]]+\]\s*/, "").replace(/^\[INT\]\s*/, "").trim();
      const merchant = cleanMerchant(withoutTag) || "Sin descripcion";
      const date = normalizeDate(movement.date);

      // Detectar transacciones internacionales (monto en USD)
      const isInternational = /\[INT\]/.test(movement.description) || /COMPRAS INT/i.test(movement.description);

      let tx;
      if (isInternational) {
        // Monto del scraper viene en USD — guardar como centavos USD (igual que email)
        const usdCents = Math.round(Math.abs(movement.amount) * 100);
        const category = smartCategorize(merchant);
        tx = insertTransaction({
          amount: usdCents,
          merchant,
          category,
          date,
          card_last4,
          source: "banco-chile",
          raw_text: JSON.stringify(movement).substring(0, 500),
          email_id: null,
          currency: "USD",
          original_amount: usdCents,
        });
      } else {
        // CLP normal
        const category = smartCategorize(merchant);
        tx = insertTransaction({
          amount: Math.abs(Math.round(movement.amount)),
          merchant,
          category,
          date,
          card_last4,
          source: "banco-chile",
          raw_text: JSON.stringify(movement).substring(0, 500),
          email_id: null,
          currency: "CLP",
          original_amount: null,
        });
      }

      if (tx) imported++;
      else skipped++;
    }

    setSetting("last_banco_chile_sync", new Date().toISOString());

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

export async function GET() {
  const configured = !!(process.env.BANCO_CHILE_RUT && process.env.BANCO_CHILE_PASSWORD);
  const lastSync = getSetting("last_banco_chile_sync");
  return NextResponse.json({ configured, lastSync });
}
