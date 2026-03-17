"use client";

import { useEffect, useState, useCallback } from "react";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { MonthlyTrend } from "@/components/dashboard/monthly-trend";
import { TransactionTable } from "@/components/dashboard/transaction-table";
import { BankSync } from "@/components/dashboard/bank-sync";
import { BillingSettings } from "@/components/dashboard/billing-settings";
import { FixedExpenses } from "@/components/dashboard/fixed-expenses";
import { Incomes } from "@/components/dashboard/incomes";
import { SavingsSummary } from "@/components/dashboard/savings-summary";
import { CardBreakdown } from "@/components/dashboard/card-breakdown";
import { Logo } from "@/components/dashboard/logo";
import { BankCredentialsModal } from "@/components/dashboard/bank-credentials-modal";
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

const TAB_CONFIG: { key: Tab; label: string; icon: string }[] = [
  { key: "gastos",  label: "Gastos",       icon: "📊" },
  { key: "detalle", label: "Detalle TC",   icon: "💳" },
  { key: "fijos",   label: "Fijos & Cuotas", icon: "📌" },
  { key: "balance", label: "Balance",      icon: "⚖️" },
];

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--border)] border-t-[var(--accent)]" />
      <p className="text-sm text-[var(--muted-foreground)]">Cargando...</p>
    </div>
  );
}

