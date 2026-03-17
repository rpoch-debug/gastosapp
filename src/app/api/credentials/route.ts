import { NextResponse } from "next/server";
import { getSetting, setSetting, getDb } from "@/lib/db";
import { BANK_CONFIGS } from "@/lib/bank-configs";

/** GET — lista bancos con estado configurado (sin exponer credenciales) */
export async function GET() {
  const banks = Object.values(BANK_CONFIGS).map((cfg) => {
    const rutInDb = getSetting(`cred_${cfg.id}_rut`);
    const rutInEnv = process.env[cfg.rutEnv];
    const configured = !!(
      (rutInDb || rutInEnv) &&
      (getSetting(`cred_${cfg.id}_password`) || process.env[cfg.passwordEnv])
    );
    return {
      id: cfg.id,
      name: cfg.name,
      configured,
      // Devuelve RUT enmascarado si está guardado (para mostrarlo en el form)
      rut: rutInDb ? rutInDb : rutInEnv ? rutInEnv : "",
      source: rutInDb ? "db" : rutInEnv ? "env" : "none",
    };
  });

  return NextResponse.json({ banks });
}

/** POST — guarda credenciales de un banco en la DB local */
export async function POST(req: Request) {
  const { bankId, rut, password } = await req.json();

  if (!BANK_CONFIGS[bankId]) {
    return NextResponse.json({ error: "Banco no soportado" }, { status: 400 });
  }
  if (!rut || !password) {
    return NextResponse.json({ error: "RUT y contraseña requeridos" }, { status: 400 });
  }

  setSetting(`cred_${bankId}_rut`, rut.trim());
  setSetting(`cred_${bankId}_password`, password);

  return NextResponse.json({ ok: true });
}

/** DELETE — elimina credenciales de un banco */
export async function DELETE(req: Request) {
  const { bankId } = await req.json();

  if (!BANK_CONFIGS[bankId]) {
    return NextResponse.json({ error: "Banco no soportado" }, { status: 400 });
  }

  const db = getDb();
  db.prepare("DELETE FROM settings WHERE key = ?").run(`cred_${bankId}_rut`);
  db.prepare("DELETE FROM settings WHERE key = ?").run(`cred_${bankId}_password`);

  return NextResponse.json({ ok: true });
}
