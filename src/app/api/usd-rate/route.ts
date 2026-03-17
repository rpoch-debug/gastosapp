import { NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";

const MINDICADOR_URL = "https://mindicador.cl/api";

interface MindicadorResponse {
  dolar: {
    codigo: string;
    nombre: string;
    valor: number;
    fecha: string;
  };
}

/** Fetch live USD/CLP rate from mindicador.cl (Banco Central de Chile) */
async function fetchLiveRate(): Promise<{ rate: number; date: string } | null> {
  try {
    const res = await fetch(MINDICADOR_URL, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as MindicadorResponse;
    if (!data.dolar?.valor) return null;
    return {
      rate: data.dolar.valor,
      date: data.dolar.fecha,
    };
  } catch {
    return null;
  }
}

/**
 * GET: fetch live rate and auto-save it.
 * The rate updates automatically — no manual intervention needed.
 */
export async function GET() {
  const live = await fetchLiveRate();

  if (live) {
    // Always save the latest rate
    setSetting("usd_rate", String(Math.round(live.rate * 100) / 100));
    setSetting("usd_rate_updated", new Date().toISOString());
  }

  const savedRate = getSetting("usd_rate");

  return NextResponse.json({
    rate: live?.rate ?? (savedRate ? parseFloat(savedRate) : 950),
    live_rate: live?.rate ?? null,
    live_date: live?.date ?? null,
  });
}

/** POST kept for backward compat — same as GET but explicit sync */
export async function POST() {
  const live = await fetchLiveRate();
  if (!live) {
    return NextResponse.json(
      { error: "No se pudo obtener el tipo de cambio desde mindicador.cl" },
      { status: 502 }
    );
  }

  setSetting("usd_rate", String(Math.round(live.rate * 100) / 100));
  setSetting("usd_rate_updated", new Date().toISOString());

  return NextResponse.json({
    rate: live.rate,
    date: live.date,
    status: "ok",
  });
}
