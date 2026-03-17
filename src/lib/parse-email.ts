export interface ParsedTransaction {
  amount: number;
  merchant: string;
  card_last4: string;
  date: string;
  currency: "CLP" | "USD";
  original_amount?: number;
}

/**
 * Parses Banco Edwards / Banco de Chile email notifications.
 *
 * Example format:
 * "Te informamos que se ha realizado una compra por $1.790 con Tarjeta de
 *  Crédito ****5280 en HIP LIDER LOS DOMINICO SANTIAGO CHL el 16/03/2026 13:45."
 */
export function parseBancoEdwardsEmail(text: string): ParsedTransaction | null {
  const cleaned = text.replace(/\s+/g, " ").trim();

  // Try CLP pattern first (most common)
  const clpPattern =
    /compra por \$([0-9.,]+)\s+con\s+Tarjeta de (?:Cr[eé]dito|D[eé]bito)\s+\*{3,4}(\d{4})\s+en\s+(.+?)\s+el\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/i;

  const clpMatch = cleaned.match(clpPattern);
  if (clpMatch) {
    const [, rawAmount, card_last4, rawMerchant, rawDate, time] = clpMatch;
    return {
      amount: parseChileanAmount(rawAmount),
      merchant: cleanMerchant(rawMerchant),
      card_last4,
      date: parseDate(rawDate, time),
      currency: "CLP",
    };
  }

  // Try USD pattern (US$12,33 — comma as decimal separator)
  const usdPattern =
    /compra por US\$([0-9.,]+)\s+con\s+Tarjeta de (?:Cr[eé]dito|D[eé]bito)\s+\*{3,4}(\d{4})\s+en\s+(.+?)\s+el\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/i;

  const usdMatch = cleaned.match(usdPattern);
  if (usdMatch) {
    const [, rawAmount, card_last4, rawMerchant, rawDate, time] = usdMatch;
    const usdAmount = parseUsdAmount(rawAmount);
    // Store USD cents as amount, convert at query time using configurable rate
    const usdCents = Math.round(usdAmount * 100);
    return {
      amount: usdCents,
      merchant: cleanMerchant(rawMerchant),
      card_last4,
      date: parseDate(rawDate, time),
      currency: "USD",
      original_amount: usdAmount,
    };
  }

  return null;
}

function parseChileanAmount(raw: string): number {
  // Chilean format: 1.790 (dot as thousands separator, no decimals for CLP)
  return parseInt(raw.replace(/\./g, "").replace(/,/g, ""), 10);
}

function parseUsdAmount(raw: string): number {
  // USD in Chilean emails: 12,33 (comma as decimal) or 1.234,56
  // Remove dots (thousands), replace comma with dot (decimal)
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  return parseFloat(normalized);
}

function cleanMerchant(raw: string): string {
  return raw
    .replace(/\s+(CHL|CL|SANTIAGO|CHILE|USA|US|SE|NL|Stockholm|Amsterdam|CUPERTNO)\s*$/i, "")
    .replace(/\s+\+\d{6,}\s*$/i, "")  // Remove phone numbers at end
    .replace(/\s+\d{3}-\d{3}-\d{4}\s*$/i, "")  // Remove phone format 866-579-7172
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(dateStr: string, time: string): string {
  const [day, month, year] = dateStr.split("/");
  return `${year}-${month}-${day}T${time}:00`;
}

/**
 * Extracts plain text from Gmail message payload.
 */
export function extractEmailText(payload: Record<string, unknown>): string {
  const body = payload.body as { data?: string } | undefined;
  if (body?.data) {
    return Buffer.from(body.data, "base64url").toString("utf-8");
  }

  const parts = payload.parts as Array<{ mimeType?: string | null; body?: { data?: string } }> | undefined;
  if (parts) {
    const textPart = parts.find((p) => p.mimeType === "text/plain");
    if (textPart?.body?.data) {
      return Buffer.from(textPart.body.data, "base64url").toString("utf-8");
    }
    const htmlPart = parts.find((p) => p.mimeType === "text/html");
    if (htmlPart?.body?.data) {
      const html = Buffer.from(htmlPart.body.data, "base64url").toString("utf-8");
      return decodeHtmlEntities(html.replace(/<[^>]+>/g, " "));
    }
  }

  return "";
}

const HTML_ENTITIES: Record<string, string> = {
  "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">",
  "&quot;": '"', "&apos;": "'",
  "&eacute;": "é", "&Eacute;": "É",
  "&aacute;": "á", "&Aacute;": "Á",
  "&iacute;": "í", "&Iacute;": "Í",
  "&oacute;": "ó", "&Oacute;": "Ó",
  "&uacute;": "ú", "&Uacute;": "Ú",
  "&ntilde;": "ñ", "&Ntilde;": "Ñ",
  "&uuml;": "ü", "&Uuml;": "Ü",
};

function decodeHtmlEntities(text: string): string {
  let result = text;
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    result = result.replaceAll(entity, char);
  }
  // Handle numeric entities like &#233;
  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
  return result;
}
