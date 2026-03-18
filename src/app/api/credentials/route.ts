import { NextResponse } from "next/server";
import { getSetting, setSetting, getDb, deleteTransactionsBySourceAndType } from "@/lib/db";
import { BANK_CONFIGS } from "@/lib/bank-configs";

/** GET — lista bancos con estado configurado y trackingMode */
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
      supportsDebit: cfg.supportsDebit,
      rut: rutInDb ? rutInDb : rutInEnv ? rutInEnv : "",
      source: rutInDb ? "db" : rutInEnv ? "env" : "none",
      trackingMode: getSetting(`tracking_mode_${cfg.id}`) ?? "tc",
    };
  });

  return NextResponse.json({ banks });
}

/** POST — guarda credenciales y trackingMode de un banco */
export async function POST(req: Request) {
  const { bankId, rut, password, trackingMode } = await req.json();

  if (!BANK_CONFIGS[bankId]) {
    return NextResponse.json({ error: "Banco no soportado" }, { status: 400 });
  }

  // Guardar trackingMode si viene — y limpiar transacciones del tipo que ya no aplica
  if (trackingMode) {
    const prevMode = getSetting(`tracking_mode_${bankId}`) ?? "tc";
    if (prevMode !== trackingMode) {
      if (trackingMode === "tc") {
        // Cambiando a solo TC → borrar débito de este banco
        deleteTransactionsBySourceAndType(bankId, "debit");
      } else if (trackingMode === "debit") {
        // Cambiando a solo débito → borrar TC de este banco
        deleteTransactionsBySourceAndType(bankId, "tc");
      }
      // Si cambia a "both" no se borra nada
    }
    setSetting(`tracking_mode_${bankId}`, trackingMode);
  }

  // Guardar credenciales solo si vienen
  if (rut && password) {
    setSetting(`cred_${bankId}_rut`, rut.trim());
    setSetting(`cred_${bankId}_password`, password);
  } else if (rut || password) {
    return NextResponse.json({ error: "RUT y contraseña requeridos" }, { status: 400 });
  }

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
