import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthName(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(date);
}

export function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export type ViewMode = "daily" | "weekly" | "monthly" | "billing";

export const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
  billing: "Facturación",
};

export function shiftRef(ref: string, mode: ViewMode, delta: number): string {
  const d = new Date(ref + "T00:00:00");
  switch (mode) {
    case "daily":
      d.setDate(d.getDate() + delta);
      break;
    case "weekly":
      d.setDate(d.getDate() + delta * 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + delta);
      break;
    case "billing":
      // For billing, the API handles period navigation via ref
      // We shift by ~30 days to land in adjacent period
      d.setDate(d.getDate() + delta * 30);
      break;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
