import { google } from "googleapis";
import { getGmailTokens, saveGmailTokens } from "./db";

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
}

export function getAuthUrl() {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
  });
}

export async function getAuthenticatedClient() {
  const tokens = getGmailTokens();
  if (!tokens) return null;

  const client = getOAuth2Client();
  client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
  });

  client.on("tokens", (newTokens) => {
    saveGmailTokens({
      access_token: newTokens.access_token || tokens.access_token,
      refresh_token: newTokens.refresh_token || tokens.refresh_token,
      expiry_date: newTokens.expiry_date || tokens.expiry_date,
    });
  });

  return client;
}

/**
 * Fetch all bank email IDs with pagination.
 * @param monthsBack - how many months back to search (used for first sync)
 * @param daysBack - if set, overrides monthsBack and searches only N days back (for updates)
 */
export async function fetchBankEmails(monthsBack = 3, daysBack: number | null = null): Promise<{ id: string }[]> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Gmail not authenticated");

  const gmail = google.gmail({ version: "v1", auth });

  const since = new Date();
  if (daysBack !== null) {
    since.setDate(since.getDate() - daysBack);
  } else {
    since.setMonth(since.getMonth() - monthsBack);
  }
  const afterDate = `${since.getFullYear()}/${String(since.getMonth() + 1).padStart(2, "0")}/${String(since.getDate()).padStart(2, "0")}`;

  const query = `from:enviodigital@bancoedwards.cl (subject:Compra OR subject:compra) after:${afterDate}`;

  const allMessages: { id: string }[] = [];
  let pageToken: string | undefined;

  do {
    const res = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 500,
      pageToken,
    });

    if (res.data.messages) {
      for (const msg of res.data.messages) {
        if (msg.id) allMessages.push({ id: msg.id });
      }
    }

    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);

  return allMessages;
}

export async function getEmailContent(messageId: string) {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Gmail not authenticated");

  const gmail = google.gmail({ version: "v1", auth });

  const res = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  return res.data;
}
