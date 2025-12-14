"use client";

import { useEffect, useState, useMemo } from "react";
import { Certificate } from "@/types/Certificate";
import { useRouter } from "next/navigation";
import { exportToCSV, downloadCSV } from "@/lib/exportUtils";
import {
  Download,
  CheckSquare,
  Square,
  Trash,
  ArrowsClockwise,
  CaretUp,
  CaretDown,
  ArrowsVertical,
  DotsThreeVertical,
  Copy,
  Pencil,
  Eye,
  X,
  File,
  ArrowSquareOut,
  CaretRight,
  Folder,
  FolderOpen,
  MagnifyingGlass,
} from "phosphor-react";
import { toast } from "@/lib/toast";
import { LoadingSpinner, LoadingSkeleton } from "./LoadingSpinner";

const ITEMS_PER_PAGE = 10;

const statusColors: Record<string, string> = {
  en_archivo: "bg-gray-100 text-gray-700",
  listo_para_entrega: "bg-blue-100 text-blue-700",
  entregado: "bg-green-100 text-green-700",
  digital_enviado: "bg-purple-100 text-purple-700",
  anulado: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  en_archivo: "En archivo",
  listo_para_entrega: "Listo para entrega",
  entregado: "Entregado",
  digital_enviado: "Digital enviado",
  anulado: "Anulado",
};

