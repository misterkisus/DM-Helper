"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [key, setKey] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
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
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">DM-доступ</h1>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Секретный ключ"
          autoFocus
          className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 focus:border-amber-300 outline-none"
        />
        {err && <div className="text-sm text-rose-400">{err}</div>}
        <button
          type="submit"
          className="w-full py-3 rounded-lg bg-amber-300 text-zinc-900 font-semibold hover:bg-amber-200"
        >
          Войти
        </button>
      </form>
    </div>
  );
}
