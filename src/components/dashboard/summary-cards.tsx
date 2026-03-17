"use client";

import { formatCLP } from "@/lib/utils";

interface Props {
  total: number;
  transactionCount: number;
  topCategory?: { category: string; total: number };
}

export function SummaryCards({ total, transactionCount, topCategory }: Props) {
  const avgPerTx = transactionCount > 0 ? Math.round(total / transactionCount) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card label="Gasto Total" value={formatCLP(total)} accent />
      <Card label="Transacciones" value={String(transactionCount)} sub={`Promedio: ${formatCLP(avgPerTx)}`} />
      <Card
        label="Mayor Categoría"
        value={topCategory?.category || "—"}
        sub={topCategory ? formatCLP(topCategory.total) : ""}
      />
    </div>
  );
}

function Card({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="p-5 rounded-xl bg-[var(--card)] border border-[var(--border)]">
      <p className="text-sm text-[var(--muted-foreground)] mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? "text-[var(--accent)]" : ""}`}>{value}</p>
      {sub && <p className="text-sm text-[var(--muted-foreground)] mt-1">{sub}</p>}
    </div>
  );
}
