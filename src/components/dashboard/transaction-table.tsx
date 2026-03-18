"use client";

import { useState } from "react";
import { formatCLP, formatDate } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/lib/categorize";

interface Transaction {
  id: number;
  amount: number;
  merchant: string;
  category: string;
  date: string;
  card_last4: string | null;
  source: string;
  movement_type?: "tc" | "debit";
}

interface Props {
  transactions: Transaction[];
  categories: string[];
  onUpdate: () => void;
}

function SourceBadge({ tx }: { tx: Transaction }) {
  // Tarjeta de crédito con número conocido
  if (tx.card_last4) {
    return (
      <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
        ****{tx.card_last4}
      </span>
    );
  }
  // Débito / cuenta corriente
  if (tx.movement_type === "debit") {
    return (
      <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
        Débito
      </span>
    );
  }
  // Webhook
  if (tx.source === "webhook") {
    return (
      <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
        Wallet
      </span>
    );
  }
  // Email u otro
  return (
    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
      Email
    </span>
  );
}

export function TransactionTable({ transactions, categories, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);

  async function updateCategory(id: number, category: string) {
    await fetch("/api/transactions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, category }),
    });
    setEditingId(null);
    onUpdate();
  }

  return (
    <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] overflow-hidden">
      <div className="p-5 border-b border-[var(--border)]">
        <h3 className="text-lg font-semibold">Transacciones</h3>
        <p className="text-sm text-[var(--muted-foreground)]">
          {transactions.length} transacciones
        </p>
      </div>

      {transactions.length === 0 ? (
        <div className="p-8 text-center text-[var(--muted-foreground)]">
          No hay transacciones este mes
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] text-sm text-[var(--muted-foreground)]">
                <th className="text-left p-3 pl-5 font-medium">Fecha</th>
                <th className="text-left p-3 font-medium">Comercio</th>
                <th className="text-left p-3 font-medium">Categoría</th>
                <th className="text-right p-3 pr-5 font-medium">Monto</th>
                <th className="text-center p-3 font-medium">Fuente</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)] transition-colors"
                >
                  <td className="p-3 pl-5 text-sm text-[var(--muted-foreground)]">
                    {formatDate(tx.date)}
                  </td>
                  <td className="p-3 font-medium">{tx.merchant}</td>
                  <td className="p-3">
                    {editingId === tx.id ? (
                      <select
                        defaultValue={tx.category}
                        onChange={(e) => updateCategory(tx.id, e.target.value)}
                        onBlur={() => setEditingId(null)}
                        autoFocus
                        className="bg-[var(--background)] border border-[var(--border)] rounded px-2 py-1 text-sm"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingId(tx.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
                        style={{
                          background: `${CATEGORY_COLORS[tx.category] || "#9ca3af"}20`,
                          color: CATEGORY_COLORS[tx.category] || "#9ca3af",
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: CATEGORY_COLORS[tx.category] || "#9ca3af" }}
                        />
                        {tx.category}
                      </button>
                    )}
                  </td>
                  <td className="p-3 pr-5 text-right font-mono font-medium">
                    {formatCLP(tx.amount)}
                  </td>
                  <td className="p-3 text-center">
                    <SourceBadge tx={tx} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
