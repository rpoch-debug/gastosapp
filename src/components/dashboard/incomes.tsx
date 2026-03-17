"use client";

import { useState, useEffect } from "react";
import { formatCLP } from "@/lib/utils";

interface Income {
  id: number;
  name: string;
  amount: number;
  day_of_month: number | null;
  recurring: number;
  active: number;
}

interface Props {
  onUpdate: () => void;
}

export function Incomes({ onUpdate }: Props) {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("");
  const [recurring, setRecurring] = useState(true);

  useEffect(() => {
    fetchIncomes();
  }, []);

  async function fetchIncomes() {
    const res = await fetch("/api/incomes");
    const data = await res.json();
    setIncomes(data.incomes);
    setTotal(data.total);
    onUpdate();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !amount) return;

    await fetch("/api/incomes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        amount: parseInt(amount),
        day_of_month: dayOfMonth ? parseInt(dayOfMonth) : undefined,
        recurring: recurring ? 1 : 0,
      }),
    });

    setName("");
    setAmount("");
    setDayOfMonth("");
    setRecurring(true);
    setShowForm(false);
    fetchIncomes();
  }

  async function handleDelete(id: number) {
    await fetch("/api/incomes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchIncomes();
  }

  return (
    <div className="p-5 rounded-xl bg-[var(--card)] border border-[var(--border)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">Ingresos</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Total mensual: <span className="font-medium text-emerald-500">{formatCLP(total)}</span>
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {showForm ? "Cancelar" : "+ Agregar"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 p-4 rounded-lg bg-[var(--background)] border border-[var(--border)] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Nombre (ej: Sueldo, Freelance)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm col-span-2"
              required
            />
            <input
              type="number"
              placeholder="Monto"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm"
              required
            />
            <input
              type="number"
              placeholder="Dia pago (opc)"
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm"
              min={1}
              max={31}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="rounded"
            />
            Ingreso recurrente (mensual)
          </label>
          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Guardar
          </button>
        </form>
      )}

      {incomes.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)] text-center py-4">
          No hay ingresos registrados
        </p>
      ) : (
        <div className="space-y-2">
          {incomes.map((inc) => (
            <div
              key={inc.id}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--muted)] transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{inc.name}</span>
                  {inc.recurring ? (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                      Mensual
                    </span>
                  ) : (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
                      Unico
                    </span>
                  )}
                </div>
                {inc.day_of_month && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    Dia {inc.day_of_month}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm text-emerald-500">{formatCLP(inc.amount)}</span>
                <button
                  onClick={() => handleDelete(inc.id)}
                  className="text-[var(--muted-foreground)] hover:text-red-500 transition-colors text-sm"
                  title="Eliminar"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
