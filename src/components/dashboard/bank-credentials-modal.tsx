"use client";

import { useState, useEffect } from "react";

type TrackingMode = "tc" | "debit" | "both";

interface BankStatus {
  id: string;
  name: string;
  configured: boolean;
  supportsDebit: boolean;
  rut: string;
  source: "db" | "env" | "none";
  trackingMode: TrackingMode;
}

interface Props {
  onClose: () => void;
  onSave: () => void;
  onSynced?: () => void;
}

export function BankCredentialsModal({ onClose, onSave, onSynced }: Props) {
  const [banks, setBanks] = useState<BankStatus[]>([]);
  const [forms, setForms] = useState<Record<string, { rut: string; password: string; showPw: boolean; trackingMode: TrackingMode }>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Record<string, { text: string; ok: boolean }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/credentials")
      .then((r) => r.json())
      .then((data) => {
        setBanks(data.banks ?? []);
        const initial: typeof forms = {};
        for (const b of data.banks ?? []) {
          initial[b.id] = { rut: b.rut ?? "", password: "", showPw: false, trackingMode: b.trackingMode ?? "tc" };
        }
        setForms(initial);
        setLoading(false);
      });
  }, []);

  function setField(bankId: string, field: "rut" | "password" | "showPw" | "trackingMode", value: string | boolean) {
    setForms((f) => ({ ...f, [bankId]: { ...f[bankId], [field]: value } }));
  }

  async function handleTrackingMode(bankId: string, mode: TrackingMode) {
    setField(bankId, "trackingMode", mode);
    await fetch("/api/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankId, trackingMode: mode }),
    });
  }

  async function handleSave(bankId: string) {
    const form = forms[bankId];
    if (!form?.rut || !form?.password) {
      setMessages((m) => ({ ...m, [bankId]: { text: "Completa RUT y contraseña", ok: false } }));
      return;
    }
    setSaving((s) => ({ ...s, [bankId]: true }));
    const res = await fetch("/api/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankId, rut: form.rut, password: form.password, trackingMode: form.trackingMode }),
    });
    const data = await res.json();
    if (data.ok) {
      setBanks((prev) => prev.map((b) => b.id === bankId ? { ...b, configured: true, source: "db" } : b));
      setForms((f) => ({ ...f, [bankId]: { ...f[bankId], password: "" } }));
      setMessages((m) => ({ ...m, [bankId]: { text: "✓ Guardado — ahora sincroniza para importar tus transacciones", ok: true } }));
      onSave();
    } else {
      setMessages((m) => ({ ...m, [bankId]: { text: data.error || "Error al guardar", ok: false } }));
    }
    setSaving((s) => ({ ...s, [bankId]: false }));
    setTimeout(() => setMessages((m) => ({ ...m, [bankId]: { text: "", ok: true } })), 3000);
  }

  async function handleSync(bankId: string) {
    setSyncing((s) => ({ ...s, [bankId]: true }));
    setMessages((m) => ({ ...m, [bankId]: { text: "Conectando con el banco… puede tardar 30-90s", ok: true } }));
    try {
      const res = await fetch(`/api/bank/${bankId}/sync`, { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setMessages((m) => ({ ...m, [bankId]: { text: `Error: ${data.error}`, ok: false } }));
      } else {
        setMessages((m) => ({ ...m, [bankId]: { text: `✓ ${data.imported} transacciones importadas, ${data.skipped} omitidas`, ok: true } }));
        onSynced?.();
      }
    } catch {
      setMessages((m) => ({ ...m, [bankId]: { text: "Error de conexión", ok: false } }));
    }
    setSyncing((s) => ({ ...s, [bankId]: false }));
  }

  async function handleDelete(bankId: string) {
    const res = await fetch("/api/credentials", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankId }),
    });
    if ((await res.json()).ok) {
      setBanks((prev) => prev.map((b) => b.id === bankId ? { ...b, configured: false, source: "none" } : b));
      setForms((f) => ({ ...f, [bankId]: { rut: "", password: "", showPw: false } }));
      setMessages((m) => ({ ...m, [bankId]: { text: "Credenciales eliminadas", ok: true } }));
      onSave();
    }
    setTimeout(() => setMessages((m) => ({ ...m, [bankId]: { text: "", ok: true } })), 3000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-lg font-semibold">Conexión con bancos</h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              Tus credenciales se guardan solo en tu computador — nunca en internet.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)]"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto max-h-[70vh] p-6 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--border)] border-t-[var(--accent)]" />
            </div>
          ) : (
            banks.map((bank) => (
              <BankRow
                key={bank.id}
                bank={bank}
                form={forms[bank.id] ?? { rut: "", password: "", showPw: false, trackingMode: "tc" }}
                saving={!!saving[bank.id]}
                syncing={!!syncing[bank.id]}
                message={messages[bank.id]}
                onRut={(v) => setField(bank.id, "rut", v)}
                onPassword={(v) => setField(bank.id, "password", v)}
                onTogglePw={() => setField(bank.id, "showPw", !forms[bank.id]?.showPw)}
                onTrackingMode={(mode) => handleTrackingMode(bank.id, mode)}
                onSave={() => handleSave(bank.id)}
                onSync={() => handleSync(bank.id)}
                onDelete={() => handleDelete(bank.id)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border)] bg-[var(--background)] rounded-b-2xl">
          <p className="text-xs text-[var(--muted-foreground)]">
            🔒 Las contraseñas se almacenan en tu base de datos local (<code>gastos.db</code>) y nunca se envían a ningún servidor externo.
          </p>
        </div>
      </div>
    </div>
  );
}

