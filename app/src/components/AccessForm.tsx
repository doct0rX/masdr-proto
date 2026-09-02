"use client";

import { useState } from "react";

export function AccessForm({ next, submitLabel }: { next: string; submitLabel: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-5 grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await fetch("/api/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
        if (res.ok) {
          window.location.href = next;
        } else {
          setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Incorrect code");
          setBusy(false);
        }
      }}
    >
      <input type="password" autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="••••••••" className="num" />
      {error && <p className="text-sm text-price">{error}</p>}
      <button type="submit" disabled={busy || !code} className="btn-primary justify-center">
        {submitLabel}
      </button>
    </form>
  );
}
