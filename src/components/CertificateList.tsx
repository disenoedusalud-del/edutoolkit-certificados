"use client";

import { useEffect, useState, useMemo, useImperativeHandle, forwardRef, useCallback } from "react";
import { Certificate } from "@/types/Certificate";
import { useRouter } from "next/navigation";
import { exportToCSV, downloadCSV } from "@/lib/exportUtils";
import {
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
  Download,
  Plus,
} from "phosphor-react";
import { toast } from "@/lib/toast";
import { LoadingSpinner, LoadingSkeleton } from "./LoadingSpinner";
import { useConfirm } from "@/contexts/ConfirmContext";
import CertificateForm from "./CertificateForm";

const ITEMS_PER_PAGE = 10;

export interface CertificateListHandle {
  exportSelected: () => void;
  exportAll: () => void;
  exportByCourse: () => void;
  getGroupedCerts: () => Record<string, Certificate[]>;
  selectedCount: number;
  hasSelected: boolean;
}

const statusColors: Record<string, string> = {
  en_archivo: "bg-gray-100 text-gray-700",
  listo_para_entrega: "bg-blue-100 text-blue-700",
  entregado: "bg-green-100 text-green-700",
  digital_enviado: "bg-purple-100 text-purple-700",
  anulado: "bg-red-100 text-red-700",
};

// Función helper para obtener el nombre del mes
const getMonthName = (monthNum: number | null | undefined): string => {
  if (!monthNum || monthNum < 1 || monthNum > 12) return "";
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
                 "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return months[monthNum - 1];
};

const statusLabels: Record<string, string> = {
  en_archivo: "En archivo",
  listo_para_entrega: "Listo para entrega",
  entregado: "Entregado",
  digital_enviado: "Digital enviado",
  anulado: "Anulado",
};