function PeriodNav({
  mode,
  data,
  onMode,
  onNavigate,
  onToday,
}: {
  mode: ViewMode;
  data: DashboardData | null;
  onMode: (m: ViewMode) => void;
  onNavigate: (d: number) => void;
  onToday: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
      {/* View mode */}
      <div className="flex gap-1 p-1 rounded-lg bg-[var(--card)] border border-[var(--border)] w-fit">
        {(Object.keys(VIEW_MODE_LABELS) as ViewMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onMode(m)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === m
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {VIEW_MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Arrow navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--muted)] transition-colors text-sm"
          title="Período anterior"
        >
          ←
        </button>
        <span className="text-base font-semibold capitalize min-w-[160px] text-center">
          {data?.period?.label || "—"}
        </span>
        <button
          onClick={() => onNavigate(1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--muted)] transition-colors text-sm"
          title="Período siguiente"
        >
          →
        </button>
        <button
          onClick={onToday}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] transition-colors"
        >
          Hoy
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [mode, setMode] = useState<ViewMode>("billing");
  const [ref, setRef] = useState(todayStr());
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showBankCredentials, setShowBankCredentials] = useState(false);
  const [bankRefreshKey, setBankRefreshKey] = useState(0);
  const [showWebhook, setShowWebhook] = useState(false);
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

  const handleMode = (m: ViewMode) => { setMode(m); setRef(todayStr()); };

  const totalTC = cardDebts.reduce((s, c) => s + c.total, 0);

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">

      {/* ── Header ── */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight leading-none">MisGastos</h1>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Tracking automático de gastos</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBankCredentials(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] transition-colors text-base"
            title="Conectar bancos"
          >
            🏦
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors text-base ${
              showSettings
                ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                : "bg-[var(--card)] border-[var(--border)] hover:bg-[var(--muted)]"
            }`}
            title="Configurar facturación"
          >
            ⚙️
          </button>
          <BankSync onSync={fetchData} refreshKey={bankRefreshKey} />
        </div>
      </header>

      {showSettings && (
        <BillingSettings onClose={() => setShowSettings(false)} onSave={fetchData} />
      )}
      {showBankCredentials && (
        <BankCredentialsModal
          onClose={() => setShowBankCredentials(false)}
          onSave={() => { setBankRefreshKey((k) => k + 1); }}
          onSynced={() => { fetchData(); fetchTotals(); }}
        />
      )}

      {/* ── Main tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--card)] border border-[var(--border)] w-fit mb-6">
        {TAB_CONFIG.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.key
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
            }`}
          >
            <span className="text-base leading-none">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ TAB: GASTOS ══ */}
      {activeTab === "gastos" && (
        <>
          <PeriodNav
            mode={mode}
            data={data}
            onMode={handleMode}
            onNavigate={navigate}
            onToday={() => setRef(todayStr())}
          />
          {loading ? (
            <Spinner />
          ) : data ? (
            <div className="space-y-6">
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
            <EmptyState />
          )}
        </>
      )}

      {/* ══ TAB: DETALLE ══ */}
      {activeTab === "detalle" && (
        <>
          {/* Deuda total por tarjeta */}
          {cardDebts.length > 0 && (
            <div className="mb-6 p-5 rounded-xl bg-[var(--card)] border border-[var(--border)]">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-4">
                Deuda acumulada total por tarjeta
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cardDebts.map((card) => (
                  <div key={card.card_last4} className="p-4 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                    <p className="text-xs text-[var(--muted-foreground)] mb-1 font-mono">••••{card.card_last4}</p>
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

          <PeriodNav
            mode={mode}
            data={data}
            onMode={handleMode}
            onNavigate={navigate}
            onToday={() => setRef(todayStr())}
          />

          {loading ? (
            <Spinner />
          ) : data && data.cardTotals ? (
            <div className="space-y-6">
              <CardBreakdown
                cardTotals={data.cardTotals}
                transactions={data.transactions}
                total={data.total}
                usdRate={data.usdRate}
              />
              {data.cardTotals.map((ct) => {
                const cardTxs = data.transactions.filter(
                  (tx) => (tx.card_last4 || "sin tarjeta") === ct.card
                );
                const clpTxs = cardTxs.filter((tx) => tx.currency !== "USD");
                const usdTxs = cardTxs.filter((tx) => tx.currency === "USD");

                return (
                  <div key={ct.card} className="space-y-4">
                    <CardTxTable
                      title={`••••${ct.card} — Pesos CLP`}
                      transactions={clpTxs}
                      currency="CLP"
                    />
                    {usdTxs.length > 0 && (
                      <CardTxTable
                        title={`••••${ct.card} — Dólares USD`}
                        transactions={usdTxs}
                        currency="USD"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState />
          )}
        </>
      )}

      {/* ══ TAB: FIJOS & CUOTAS ══ */}
      {activeTab === "fijos" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FixedExpenses onUpdate={fetchTotals} />
          <Incomes onUpdate={fetchTotals} />
        </div>
      )}

      {/* ══ TAB: BALANCE ══ */}
      {activeTab === "balance" && (
        <div className="space-y-6">
          <SavingsSummary
            totalIncome={incomeTotal}
            totalFixed={fixedTotal}
            totalTC={totalTC}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Ingresos"
              value={formatCLP(incomeTotal)}
              valueColor="text-emerald-500"
              icon="💰"
            />
            <StatCard
              label="Gastos Fijos"
              value={formatCLP(fixedTotal)}
              icon="📌"
              sub={incomeTotal > 0 ? `${Math.round((fixedTotal / incomeTotal) * 100)}% del ingreso` : undefined}
            />
            <StatCard
              label="Deuda TC Total"
              value={formatCLP(totalTC)}
              valueColor="text-red-400"
              icon="💳"
              sub={cardDebts.map((c) => `••••${c.card_last4}: ${formatCLP(c.total)}`).join(" · ")}
            />
          </div>
        </div>
      )}

      {/* ── Footer (webhook) ── */}
      <footer className="mt-10 border-t border-[var(--border)] pt-6">
        <button
          onClick={() => setShowWebhook(!showWebhook)}
          className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <span>{showWebhook ? "▾" : "▸"}</span>
          Webhook URL para Apple Wallet
        </button>
        {showWebhook && (
          <div className="mt-2 p-3 rounded-lg bg-[var(--card)] border border-[var(--border)]">
            <code className="text-xs text-[var(--muted-foreground)] break-all">
              {typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/webhook?amount=MONTO&merchant=COMERCIO&secret=TU_SECRET
            </code>
          </div>
        )}
      </footer>
    </main>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-2 text-center">
      <span className="text-4xl">💳</span>
      <p className="font-medium">Sin transacciones</p>
      <p className="text-sm text-[var(--muted-foreground)]">
        Sincroniza tu banco para importar gastos.
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  valueColor = "",
  icon,
  sub,
}: {
  label: string;
  value: string;
  valueColor?: string;
  icon: string;
  sub?: string;
}) {
  return (
    <div className="p-5 rounded-xl bg-[var(--card)] border border-[var(--border)]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-[var(--muted-foreground)] mt-1">{sub}</p>}
    </div>
  );
}

function CardTxTable({
  title,
  transactions,
  currency,
}: {
  title: string;
  transactions: Transaction[];
  currency: "CLP" | "USD";
}) {
  const total =
    currency === "USD"
      ? `US$${(transactions.reduce((s, t) => s + (t.original_amount || 0), 0) / 100).toFixed(2)}`
      : formatCLP(transactions.reduce((s, t) => s + t.amount, 0));

  return (
    <div className="p-5 rounded-xl bg-[var(--card)] border border-[var(--border)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className="text-sm font-medium text-[var(--muted-foreground)]">
          {transactions.length} txs · {total}
        </span>
      </div>
      {transactions.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">Sin transacciones</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--muted-foreground)] border-b border-[var(--border)]">
                <th className="pb-2 font-medium">Fecha</th>
                <th className="pb-2 font-medium">Comercio</th>
                <th className="pb-2 font-medium">Categoría</th>
                {currency === "USD" ? (
                  <>
                    <th className="pb-2 font-medium text-right">USD</th>
                    <th className="pb-2 font-medium text-right">~CLP</th>
                  </>
                ) : (
                  <th className="pb-2 font-medium text-right">Monto</th>
                )}
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 10).map((tx) => (
                <tr key={tx.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2 text-[var(--muted-foreground)] text-xs">{tx.date.slice(0, 10)}</td>
                  <td className="py-2 max-w-[180px] truncate">{tx.merchant}</td>
                  <td className="py-2">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--muted)]">{tx.category}</span>
                  </td>
                  {currency === "USD" ? (
                    <>
                      <td className="py-2 text-right font-medium">US${((tx.original_amount || 0) / 100).toFixed(2)}</td>
                      <td className="py-2 text-right text-[var(--muted-foreground)]">{formatCLP(tx.amount)}</td>
                    </>
                  ) : (
                    <td className="py-2 text-right font-medium">{formatCLP(tx.amount)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length > 10 && (
            <p className="text-xs text-[var(--muted-foreground)] text-center mt-2">
              y {transactions.length - 10} más...
            </p>
          )}
        </div>
      )}
    </div>
  );
}
