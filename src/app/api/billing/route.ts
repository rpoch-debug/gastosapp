import { NextRequest, NextResponse } from "next/server";
import { addBillingCycleDate, removeBillingCycleDate, getBillingCycleDates } from "@/lib/db";

export async function GET() {
  const dates = getBillingCycleDates();
  return NextResponse.json({ dates });
}

export async function POST(request: NextRequest) {
  const { close_date } = await request.json();

  if (!close_date || !/^\d{4}-\d{2}-\d{2}$/.test(close_date)) {
    return NextResponse.json({ error: "close_date required (YYYY-MM-DD)" }, { status: 400 });
  }

  addBillingCycleDate(close_date);
  return NextResponse.json({ status: "ok" });
}

export async function DELETE(request: NextRequest) {
  const { close_date } = await request.json();

  if (!close_date) {
    return NextResponse.json({ error: "close_date required" }, { status: 400 });
  }

  removeBillingCycleDate(close_date);
  return NextResponse.json({ status: "ok" });
}