const CertificateList = forwardRef<CertificateListHandle>((props, ref) => {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null>(null);
  const [usingBackendPagination, setUsingBackendPagination] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [sortField, setSortField] = useState<keyof Certificate | null>(null);
  const { confirm } = useConfirm();
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [quickViewCert, setQuickViewCert] = useState<Certificate | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grouped" | "grid">("grouped");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedGroupForModal, setSelectedGroupForModal] = useState<{groupKey: string, certs: Certificate[]} | null>(null);
  const [groupSearchTerms, setGroupSearchTerms] = useState<Record<string, string>>({});
  const [quickEditData, setQuickEditData] = useState<{
    deliveryStatus: string;
    deliveryDate: string;
    deliveredTo: string;
    physicalLocation: string;
    folioCode: string;
  } | null>(null);
  const [quickEditLoading, setQuickEditLoading] = useState(false);
  const [showAddCertificateForm, setShowAddCertificateForm] = useState(false);
  const [initialCourseData, setInitialCourseData] = useState<{
    courseId: string;
    courseName: string;
    courseType: string;
    year: number;
    month?: number | null;
    edition?: number | null;
    origin?: string;
  } | null>(null);
  const router = useRouter();

  // Detectar si hay filtros activos
  const hasActiveFilters = useMemo(() => {
    return searchTerm !== "" || statusFilter !== "all" || yearFilter !== "all" || sortField !== null;
  }, [searchTerm, statusFilter, yearFilter, sortField]);

  const loadCertificates = async (page: number = 1) => {
    try {
      setLoading(true);
      
      // Para la vista agrupada o cuadrícula, siempre cargar TODOS los certificados
      // para poder agruparlos correctamente por edición
      if (viewMode === "grouped" || viewMode === "grid") {
        setUsingBackendPagination(false);
        console.log("[CertificateList] Cargando todos los certificados para vista agrupada/cuadrícula");
        const res = await fetch("/api/certificates?limit=10000"); // Cargar todos (límite alto)
        const data = await res.json();
        
        console.log("[CertificateList] Respuesta de API:", {
          isArray: Array.isArray(data),
          hasData: !!data.data,
          dataLength: Array.isArray(data) ? data.length : (data.data?.length || 0),
          hasError: !!data.error
        });
        
        if (Array.isArray(data)) {
          // Formato antiguo: array directo
          console.log(`[CertificateList] Certificados cargados (array directo): ${data.length}`);
          setCerts(data);
        } else if (data.error) {
          console.error("Error from API:", data.error);
          setCerts([]);
        } else if (data.data && Array.isArray(data.data)) {
          // Formato nuevo con paginación
          console.log(`[CertificateList] Certificados cargados (con paginación): ${data.data.length}`);
          setCerts(data.data);
        } else {
          console.warn("[CertificateList] Formato de respuesta desconocido:", data);
          setCerts([]);
        }
        setPagination(null);
      } else if (!hasActiveFilters) {
        // Vista lista sin filtros: usar paginación del backend
        setUsingBackendPagination(true);
        const res = await fetch(`/api/certificates?page=${page}&limit=${ITEMS_PER_PAGE}`);
        const data = await res.json();
        
        if (data.error) {
          console.error("Error from API:", data.error);
          setCerts([]);
          setPagination(null);
        } else if (data.pagination) {
          // Respuesta con paginación
          setCerts(data.data || []);
          setPagination(data.pagination);
        } else {
          // Fallback: respuesta sin paginación (formato antiguo)
          setCerts(Array.isArray(data) ? data : []);
          setPagination(null);
        }
      } else {
        // Hay filtros activos, cargar TODOS los certificados (sin paginación) para filtrar en memoria
        setUsingBackendPagination(false);
        const res = await fetch("/api/certificates?limit=10000"); // Cargar todos (límite alto)
        const data = await res.json();
        
        if (Array.isArray(data)) {
          // Formato antiguo: array directo
          setCerts(data);
        } else if (data.error) {
          console.error("Error from API:", data.error);
          setCerts([]);
        } else if (data.data && Array.isArray(data.data)) {
          // Formato nuevo con paginación, pero necesitamos todos
          setCerts(data.data);
        } else {
          setCerts([]);
        }
        setPagination(null);
      }
    } catch (error) {
      console.error("Error loading certificates:", error);
      setCerts([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Si hay filtros, desactivar paginación del backend y recargar todos
    if (hasActiveFilters) {
      setUsingBackendPagination(false);
      setCurrentPage(1);
    }
  }, [hasActiveFilters]);

  useEffect(() => {
    loadCertificates(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, hasActiveFilters, viewMode]);

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

  // Agrupar certificados por curso, edición y año
  const groupedCerts = useMemo(() => {
    const groups: Record<string, Certificate[]> = {};
    filteredCerts.forEach((cert) => {
      const courseCode = cert.courseId ? cert.courseId.split("-")[0] : "SIN-CODIGO";
      let groupKey: string;

      // Usar el prefijo del courseId (código + edición + año) como clave de carpeta,
      // para que TODOS los certificados con el mismo ID base caigan en la misma carpeta,
      // aunque cambie ligeramente el nombre del curso u otros campos.
      if (cert.courseId) {
        const parts = cert.courseId.split("-");
        // Formatos esperados:
        // - CODIGO-AÑO-NN        (3 partes)
        // - CODIGO-EDICION-AÑO-NN (4 partes)
        if (parts.length >= 3) {
          // Tomamos todo menos el último segmento (el correlativo NN)
          groupKey = parts.slice(0, parts.length - 1).join("-");
        } else {
          // Fallback por si llega un formato raro
          groupKey = `${courseCode}-${cert.year}`;
        }
      } else {
        // Si no hay courseId, agrupar solo por código y año
        groupKey = `${courseCode}-${cert.year}`;
      }
      
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

  // Abrir modal de grupo en vista grid
  const openGroupModal = (groupKey: string) => {
    const certs = groupedCerts[groupKey];
    if (certs) {
      setSelectedGroupForModal({ groupKey, certs });
    }
  };

  // Funciones de exportación
  const exportSelected = useCallback(() => {
    if (selectedIds.size === 0) {
      toast.error("No hay certificados seleccionados");
      return;
    }
    
    const selectedCerts = filteredCerts.filter((cert) => 
      cert.id && selectedIds.has(cert.id)
    );
    
    if (selectedCerts.length === 0) {
      toast.error("No se encontraron certificados seleccionados");
      return;
    }
    
    const csv = exportToCSV(selectedCerts);
    const filename = `certificados_seleccionados_${new Date().toISOString().split("T")[0]}.csv`;
    downloadCSV(csv, filename);
    toast.success(`${selectedCerts.length} certificado(s) exportado(s)`);
  }, [selectedIds, filteredCerts]);

  const exportAll = useCallback(() => {
    if (filteredCerts.length === 0) {
      toast.error("No hay certificados para exportar");
      return;
    }
    
    const csv = exportToCSV(filteredCerts);
    const filename = `certificados_${new Date().toISOString().split("T")[0]}.csv`;
    downloadCSV(csv, filename);
    toast.success(`${filteredCerts.length} certificado(s) exportado(s)`);
  }, [filteredCerts]);

  const exportByCourse = useCallback(() => {
    // Esta función solo necesita abrir el modal, que ya está manejado en el componente padre
    // No necesita implementación aquí, pero la agregamos para completar la interfaz
  }, []);

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
      return <ArrowsVertical size={14} className="text-text-tertiary" />;
    }
    return sortDirection === "asc" ? (
      <CaretUp size={14} className="text-accent" />
    ) : (
      <CaretDown size={14} className="text-accent" />
    );
  };

  // Paginación: usar backend si no hay filtros, sino usar memoria
  const totalPages = usingBackendPagination && pagination 
    ? pagination.totalPages 
    : Math.ceil(filteredCerts.length / ITEMS_PER_PAGE);
  
  const paginatedCerts = usingBackendPagination
    ? filteredCerts // Cuando usamos backend, filteredCerts ya está paginado
    : (() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredCerts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
      })();

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

  // Resetear página cuando cambian los filtros (solo si no usamos backend pagination)
  useEffect(() => {
    if (!usingBackendPagination) {
      setCurrentPage(1);
    }
  }, [searchTerm, statusFilter, yearFilter, sortField, sortDirection, usingBackendPagination]);

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

    const confirmed = await confirm({
      title: "Cambiar Estado",
      message: `¿Estás seguro de cambiar el estado de ${selectedIds.size} certificado(s) a "${statusLabels[bulkStatus]}"?`,
      variant: "warning",
      confirmText: "Cambiar",
      cancelText: "Cancelar",
    });

    if (!confirmed) {
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

    const confirmed = await confirm({
      title: "Eliminar Certificados",
      message: `¿Estás seguro de eliminar ${selectedIds.size} certificado(s)?\n\nEsta acción no se puede deshacer.`,
      variant: "danger",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
    });

    if (!confirmed) {
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

  // Exponer funciones y propiedades a través del ref
  useImperativeHandle(ref, () => ({
    exportSelected,
    exportAll,
    exportByCourse,
    getGroupedCerts: () => groupedCerts,
    selectedCount: selectedIds.size,
    hasSelected: selectedIds.size > 0,
  }), [exportSelected, exportAll, exportByCourse, groupedCerts, selectedIds.size]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <LoadingSpinner size={32} className="text-blue-600" />
        <p className="text-text-secondary text-sm">Cargando certificados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros y búsqueda */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 w-full md:w-auto">
          <div>
            <label className="block text-xs text-text-secondary mb-1">Buscar</label>
            <input
              type="text"
              placeholder="Nombre, curso o código (ej: LM, GASH)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-sm bg-theme-secondary text-text-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-sm bg-theme-secondary text-text-primary"
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
            <label className="block text-xs text-text-secondary mb-1">Año</label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-sm bg-theme-secondary text-text-primary"
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
          <div className="flex border border-theme rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                viewMode === "list"
                  ? "bg-blue-600 text-white"
                  : "bg-theme-secondary text-text-primary hover:bg-theme-tertiary"
              }`}
              title="Vista de lista"
            >
              <ArrowsVertical size={18} />
              Lista
            </button>
            <button
              onClick={() => setViewMode("grouped")}
              className={`px-3 py-2 text-sm transition-colors flex items-center gap-2 border-l border-theme ${
                viewMode === "grouped"
                  ? "bg-blue-600 text-white"
                  : "bg-theme-secondary text-text-primary hover:bg-theme-tertiary"
              }`}
              title="Vista agrupada"
            >
              <Folder size={18} />
              Agrupada
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-2 text-sm transition-colors flex items-center gap-2 border-l border-theme ${
                viewMode === "grid"
                  ? "bg-blue-600 text-white"
                  : "bg-theme-secondary text-text-primary hover:bg-theme-tertiary"
              }`}
              title="Vista de cuadrícula"
            >
              <FolderOpen size={18} />
              Cuadrícula
            </button>
          </div>
          {viewMode === "grouped" && (
            <>
              <button
                onClick={expandAllGroups}
                className="px-3 py-2 border border-theme rounded-lg hover:bg-theme-tertiary transition-colors text-sm bg-theme-secondary text-text-primary"
                title="Expandir todos los grupos"
              >
                Expandir
              </button>
              <button
                onClick={collapseAllGroups}
                className="px-3 py-2 border border-theme rounded-lg hover:bg-theme-tertiary transition-colors text-sm bg-theme-secondary text-text-primary"
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

      {/* Contador de resultados */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-text-secondary">
          Mostrando {paginatedCerts.length} de {filteredCerts.length} certificados
        </div>
      </div>

      {/* Tabla */}
      {filteredCerts.length === 0 ? (
        <p className="text-text-secondary text-sm text-center py-8">
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
              const month = groupCerts[0].month;
              const isExpanded = expandedGroups.has(groupKey);
              
              return (
                <div key={groupKey} className="bg-theme-secondary border border-theme rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    className="w-full px-4 py-3 bg-theme-secondary hover:bg-theme-tertiary transition-colors flex items-center justify-between text-left relative border border-theme"
                  >
                    {/* Barra izquierda de color - solo visible en neo-brutalism */}
                    <div className="absolute left-0 top-0 bottom-0 w-[10px] barra-indicador-grupo" />
                    <div className="flex items-center gap-3 pl-4">
                      {isExpanded ? (
                        <FolderOpen size={20} className="text-accent" weight="fill" />
                      ) : (
                        <Folder size={20} className="text-text-secondary" weight="fill" />
                      )}
                      <div>
                        <div className="font-semibold text-text-primary">
                          {courseCode} - {courseName}
                        </div>
                        <div className="text-xs text-text-secondary">
                          {month ? `${getMonthName(month)} ` : ""}Año {year} • {groupCerts.length} certificado{groupCerts.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-text-secondary bg-theme-secondary px-2 py-1 rounded border border-theme">
                        {groupCerts.length}
                      </span>
                      {isExpanded ? (
                        <CaretDown size={18} className="text-text-secondary" />
                      ) : (
                        <CaretRight size={18} className="text-text-secondary" />
                      )}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-theme">
                      {/* Búsqueda dentro de la carpeta y botón agregar */}
                      <div className="p-3 bg-theme-tertiary border-b border-theme flex items-center gap-2">
                        <div className="relative flex-1">
                          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary" />
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
                            className="w-full pl-10 pr-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-sm bg-theme-secondary text-text-primary"
                          />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const firstCert = groupCerts[0];
                            // Extraer edición del courseId si existe (formato: CODIGO-EDICION-AÑO-NUMERO)
                            let edition: number | null = null;
                            if (firstCert.courseId) {
                              const parts = firstCert.courseId.split("-");
                              console.log("[CertificateList] Extrayendo edición de courseId:", {
                                courseId: firstCert.courseId,
                                parts,
                                partsLength: parts.length
                              });
                              // Si tiene 4 partes: CODIGO-EDICION-AÑO-NUMERO
                              // Si tiene 3 partes: CODIGO-AÑO-NUMERO (sin edición)
                              if (parts.length === 4) {
                                const editionNum = parseInt(parts[1], 10);
                                if (!isNaN(editionNum)) {
                                  edition = editionNum;
                                  console.log("[CertificateList] Edición extraída:", edition);
                                }
                              } else {
                                console.log("[CertificateList] No se encontró edición (formato sin edición)");
                              }
                            }
                            setInitialCourseData({
                              courseId: courseCode,
                              courseName: firstCert.courseName || "",
                              courseType: firstCert.courseType || "Curso",
                              year: firstCert.year,
                              month: firstCert.month || null,
                              edition: edition,
                              origin: firstCert.origin || "nuevo",
                            });
                            setShowAddCertificateForm(true);
                          }}
                          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors text-sm font-medium flex items-center gap-2 whitespace-nowrap"
                        >
                          <Plus size={18} weight="bold" />
                          Agregar Certificado
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-theme-tertiary text-text-secondary uppercase text-xs">
                            <tr>
                              <th className="px-4 py-2 text-left w-12">
                                <CheckSquare size={16} className="text-text-tertiary" />
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
                                    <td colSpan={5} className="px-4 py-4 text-center text-text-secondary text-sm">
                                      No se encontraron certificados con la búsqueda "{groupSearchTerm}"
                                    </td>
                                  </tr>
                                );
                              }
                              
                              return filteredGroupCerts.map((c) => (
                              <tr
                                key={c.id}
                                className="hover:bg-theme-tertiary transition-colors cursor-pointer"
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
                                    physicalLocation: c.physicalLocation || "",
                                    folioCode: c.folioCode || "",
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
                                    <Square size={20} className="text-text-tertiary cursor-pointer" />
                                  )}
                                </td>
                                <td className="px-4 py-2 font-medium text-text-primary">
                                  {c.fullName}
                                </td>
                                <td className="px-4 py-2 text-text-primary font-mono text-xs">
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
                                      className="p-1 hover:bg-theme-tertiary rounded transition-colors"
                                    >
                                      <DotsThreeVertical size={18} className="text-text-secondary" />
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
                        <div className="px-4 py-2 bg-theme-tertiary border-t border-theme text-xs text-text-secondary">
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
            <div className="text-center py-8 text-text-secondary">
              No se encontraron certificados con los filtros aplicados.
            </div>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* Vista Cuadrícula */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(groupedCerts)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([groupKey, groupCerts]) => {
              const courseCode = groupCerts[0].courseId ? groupCerts[0].courseId.split("-")[0] : "SIN-CODIGO";
              const courseName = groupCerts[0].courseName;
              const year = groupCerts[0].year;
              const month = groupCerts[0].month;
              
              return (
                <button
                  key={groupKey}
                  onClick={() => openGroupModal(groupKey)}
                  className="bg-theme-secondary border-2 border-theme rounded-lg p-4 hover:border-accent hover:bg-theme-tertiary transition-all text-left group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <FolderOpen size={32} className="text-blue-600 group-hover:text-accent transition-colors" weight="fill" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-text-primary truncate">
                        {courseCode}
                      </div>
                      <div className="text-xs text-text-secondary truncate">
                        {courseName}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {month && (
                      <div className="text-xs text-text-secondary">
                        Mes: <span className="font-medium text-text-primary">{getMonthName(month)}</span>
                      </div>
                    )}
                    <div className="text-xs text-text-secondary">
                      Año: <span className="font-medium text-text-primary">{year}</span>
                    </div>
                    <div className="text-xs text-text-secondary">
                      Certificados: <span className="font-medium text-text-primary">{groupCerts.length}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          {Object.keys(groupedCerts).length === 0 && (
            <div className="col-span-full text-center py-8 text-text-secondary">
              No se encontraron certificados con los filtros aplicados.
            </div>
          )}
        </div>
      ) : (
        /* Vista Lista */
        <>
          <div className="overflow-x-auto overflow-y-visible">
            <table className="min-w-full text-sm">
              <thead className="bg-theme-tertiary text-text-secondary uppercase text-xs">
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
                        <Square size={20} className="text-text-tertiary" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left">
                    <button
                      onClick={() => handleSort("fullName")}
                      className="flex items-center gap-1 hover:text-text-primary"
                    >
                      Nombre
                      {getSortIcon("fullName")}
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left">
                    <button
                      onClick={() => handleSort("courseName")}
                      className="flex items-center gap-1 hover:text-text-primary"
                    >
                      Curso
                      {getSortIcon("courseName")}
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left">
                    <button
                      onClick={() => handleSort("year")}
                      className="flex items-center gap-1 hover:text-text-primary"
                    >
                      Año
                      {getSortIcon("year")}
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left">
                    <button
                      onClick={() => handleSort("deliveryStatus")}
                      className="flex items-center gap-1 hover:text-text-primary"
                    >
                      Estado
                      {getSortIcon("deliveryStatus")}
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left w-12">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-theme">
                {paginatedCerts.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-theme-tertiary transition-colors relative cursor-pointer"
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
                        physicalLocation: c.physicalLocation || "",
                        folioCode: c.folioCode || "",
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
                        <Square size={20} className="text-text-tertiary cursor-pointer" />
                      )}
                    </td>
                    <td
                      className="px-4 py-2 font-medium text-text-primary"
                    >
                      {c.fullName}
                    </td>
                    <td
                      className="px-4 py-2 text-text-primary"
                    >
                      {c.courseName}
                    </td>
                    <td
                      className="px-4 py-2 text-text-primary"
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
                          className="p-1 hover:bg-theme-tertiary rounded transition-colors"
                        >
                          <DotsThreeVertical size={18} className="text-text-secondary" />
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
                className="px-4 py-2 text-sm border border-theme rounded-lg hover:bg-theme-tertiary disabled:opacity-50 disabled:cursor-not-allowed bg-theme-secondary text-text-primary"
              >
                Anterior
              </button>
              <span className="text-sm text-text-secondary">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm border border-theme rounded-lg hover:bg-theme-tertiary disabled:opacity-50 disabled:cursor-not-allowed bg-theme-secondary text-text-primary"
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
            className="fixed bg-theme-secondary border border-theme rounded-lg shadow-xl z-[200] min-w-[180px]"
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
                        physicalLocation: cert.physicalLocation || "",
                        folioCode: cert.folioCode || "",
                      });
                      setOpenMenuId(null);
                      setMenuPosition(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-theme-tertiary flex items-center gap-2"
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
                    className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-theme-tertiary flex items-center gap-2"
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
                    className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-theme-tertiary flex items-center gap-2"
                  >
                    <Copy size={16} />
                    Duplicar
                  </button>
                  <div className="border-t border-theme"></div>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      setOpenMenuId(null);
                      setMenuPosition(null);
                      const confirmed = await confirm({
                        title: "Eliminar Certificado",
                        message: "¿Estás seguro de eliminar este certificado?\n\nEsta acción no se puede deshacer.",
                        variant: "danger",
                        confirmText: "Eliminar",
                        cancelText: "Cancelar",
                      });

                      if (confirmed) {
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-theme-secondary rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-theme-secondary border-b border-theme px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-text-primary">
                Edición Rápida - {quickViewCert.fullName}
              </h2>
              <button
                onClick={() => {
                  setQuickViewCert(null);
                  setQuickEditData(null);
                }}
                className="p-1 hover:bg-theme-tertiary rounded transition-colors"
              >
                <X size={24} className="text-text-secondary" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Información Relevante */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-text-secondary uppercase mb-1">
                    Nombre Completo
                  </label>
                  <p className="text-text-primary font-medium">{quickViewCert.fullName}</p>
                </div>
                <div>
                  <label className="block text-xs text-text-secondary uppercase mb-1">
                    Curso
                  </label>
                  <p className="text-text-primary">{quickViewCert.courseName}</p>
                </div>
                <div>
                  <label className="block text-xs text-text-secondary uppercase mb-1">
                    ID del Certificado
                  </label>
                  <p className="text-text-primary font-mono text-sm">{quickViewCert.courseId}</p>
                </div>
                <div>
                  <label className="block text-xs text-text-secondary uppercase mb-1">
                    Año
                  </label>
                  <p className="text-text-primary">{quickViewCert.year}</p>
                </div>
                {quickViewCert.email && (
                  <div>
                    <label className="block text-xs text-text-secondary uppercase mb-1">
                      Email
                    </label>
                    <p className="text-text-primary text-sm">{quickViewCert.email}</p>
                  </div>
                )}
                {quickViewCert.phone && (
                  <div>
                    <label className="block text-xs text-text-secondary uppercase mb-1">
                      Teléfono
                    </label>
                    <p className="text-text-primary text-sm">{quickViewCert.phone}</p>
                  </div>
                )}
                {quickViewCert.physicalLocation && (
                  <div>
                    <label className="block text-xs text-text-secondary uppercase mb-1">
                      Ubicación Física
                    </label>
                    <p className="text-text-primary text-sm">{quickViewCert.physicalLocation}</p>
                  </div>
                )}
                {quickViewCert.folioCode && (
                  <div>
                    <label className="block text-xs text-text-secondary uppercase mb-1">
                      Código de Folio
                    </label>
                    <p className="text-text-primary font-mono text-sm">{quickViewCert.folioCode}</p>
                  </div>
                )}
                {quickViewCert.driveFileId && (
                  <div className="md:col-span-2">
                    <label className="block text-xs text-text-secondary uppercase mb-2">
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
                        className="px-4 py-2 bg-theme-tertiary text-text-primary rounded-lg hover:bg-theme-secondary transition-colors flex items-center gap-2 text-sm border border-theme"
                      >
                        <Download size={18} weight="bold" />
                        Descargar
                      </a>
                    </div>
                    <p className="text-text-secondary text-xs mt-2 font-mono break-all">
                      ID: {quickViewCert.driveFileId}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-theme pt-4">
                <h3 className="text-sm font-semibold text-text-primary mb-4">
                  Estado y Entrega
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
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
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-theme-secondary text-text-primary"
                    >
                      <option value="en_archivo">En archivo</option>
                      <option value="listo_para_entrega">Listo para entrega</option>
                      <option value="entregado">Entregado</option>
                      <option value="digital_enviado">Digital enviado</option>
                      <option value="anulado">Anulado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
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
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-theme-secondary text-text-primary"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-text-secondary mb-2">
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
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-theme-secondary text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Ubicación Física
                    </label>
                    <input
                      type="text"
                      value={quickEditData.physicalLocation}
                      onChange={(e) =>
                        setQuickEditData({
                          ...quickEditData,
                          physicalLocation: e.target.value,
                        })
                      }
                      placeholder="Ej: Archivo A, Estante 3, etc."
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-theme-secondary text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Código de Folio
                    </label>
                    <input
                      type="text"
                      value={quickEditData.folioCode}
                      onChange={(e) =>
                        setQuickEditData({
                          ...quickEditData,
                          folioCode: e.target.value,
                        })
                      }
                      placeholder="Ej: FOL-2025-001"
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-theme-secondary text-text-primary font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex gap-3 justify-end pt-4 border-t border-theme">
                <button
                  onClick={() => {
                    setQuickViewCert(null);
                    setQuickEditData(null);
                  }}
                  className="px-4 py-2 text-text-primary bg-theme-tertiary rounded-lg hover:bg-theme-secondary transition-colors border border-theme"
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
                          physicalLocation: quickEditData.physicalLocation || null,
                          folioCode: quickEditData.folioCode || null,
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
                  className="px-4 py-2 text-accent bg-accent/20 rounded-lg hover:bg-accent/30 transition-colors border border-accent/30"
                >
                  Ver Detalle Completo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Certificados del Curso (Vista Grid) */}
      {selectedGroupForModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4" onClick={() => setSelectedGroupForModal(null)}>
          <div className="bg-theme-secondary border border-theme rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-6 border-b border-theme">
              <div className="flex items-center gap-3">
                <FolderOpen size={24} weight="bold" className="text-accent" />
                <div>
                  <h2 className="text-xl font-bold text-text-primary">
                    {selectedGroupForModal.certs[0].courseId?.split("-")[0]} - {selectedGroupForModal.certs[0].courseName}
                  </h2>
                  <p className="text-sm text-text-secondary">
                    {selectedGroupForModal.certs[0].month ? `${getMonthName(selectedGroupForModal.certs[0].month)} ` : ""}Año {selectedGroupForModal.certs[0].year} • {selectedGroupForModal.certs.length} certificado{selectedGroupForModal.certs.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const firstCert = selectedGroupForModal.certs[0];
                    const courseCode = firstCert.courseId?.split("-")[0] || "";
                    // Extraer edición del courseId si existe (formato: CODIGO-EDICION-AÑO-NUMERO)
                    let edition: number | null = null;
                    if (firstCert.courseId) {
                      const parts = firstCert.courseId.split("-");
                      console.log("[CertificateList] Extrayendo edición de courseId (modal):", {
                        courseId: firstCert.courseId,
                        parts,
                        partsLength: parts.length
                      });
                      // Si tiene 4 partes: CODIGO-EDICION-AÑO-NUMERO
                      // Si tiene 3 partes: CODIGO-AÑO-NUMERO (sin edición)
                      if (parts.length === 4) {
                        const editionNum = parseInt(parts[1], 10);
                        if (!isNaN(editionNum)) {
                          edition = editionNum;
                          console.log("[CertificateList] Edición extraída (modal):", edition);
                        }
                      } else {
                        console.log("[CertificateList] No se encontró edición (formato sin edición)");
                      }
                    }
                    setInitialCourseData({
                      courseId: courseCode,
                      courseName: firstCert.courseName || "",
                      courseType: firstCert.courseType || "Curso",
                      year: firstCert.year,
                      month: firstCert.month || null,
                      edition: edition,
                      origin: firstCert.origin || "nuevo",
                    });
                    setShowAddCertificateForm(true);
                  }}
                  className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Plus size={18} weight="bold" />
                  Agregar Certificado
                </button>
                <button
                  onClick={() => setSelectedGroupForModal(null)}
                  className="p-2 hover:bg-theme-tertiary rounded-lg transition-colors"
                >
                  <X size={20} weight="bold" className="text-text-secondary" />
                </button>
              </div>
            </div>

            {/* Contenido del Modal - Tabla de certificados */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-theme-tertiary text-text-secondary uppercase text-xs sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left w-12">
                        <CheckSquare size={16} className="text-text-tertiary" />
                      </th>
                      <th className="px-4 py-2 text-left">Nombre</th>
                      <th className="px-4 py-2 text-left">ID Certificado</th>
                      <th className="px-4 py-2 text-left">Email</th>
                      <th className="px-4 py-2 text-left">Teléfono</th>
                      <th className="px-4 py-2 text-left">Estado</th>
                      <th className="px-4 py-2 text-left w-12">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme">
                    {selectedGroupForModal.certs.map((cert) => (
                      <tr key={cert.id} className="hover:bg-theme-tertiary transition-colors">
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelect(cert.id || "", e);
                            }}
                            className="flex items-center justify-center"
                          >
                            {cert.id && selectedIds.has(cert.id) ? (
                              <CheckSquare size={20} weight="fill" className="text-blue-600" />
                            ) : (
                              <Square size={20} className="text-text-tertiary" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-text-primary font-medium">
                          {cert.fullName}
                        </td>
                        <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                          {cert.courseId}
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          {cert.email || "-"}
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          {cert.phone || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[cert.deliveryStatus || "en_archivo"]}`}>
                            {statusLabels[cert.deliveryStatus || "en_archivo"]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === cert.id ? null : cert.id || "");
                                setMenuPosition({ top: e.clientY, left: e.clientX });
                              }}
                              className="p-1 hover:bg-theme-secondary rounded transition-colors"
                            >
                              <DotsThreeVertical size={18} className="text-text-secondary" />
                            </button>
                            {openMenuId === cert.id && menuPosition && (
                              <div
                                className="fixed z-[60] bg-theme-secondary border border-theme rounded-lg shadow-lg py-1 min-w-[150px]"
                                style={{
                                  top: `${menuPosition.top}px`,
                                  left: `${menuPosition.left}px`,
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setQuickViewCert(cert);
                                    setQuickEditData({
                                      deliveryStatus: cert.deliveryStatus || "en_archivo",
                                      deliveryDate: cert.deliveryDate ? new Date(cert.deliveryDate).toISOString().split("T")[0] : "",
                                      deliveredTo: cert.deliveredTo || "",
                                      physicalLocation: cert.physicalLocation || "",
                                      folioCode: cert.folioCode || "",
                                    });
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-theme-tertiary flex items-center gap-2"
                                >
                                  <Eye size={16} />
                                  Ver Detalle
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/admin/certificados/${cert.id}`);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-theme-tertiary flex items-center gap-2"
                                >
                                  <Pencil size={16} />
                                  Editar
                                </button>
                                {cert.driveFileId && (
                                  <a
                                    href={cert.driveWebViewLink || `https://drive.google.com/file/d/${cert.driveFileId}/view`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-theme-tertiary flex items-center gap-2"
                                  >
                                    <File size={16} />
                                    Ver PDF
                                  </a>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (cert.courseId) {
                                      navigator.clipboard.writeText(cert.courseId);
                                      toast.success("ID copiado al portapapeles");
                                    }
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-theme-tertiary flex items-center gap-2"
                                >
                                  <Copy size={16} />
                                  Copiar ID
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Agregar Certificado */}
      {showAddCertificateForm && initialCourseData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-theme-secondary rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-theme">
            <div className="sticky top-0 bg-theme-secondary border-b border-theme px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-text-primary">
                Agregar Nuevo Certificado
              </h2>
              <button
                onClick={() => {
                  setShowAddCertificateForm(false);
                  setInitialCourseData(null);
                }}
                className="p-1 hover:bg-theme-tertiary rounded transition-colors"
              >
                <X size={24} className="text-text-secondary" />
              </button>
            </div>
            <div className="p-6">
              <CertificateForm
                initialCourseData={initialCourseData}
                onCancel={() => {
                  setShowAddCertificateForm(false);
                  setInitialCourseData(null);
                }}
                onSuccess={async () => {
                  await loadCertificates();
                  setShowAddCertificateForm(false);
                  setInitialCourseData(null);
                  toast.success("Certificado creado correctamente");
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

CertificateList.displayName = "CertificateList";

export default CertificateList;

