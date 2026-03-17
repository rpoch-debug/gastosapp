"use client";

import { formatCLP } from "@/lib/utils";

interface CardTotal {
  card: string;
  count: number;
  total: number;
}

interface Transaction {
  id: number;
  amount: number;
  merchant: string;
  category: string;
  date: string;
  card_last4: string | null;
  source: string;
  currency: string;
  original_amount: number | null;
}

interface Props {
  cardTotals: CardTotal[];
  transactions: Transaction[];
  total: number;
  usdRate: number;
}

const CARD_COLORS = ["#3b82f6", "#f97316", "#a855f7", "#22c55e", "#ef4444"];

function formatUSD(cents: number): string {
  return `US$${(cents / 100).toFixed(2)}`;
}

export function CardBreakdown({ cardTotals, transactions, total, usdRate }: Props) {
  const cardDetails = cardTotals.map((ct) => {
    const cardTxs = transactions.filter(
      (tx) => (tx.card_last4 || "sin tarjeta") === ct.card
    );

    // Separate CLP and USD
    const clpTxs = cardTxs.filter((tx) => tx.currency !== "USD");
    const usdTxs = cardTxs.filter((tx) => tx.currency === "USD");
    const clpTotal = clpTxs.reduce((s, tx) => s + tx.amount, 0);
    const usdTotalCents = usdTxs.reduce((s, tx) => s + (tx.original_amount || 0), 0);
    const usdTotalCLP = usdTxs.reduce((s, tx) => s + tx.amount, 0);

    // Category breakdown
    const catMap = new Map<string, number>();
    for (const tx of cardTxs) {
      catMap.set(tx.category, (catMap.get(tx.category) || 0) + tx.amount);
    }
    const categories = Array.from(catMap.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

    return { ...ct, categories, clpTotal, usdTotalCents, usdTotalCLP, clpCount: clpTxs.length, usdCount: usdTxs.length };
  });

  return (
    <div className="p-5 rounded-xl bg-[var(--card)] border border-[var(--border)]">
      <h3 className="font-semibold text-lg mb-4">Detalle por Tarjeta</h3>

      <div className="space-y-6">
        {cardDetails.map((card, i) => {
          const pct = total > 0 ? Math.round((card.total / total) * 100) : 0;
          const color = CARD_COLORS[i % CARD_COLORS.length];

          return (
            <div key={card.card}>
              {/* Card header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ backgroundColor: color }}
                  >
                    {card.card === "sin tarjeta" ? "?" : card.card}
                  </div>
                  <span className="font-medium text-sm">****{card.card}</span>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {card.count} transacciones
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-semibold">{formatCLP(card.total)}</span>
                  <span className="text-xs text-[var(--muted-foreground)] ml-2">{pct}%</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-[var(--muted)] mb-3">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>

              {/* CLP / USD split */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                  <p className="text-xs text-[var(--muted-foreground)] mb-0.5">Pesos (CLP)</p>
                  <p className="font-semibold text-sm">{formatCLP(card.clpTotal)}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{card.clpCount} transacciones</p>
                </div>
                {card.usdCount > 0 && (
                  <div className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                    <p className="text-xs text-[var(--muted-foreground)] mb-0.5">Dolares (USD)</p>
                    <p className="font-semibold text-sm">{formatUSD(card.usdTotalCents)}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {card.usdCount} transacciones · ~{formatCLP(card.usdTotalCLP)}
                    </p>
                  </div>
                )}
              </div>

              {/* Category breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 pl-2">
                {card.categories.slice(0, 6).map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between text-xs">
                    <span className="text-[var(--muted-foreground)] truncate">{cat.category}</span>
                    <span className="font-medium ml-2">{formatCLP(cat.total)}</span>
                  </div>
                ))}
                {card.categories.length > 6 && (
                  <div className="text-xs text-[var(--muted-foreground)]">
                    +{card.categories.length - 6} mas
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison bar */}
      {cardTotals.length > 1 && (
        <div className="mt-5 pt-4 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--muted-foreground)] mb-2">Distribucion entre tarjetas</p>
          <div className="w-full h-4 rounded-full overflow-hidden flex">
            {cardTotals.map((ct, i) => {
              const pct = total > 0 ? (ct.total / total) * 100 : 0;
              return (
                <div
                  key={ct.card}
                  className="h-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: CARD_COLORS[i % CARD_COLORS.length],
                  }}
                  title={`****${ct.card}: ${formatCLP(ct.total)}`}
                />
              );
            })}
          </div>
          <div className="flex gap-4 mt-2">
            {cardTotals.map((ct, i) => (
              <span key={ct.card} className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: CARD_COLORS[i % CARD_COLORS.length] }}
                />
                ****{ct.card}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* USD rate info */}
      <div className="mt-4 pt-3 border-t border-[var(--border)]">
        <p className="text-xs text-[var(--muted-foreground)]">
          Tipo de cambio: US$1 = {formatCLP(usdRate)} (configurable en ajustes)
        </p>
      </div>
    </div>
  );
}