export default function CertificateList() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [sortField, setSortField] = useState<keyof Certificate | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [quickViewCert, setQuickViewCert] = useState<Certificate | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grouped">("grouped");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupSearchTerms, setGroupSearchTerms] = useState<Record<string, string>>({});
  const [quickEditData, setQuickEditData] = useState<{
    deliveryStatus: string;
    deliveryDate: string;
    deliveredTo: string;
  } | null>(null);
  const [quickEditLoading, setQuickEditLoading] = useState(false);
  const router = useRouter();

  const loadCertificates = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/certificates");
      const data = await res.json();
      
      // Asegurar que siempre sea un array
      if (Array.isArray(data)) {
        setCerts(data);
      } else if (data.error) {
        console.error("Error from API:", data.error);
        setCerts([]); // Establecer array vacío en caso de error
      } else {
        console.warn("Unexpected data format:", data);
        setCerts([]); // Establecer array vacío si el formato no es el esperado
      }
    } catch (error) {
      console.error("Error loading certificates:", error);
      setCerts([]); // Establecer array vacío en caso de error de red
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCertificates();
  }, []);

  // Filtrar y ordenar certificados
  const filteredCerts = useMemo(() => {
    // Asegurar que certs sea un array
    if (!Array.isArray(certs)) {
      return [];
    }
    
    let filtered = certs.filter((cert) => {
      // Búsqueda por nombre, curso, código del curso (tag) o ID del certificado
      const searchLower = searchTerm.toLowerCase();
      const courseCode = cert.courseId ? cert.courseId.split("-")[0].toLowerCase() : "";
      const matchesSearch =
        searchTerm === "" ||
        cert.fullName.toLowerCase().includes(searchLower) ||
        cert.courseName.toLowerCase().includes(searchLower) ||
        cert.courseId?.toLowerCase().includes(searchLower) ||
        courseCode.includes(searchLower);

      // Filtro por estado
      const matchesStatus =
        statusFilter === "all" || cert.deliveryStatus === statusFilter;

      // Filtro por año
      const matchesYear =
        yearFilter === "all" || cert.year.toString() === yearFilter;

      return matchesSearch && matchesStatus && matchesYear;
    });

    // Ordenar
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (typeof aValue === "string" && typeof bValue === "string") {
          const comparison = aValue.localeCompare(bValue);
          return sortDirection === "asc" ? comparison : -comparison;
        }

        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
        }

        return 0;
      });
    }

    return filtered;
  }, [certs, searchTerm, statusFilter, yearFilter, sortField, sortDirection]);

  // Agrupar certificados por curso y año
  const groupedCerts = useMemo(() => {
    const groups: Record<string, Certificate[]> = {};
    filteredCerts.forEach((cert) => {
      const courseCode = cert.courseId ? cert.courseId.split("-")[0] : "SIN-CODIGO";
      const groupKey = `${courseCode}-${cert.courseName}-${cert.year}`;
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(cert);
    });
    
    // Ordenar certificados dentro de cada grupo por courseId
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => {
        const aId = a.courseId || "";
        const bId = b.courseId || "";
        return aId.localeCompare(bId);
      });
    });
    
    return groups;
  }, [filteredCerts]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const expandAllGroups = () => {
    setExpandedGroups(new Set(Object.keys(groupedCerts)));
  };

  const collapseAllGroups = () => {
    setExpandedGroups(new Set());
  };


  const handleSort = (field: keyof Certificate) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: keyof Certificate) => {
    if (sortField !== field) {
      return <ArrowsVertical size={14} className="text-slate-400" />;
    }
    return sortDirection === "asc" ? (
      <CaretUp size={14} className="text-blue-600" />
    ) : (
      <CaretDown size={14} className="text-blue-600" />
    );
  };

  // Paginación
  const totalPages = Math.ceil(filteredCerts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCerts = filteredCerts.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  // Obtener años únicos para el filtro
  const uniqueYears = useMemo(() => {
    if (!Array.isArray(certs)) {
      return [];
    }
    const years = Array.from(new Set(certs.map((c) => c.year))).sort(
      (a, b) => b - a
    );
    return years;
  }, [certs]);

  useEffect(() => {
    setCurrentPage(1); // Resetear a la primera página cuando cambian los filtros
  }, [searchTerm, statusFilter, yearFilter, sortField, sortDirection]);

  // Toggle selección individual
  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Seleccionar/deseleccionar todos en la página actual
  const toggleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allPageIds = paginatedCerts.map((c) => c.id!).filter(Boolean);
    const allSelected = allPageIds.every((id) => selectedIds.has(id));

    if (allSelected) {
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        allPageIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
    } else {
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        allPageIds.forEach((id) => newSet.add(id));
        return newSet;
      });
    }
  };

  // Cambiar estado masivo
  const handleBulkStatusChange = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;

    if (
      !confirm(
        `¿Estás seguro de cambiar el estado de ${selectedIds.size} certificado(s) a "${statusLabels[bulkStatus]}"?`
      )
    ) {
      return;
    }

    setBulkLoading(true);
    try {
      const response = await fetch("/api/certificates/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          deliveryStatus: bulkStatus,
        }),
      });

      if (response.ok) {
        await loadCertificates();
        setSelectedIds(new Set());
        setBulkStatus("");
        setShowBulkActions(false);
        toast.success("Estado actualizado correctamente");
      } else {
        toast.error("Error al actualizar el estado");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al actualizar el estado");
    } finally {
      setBulkLoading(false);
    }
  };

  // Eliminar masivo
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (
      !confirm(
        `¿Estás seguro de eliminar ${selectedIds.size} certificado(s)? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    setBulkLoading(true);
    try {
      const response = await fetch("/api/certificates/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (response.ok) {
        await loadCertificates();
        setSelectedIds(new Set());
        setShowBulkActions(false);
        toast.success("Certificados eliminados correctamente");
      } else {
        toast.error("Error al eliminar los certificados");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al eliminar los certificados");
    } finally {
      setBulkLoading(false);
    }
  };

  // Mostrar/ocultar acciones masivas según selección
  useEffect(() => {
    setShowBulkActions(selectedIds.size > 0);
  }, [selectedIds]);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null);
    };
    if (openMenuId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openMenuId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <LoadingSpinner size={32} className="text-blue-600" />
        <p className="text-slate-500 text-sm">Cargando certificados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros y búsqueda */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 w-full md:w-auto">
          <div>
            <label className="block text-xs text-slate-600 mb-1">Buscar</label>
            <input
              type="text"
              placeholder="Nombre, curso o código (ej: LM, GASH)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">Todos</option>
              <option value="en_archivo">En archivo</option>
              <option value="listo_para_entrega">Listo para entrega</option>
              <option value="entregado">Entregado</option>
              <option value="digital_enviado">Digital enviado</option>
              <option value="anulado">Anulado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Año</label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">Todos</option>
              {uniqueYears.map((year) => (
                <option key={year} value={year.toString()}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => setViewMode(viewMode === "list" ? "grouped" : "list")}
            className={`px-3 py-2 border rounded-lg transition-colors text-sm flex items-center gap-2 ${
              viewMode === "grouped"
                ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                : "border-slate-300 hover:bg-slate-50"
            }`}
            title={viewMode === "list" ? "Cambiar a vista agrupada" : "Cambiar a vista lista"}
          >
            {viewMode === "list" ? (
              <>
                <Folder size={18} />
                Agrupada
              </>
            ) : (
              <>
                <ArrowsVertical size={18} />
                Lista
              </>
            )}
          </button>
          {viewMode === "grouped" && (
            <>
              <button
                onClick={expandAllGroups}
                className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                title="Expandir todos los grupos"
              >
                Expandir
              </button>
              <button
                onClick={collapseAllGroups}
                className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                title="Colapsar todos los grupos"
              >
                Colapsar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Acciones masivas */}
      {showBulkActions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-blue-900">
              {selectedIds.size} certificado(s) seleccionado(s)
            </span>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="px-3 py-1 border border-blue-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="">Cambiar estado a...</option>
              <option value="en_archivo">En archivo</option>
              <option value="listo_para_entrega">Listo para entrega</option>
              <option value="entregado">Entregado</option>
              <option value="digital_enviado">Digital enviado</option>
              <option value="anulado">Anulado</option>
            </select>
            <button
              onClick={handleBulkStatusChange}
              disabled={!bulkStatus || bulkLoading}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {bulkLoading ? (
                <LoadingSpinner size={16} className="text-white" />
              ) : (
                <ArrowsClockwise size={16} weight="bold" />
              )}
              Aplicar
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkLoading}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {bulkLoading ? (
                <LoadingSpinner size={16} className="text-white" />
              ) : (
                <Trash size={16} weight="bold" />
              )}
              Eliminar
            </button>
          </div>
          <button
            onClick={() => {
              setSelectedIds(new Set());
              setBulkStatus("");
            }}
            className="text-sm text-blue-700 hover:text-blue-900"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Contador de resultados y exportar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Mostrando {paginatedCerts.length} de {filteredCerts.length} certificados
        </div>
        {filteredCerts.length > 0 && (
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <button
                onClick={() => {
                  const selectedCerts = filteredCerts.filter(
                    (c) => c.id && selectedIds.has(c.id)
                  );
                  const csv = exportToCSV(selectedCerts);
                  const filename = `certificados_seleccionados_${new Date().toISOString().split("T")[0]}.csv`;
                  downloadCSV(csv, filename);
                  toast.success(`${selectedCerts.length} certificado(s) exportado(s)`);
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-2"
              >
                <Download size={18} weight="bold" />
                Exportar Seleccionados ({selectedIds.size})
              </button>
            )}
            <button
              onClick={() => {
                const csv = exportToCSV(filteredCerts);
                const filename = `certificados_${new Date().toISOString().split("T")[0]}.csv`;
                downloadCSV(csv, filename);
                toast.success(`${filteredCerts.length} certificado(s) exportado(s)`);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
            >
              <Download size={18} weight="bold" />
              Exportar Todos
            </button>
          </div>
        )}
      </div>

      {/* Tabla */}
      {filteredCerts.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-8">
          No se encontraron certificados con los filtros aplicados.
        </p>
      ) : viewMode === "grouped" ? (
        /* Vista Agrupada */
        <div className="space-y-2">
          {Object.entries(groupedCerts)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([groupKey, groupCerts]) => {
              const courseCode = groupCerts[0].courseId ? groupCerts[0].courseId.split("-")[0] : "SIN-CODIGO";
              const courseName = groupCerts[0].courseName;
              const year = groupCerts[0].year;
              const isExpanded = expandedGroups.has(groupKey);
              
              return (
                <div key={groupKey} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <FolderOpen size={20} className="text-blue-600" weight="fill" />
                      ) : (
                        <Folder size={20} className="text-slate-500" weight="fill" />
                      )}
                      <div>
                        <div className="font-semibold text-slate-800">
                          {courseCode} - {courseName}
                        </div>
                        <div className="text-xs text-slate-500">
                          Año {year} • {groupCerts.length} certificado{groupCerts.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded">
                        {groupCerts.length}
                      </span>
                      {isExpanded ? (
                        <CaretDown size={18} className="text-slate-500" />
                      ) : (
                        <CaretRight size={18} className="text-slate-500" />
                      )}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-slate-200">
                      {/* Búsqueda dentro de la carpeta */}
                      <div className="p-3 bg-slate-50 border-b border-slate-200">
                        <div className="relative">
                          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder={`Buscar en ${courseCode}...`}
                            value={groupSearchTerms[groupKey] || ""}
                            onChange={(e) => {
                              setGroupSearchTerms((prev) => ({
                                ...prev,
                                [groupKey]: e.target.value,
                              }));
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
                            <tr>
                              <th className="px-4 py-2 text-left w-12">
                                <CheckSquare size={16} className="text-slate-400" />
                              </th>
                              <th className="px-4 py-2 text-left">Nombre</th>
                              <th className="px-4 py-2 text-left">ID Certificado</th>
                              <th className="px-4 py-2 text-left">Estado</th>
                              <th className="px-4 py-2 text-left w-12">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(() => {
                              const groupSearchTerm = (groupSearchTerms[groupKey] || "").toLowerCase();
                              const filteredGroupCerts = groupSearchTerm
                                ? groupCerts.filter((c) => {
                                    const searchLower = groupSearchTerm;
                                    return (
                                      c.fullName.toLowerCase().includes(searchLower) ||
                                      c.courseId?.toLowerCase().includes(searchLower) ||
                                      c.email?.toLowerCase().includes(searchLower) ||
                                      c.phone?.toLowerCase().includes(searchLower)
                                    );
                                  })
                                : groupCerts;
                              
                              if (filteredGroupCerts.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={5} className="px-4 py-4 text-center text-slate-500 text-sm">
                                      No se encontraron certificados con la búsqueda "{groupSearchTerm}"
                                    </td>
                                  </tr>
                                );
                              }
                              
                              return filteredGroupCerts.map((c) => (
                              <tr
                                key={c.id}
                                className="hover:bg-slate-50 transition-colors cursor-pointer"
                                onClick={(e) => {
                                  if ((e.target as HTMLElement).closest('input[type="checkbox"]') || 
                                      (e.target as HTMLElement).closest('button') ||
                                      (e.target as HTMLElement).closest('input[type="text"]')) {
                                    return;
                                  }
                                  setQuickViewCert(c);
                                  setQuickEditData({
                                    deliveryStatus: c.deliveryStatus || "en_archivo",
                                    deliveryDate: c.deliveryDate ? new Date(c.deliveryDate).toISOString().split("T")[0] : "",
                                    deliveredTo: c.deliveredTo || "",
                                  });
                                }}
                              >
                                <td
                                  className="px-4 py-2"
                                  onClick={(e) => c.id && toggleSelect(c.id, e)}
                                >
                                  {selectedIds.has(c.id!) ? (
                                    <CheckSquare size={20} className="text-blue-600 cursor-pointer" weight="fill" />
                                  ) : (
                                    <Square size={20} className="text-slate-400 cursor-pointer" />
                                  )}
                                </td>
                                <td className="px-4 py-2 font-medium text-slate-800">
                                  {c.fullName}
                                </td>
                                <td className="px-4 py-2 text-slate-700 font-mono text-xs">
                                  {c.courseId}
                                </td>
                                <td className="px-4 py-2">
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      statusColors[c.deliveryStatus || "en_archivo"] ||
                                      "bg-gray-100 text-gray-700"
                                    }`}
                                  >
                                    {statusLabels[c.deliveryStatus || "en_archivo"] ||
                                      c.deliveryStatus ||
                                      "—"}
                                  </span>
                                </td>
                                <td className="px-4 py-2 w-12">
                                  <div className="relative">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (openMenuId === c.id) {
                                          setOpenMenuId(null);
                                          setMenuPosition(null);
                                        } else {
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          setMenuPosition({
                                            top: rect.bottom + 4,
                                            left: rect.right - 180,
                                          });
                                          setOpenMenuId(c.id || null);
                                        }
                                      }}
                                      className="p-1 hover:bg-slate-200 rounded transition-colors"
                                    >
                                      <DotsThreeVertical size={18} className="text-slate-600" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                      {groupSearchTerms[groupKey] && (
                        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
                          Mostrando {(() => {
                            const groupSearchTerm = (groupSearchTerms[groupKey] || "").toLowerCase();
                            const filtered = groupSearchTerm
                              ? groupCerts.filter((c) => {
                                  const searchLower = groupSearchTerm;
                                  return (
                                    c.fullName.toLowerCase().includes(searchLower) ||
                                    c.courseId?.toLowerCase().includes(searchLower) ||
                                    c.email?.toLowerCase().includes(searchLower) ||
                                    c.phone?.toLowerCase().includes(searchLower)
                                  );
                                })
                              : groupCerts;
                            return filtered.length;
                          })()} de {groupCerts.length} certificado{groupCerts.length !== 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          {Object.keys(groupedCerts).length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No se encontraron certificados con los filtros aplicados.
            </div>
          )}
        </div>
      ) : (
        /* Vista Lista */
        <>
          <div className="overflow-x-auto overflow-y-visible">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-2 text-left w-12">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center justify-center"
                    >
                      {paginatedCerts.every(
                        (c) => c.id && selectedIds.has(c.id)
                      ) ? (
                        <CheckSquare size={20} weight="fill" className="text-blue-600" />
                      ) : (
                        <Square size={20} className="text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left">
                    <button
                      onClick={() => handleSort("fullName")}
                      className="flex items-center gap-1 hover:text-slate-800"
                    >
                      Nombre
                      {getSortIcon("fullName")}
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left">
                    <button
                      onClick={() => handleSort("courseName")}
                      className="flex items-center gap-1 hover:text-slate-800"
                    >
                      Curso
                      {getSortIcon("courseName")}
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left">
                    <button
                      onClick={() => handleSort("year")}
                      className="flex items-center gap-1 hover:text-slate-800"
                    >
                      Año
                      {getSortIcon("year")}
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left">
                    <button
                      onClick={() => handleSort("deliveryStatus")}
                      className="flex items-center gap-1 hover:text-slate-800"
                    >
                      Estado
                      {getSortIcon("deliveryStatus")}
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left w-12">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {paginatedCerts.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50 transition-colors relative cursor-pointer"
                    onClick={(e) => {
                      // No abrir si se hace clic en el checkbox o en el menú de tres puntos
                      if ((e.target as HTMLElement).closest('input[type="checkbox"]') || 
                          (e.target as HTMLElement).closest('button')) {
                        return;
                      }
                      setQuickViewCert(c);
                      setQuickEditData({
                        deliveryStatus: c.deliveryStatus || "en_archivo",
                        deliveryDate: c.deliveryDate ? new Date(c.deliveryDate).toISOString().split("T")[0] : "",
                        deliveredTo: c.deliveredTo || "",
                      });
                    }}
                  >
                    <td
                      className="px-4 py-2"
                      onClick={(e) => c.id && toggleSelect(c.id, e)}
                    >
                      {c.id && selectedIds.has(c.id) ? (
                        <CheckSquare
                          size={20}
                          weight="fill"
                          className="text-blue-600 cursor-pointer"
                        />
                      ) : (
                        <Square size={20} className="text-slate-400 cursor-pointer" />
                      )}
                    </td>
                    <td
                      className="px-4 py-2 font-medium text-slate-800"
                    >
                      {c.fullName}
                    </td>
                    <td
                      className="px-4 py-2 text-slate-700"
                    >
                      {c.courseName}
                    </td>
                    <td
                      className="px-4 py-2 text-slate-700"
                    >
                      {c.year}
                    </td>
                    <td
                      className="px-4 py-2"
                    >
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          statusColors[c.deliveryStatus || "en_archivo"] ||
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {statusLabels[c.deliveryStatus || "en_archivo"] ||
                          c.deliveryStatus ||
                          "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2 w-12">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openMenuId === c.id) {
                              setOpenMenuId(null);
                              setMenuPosition(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuPosition({
                                top: rect.bottom + 4,
                                left: rect.right - 180,
                              });
                              setOpenMenuId(c.id || null);
                            }
                          }}
                          className="p-1 hover:bg-slate-200 rounded transition-colors"
                        >
                          <DotsThreeVertical size={18} className="text-slate-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación - Solo en vista lista */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-sm text-slate-600">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {/* Menú desplegable fuera del contenedor con scroll - Funciona para ambas vistas */}
      {openMenuId && menuPosition && (
        <>
          <div 
            className="fixed inset-0 z-[90]" 
            onClick={() => {
              setOpenMenuId(null);
              setMenuPosition(null);
            }}
          />
          <div 
            className="fixed bg-white border border-slate-200 rounded-lg shadow-xl z-[200] min-w-[180px]"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const cert = certs.find(c => c.id === openMenuId);
              if (!cert) return null;
              return (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuickViewCert(cert);
                      setQuickEditData({
                        deliveryStatus: cert.deliveryStatus || "en_archivo",
                        deliveryDate: cert.deliveryDate ? new Date(cert.deliveryDate).toISOString().split("T")[0] : "",
                        deliveredTo: cert.deliveredTo || "",
                      });
                      setOpenMenuId(null);
                      setMenuPosition(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Pencil size={16} />
                    Edición Rápida
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/admin/certificados/${cert.id}`);
                      setOpenMenuId(null);
                      setMenuPosition(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Eye size={16} />
                    Ver Detalle Completo
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      setOpenMenuId(null);
                      setMenuPosition(null);
                      try {
                        const { id, ...certificateData } = cert;
                        const newCertificate = {
                          ...certificateData,
                          fullName: `${certificateData.fullName} (Copia)`,
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        };

                        const response = await fetch("/api/certificates", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(newCertificate),
                        });

                        if (response.ok) {
                          await loadCertificates();
                          toast.success("Certificado duplicado correctamente");
                        } else {
                          toast.error("Error al duplicar el certificado");
                        }
                      } catch (error) {
                        console.error("Error:", error);
                        toast.error("Error al duplicar el certificado");
                      }
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Copy size={16} />
                    Duplicar
                  </button>
                  <div className="border-t border-slate-200"></div>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      setOpenMenuId(null);
                      setMenuPosition(null);
                      if (
                        confirm(
                          "¿Estás seguro de eliminar este certificado? Esta acción no se puede deshacer."
                        )
                      ) {
                        try {
                          const response = await fetch(
                            `/api/certificates/${cert.id}`,
                            {
                              method: "DELETE",
                            }
                          );

                          if (response.ok) {
                            await loadCertificates();
                            toast.success("Certificado eliminado correctamente");
                          } else {
                            toast.error("Error al eliminar el certificado");
                          }
                        } catch (error) {
                          console.error("Error:", error);
                          toast.error("Error al eliminar el certificado");
                        }
                      }
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash size={16} />
                    Eliminar
                  </button>
                </>
              );
            })()}
          </div>
        </>
      )}

      {/* Modal de Edición Rápida */}
      {quickViewCert && quickEditData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800">
                Edición Rápida - {quickViewCert.fullName}
              </h2>
              <button
                onClick={() => {
                  setQuickViewCert(null);
                  setQuickEditData(null);
                }}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
              >
                <X size={24} className="text-slate-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Información Relevante */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 uppercase mb-1">
                    Nombre Completo
                  </label>
                  <p className="text-slate-800 font-medium">{quickViewCert.fullName}</p>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase mb-1">
                    Curso
                  </label>
                  <p className="text-slate-800">{quickViewCert.courseName}</p>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase mb-1">
                    ID del Certificado
                  </label>
                  <p className="text-slate-800 font-mono text-sm">{quickViewCert.courseId}</p>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase mb-1">
                    Año
                  </label>
                  <p className="text-slate-800">{quickViewCert.year}</p>
                </div>
                {quickViewCert.email && (
                  <div>
                    <label className="block text-xs text-slate-500 uppercase mb-1">
                      Email
                    </label>
                    <p className="text-slate-800 text-sm">{quickViewCert.email}</p>
                  </div>
                )}
                {quickViewCert.phone && (
                  <div>
                    <label className="block text-xs text-slate-500 uppercase mb-1">
                      Teléfono
                    </label>
                    <p className="text-slate-800 text-sm">{quickViewCert.phone}</p>
                  </div>
                )}
                {quickViewCert.driveFileId && (
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-500 uppercase mb-2">
                      Archivo en Google Drive
                    </label>
                    <div className="flex gap-2">
                      <a
                        href={quickViewCert.driveWebViewLink || `https://drive.google.com/file/d/${quickViewCert.driveFileId}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                      >
                        <File size={18} weight="bold" />
                        Ver Certificado en Drive
                        <ArrowSquareOut size={16} />
                      </a>
                      <a
                        href={`https://drive.google.com/uc?export=download&id=${quickViewCert.driveFileId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors flex items-center gap-2 text-sm"
                      >
                        <Download size={18} weight="bold" />
                        Descargar
                      </a>
                    </div>
                    <p className="text-slate-500 text-xs mt-2 font-mono break-all">
                      ID: {quickViewCert.driveFileId}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">
                  Estado y Entrega
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Estado <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={quickEditData.deliveryStatus}
                      onChange={(e) =>
                        setQuickEditData({
                          ...quickEditData,
                          deliveryStatus: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="en_archivo">En archivo</option>
                      <option value="listo_para_entrega">Listo para entrega</option>
                      <option value="entregado">Entregado</option>
                      <option value="digital_enviado">Digital enviado</option>
                      <option value="anulado">Anulado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Fecha de Entrega
                    </label>
                    <input
                      type="date"
                      value={quickEditData.deliveryDate}
                      onChange={(e) =>
                        setQuickEditData({
                          ...quickEditData,
                          deliveryDate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Entregado a
                    </label>
                    <input
                      type="text"
                      value={quickEditData.deliveredTo}
                      onChange={(e) =>
                        setQuickEditData({
                          ...quickEditData,
                          deliveredTo: e.target.value,
                        })
                      }
                      placeholder="Ej: Madre del alumno, Titular, etc."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setQuickViewCert(null);
                    setQuickEditData(null);
                  }}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!quickViewCert.id) return;
                    setQuickEditLoading(true);
                    try {
                      const response = await fetch(`/api/certificates/${quickViewCert.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          ...quickViewCert,
                          deliveryStatus: quickEditData.deliveryStatus,
                          deliveryDate: quickEditData.deliveryDate || null,
                          deliveredTo: quickEditData.deliveredTo || null,
                        }),
                      });

                      if (response.ok) {
                        await loadCertificates();
                        toast.success("Certificado actualizado correctamente");
                        setQuickViewCert(null);
                        setQuickEditData(null);
                      } else {
                        const data = await response.json();
                        toast.error(data.error || "Error al actualizar el certificado");
                      }
                    } catch (error) {
                      console.error("Error:", error);
                      toast.error("Error al actualizar el certificado");
                    } finally {
                      setQuickEditLoading(false);
                    }
                  }}
                  disabled={quickEditLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {quickEditLoading && <LoadingSpinner size={18} className="text-white" />}
                  {quickEditLoading ? "Guardando..." : "Guardar Cambios"}
                </button>
                <button
                  onClick={() => {
                    router.push(`/admin/certificados/${quickViewCert.id}`);
                  }}
                  className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Ver Detalle Completo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

