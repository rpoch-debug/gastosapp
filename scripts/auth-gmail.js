/**
 * Script para autenticación de Gmail.
 * Usa el flujo de "installed app" que es compatible con las credenciales desktop.
 *
 * Uso: node scripts/auth-gmail.js
 *
 * 1. Te da una URL para abrir en el browser
 * 2. Autorizas la app
 * 3. Google te redirige a localhost con un code
 * 4. El script captura el code y guarda los tokens
 */

const { google } = require("googleapis");
const http = require("http");
const url = require("url");
const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "gastos.db");

// Credentials from .env.local
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3001/callback"; // Temporary local server

async function main() {
  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
  });

  console.log("\n=== Autenticación Gmail ===\n");
  console.log("Abre esta URL en tu browser:\n");
  console.log(authUrl);
  console.log("\nEsperando autorización...\n");

  // Start temporary server to capture the callback
  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const query = url.parse(req.url, true).query;
      if (query.code) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<h1>✅ Autorización exitosa!</h1><p>Puedes cerrar esta pestaña.</p>");
        server.close();
        resolve(query.code);
      } else if (query.error) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<h1>❌ Error: ${query.error}</h1>`);
        server.close();
        reject(new Error(query.error));
      }
    });

    server.listen(3001, () => {
      console.log("Servidor temporal escuchando en http://localhost:3001");
    });
  });

  console.log("Code recibido, intercambiando por tokens...");

  const { tokens } = await oauth2Client.getToken(code);
  console.log("Tokens recibidos!");

  // Save to database
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  // Ensure tables exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS gmail_tokens (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expiry_date INTEGER NOT NULL
    );
  `);

  db.prepare(`
    INSERT OR REPLACE INTO gmail_tokens (id, access_token, refresh_token, expiry_date)
    VALUES (1, ?, ?, ?)
  `).run(
    tokens.access_token,
    tokens.refresh_token,
    tokens.expiry_date || Date.now() + 3600 * 1000
  );

  db.close();

  console.log("\n✅ Gmail conectado exitosamente!");
  console.log("Los tokens se guardaron en gastos.db");
  console.log("Ahora puedes hacer sync desde el dashboard.\n");
}

main().catch(console.error);
