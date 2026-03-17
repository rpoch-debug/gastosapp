import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";

export async function GET() {
  const billingDay = getSetting("billing_day") || "20";
  const usdRate = getSetting("usd_rate") || "950";
  return NextResponse.json({
    billing_day: parseInt(billingDay, 10),
    usd_rate: parseFloat(usdRate),
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();

  if (body.billing_day !== undefined) {
    const day = parseInt(body.billing_day, 10);
    if (day < 1 || day > 31) {
      return NextResponse.json({ error: "billing_day must be 1-31" }, { status: 400 });
    }
    setSetting("billing_day", String(day));
  }

  if (body.usd_rate !== undefined) {
    const rate = parseFloat(body.usd_rate);
    if (rate < 1 || rate > 5000) {
      return NextResponse.json({ error: "usd_rate must be between 1 and 5000" }, { status: 400 });
    }
    setSetting("usd_rate", String(rate));
  }

  return NextResponse.json({ status: "ok" });
}
