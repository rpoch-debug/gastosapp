"use client";

import { useState, useEffect } from "react";

interface Props {
  onSync: () => void;
}

export function BancoChileSync({ onSync }: Props) {
  const [configured, setConfigured] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/banco-chile/sync")
      .then((r) => r.json())
      .then((data) => {
        setConfigured(data.configured);
        setLastSync(data.lastSync);
      });
  }, []);

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/banco-chile/sync", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setResult(`Error: ${data.error}`);
      } else {
        setResult(`${data.imported} nuevos, ${data.skipped} omitidos`);
        setLastSync(new Date().toISOString());
        onSync();
      }
    } catch {
      setResult("Error de conexion");
    }
    setSyncing(false);
  }

  if (!configured) return null;

  const lastSyncLabel = lastSync
    ? `BChile: ${new Date(lastSync).toLocaleDateString("es-CL", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : "BChile: sin sync";

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        {result && <p className="text-xs text-[var(--muted-foreground)]">{result}</p>}
        <p className="text-xs text-[var(--muted-foreground)]">{lastSyncLabel}</p>
      </div>
      <button
        onClick={handleSync}
        disabled={syncing}
        className="px-4 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] font-medium text-sm hover:bg-[var(--muted)] transition-colors disabled:opacity-50"
        title="Sincronizar movimientos de Banco de Chile (~30-60s)"
      >
        {syncing ? "Conectando..." : "Banco Chile"}
      </button>
    </div>
  );
}
