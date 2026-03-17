"use client";

import { CATEGORY_COLORS } from "@/lib/categorize";
import { formatCLP } from "@/lib/utils";

interface Props {
  data: { category: string; total: number }[];
  total: number;
}

export function CategoryChart({ data, total }: Props) {
  if (data.length === 0) {
    return (
      <div className="p-6 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-center h-80">
        <p className="text-[var(--muted-foreground)]">Sin datos</p>
      </div>
    );
  }

  // Build conic-gradient for donut chart
  let cumulative = 0;
  const gradientStops = data.map((item) => {
    const pct = (item.total / total) * 100;
    const start = cumulative;
    cumulative += pct;
    const color = CATEGORY_COLORS[item.category] || "#9ca3af";
    return `${color} ${start}% ${cumulative}%`;
  });

  const gradient = `conic-gradient(${gradientStops.join(", ")})`;

  return (
    <div className="p-6 rounded-xl bg-[var(--card)] border border-[var(--border)]">
      <h3 className="text-lg font-semibold mb-4">Por Categoría</h3>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-44 h-44 shrink-0">
          <div
            className="w-full h-full rounded-full"
            style={{ background: gradient }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: "var(--card)" }}
            >
              <span className="text-sm font-bold">{formatCLP(total)}</span>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-2 w-full">
          {data.map((item) => {
            const pct = total > 0 ? Math.round((item.total / total) * 100) : 0;
            return (
              <div key={item.category} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: CATEGORY_COLORS[item.category] || "#9ca3af" }}
                />
                <span className="flex-1 truncate">{item.category}</span>
                <span className="text-[var(--muted-foreground)]">{pct}%</span>
                <span className="font-medium w-24 text-right">{formatCLP(item.total)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
