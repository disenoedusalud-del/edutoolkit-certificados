"use client";

import { useState, useEffect } from "react";
import CertificateList from "@/components/CertificateList";
import CertificateForm from "@/components/CertificateForm";
import CertificateStats from "@/components/CertificateStats";
import ThemeSelector from "@/components/ThemeSelector";
import { ChartBar, Plus, BookOpen, ArrowLeft, Gear } from "phosphor-react";
import Link from "next/link";

function AjustesButton() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.role) {
          setUserRole(data.role);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || userRole !== "MASTER_ADMIN") {
    return null;
  }

  return (
    <Link
      href="/admin/ajustes"
      className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
    >
      <Gear size={18} weight="bold" />
      Ajustes
    </Link>
  );
}

export default function Page() {
  const [showForm, setShowForm] = useState(false);
  const [showStats, setShowStats] = useState(false);

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Gestión de Certificados
        </h1>
        {!showForm && (
          <div className="flex gap-2 items-center">
            <ThemeSelector />
            <AjustesButton />
            <Link
              href="/admin/cursos"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <BookOpen size={18} weight="bold" />
              Administrar Cursos
            </Link>
            <button
              onClick={() => setShowStats(!showStats)}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <ChartBar size={18} weight="bold" />
              {showStats ? "Ocultar Estadísticas" : "Ver Estadísticas"}
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus size={18} weight="bold" />
              Nuevo Certificado
            </button>
          </div>
        )}
      </div>

      {showForm ? (
        <div className="bg-white rounded-xl shadow p-6 border border-slate-200">
          <div className="mb-4">
            <button
              onClick={() => setShowForm(false)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft size={20} weight="bold" />
              <span>Volver a la lista</span>
            </button>
          </div>
          <CertificateForm onCancel={() => setShowForm(false)} />
        </div>
      ) : (
        <div className="space-y-6">
          {showStats && (
            <div className="bg-white rounded-xl shadow p-6 border border-slate-200">
              <CertificateStats />
            </div>
          )}
          <div className="bg-white rounded-xl shadow p-4 border border-slate-200">
            <CertificateList />
          </div>
        </div>
      )}
    </main>
  );
}

