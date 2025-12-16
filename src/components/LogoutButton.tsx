// src/components/LogoutButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SignOut } from "phosphor-react";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/logout", {
        method: "POST",
      });

      if (!res.ok) {
        console.error("[LOGOUT] Error al cerrar sesión");
        setLoading(false);
        return;
      }

      // Después de cerrar sesión, mandamos a /login
      startTransition(() => {
        router.push("/login");
        router.refresh();
      });
    } catch (error) {
      console.error("[LOGOUT] Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || isPending;

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={disabled}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <SignOut size={18} weight="bold" />
      {disabled ? "Cerrando sesión..." : "Salir"}
    </button>
  );
}
