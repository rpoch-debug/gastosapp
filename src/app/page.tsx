"use client";

import { useEffect, useState, useCallback } from "react";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { MonthlyTrend } from "@/components/dashboard/monthly-trend";
import { TransactionTable } from "@/components/dashboard/transaction-table";
import { GmailSync } from "@/components/dashboard/gmail-sync";
import { BancoChileSync } from "@/components/dashboard/banco-chile-sync";
import { BillingSettings } from "@/components/dashboard/billing-settings";
import { FixedExpenses } from "@/components/dashboard/fixed-expenses";
import { Incomes } from "@/components/dashboard/incomes";
import { SavingsSummary } from "@/components/dashboard/savings-summary";
import { CardBreakdown } from "@/components/dashboard/card-breakdown";
import { todayStr, VIEW_MODE_LABELS, shiftRef, formatCLP } from "@/lib/utils";
import type { ViewMode } from "@/lib/utils";

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

interface DashboardData {
  transactions: Transaction[];
  categoryTotals: { category: string; total: number }[];
  monthlyTotals: { month: string; total: number }[];
  cardTotals: { card: string; count: number; total: number }[];
  total: number;
  usdRate: number;
  categories: string[];
  period: { from: string; to: string; label: string; mode: string };
}

interface CardDebt {
  card_last4: string;
  clp: number;
  usdCents: number;
  usdCLP: number;
  total: number;
  count: number;
}

