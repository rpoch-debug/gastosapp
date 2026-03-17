"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { formatCLP } from "@/lib/utils";

interface Props {
  data: { month: string; total: number }[];
}

export function MonthlyTrend({ data }: Props) {
  const chartData = [...data].reverse().map((d) => ({
    ...d,
    label: d.month.slice(5), // "03" from "2026-03"
  }));

  if (chartData.length === 0) {
    return (
      <div className="p-6 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-center h-80">
        <p className="text-[var(--muted-foreground)]">Sin datos históricos</p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-xl bg-[var(--card)] border border-[var(--border)]">
      <h3 className="text-lg font-semibold mb-4">Tendencia Mensual</h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            />
            <Tooltip
              formatter={(value) => formatCLP(Number(value))}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--foreground)",
              }}
            />
            <Bar dataKey="total" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