const TRACKING_OPTIONS: { value: TrackingMode; label: string; icon: string; desc: string }[] = [
  { value: "tc", label: "Crédito", icon: "💳", desc: "Solo tarjeta de crédito" },
  { value: "debit", label: "Débito", icon: "🏦", desc: "Solo cuenta corriente" },
  { value: "both", label: "Ambos", icon: "✦", desc: "TC + cuenta corriente" },
];

function BankRow({
  bank, form, saving, syncing, message,
  onRut, onPassword, onTogglePw, onTrackingMode, onSave, onSync, onDelete,
}: {
  bank: BankStatus;
  form: { rut: string; password: string; showPw: boolean; trackingMode: TrackingMode };
  saving: boolean;
  syncing: boolean;
  message?: { text: string; ok: boolean };
  onRut: (v: string) => void;
  onPassword: (v: string) => void;
  onTogglePw: () => void;
  onTrackingMode: (mode: TrackingMode) => void;
  onSave: () => void;
  onSync: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-xl border transition-colors ${bank.configured ? "border-emerald-500/30 bg-emerald-500/5" : "border-[var(--border)] bg-[var(--background)]"}`}>
      {/* Row header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${bank.configured ? "bg-emerald-500" : "bg-[var(--muted-foreground)]"}`} />
          <span className="font-medium text-sm">{bank.name}</span>
          {bank.configured && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
              {bank.source === "env" ? "via .env" : "conectado"}
            </span>
          )}
        </div>
        <span className="text-[var(--muted-foreground)] text-sm">{expanded ? "▾" : "▸"}</span>
      </div>

      {/* Expanded form */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-[var(--border)]">

          {/* Tracking mode selector */}
          {bank.supportsDebit && (
            <div className="pt-3">
              <label className="block text-xs text-[var(--muted-foreground)] mb-2">¿Qué movimientos importar?</label>
              <div className="grid grid-cols-3 gap-2">
                {TRACKING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onTrackingMode(opt.value)}
                    className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      form.trackingMode === opt.value
                        ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/50"
                    }`}
                  >
                    <span className="text-base">{opt.icon}</span>
                    <span>{opt.label}</span>
                    <span className="text-[10px] opacity-70 text-center leading-tight">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--muted-foreground)] mb-1">RUT</label>
              <input
                type="text"
                placeholder="12345678-9"
                value={form.rut}
                onChange={(e) => onRut(e.target.value)}
                disabled={bank.source === "env"}
                className="w-full px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--muted-foreground)] mb-1">Contraseña del banco</label>
              <div className="relative">
                <input
                  type={form.showPw ? "text" : "password"}
                  placeholder={bank.configured ? "••••••• (cambiar)" : "Tu clave de internet"}
                  value={form.password}
                  onChange={(e) => onPassword(e.target.value)}
                  disabled={bank.source === "env"}
                  className="w-full px-3 py-2 pr-10 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--accent)] disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={onTogglePw}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-xs px-1"
                >
                  {form.showPw ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
          </div>

          {bank.source === "env" ? (
            <div className="space-y-2">
              <p className="text-xs text-[var(--muted-foreground)]">
                Configurado via variable de entorno. Para editar, modifica <code>.env.local</code>.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={onSync}
                  disabled={syncing}
                  className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {syncing ? "⏳ Conectando..." : "⬇️ Sincronizar ahora"}
                </button>
                {message?.text && (
                  <span className={`text-xs ${message.ok ? "text-emerald-400" : "text-red-400"}`}>
                    {message.text}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
                {bank.configured && (
                  <>
                    <button
                      onClick={onSync}
                      disabled={syncing}
                      className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {syncing ? "⏳ Conectando..." : "⬇️ Sincronizar ahora"}
                    </button>
                    <button
                      onClick={onDelete}
                      className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors"
                    >
                      Desconectar
                    </button>
                  </>
                )}
              </div>
              {message?.text && (
                <p className={`text-xs ${message.ok ? "text-emerald-400" : "text-red-400"}`}>
                  {message.text}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
