import { NextRequest, NextResponse } from "next/server";
import {
  getFixedExpenses,
  addFixedExpense,
  updateFixedExpense,
  deleteFixedExpense,
} from "@/lib/db";

export async function GET() {
  const expenses = getFixedExpenses();
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  return NextResponse.json({ expenses, total });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.name || !body.amount) {
    return NextResponse.json({ error: "name and amount required" }, { status: 400 });
  }
  const expense = addFixedExpense({
    name: body.name,
    amount: Math.round(body.amount),
    category: body.category || "Otros",
    day_of_month: body.day_of_month,
    num_installments: body.num_installments,
    current_installment: body.current_installment,
    start_date: body.start_date || new Date().toISOString().slice(0, 10),
    end_date: body.end_date,
  });
  return NextResponse.json(expense, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const { id, ...fields } = body;
  updateFixedExpense(id, fields);
  return NextResponse.json({ status: "ok" });
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  deleteFixedExpense(id);
  return NextResponse.json({ status: "ok" });
}
