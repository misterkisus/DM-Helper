"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [key, setKey] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) {
        setErr("Неверный ключ");
        return;
      }
      router.replace("/dm");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm anim-fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/5 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-amber-100/70">
            Pathfinder 2e
          </div>
          <h1 className="font-serif gold-text font-bold mt-2" style={{ fontSize: "clamp(2rem, 8vw, 3rem)" }}>
            Помощник ДМа
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Введите ключ мастера, чтобы открыть панель управления боем.
          </p>
          <div className="ornate-divider mt-4 mx-auto max-w-[200px]" />
        </div>

        <form onSubmit={submit} className="battle-card glass-strong rounded-2xl p-6 space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-zinc-400">Секретный ключ</span>
            <div className="relative mt-2">
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="••••••••••••"
                autoFocus
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 focus:border-amber-300/60 outline-none transition text-lg tracking-widest"
              />
            </div>
          </label>

          {err && (
            <div className="anim-fade-in text-sm text-rose-300 bg-rose-500/10 border border-rose-400/30 rounded-lg px-3 py-2">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !key}
            className="relative w-full py-3 rounded-xl font-serif text-lg font-semibold bg-gradient-to-b from-amber-200 via-amber-300 to-amber-500 text-zinc-900 hover:from-amber-100 hover:via-amber-200 hover:to-amber-400 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
          >
            <span className="relative z-10">{loading ? "Проверяю..." : "Войти"}</span>
            {!loading && <span className="absolute inset-0 anim-shimmer" />}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-zinc-500">
          Трекер инициативы для Pathfinder 2e
        </div>
      </div>
    </main>
  );
}
