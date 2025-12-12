// src/components/LogoutButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
      className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-60"
    >
      {disabled ? "Cerrando sesión..." : "Cerrar sesión"}
    </button>
  );
}
