import { NextResponse } from "next/server";
import { getSetting } from "@/lib/db";
import { BANK_CONFIGS } from "@/lib/bank-configs";

export async function GET() {
  const banks = Object.values(BANK_CONFIGS).map((cfg) => ({
    id: cfg.id,
    name: cfg.name,
    shortName: cfg.shortName,
    configured: !!(process.env[cfg.rutEnv] && process.env[cfg.passwordEnv]),
    lastSync: getSetting(`last_sync_${cfg.id}`) ?? null,
  }));

  return NextResponse.json({ banks });
}
