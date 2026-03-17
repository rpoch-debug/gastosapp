require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { google } = require('googleapis');
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'gastos.db');
const db = new Database(DB_PATH);
const tokens = db.prepare("SELECT * FROM gmail_tokens WHERE id = 1").get();

// Import parse functions inline since they're TS
function decodeHtmlEntities(text) {
  const entities = {
    "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">",
    "&eacute;": "é", "&Eacute;": "É",
    "&aacute;": "á", "&Aacute;": "Á",
    "&iacute;": "í", "&Iacute;": "Í",
    "&oacute;": "ó", "&Oacute;": "Ó",
    "&uacute;": "ú", "&Uacute;": "Ú",
    "&ntilde;": "ñ", "&Ntilde;": "Ñ",
  };
  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.split(entity).join(char);
  }
  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  return result;
}

function extractText(payload) {
  const body = payload.body;
  if (body && body.data) {
    return Buffer.from(body.data, "base64url").toString("utf-8");
  }
  if (payload.parts) {
    const textPart = payload.parts.find(p => p.mimeType === "text/plain");
    if (textPart && textPart.body && textPart.body.data) {
      return Buffer.from(textPart.body.data, "base64url").toString("utf-8");
    }
    const htmlPart = payload.parts.find(p => p.mimeType === "text/html");
    if (htmlPart && htmlPart.body && htmlPart.body.data) {
      const html = Buffer.from(htmlPart.body.data, "base64url").toString("utf-8");
      return decodeHtmlEntities(html.replace(/<[^>]+>/g, " "));
    }
  }
  return "";
}

function parse(text) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const pattern = /compra por \$([0-9.,]+)\s+con\s+Tarjeta de (?:Cr[eé]dito|D[eé]bito)\s+\*{3,4}(\d{4})\s+en\s+(.+?)\s+el\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/i;
  return cleaned.match(pattern);
}

async function main() {
  const client = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET);
  client.setCredentials(tokens);
  const gmail = google.gmail({ version: 'v1', auth: client });

  const since = new Date();
  since.setMonth(since.getMonth() - 1);
  const afterDate = `${since.getFullYear()}/${String(since.getMonth()+1).padStart(2,'0')}/${String(since.getDate()).padStart(2,'0')}`;
  const query = `from:enviodigital@bancoedwards.cl (subject:Compra OR subject:compra) after:${afterDate}`;

  const res = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 500 });
  const msgs = res.data.messages || [];

  let failCount = 0;
  for (const msg of msgs) {
    const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
    const subject = full.data.payload.headers.find(h => h.name.toLowerCase() === 'subject');
    const text = extractText(full.data.payload);
    const matched = parse(text);
    if (!matched) {
      failCount++;
      const cleaned = text.replace(/\s+/g, ' ').trim();
      // Look for key patterns
      const dollarMatch = cleaned.match(/\$[0-9.,]+/);
      const tarjetaMatch = cleaned.match(/\*{3,4}\d{4}/);
      console.log(`--- FAILED #${failCount} ---`);
      console.log(`Subject: ${subject ? subject.value : 'N/A'}`);
      console.log(`Dollar found: ${dollarMatch ? dollarMatch[0] : 'NO'}`);
      console.log(`Card found: ${tarjetaMatch ? tarjetaMatch[0] : 'NO'}`);
      // Show a relevant chunk
      const idx = cleaned.toLowerCase().indexOf('compra');
      if (idx >= 0) {
        console.log(`Context: ...${cleaned.substring(Math.max(0,idx-10), idx+250)}...`);
      } else {
        console.log(`First 300: ${cleaned.substring(0, 300)}`);
      }
      console.log('');
    }
  }
  console.log(`\nTotal: ${failCount} failed out of ${msgs.length}`);
}

main().catch(console.error);
