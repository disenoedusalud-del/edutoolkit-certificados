// src/app/admin/debug/rate-limit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ArrowLeft, Trash, Refresh } from "phosphor-react";
import Link from "next/link";
import type { UserRole } from "@/lib/auth";

export default function RateLimitDebugPage() {
  const [loading, setLoading] = useState(false);
  const [ip, setIp] = useState("");
  const [checkingRole, setCheckingRole] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const router = useRouter();

  // Verificar que el usuario sea MASTER_ADMIN
  useEffect(() => {
    const checkRole = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (data.role !== "MASTER_ADMIN") {
          toast.error("Solo MASTER_ADMIN puede acceder a esta página");
          router.push("/admin/certificados");
          return;
        }
        setUserRole(data.role);
      } catch (error) {
        console.error("Error verificando rol:", error);
        router.push("/login");
      } finally {
        setCheckingRole(false);
      }
    };
    checkRole();
  }, [router]);

  if (checkingRole) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
        <LoadingSpinner />
      </main>
    );
  }

  if (userRole !== "MASTER_ADMIN") {
    return null; // Ya se redirigió
  }

  const handleResetIP = async () => {
    if (!ip.trim()) {
      toast.error("Ingresa una IP");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/debug/reset-rate-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: ip.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al resetear rate limit");
      }

      toast.success(data.message || "Rate limit reseteado correctamente");
      setIp("");
    } catch (error) {
      console.error("Error:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al resetear rate limit"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetAll = async () => {
    if (!confirm("¿Estás seguro de resetear TODOS los rate limits? Esto afectará a todos los usuarios.")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/debug/reset-rate-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al resetear rate limits");
      }

      toast.success(
        data.message || `Se resetearon ${data.resetCount || 0} rate limits`
      );
    } catch (error) {
      console.error("Error:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al resetear rate limits"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetMyIP = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/debug/reset-rate-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // Sin IP = resetear la IP del request
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al resetear rate limit");
      }

      toast.success(
        data.message || "Rate limit reseteado para tu IP"
      );
    } catch (error) {
      console.error("Error:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al resetear rate limit"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mb-4">
        <Link
          href="/admin/certificados"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={20} weight="bold" />
          <span>Volver a Certificados</span>
        </Link>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow border border-slate-200 p-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Resetear Rate Limit
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            Solo disponible para MASTER_ADMIN. Úsalo cuando un usuario (incluido tú) se quede bloqueado por rate limiting.
          </p>

          <div className="space-y-4">
            {/* Resetear mi propia IP */}
            <div className="border border-slate-200 rounded-lg p-4">
              <h2 className="font-semibold text-slate-700 mb-2">
                Resetear mi IP actual
              </h2>
              <p className="text-xs text-slate-500 mb-3">
                Resetea el rate limit para tu IP actual (útil si te quedaste bloqueado).
              </p>
              <button
                onClick={handleResetMyIP}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                <Refresh size={18} weight="bold" />
                {loading ? "Reseteando..." : "Resetear mi IP"}
              </button>
            </div>

            {/* Resetear IP específica */}
            <div className="border border-slate-200 rounded-lg p-4">
              <h2 className="font-semibold text-slate-700 mb-2">
                Resetear IP específica
              </h2>
              <p className="text-xs text-slate-500 mb-3">
                Resetea el rate limit para una IP específica.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  placeholder="Ej: 192.168.1.1"
                  className="flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleResetIP}
                  disabled={loading || !ip.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  Resetear
                </button>
              </div>
            </div>

            {/* Resetear todos */}
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <h2 className="font-semibold text-red-700 mb-2">
                Resetear TODOS los rate limits
              </h2>
              <p className="text-xs text-red-600 mb-3">
                ⚠️ Esto resetea el rate limit para TODOS los usuarios. Úsalo solo en emergencias.
              </p>
              <button
                onClick={handleResetAll}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                <Trash size={18} weight="bold" />
                {loading ? "Reseteando..." : "Resetear todos"}
              </button>
            </div>
          </div>

          <div className="mt-6 p-3 bg-slate-100 rounded-lg">
            <p className="text-xs text-slate-600">
              <strong>Nota:</strong> El rate limit se basa en la IP del cliente. 
              Si estás detrás de un proxy o compartes IP con otros usuarios, 
              resetear puede afectar a otros también.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

