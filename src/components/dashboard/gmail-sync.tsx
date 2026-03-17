"use client";

import { useState, useEffect } from "react";

interface Props {
  onSync: () => void;
}

export function GmailSync({ onSync }: Props) {
  const [connected, setConnected] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/gmail/sync")
      .then((r) => r.json())
      .then((data) => {
        setConnected(data.connected);
        setAuthUrl(data.authUrl);
        setLastSync(data.lastSync);
      });
  }, []);

  async function handleSync(fullSync = false) {
    setSyncing(true);
    setResult(null);
    try {
      const body: Record<string, unknown> = {};
      if (fullSync) body.fullSync = true;

      const res = await fetch("/api/gmail/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        setResult(`Error: ${data.error}`);
        if (data.authUrl) setAuthUrl(data.authUrl);
      } else {
        const scope = data.searchScope || "";
        setResult(`${data.imported} nuevos, ${data.skipped} ya existentes (${scope})`);
        setLastSync(new Date().toISOString());
        onSync();
      }
    } catch {
      setResult("Error de conexion");
    }
    setSyncing(false);
  }

  if (!connected && authUrl) {
    return (
      <a
        href={authUrl}
        className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-medium text-sm hover:opacity-90 transition-opacity"
      >
        Conectar Gmail
      </a>
    );
  }

  const lastSyncLabel = lastSync
    ? `Ultimo sync: ${new Date(lastSync).toLocaleDateString("es-CL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
    : "Sin sincronizar";

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        {result && (
          <p className="text-xs text-[var(--muted-foreground)]">{result}</p>
        )}
        <p className="text-xs text-[var(--muted-foreground)]">{lastSyncLabel}</p>
      </div>
      <button
        onClick={() => handleSync(false)}
        disabled={syncing}
        className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        title={lastSync ? "Buscar emails de los ultimos 7 dias" : "Primera sincronizacion (3 meses)"}
      >
        {syncing ? "..." : "Actualizar"}
      </button>
    </div>
  );
}