type Tab = "gastos" | "detalle" | "fijos" | "balance";

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [mode, setMode] = useState<ViewMode>("billing");
  const [ref, setRef] = useState(todayStr());
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("gastos");
  const [fixedTotal, setFixedTotal] = useState(0);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [cardDebts, setCardDebts] = useState<CardDebt[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/transactions?mode=${mode}&ref=${ref}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [mode, ref]);

  const fetchTotals = useCallback(async () => {
    const [fixedRes, incomeRes, cardRes] = await Promise.all([
      fetch("/api/fixed-expenses"),
      fetch("/api/incomes"),
      fetch("/api/card-totals"),
    ]);
    const fixedData = await fixedRes.json();
    const incomeData = await incomeRes.json();
    const cardData = await cardRes.json();
    setFixedTotal(fixedData.total);
    setIncomeTotal(incomeData.total);
    setCardDebts(cardData.cards || []);
  }, []);

  useEffect(() => {
    fetchData();
    fetchTotals();
  }, [fetchData, fetchTotals]);

  const navigate = (delta: number) => {
    if (mode === "billing" && data?.period) {
      if (delta < 0) {
        const d = new Date(data.period.from + "T00:00:00");
        d.setDate(d.getDate() - 1);
        setRef(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
      } else {
        setRef(data.period.to);
      }
    } else {
      setRef(shiftRef(ref, mode, delta));
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "gastos", label: "Gastos" },
    { key: "detalle", label: "Detalle" },
    { key: "fijos", label: "Fijos & Cuotas" },
    { key: "balance", label: "Balance" },
  ];

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Gastos</h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Tracking automatico de gastos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--muted)] transition-colors text-sm"
            title="Configurar facturacion"
          >
            ⚙
          </button>
          <BancoChileSync onSync={fetchData} />
          <GmailSync onSync={fetchData} />
        </div>
      </header>

      {showSettings && (
        <BillingSettings onClose={() => setShowSettings(false)} onSave={fetchData} />
      )}

      {/* Main tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-[var(--card)] border border-[var(--border)] w-fit mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === t.key
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "gastos" && (
        <>
          {/* View mode tabs */}
          <div className="flex gap-1 p-1 rounded-lg bg-[var(--card)] border border-[var(--border)] w-fit mb-6">
            {(Object.keys(VIEW_MODE_LABELS) as ViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setRef(todayStr()); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  mode === m
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {VIEW_MODE_LABELS[m]}
              </button>
            ))}
          </div>

          {/* Period navigation */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => navigate(-1)}
              className="px-3 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
            >
              ←
            </button>
            <h2 className="text-xl font-semibold capitalize">
              {data?.period?.label || "..."}
            </h2>
            <button
              onClick={() => navigate(1)}
              className="px-3 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
            >
              →
            </button>
            <button
              onClick={() => setRef(todayStr())}
              className="px-3 py-1.5 rounded-lg text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Hoy
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
            </div>
          ) : data ? (
            <div className="space-y-8">
              <SummaryCards
                total={data.total}
                transactionCount={data.transactions.length}
                topCategory={data.categoryTotals[0]}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CategoryChart data={data.categoryTotals} total={data.total} />
                <MonthlyTrend data={data.monthlyTotals} />
              </div>

              <TransactionTable
                transactions={data.transactions}
                categories={data.categories}
                onUpdate={fetchData}
              />
            </div>
          ) : (
            <p className="text-center text-[var(--muted-foreground)]">
              No hay datos. Conecta tu Gmail o envia datos via webhook.
            </p>
          )}
        </>
      )}

      {activeTab === "detalle" && (
        <>
          {/* Deuda total por tarjeta */}
          {cardDebts.length > 0 && (
            <div className="mb-6 p-5 rounded-xl bg-[var(--card)] border border-[var(--border)]">
              <h3 className="font-semibold mb-4">Deuda total por tarjeta</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cardDebts.map((card) => (
                  <div key={card.card_last4} className="p-4 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                    <p className="text-sm text-[var(--muted-foreground)] mb-1">****{card.card_last4}</p>
                    <p className="text-2xl font-bold">{formatCLP(card.total)}</p>
                    <div className="mt-2 space-y-0.5 text-xs text-[var(--muted-foreground)]">
                      {card.clp > 0 && <p>CLP: {formatCLP(card.clp)}</p>}
                      {card.usdCents > 0 && (
                        <p>USD: US${(card.usdCents / 100).toFixed(2)} (~{formatCLP(card.usdCLP)})</p>
                      )}
                      <p>{card.count} transacciones en total</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Period navigation (shared with gastos) */}
          <div className="flex gap-1 p-1 rounded-lg bg-[var(--card)] border border-[var(--border)] w-fit mb-6">
            {(Object.keys(VIEW_MODE_LABELS) as ViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setRef(todayStr()); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  mode === m
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {VIEW_MODE_LABELS[m]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => navigate(-1)}
              className="px-3 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
            >
              ←
            </button>
            <h2 className="text-xl font-semibold capitalize">
              {data?.period?.label || "..."}
            </h2>
            <button
              onClick={() => navigate(1)}
              className="px-3 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
            >
              →
            </button>
            <button
              onClick={() => setRef(todayStr())}
              className="px-3 py-1.5 rounded-lg text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Hoy
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
            </div>
          ) : data && data.cardTotals ? (
            <div className="space-y-6">
              <CardBreakdown
                cardTotals={data.cardTotals}
                transactions={data.transactions}
                total={data.total}
                usdRate={data.usdRate}
              />

              {/* Per-card transaction tables split by currency */}
              {data.cardTotals.map((ct) => {
                const cardTxs = data.transactions.filter(
                  (tx) => (tx.card_last4 || "sin tarjeta") === ct.card
                );
                const clpTxs = cardTxs.filter((tx) => tx.currency !== "USD");
                const usdTxs = cardTxs.filter((tx) => tx.currency === "USD");

                return (
                  <div key={ct.card} className="space-y-4">
                    {/* CLP transactions */}
                    <div className="p-5 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                      <h3 className="font-semibold mb-3">
                        ****{ct.card} — Pesos (CLP)
                        <span className="text-sm font-normal text-[var(--muted-foreground)] ml-2">
                          {clpTxs.length} transacciones · {formatCLP(clpTxs.reduce((s, t) => s + t.amount, 0))}
                        </span>
                      </h3>
                      {clpTxs.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-[var(--muted-foreground)] border-b border-[var(--border)]">
                                <th className="pb-2 font-medium">Fecha</th>
                                <th className="pb-2 font-medium">Comercio</th>
                                <th className="pb-2 font-medium">Categoria</th>
                                <th className="pb-2 font-medium text-right">Monto</th>
                              </tr>
                            </thead>
                            <tbody>
                              {clpTxs.slice(0, 10).map((tx) => (
                                <tr key={tx.id} className="border-b border-[var(--border)] last:border-0">
                                  <td className="py-2 text-[var(--muted-foreground)]">{tx.date.slice(0, 10)}</td>
                                  <td className="py-2">{tx.merchant}</td>
                                  <td className="py-2">
                                    <span className="px-2 py-0.5 rounded text-xs bg-[var(--muted)]">{tx.category}</span>
                                  </td>
                                  <td className="py-2 text-right font-medium">{formatCLP(tx.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {clpTxs.length > 10 && (
                            <p className="text-xs text-[var(--muted-foreground)] text-center mt-2">
                              y {clpTxs.length - 10} transacciones mas...
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--muted-foreground)]">Sin transacciones en CLP</p>
                      )}
                    </div>

                    {/* USD transactions */}
                    {usdTxs.length > 0 && (
                      <div className="p-5 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                        <h3 className="font-semibold mb-3">
                          ****{ct.card} — Dolares (USD)
                          <span className="text-sm font-normal text-[var(--muted-foreground)] ml-2">
                            {usdTxs.length} transacciones · US${(usdTxs.reduce((s, t) => s + (t.original_amount || 0), 0) / 100).toFixed(2)}
                            {" "}(~{formatCLP(usdTxs.reduce((s, t) => s + t.amount, 0))})
                          </span>
                        </h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-[var(--muted-foreground)] border-b border-[var(--border)]">
                                <th className="pb-2 font-medium">Fecha</th>
                                <th className="pb-2 font-medium">Comercio</th>
                                <th className="pb-2 font-medium">Categoria</th>
                                <th className="pb-2 font-medium text-right">USD</th>
                                <th className="pb-2 font-medium text-right">~CLP</th>
                              </tr>
                            </thead>
                            <tbody>
                              {usdTxs.map((tx) => (
                                <tr key={tx.id} className="border-b border-[var(--border)] last:border-0">
                                  <td className="py-2 text-[var(--muted-foreground)]">{tx.date.slice(0, 10)}</td>
                                  <td className="py-2">{tx.merchant}</td>
                                  <td className="py-2">
                                    <span className="px-2 py-0.5 rounded text-xs bg-[var(--muted)]">{tx.category}</span>
                                  </td>
                                  <td className="py-2 text-right font-medium">US${((tx.original_amount || 0) / 100).toFixed(2)}</td>
                                  <td className="py-2 text-right text-[var(--muted-foreground)]">{formatCLP(tx.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-[var(--muted-foreground)]">No hay datos.</p>
          )}
        </>
      )}

      {activeTab === "fijos" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FixedExpenses onUpdate={fetchTotals} />
          <Incomes onUpdate={fetchTotals} />
        </div>
      )}

      {activeTab === "balance" && (() => {
        const totalTC = cardDebts.reduce((s, c) => s + c.total, 0);
        return (
          <div className="space-y-6">
            <SavingsSummary
              totalIncome={incomeTotal}
              totalFixed={fixedTotal}
              totalTC={totalTC}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                <p className="text-sm text-[var(--muted-foreground)] mb-1">Ingresos</p>
                <p className="text-2xl font-bold text-emerald-500">{formatCLP(incomeTotal)}</p>
              </div>
              <div className="p-5 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                <p className="text-sm text-[var(--muted-foreground)] mb-1">Gastos Fijos</p>
                <p className="text-2xl font-bold">{formatCLP(fixedTotal)}</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {incomeTotal > 0 ? `${Math.round((fixedTotal / incomeTotal) * 100)}% del ingreso` : ""}
                </p>
              </div>
              <div className="p-5 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                <p className="text-sm text-[var(--muted-foreground)] mb-1">Deuda TC Total</p>
                <p className="text-2xl font-bold text-red-400">{formatCLP(totalTC)}</p>
                {cardDebts.map((c) => (
                  <p key={c.card_last4} className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    ****{c.card_last4}: {formatCLP(c.total)}
                  </p>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Webhook info */}
      <footer className="mt-12 p-4 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--muted-foreground)]">
        <p className="font-medium text-[var(--foreground)] mb-2">Webhook URL para Apple Wallet:</p>
        <code className="block p-2 bg-[var(--background)] rounded text-xs break-all">
          {typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/webhook?amount=MONTO&merchant=COMERCIO&secret=TU_SECRET
        </code>
      </footer>
    </main>
  );
}
