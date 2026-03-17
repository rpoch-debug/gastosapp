import { NextRequest, NextResponse } from "next/server";
import { getIncomes, addIncome, updateIncome, deleteIncome } from "@/lib/db";

export async function GET() {
  const incomes = getIncomes();
  const total = incomes.reduce((sum, i) => sum + i.amount, 0);
  return NextResponse.json({ incomes, total });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.name || !body.amount) {
    return NextResponse.json({ error: "name and amount required" }, { status: 400 });
  }
  const income = addIncome({
    name: body.name,
    amount: Math.round(body.amount),
    day_of_month: body.day_of_month,
    recurring: body.recurring,
  });
  return NextResponse.json(income, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const { id, ...fields } = body;
  updateIncome(id, fields);
  return NextResponse.json({ status: "ok" });
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  deleteIncome(id);
  return NextResponse.json({ status: "ok" });
}
