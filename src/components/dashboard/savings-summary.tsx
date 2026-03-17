"use client";

import { formatCLP } from "@/lib/utils";

interface Props {
  totalIncome: number;
  totalFixed: number;
  totalTC: number;
}

export function SavingsSummary({ totalIncome, totalFixed, totalTC }: Props) {
  const totalExpenses = totalFixed + totalTC;
  const savings = totalIncome - totalExpenses;
  const savingsPercent = totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : 0;
  const isPositive = savings >= 0;

  return (
    <div className="p-5 rounded-xl bg-[var(--card)] border border-[var(--border)]">
      <h3 className="font-semibold text-lg mb-4">Resumen Mensual</h3>
      <div className="space-y-3">
        <Row label="Ingresos" value={totalIncome} color="text-emerald-500" />
        <Row label="Gastos fijos" value={-totalFixed} color="text-[var(--muted-foreground)]" />
        <Row label="Deuda TC total" value={-totalTC} color="text-red-400" />
        <div className="border-t border-[var(--border)] pt-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Ahorro</span>
            <div className="text-right">
              <span className={`text-xl font-bold ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
                {formatCLP(savings)}
              </span>
              <span className={`block text-xs ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
                {savingsPercent}% del ingreso
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {totalIncome > 0 && (
          <div className="mt-2">
            <div className="w-full h-3 rounded-full bg-[var(--muted)] overflow-hidden flex">
              <div
                className="h-full bg-[var(--accent)] transition-all"
                style={{ width: `${Math.min((totalFixed / totalIncome) * 100, 100)}%` }}
                title={`Fijos: ${formatCLP(totalFixed)}`}
              />
              <div
                className="h-full bg-red-400 transition-all"
                style={{ width: `${Math.min((totalTC / totalIncome) * 100, 100)}%` }}
                title={`Deuda TC: ${formatCLP(totalTC)}`}
              />
            </div>
            <div className="flex justify-between text-xs text-[var(--muted-foreground)] mt-1">
              <div className="flex gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[var(--accent)] inline-block" /> Fijos
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Deuda TC
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[var(--muted)] inline-block" /> Ahorro
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
      <span className={`font-medium text-sm ${color}`}>{formatCLP(value)}</span>
    </div>
  );
}
