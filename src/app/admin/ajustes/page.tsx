"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Shield, ArrowClockwise, Gear, Palette } from "phosphor-react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import ThemeSelector from "@/components/ThemeSelector";
import type { UserRole } from "@/lib/auth";

export default function AjustesPage() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
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
      <main className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
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

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Gear size={32} weight="bold" className="text-slate-700" />
            <h1 className="text-2xl font-bold text-slate-800">
              Ajustes del Sistema
            </h1>
          </div>

          <p className="text-sm text-slate-600 mb-6">
            Configuración y herramientas administrativas disponibles solo para MASTER_ADMIN.
          </p>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">Apariencia</h2>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-slate-800 mb-1">Tema de la aplicación</h3>
                  <p className="text-sm text-slate-600">
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
              className="p-6 border border-slate-200 rounded-lg hover:border-amber-500 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors">
                  <Shield size={24} weight="bold" className="text-amber-700" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800 mb-1">
                    Administrar Roles
                  </h3>
                  <p className="text-sm text-slate-600">
                    Gestiona los roles y permisos de los usuarios del sistema.
                  </p>
                </div>
              </div>
            </Link>

            {/* Debug Rate Limit */}
            <Link
              href="/admin/debug/rate-limit"
              className="p-6 border border-slate-200 rounded-lg hover:border-orange-500 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                  <ArrowClockwise size={24} weight="bold" className="text-orange-700" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800 mb-1">
                    Debug Rate Limit
                  </h3>
                  <p className="text-sm text-slate-600">
                    Resetea bloqueos de rate limiting cuando sea necesario.
                  </p>
                </div>
              </div>
            </Link>
          </div>

          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-600">
              <strong>Nota:</strong> Estas herramientas son de uso exclusivo para administradores del sistema. 
              Úsalas con precaución y solo cuando sea necesario.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

