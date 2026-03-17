"use client";

import { useState, useEffect } from "react";

interface BankStatus {
  id: string;
  name: string;
  shortName: string;
  configured: boolean;
  lastSync: string | null;
}

interface Props {
  onSync: () => void;
  refreshKey?: number;
}

export function BankSync({ onSync, refreshKey }: Props) {
  const [banks, setBanks] = useState<BankStatus[]>([]);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/bank/status")
      .then((r) => r.json())
      .then((data) => setBanks(data.banks ?? []));
  }, [refreshKey]);

  async function handleSync(bankId: string) {
    setSyncing((s) => ({ ...s, [bankId]: true }));
    setResults((r) => ({ ...r, [bankId]: "" }));
    try {
      const res = await fetch(`/api/bank/${bankId}/sync`, { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setResults((r) => ({ ...r, [bankId]: `Error: ${data.error}` }));
      } else {
        setResults((r) => ({
          ...r,
          [bankId]: `${data.imported} nuevos, ${data.skipped} omitidos`,
        }));
        setBanks((prev) =>
          prev.map((b) =>
            b.id === bankId ? { ...b, lastSync: new Date().toISOString() } : b
          )
        );
        onSync();
      }
    } catch {
      setResults((r) => ({ ...r, [bankId]: "Error de conexion" }));
    }
    setSyncing((s) => ({ ...s, [bankId]: false }));
  }

  const configured = banks.filter((b) => b.configured);
  if (configured.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      {configured.map((bank) => (
        <div key={bank.id} className="flex items-center gap-2">
          <div className="text-right">
            {results[bank.id] && (
              <p className="text-xs text-[var(--muted-foreground)]">{results[bank.id]}</p>
            )}
            <p className="text-xs text-[var(--muted-foreground)]">
              {bank.lastSync
                ? `${bank.shortName}: ${new Date(bank.lastSync).toLocaleDateString("es-CL", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : `${bank.shortName}: sin sync`}
            </p>
          </div>
          <button
            onClick={() => handleSync(bank.id)}
            disabled={!!syncing[bank.id]}
            className="px-4 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] font-medium text-sm hover:bg-[var(--muted)] transition-colors disabled:opacity-50"
            title={`Sincronizar ${bank.name} (~30-90s)`}
          >
            {syncing[bank.id] ? "Conectando..." : bank.shortName}
          </button>
        </div>
      ))}
    </div>
  );
}
