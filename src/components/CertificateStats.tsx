"use client";

import { useEffect, useState } from "react";
import {
  ClipboardText,
  CheckCircle,
  Package,
  Calendar,
  Warning,
} from "phosphor-react";
import { LoadingSpinner, LoadingSkeleton } from "./LoadingSpinner";

interface CertificateStatsData {
  total: number;
  porEstado: {
    entregados: number;
    listosParaEntrega: number;
    enArchivo: number;
    digitalEnviado: number;
  };
  porAño: Record<number, number>;
  esteAño: number;
}

export default function CertificateStats() {
  const [stats, setStats] = useState<CertificateStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/certificates/stats")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        setStats(data);
        setError(null);
      })
      .catch((error) => {
        console.error("Error loading certificate stats:", error);
        setError("No se pudieron cargar las estadísticas. Por favor, intenta de nuevo.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg p-4 border border-slate-200"
            >
              <LoadingSkeleton lines={2} />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <LoadingSkeleton lines={4} />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <Warning size={20} weight="fill" />
          <span className="font-medium">{error || "Error desconocido"}</span>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            setError(null);
            fetch("/api/certificates/stats")
              .then((res) => res.json())
              .then((data) => {
                setStats(data);
                setError(null);
              })
              .catch((err) => {
                setError("No se pudieron cargar las estadísticas.");
                console.error(err);
              })
              .finally(() => setLoading(false));
          }}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // Usar datos del backend
  const { total, porEstado, porAño, esteAño } = stats;
  const { entregados, listosParaEntrega, enArchivo, digitalEnviado } = porEstado;

  const stats = [
    {
      label: "Total Certificados",
      value: total,
      color: "bg-blue-500",
      Icon: ClipboardText,
    },
    {
      label: "Entregados",
      value: entregados,
      color: "bg-green-500",
      Icon: CheckCircle,
    },
    {
      label: "Listos para Entrega",
      value: listosParaEntrega,
      color: "bg-yellow-500",
      Icon: Package,
    },
    {
      label: "Este Año",
      value: esteAño,
      color: "bg-purple-500",
      Icon: Calendar,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <stat.Icon size={24} className="text-slate-600" weight="duotone" />
              <div
                className={`w-3 h-3 rounded-full ${stat.color}`}
                aria-hidden="true"
              ></div>
            </div>
            <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
            <div className="text-xs text-slate-600 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Distribución por estado */}
      <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Distribución por Estado
        </h3>
        <div className="space-y-3">
          <StatBar
            label="En Archivo"
            value={enArchivo}
            total={total}
            color="bg-gray-500"
          />
          <StatBar
            label="Listo para Entrega"
            value={listosParaEntrega}
            total={total}
            color="bg-blue-500"
          />
          <StatBar
            label="Entregado"
            value={entregados}
            total={total}
            color="bg-green-500"
          />
          <StatBar
            label="Digital Enviado"
            value={digitalEnviado}
            total={total}
            color="bg-purple-500"
          />
        </div>
      </div>

      {/* Top años */}
      {Object.keys(porAño).length > 0 && (
        <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            Certificados por Año
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(porAño)
              .sort(([a], [b]) => Number(b) - Number(a))
              .slice(0, 8)
              .map(([año, cantidad]) => (
                <div
                  key={año}
                  className="text-center p-3 bg-slate-50 rounded-lg"
                >
                  <div className="text-lg font-bold text-slate-800">
                    {cantidad}
                  </div>
                  <div className="text-xs text-slate-600">{año}</div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-slate-700">{label}</span>
        <span className="text-sm font-medium text-slate-800">
          {value} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

