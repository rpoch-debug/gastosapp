"use client";

import { useState, useEffect } from "react";
import { formatCLP } from "@/lib/utils";
import { CATEGORIES } from "@/lib/categorize";

interface FixedExpense {
  id: number;
  name: string;
  amount: number;
  category: string;
  day_of_month: number | null;
  num_installments: number | null;
  current_installment: number;
  active: number;
}

interface Props {
  onUpdate: () => void;
}

export function FixedExpenses({ onUpdate }: Props) {
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Otros");
  const [dayOfMonth, setDayOfMonth] = useState("");
  const [numInstallments, setNumInstallments] = useState("");
  const [currentInstallment, setCurrentInstallment] = useState("");

  useEffect(() => {
    fetchExpenses();
  }, []);

  async function fetchExpenses() {
    const res = await fetch("/api/fixed-expenses");
    const data = await res.json();
    setExpenses(data.expenses);
    setTotal(data.total);
    onUpdate();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !amount) return;

    await fetch("/api/fixed-expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        amount: parseInt(amount),
        category,
        day_of_month: dayOfMonth ? parseInt(dayOfMonth) : undefined,
        num_installments: numInstallments ? parseInt(numInstallments) : undefined,
        current_installment: currentInstallment ? parseInt(currentInstallment) : undefined,
        start_date: new Date().toISOString().slice(0, 10),
      }),
    });

    setName("");
    setAmount("");
    setCategory("Otros");
    setDayOfMonth("");
    setNumInstallments("");
    setCurrentInstallment("");
    setShowForm(false);
    fetchExpenses();
  }

  async function handleDelete(id: number) {
    await fetch("/api/fixed-expenses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchExpenses();
  }

  return (
    <div className="p-5 rounded-xl bg-[var(--card)] border border-[var(--border)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">Gastos Fijos</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Total mensual: <span className="font-medium text-[var(--foreground)]">{formatCLP(total)}</span>
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {showForm ? "Cancelar" : "+ Agregar"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 p-4 rounded-lg bg-[var(--background)] border border-[var(--border)] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Nombre (ej: Netflix, Arriendo)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm col-span-2"
              required
            />
            <input
              type="number"
              placeholder="Monto mensual"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm"
              required
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Dia cobro (opc)"
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm"
              min={1}
              max={31}
            />
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Cuotas (opc)"
                value={numInstallments}
                onChange={(e) => setNumInstallments(e.target.value)}
                className="px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm w-full"
                min={1}
              />
              {numInstallments && (
                <input
                  type="number"
                  placeholder="Actual"
                  value={currentInstallment}
                  onChange={(e) => setCurrentInstallment(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm w-20"
                  min={1}
                  max={parseInt(numInstallments) || undefined}
                />
              )}
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Guardar
          </button>
        </form>
      )}

      {expenses.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)] text-center py-4">
          No hay gastos fijos registrados
        </p>
      ) : (
        <div className="space-y-2">
          {expenses.map((exp) => (
            <div
              key={exp.id}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--muted)] transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{exp.name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
                    {exp.category}
                  </span>
                </div>
                <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {exp.day_of_month && `Dia ${exp.day_of_month}`}
                  {exp.num_installments && (
                    <span>
                      {exp.day_of_month && " · "}
                      Cuota {exp.current_installment}/{exp.num_installments}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm">{formatCLP(exp.amount)}</span>
                <button
                  onClick={() => handleDelete(exp.id)}
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
