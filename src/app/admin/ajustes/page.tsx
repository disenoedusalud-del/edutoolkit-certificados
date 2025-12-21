"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Shield, ArrowClockwise, Gear, Clock } from "phosphor-react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import ThemeSelector from "@/components/ThemeSelector";
import AdminUsersHistoryModal from "@/components/AdminUsersHistoryModal";
import type { UserRole } from "@/lib/auth";

export default function AjustesPage() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkRole = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        setUserRole(data.role || null);
      } catch (error) {
        console.error("Error verificando rol:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    checkRole();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-theme-primary p-8 flex items-center justify-center">
        <LoadingSpinner />
      </main>
    );
  }

  if (userRole !== "MASTER_ADMIN") {
    toast.error("Solo MASTER_ADMIN puede acceder a esta página");
    router.push("/admin/certificados");
    return null;
  }

  return (
    <main className="min-h-screen bg-theme-primary p-8">
      <div className="mb-4">
        <Link
          href="/admin/certificados"
          className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={20} weight="bold" />
          <span>Volver a Certificados</span>
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-theme-secondary rounded-xl shadow border border-theme p-6">
          <div className="flex items-center gap-3 mb-6">
            <Gear size={32} weight="bold" className="text-text-primary" />
            <h1 className="text-2xl font-bold text-text-primary">
              Ajustes del Sistema
            </h1>
          </div>

          <p className="text-sm text-text-secondary mb-6">
            Configuración y herramientas administrativas disponibles solo para MASTER_ADMIN.
          </p>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Apariencia</h2>
            <div className="bg-theme-tertiary rounded-lg p-4 border border-theme">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-text-primary mb-1">Tema de la aplicación</h3>
                  <p className="text-sm text-text-secondary">
                    Cambia entre Tokyo Night, Dark, Light y Solarized Light
                  </p>
                </div>
                <ThemeSelector />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Administrar Roles */}
            <Link
              href="/admin/roles"
              className="p-6 border border-theme rounded-lg hover:border-accent hover:shadow-md transition-all group bg-theme-secondary"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-accent/20 rounded-lg group-hover:bg-accent/30 transition-colors">
                  <Shield size={24} weight="bold" className="text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-text-primary mb-1">
                    Administrar Roles
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Gestiona los roles y permisos de los usuarios del sistema.
                  </p>
                </div>
              </div>
            </Link>

            {/* Debug Rate Limit */}
            <Link
              href="/admin/debug/rate-limit"
              className="p-6 border border-theme rounded-lg hover:border-accent hover:shadow-md transition-all group bg-theme-secondary"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-accent/20 rounded-lg group-hover:bg-accent/30 transition-colors">
                  <ArrowClockwise size={24} weight="bold" className="text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-text-primary mb-1">
                    Debug Rate Limit
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Resetea bloqueos de rate limiting cuando sea necesario.
                  </p>
                </div>
              </div>
            </Link>

            {/* Historial de Cambios */}
            <button
              onClick={() => setShowHistory(true)}
              className="p-6 border border-theme rounded-lg hover:border-accent hover:shadow-md transition-all group bg-theme-secondary text-left"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-accent/20 rounded-lg group-hover:bg-accent/30 transition-colors">
                  <Clock size={24} weight="bold" className="text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-text-primary mb-1">
                    Historial de Cambios
                  </h3>
                  <p className="text-sm text-text-secondary">
                    Ver quién agregó, modificó o eliminó usuarios del sistema.
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-6 p-4 bg-theme-tertiary rounded-lg border border-theme">
            <p className="text-xs text-text-secondary">
              <strong>Nota:</strong> Estas herramientas son de uso exclusivo para administradores del sistema. 
              Úsalas con precaución y solo cuando sea necesario.
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Historial */}
      <AdminUsersHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </main>
  );
}

