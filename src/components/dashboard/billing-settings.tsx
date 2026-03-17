"use client";

import { useState, useEffect, useCallback } from "react";

interface Props {
  onClose: () => void;
  onSave: () => void;
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Generate the last N months as {year, month} */
function recentMonths(count: number): { year: number; month: number }[] {
  const today = new Date();
  const result: { year: number; month: number }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    result.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  return result;
}

export function BillingSettings({ onClose, onSave }: Props) {
  const [liveRate, setLiveRate] = useState<number | null>(null);
  const [liveDate, setLiveDate] = useState<string | null>(null);
  const [billingDay, setBillingDay] = useState(20);
  const [cycleDates, setCycleDates] = useState<string[]>([]);

  const months = recentMonths(6);

  const loadData = useCallback(async () => {
    const [settingsRes, billingRes, usdRes] = await Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/billing").then((r) => r.json()),
      fetch("/api/usd-rate").then((r) => r.json()),
    ]);
    setBillingDay(settingsRes.billing_day || 20);
    setLiveRate(usdRes.live_rate);
    setLiveDate(usdRes.live_date);
    setCycleDates(billingRes.dates);

    // Auto-save live rate if available
    if (usdRes.live_rate && usdRes.live_rate !== usdRes.saved_rate) {
      await fetch("/api/usd-rate", { method: "POST" });
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /** Get the close date for a specific month */
  function getCloseDateForMonth(year: number, month: number): string {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const match = cycleDates.find((d) => d.startsWith(prefix));
    if (match) return match;
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(billingDay).padStart(2, "0")}`;
  }

  async function setCloseDate(year: number, month: number, day: number) {
    if (day < 1 || day > 31) return;

    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const newDate = `${prefix}-${String(day).padStart(2, "0")}`;

    // Remove any existing close date for this month
    const existing = cycleDates.find((d) => d.startsWith(prefix));
    if (existing) {
      await fetch("/api/billing", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ close_date: existing }),
      });
    }

    // Always save the date (even if it matches default, so it's explicit)
    await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ close_date: newDate }),
    });

    const res = await fetch("/api/billing");
    const data = await res.json();
    setCycleDates(data.dates);
    onSave();
  }

  return (
    <div className="mb-8 p-6 rounded-xl bg-[var(--card)] border border-[var(--border)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Configuracion</h3>
        <button
          onClick={onClose}
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors text-xl"
        >
          ✕
        </button>
      </div>

      {/* USD rate - read only from API */}
      <div className="mb-6 pb-6 border-b border-[var(--border)]">
        <label className="block text-sm font-medium mb-2">
          Tipo de cambio USD → CLP
        </label>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)]">
          {liveRate ? (
            <>
              <span className="text-xs text-green-400">●</span>
              <span className="text-sm">
                Dolar observado: <strong>${liveRate.toFixed(2)}</strong> CLP
              </span>
              {liveDate && (
                <span className="text-xs text-[var(--muted-foreground)]">
                  ({new Date(liveDate).toLocaleDateString("es-CL")})
                </span>
              )}
              <span className="text-xs text-[var(--muted-foreground)] ml-auto">
                mindicador.cl
              </span>
            </>
          ) : (
            <span className="text-sm text-[var(--muted-foreground)]">Cargando...</span>
          )}
        </div>
      </div>

      {/* Billing cycle close dates */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Dia de cierre por mes
        </label>
        <p className="text-xs text-[var(--muted-foreground)] mb-4">
          Cambia el dia de cierre de cualquier mes.
        </p>

        <div className="space-y-2">
          {months.map(({ year, month }) => {
            const date = getCloseDateForMonth(year, month);
            const currentDay = parseInt(date.split("-")[2], 10);
            return (
              <div
                key={`${year}-${month}`}
                className="flex items-center justify-between px-4 py-3 rounded-lg bg-[var(--background)] border border-[var(--border)]"
              >
                <span className="text-sm font-medium w-32">
                  {MONTH_NAMES[month]} {year}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--muted-foreground)]">Cierre dia</span>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={currentDay}
                    onChange={(e) => {
                      const day = parseInt(e.target.value, 10);
                      if (day >= 1 && day <= 31) {
                        setCloseDate(year, month, day);
                      }
                    }}
                    className="w-16 px-2 py-1 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm text-center"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
