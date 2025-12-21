// src/components/AdminUsersHistoryModal.tsx
"use client";

import { useState, useEffect } from "react";
import { X, Clock, UserPlus, UserMinus, Pencil } from "phosphor-react";
import { LoadingSpinner } from "./LoadingSpinner";
import { toast } from "@/lib/toast";

interface AuditLog {
  id: string;
  action: "created" | "updated" | "deleted";
  email: string;
  role?: string;
  previousRole?: string;
  performedBy: string;
  timestamp: string;
}

interface HistoryResponse {
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminUsersHistoryModal({ isOpen, onClose }: Props) {
  const [history, setHistory] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async (page = 1) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin-users/history?page=${page}&limit=50`);
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al cargar historial");
      }

      const data: HistoryResponse = await res.json();
      setHistory(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al cargar historial"
      );
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "created":
        return <UserPlus size={18} weight="bold" className="text-success" />;
      case "deleted":
        return <UserMinus size={18} weight="bold" className="text-error" />;
      case "updated":
        return <Pencil size={18} weight="bold" className="text-accent" />;
      default:
        return <Clock size={18} weight="bold" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "created":
        return "Agregado";
      case "deleted":
        return "Eliminado";
      case "updated":
        return "Actualizado";
      default:
        return action;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-theme-secondary rounded-xl shadow-lg border border-theme max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-theme">
          <div className="flex items-center gap-3">
            <Clock size={24} weight="bold" className="text-text-primary" />
            <h2 className="text-xl font-bold text-text-primary">
              Historial de Cambios
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-theme-tertiary rounded-lg transition-colors border border-theme"
            aria-label="Cerrar"
          >
            <X size={20} weight="bold" className="text-text-primary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-secondary">
                No hay registros en el historial
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((log) => (
                <div
                  key={log.id}
                  className="bg-theme-tertiary rounded-lg p-4 border border-theme"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getActionIcon(log.action)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-text-primary">
                          {getActionLabel(log.action)}
                        </span>
                        <span className="text-sm text-text-secondary">
                          {log.email}
                        </span>
                      </div>
                      {log.action === "updated" && log.previousRole && (
                        <div className="text-xs text-text-secondary mb-1">
                          Rol anterior: <span className="font-medium">{log.previousRole}</span> → 
                          Rol nuevo: <span className="font-medium">{log.role}</span>
                        </div>
                      )}
                      {log.action === "created" && log.role && (
                        <div className="text-xs text-text-secondary mb-1">
                          Rol asignado: <span className="font-medium">{log.role}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-text-tertiary">
                        <span>Por: {log.performedBy}</span>
                        <span>
                          {new Date(log.timestamp).toLocaleString("es-ES", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer con paginación */}
        {!loading && history.length > 0 && (
          <div className="flex items-center justify-between p-6 border-t border-theme">
            <div className="text-sm text-text-secondary">
              Mostrando {history.length} de {pagination.total} registros
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => loadHistory(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1.5 text-sm bg-theme-tertiary text-text-primary rounded-lg hover:bg-theme-secondary disabled:opacity-50 disabled:cursor-not-allowed border border-theme transition-colors"
              >
                Anterior
              </button>
              <span className="px-3 py-1.5 text-sm text-text-secondary">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <button
                onClick={() => loadHistory(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 text-sm bg-theme-tertiary text-text-primary rounded-lg hover:bg-theme-secondary disabled:opacity-50 disabled:cursor-not-allowed border border-theme transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

