"use client";

import { useEffect, useState, useMemo, useImperativeHandle, forwardRef, useCallback } from "react";
import { Certificate } from "@/types/Certificate";
import { Course } from "@/types/Course";
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
  Funnel,
  ArrowLeft,
  ArrowRight,
} from "phosphor-react";
import { toast } from "@/lib/toast";
import { LoadingSpinner, LoadingSkeleton } from "./LoadingSpinner";
import { useConfirm } from "@/contexts/ConfirmContext";

const ITEMS_PER_PAGE = 15;
const GROUPS_PER_PAGE = 10;
const CERTS_PER_GROUP_PAGE = 15;

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

interface CertificateListProps {
  onAddCertificate?: (courseId?: string, courseName?: string) => void;
  userRole?: string | null;
}

const CertificateList = forwardRef<CertificateListHandle, CertificateListProps>((props, ref) => {
  const { onAddCertificate, userRole } = props;
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
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
  const [selectedGroupForModal, setSelectedGroupForModal] = useState<{ groupKey: string, certs: Certificate[] } | null>(null);
  const [groupSearchTerms, setGroupSearchTerms] = useState<Record<string, string>>({});
  const [quickEditData, setQuickEditData] = useState<{
    deliveryStatus: string;
    deliveryDate: string;
    deliveredTo: string;
  } | null>(null);
  const [quickEditLoading, setQuickEditLoading] = useState(false);
  const [groupsPage, setGroupsPage] = useState(1);
  const [groupInnerPages, setGroupInnerPages] = useState<Record<string, number>>({});
  const router = useRouter();

  // Detectar si hay filtros activos
  const hasActiveFilters = useMemo(() => {
    return (
      searchTerm !== "" ||
      statusFilter !== "all" ||
      yearFilter !== "all" ||
      monthFilter !== "all" ||
      typeFilter !== "all" ||
      sortField !== null
    );
  }, [searchTerm, statusFilter, yearFilter, monthFilter, typeFilter, sortField]);

  const loadCertificates = async (page: number = 1) => {
    try {
      setLoading(true);

      // Cargar cursos siempre
      const coursesRes = await fetch("/api/courses");
      const coursesData = await coursesRes.json();
      if (Array.isArray(coursesData)) {
        setCourses(coursesData);
      } else if (coursesData.data && Array.isArray(coursesData.data)) {
        setCourses(coursesData.data);
      }

      // Si no hay filtros activos Y estamos en vista de lista, usar paginación del backend
      if (!hasActiveFilters && viewMode === "list") {
        // Usar paginación del backend
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
        const res = await fetch("/api/certificates"); // Sin parámetros = todos los certificados
        const data = await res.json();

        if (Array.isArray(data)) {
          // Formato antiguo: array directo
          setCerts(data);
        } else if (data.error) {
          console.error("Error from API:", data.error);
          setCerts([]);
        } else if (data.data && Array.isArray(data.data)) {
          // Formato nuevo con paginación, pero necesitamos todos
          // Si hay paginación, necesitamos hacer múltiples requests o cargar todos de otra forma
          // Por ahora, cargamos solo la primera página y mostramos advertencia
          console.warn("Filtros activos pero API devolvió paginación. Cargando solo primera página.");
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

  // Reiniciar paginación de grupos cuando cambian los filtros
  useEffect(() => {
    setGroupsPage(1);
    setGroupInnerPages({});
  }, [searchTerm, statusFilter, yearFilter, monthFilter, typeFilter]);

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
        cert.identification?.toLowerCase().includes(searchLower) ||
        cert.email?.toLowerCase().includes(searchLower) ||
        cert.phone?.toLowerCase().includes(searchLower) ||
        courseCode.includes(searchLower);

      // Filtro por estado
      const matchesStatus =
        statusFilter === "all" || cert.deliveryStatus === statusFilter;

      // Filtro por año
      const matchesYear =
        yearFilter === "all" || cert.year.toString() === yearFilter;

      // Filtro por mes
      const matchesMonth =
        monthFilter === "all" || cert.month?.toString() === monthFilter;

      // Filtro por tipo
      const matchesType =
        typeFilter === "all" || cert.courseType === typeFilter;

      return matchesSearch && matchesStatus && matchesYear && matchesMonth && matchesType;
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
  }, [certs, searchTerm, statusFilter, yearFilter, monthFilter, typeFilter, sortField, sortDirection]);

  // Agrupar certificados por curso y año (incluyendo cursos vacíos)
  const groupedCerts = useMemo(() => {
    const groups: Record<string, Certificate[]> = {};

    // 1. Inicializar con los cursos conocidos (para mostrar carpetas vacías)
    courses.forEach(course => {
      // Aplicar los mismos filtros que a los certificados
      const matchesYear = yearFilter === "all" || course.year.toString() === yearFilter;
      const matchesMonth = monthFilter === "all" || course.month?.toString() === monthFilter;
      const matchesType = typeFilter === "all" || course.courseType === typeFilter;

      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === "" ||
        course.name.toLowerCase().includes(searchLower) ||
        course.id.toLowerCase().includes(searchLower);

      if (matchesYear && matchesMonth && matchesType && matchesSearch) {
        groups[course.id] = [];
      }
    });

    // 2. Agrupar los certificados filtrados
    filteredCerts.forEach((cert) => {
      let derivedCourseId = "SIN-CODIGO";
      if (cert.courseId) {
        if (cert.courseId.includes("-")) {
          const parts = cert.courseId.split("-");
          if (parts.length > 1) {
            derivedCourseId = parts.slice(0, parts.length - 1).join("-");
          } else {
            derivedCourseId = cert.courseId;
          }
        } else {
          derivedCourseId = cert.courseId;
        }
      }

      const groupKey = derivedCourseId;

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(cert);
    });

    return groups;
  }, [filteredCerts, courses, yearFilter, monthFilter, typeFilter, searchTerm]);

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
            <div className="relative">
              <input
                type="text"
                placeholder="Nombre, DNI, Email, Curso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-sm bg-theme-secondary text-text-primary pr-9"
              />
              <MagnifyingGlass size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-sm bg-theme-secondary text-text-primary"
            >
              <option value="all">Todos los estados</option>
              <option value="en_archivo">En archivo</option>
              <option value="listo_para_entrega">Listo para entrega</option>
              <option value="entregado">Entregado</option>
              <option value="digital_enviado">Digital enviado</option>
              <option value="anulado">Anulado</option>
            </select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-text-secondary mb-1">Año</label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-sm bg-theme-secondary text-text-primary"
              >
                <option value="all">Años</option>
                {uniqueYears.map((year) => (
                  <option key={year} value={year.toString()}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`p-2 border rounded-lg transition-colors flex items-center gap-2 text-sm ${showAdvancedFilters ? 'bg-accent/10 border-accent text-accent' : 'border-theme text-text-secondary hover:bg-theme-tertiary'}`}
                title="Más filtros"
              >
                <Funnel size={18} />
                <span className="hidden md:inline">Filtros</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto mt-2 md:mt-0">
          <div className="flex border border-theme rounded-lg overflow-hidden shrink-0">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-2 text-sm transition-colors flex items-center gap-2 ${viewMode === "list"
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
              className={`px-3 py-2 text-sm transition-colors flex items-center gap-2 border-l border-theme ${viewMode === "grouped"
                ? "bg-blue-600 text-white"
                : "bg-theme-secondary text-text-primary hover:bg-theme-tertiary"
                }`}
              title="Vista agrupada"
            >
              <Folder size={18} />
              Grupos
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-2 text-sm transition-colors flex items-center gap-2 border-l border-theme ${viewMode === "grid"
                ? "bg-blue-600 text-white"
                : "bg-theme-secondary text-text-primary hover:bg-theme-tertiary"
                }`}
              title="Vista de cuadrícula"
            >
              <CheckSquare size={18} />
              Cuadros
            </button>
          </div>

          {viewMode === "grouped" && (
            <div className="flex gap-1 shrink-0">
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
            </div>
          )}
        </div>
      </div>

      {/* Filtros Avanzados (En su propia fila para no romper el layout) */}
      {showAdvancedFilters && (
        <div className="w-full relative p-4 bg-theme-tertiary border border-theme rounded-xl animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
          <button
            onClick={() => setShowAdvancedFilters(false)}
            className="absolute top-2 right-2 p-1 hover:bg-theme-secondary rounded-full text-text-tertiary hover:text-text-primary transition-colors"
            title="Cerrar filtros"
          >
            <X size={18} />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Mes</label>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-sm bg-theme-secondary text-text-primary"
              >
                <option value="all">Cualquier mes</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={(i + 1).toString()}>
                    {getMonthName(i + 1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Tipo de Curso</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-sm bg-theme-secondary text-text-primary"
              >
                <option value="all">Todos los tipos</option>
                <option value="Curso">Curso</option>
                <option value="Taller">Taller</option>
                <option value="Diplomado">Diplomado</option>
                <option value="Seminario">Seminario</option>
                <option value="Congreso">Congreso</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div className="md:col-span-2 flex items-end justify-end gap-3">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setYearFilter("all");
                  setMonthFilter("all");
                  setTypeFilter("all");
                }}
                className="text-xs text-accent hover:underline px-2 py-1"
              >
                Limpiar todos los filtros
              </button>
              <button
                onClick={() => setShowAdvancedFilters(false)}
                className="px-3 py-1 bg-theme-secondary border border-theme rounded-md text-xs font-medium text-text-primary hover:bg-theme transition-colors shadow-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Acciones masivas */}
      {showBulkActions && userRole !== "VIEWER" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-blue-900">
              {selectedIds.size} certificado(s) seleccionado(s)
            </span>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="px-3 py-1 border border-blue-300 rounded text-sm focus:ring-2 focus:ring-blue-500 bg-white"
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
              className="px-4 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
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
              className="px-4 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
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
            className="text-sm text-blue-700 hover:text-blue-900 font-medium px-2 py-1"
          >
            Cancelar selección
          </button>
        </div>
      )}

      {/* Resultados e indicador de filtros */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-text-secondary">
          Mostrando {usingBackendPagination ? certs.length : filteredCerts.length} de {pagination?.total || filteredCerts.length} certificados
          {hasActiveFilters && (
            <span className="ml-2 px-2 py-0.5 bg-accent/10 text-accent rounded-full text-xs">
              Filtros activos
            </span>
          )}
        </div>
      </div>

      {/* Tabla */}
      {
        filteredCerts.length === 0 ? (
          <p className="text-text-secondary text-sm text-center py-8">
            No se encontraron certificados con los filtros aplicados.
          </p>
        ) : viewMode === "grouped" ? (
          /* Vista Agrupada */
          <div className="space-y-2">
            {(() => {
              const groupEntries = Object.entries(groupedCerts).sort(([a], [b]) => a.localeCompare(b));
              const totalGroups = groupEntries.length;
              const totalPagesGroups = Math.ceil(totalGroups / GROUPS_PER_PAGE);
              const pagedGroups = groupEntries.slice(
                (groupsPage - 1) * GROUPS_PER_PAGE,
                groupsPage * GROUPS_PER_PAGE
              );

              return (
                <>
                  {pagedGroups.map(([groupKey, groupCerts]) => {
                    const isEmpty = groupCerts.length === 0;
                    const course = courses.find(c => c.id === groupKey);

                    const courseCode = groupKey;
                    const courseName = course ? course.name : (groupCerts[0]?.courseName || "Curso Desconocido");
                    const year = course ? course.year : (groupCerts[0]?.year || new Date().getFullYear());
                    const month = course ? course.month : groupCerts[0]?.month;
                    const isExpanded = expandedGroups.has(groupKey);

                    return (
                      <div key={groupKey} className={`bg-theme-secondary border border-theme rounded-lg overflow-hidden ${isEmpty ? 'opacity-75' : ''}`}>
                        <div
                          onClick={() => toggleGroup(groupKey)}
                          className="w-full px-4 py-3 bg-theme-secondary hover:bg-theme-tertiary transition-colors flex items-center justify-between text-left relative border border-theme cursor-pointer"
                        >
                          <div className={`absolute left-0 top-0 bottom-0 w-[10px] ${isEmpty ? 'bg-gray-300' : 'barra-indicador-grupo'}`} />
                          <div className="flex items-center gap-3 pl-4">
                            {isExpanded ? (
                              <FolderOpen size={20} className={isEmpty ? "text-gray-400" : "text-accent"} weight="fill" />
                            ) : (
                              <Folder size={20} className={isEmpty ? "text-gray-400" : "text-text-secondary"} weight="fill" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold ${isEmpty ? 'text-text-secondary' : 'text-text-primary'}`}>
                                  {courseCode} - {courseName}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(courseCode);
                                    toast.success(`ID de curso copiado: ${courseCode}`);
                                  }}
                                  className="p-1 hover:bg-theme-secondary rounded text-text-tertiary hover:text-blue-600 transition-all border border-transparent hover:border-theme bg-theme-tertiary"
                                  title="Copiar ID del Curso"
                                >
                                  <Copy size={16} />
                                </button>
                              </div>
                              <div className="text-xs text-text-secondary">
                                {month ? `${getMonthName(month)} ` : ""}Año {year} • {groupCerts.length} certificado{groupCerts.length !== 1 ? "s" : ""}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onAddCertificate && userRole !== "VIEWER") {
                                  onAddCertificate(groupKey, courseName);
                                }
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors border border-transparent hover:border-blue-200"
                              title="Agregar certificado a este curso"
                            >
                              <Plus size={18} weight="bold" />
                            </button>
                            <span className={`text-xs font-medium bg-theme-secondary px-2 py-1 rounded border border-theme ${isEmpty ? 'text-gray-400' : 'text-text-secondary'}`}>
                              {groupCerts.length}
                            </span>
                            {isExpanded ? (
                              <CaretDown size={18} className="text-text-secondary" />
                            ) : (
                              <CaretRight size={18} className="text-text-secondary" />
                            )}
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="border-t border-theme">
                            {/* Búsqueda interna */}
                            <div className="p-3 bg-theme-tertiary border-b border-theme">
                              <div className="relative">
                                <MagnifyingGlass size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary" />
                                <input
                                  type="text"
                                  placeholder={`Buscar en ${courseCode}...`}
                                  value={groupSearchTerms[groupKey] || ""}
                                  onChange={(e) => {
                                    setGroupSearchTerms((prev) => ({ ...prev, [groupKey]: e.target.value }));
                                    setGroupInnerPages((prev) => ({ ...prev, [groupKey]: 1 })); // Reset inner page on search
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full pl-10 pr-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-accent focus:border-accent text-sm bg-theme-secondary text-text-primary"
                                />
                              </div>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm">
                                <thead className="bg-theme-tertiary text-text-secondary uppercase text-xs">
                                  <tr>
                                    <th className="px-4 py-2 text-left w-12">
                                      <CheckSquare size={16} className="text-text-tertiary" />
                                    </th>
                                    <th className="px-4 py-2 text-left">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleSort("fullName"); }}
                                        className="flex items-center gap-1 hover:text-text-primary"
                                      >
                                        Nombre / DNI
                                        {getSortIcon("fullName")}
                                      </button>
                                    </th>
                                    <th className="px-4 py-2 text-left">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleSort("courseId"); }}
                                        className="flex items-center gap-1 hover:text-text-primary"
                                      >
                                        ID Certificado
                                        {getSortIcon("courseId")}
                                      </button>
                                    </th>
                                    <th className="px-4 py-2 text-left">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleSort("deliveryStatus"); }}
                                        className="flex items-center gap-1 hover:text-text-primary"
                                      >
                                        Estado
                                        {getSortIcon("deliveryStatus")}
                                      </button>
                                    </th>
                                    <th className="px-4 py-2 text-left w-12">Acciones</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {(() => {
                                    const searchTerm = (groupSearchTerms[groupKey] || "").toLowerCase();
                                    const filtered = searchTerm
                                      ? groupCerts.filter(c =>
                                        c.fullName.toLowerCase().includes(searchTerm) ||
                                        c.courseId?.toLowerCase().includes(searchTerm) ||
                                        c.identification?.toLowerCase().includes(searchTerm)
                                      )
                                      : groupCerts;

                                    const innerPage = groupInnerPages[groupKey] || 1;
                                    const totalInnerPages = Math.ceil(filtered.length / CERTS_PER_GROUP_PAGE);
                                    const pagedCerts = filtered.slice(
                                      (innerPage - 1) * CERTS_PER_GROUP_PAGE,
                                      innerPage * CERTS_PER_GROUP_PAGE
                                    );

                                    if (filtered.length === 0) {
                                      return (
                                        <tr>
                                          <td colSpan={5} className="px-4 py-8 text-center text-text-secondary">
                                            No se encontraron certificados.
                                          </td>
                                        </tr>
                                      );
                                    }

                                    return (
                                      <>
                                        {pagedCerts.map((c) => (
                                          <tr
                                            key={c.id}
                                            className="hover:bg-theme-tertiary transition-colors cursor-pointer"
                                            onClick={() => {
                                              setQuickViewCert(c);
                                              setQuickEditData({
                                                deliveryStatus: c.deliveryStatus || "en_archivo",
                                                deliveryDate: c.deliveryDate ? new Date(c.deliveryDate).toISOString().split("T")[0] : "",
                                                deliveredTo: c.deliveredTo || "",
                                              });
                                            }}
                                          >
                                            <td className="px-4 py-2" onClick={(e) => { e.stopPropagation(); c.id && toggleSelect(c.id, e); }}>
                                              {selectedIds.has(c.id!) ? (
                                                <CheckSquare size={20} className="text-blue-600" weight="fill" />
                                              ) : (
                                                <Square size={20} className="text-text-tertiary" />
                                              )}
                                            </td>
                                            <td className="px-4 py-2 font-medium text-text-primary">
                                              <div>{c.fullName}</div>
                                              {c.identification && <div className="text-[10px] text-text-tertiary font-normal uppercase">DNI: {c.identification}</div>}
                                            </td>
                                            <td className="px-4 py-2 text-text-primary font-mono text-xs">{c.courseId}</td>
                                            <td className="px-4 py-2">
                                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[c.deliveryStatus || "en_archivo"]}`}>
                                                {statusLabels[c.deliveryStatus || "en_archivo"]}
                                              </span>
                                            </td>
                                            <td className="px-4 py-2">
                                              <button onClick={(e) => {
                                                e.stopPropagation();
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setMenuPosition({ top: rect.bottom + 4, left: rect.right - 180 });
                                                setOpenMenuId(c.id || null);
                                              }}>
                                                <DotsThreeVertical size={18} />
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                        {totalInnerPages > 1 && (
                                          <tr>
                                            <td colSpan={5} className="px-4 py-3 bg-theme-tertiary">
                                              <div className="flex items-center justify-between">
                                                <span className="text-xs text-text-secondary">
                                                  Certificados {Math.min(filtered.length, (innerPage - 1) * CERTS_PER_GROUP_PAGE + 1)} - {Math.min(filtered.length, innerPage * CERTS_PER_GROUP_PAGE)} de {filtered.length}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setGroupInnerPages(prev => ({ ...prev, [groupKey]: Math.max(1, innerPage - 1) }));
                                                    }}
                                                    disabled={innerPage === 1}
                                                    className="p-1 hover:bg-theme-secondary rounded disabled:opacity-30"
                                                  >
                                                    <ArrowLeft size={16} />
                                                  </button>
                                                  <span className="text-xs font-medium">{innerPage} / {totalInnerPages}</span>
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setGroupInnerPages(prev => ({ ...prev, [groupKey]: Math.min(totalInnerPages, innerPage + 1) }));
                                                    }}
                                                    disabled={innerPage === totalInnerPages}
                                                    className="p-1 hover:bg-theme-secondary rounded disabled:opacity-30"
                                                  >
                                                    <ArrowRight size={16} />
                                                  </button>
                                                </div>
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </>
                                    );
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Paginación de Carpetas */}
                  {totalPagesGroups > 1 && (
                    <div className="flex items-center justify-between pt-6 border-t border-theme mt-4">
                      <button
                        onClick={() => {
                          setGroupsPage(p => Math.max(1, p - 1));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        disabled={groupsPage === 1}
                        className="px-4 py-2 text-sm border border-theme rounded-lg hover:bg-theme-tertiary disabled:opacity-50 flex items-center gap-2 bg-theme-secondary"
                      >
                        <ArrowLeft size={16} />
                        Carpetas Anteriores
                      </button>
                      <span className="text-sm font-medium">Página de Carpetas {groupsPage} de {totalPagesGroups}</span>
                      <button
                        onClick={() => {
                          setGroupsPage(p => Math.min(totalPagesGroups, p + 1));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        disabled={groupsPage === totalPagesGroups}
                        className="px-4 py-2 text-sm border border-theme rounded-lg hover:bg-theme-tertiary disabled:opacity-50 flex items-center gap-2 bg-theme-secondary"
                      >
                        Siguientes Carpetas
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
            {Object.keys(groupedCerts).length === 0 && (
              <div className="text-center py-8 text-text-secondary">
                No se encontraron certificados con los filtros aplicados.
              </div>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* Vista Cuadrícula con Paginación */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(() => {
                const groupEntries = Object.entries(groupedCerts).sort(([a], [b]) => a.localeCompare(b));
                const totalPagesGroups = Math.ceil(groupEntries.length / GROUPS_PER_PAGE);
                const pagedGroups = groupEntries.slice(
                  (groupsPage - 1) * GROUPS_PER_PAGE,
                  groupsPage * GROUPS_PER_PAGE
                );

                return pagedGroups.map(([groupKey, groupCerts]) => {
                  const isEmpty = groupCerts.length === 0;
                  const course = courses.find(c => c.id === groupKey);

                  const courseCode = groupKey;
                  const courseName = course ? course.name : (groupCerts[0]?.courseName || "Curso Desconocido");
                  const year = course ? course.year : (groupCerts[0]?.year || new Date().getFullYear());
                  const month = course ? course.month : groupCerts[0]?.month;

                  return (
                    <div
                      key={groupKey}
                      className={`bg-theme-secondary border-2 border-theme rounded-lg p-4 hover:border-accent hover:bg-theme-tertiary transition-all text-left group relative ${isEmpty ? 'opacity-80' : ''}`}
                    >
                      <div
                        className="cursor-pointer"
                        onClick={() => openGroupModal(groupKey)}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <FolderOpen size={32} className={`transition-colors ${isEmpty ? 'text-gray-400' : 'text-blue-600 group-hover:text-accent'}`} weight="fill" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <div className={`font-semibold truncate ${isEmpty ? 'text-text-secondary' : 'text-text-primary'}`} title={groupKey}>
                                {courseCode}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(groupKey);
                                  toast.success(`ID de curso copiado: ${groupKey}`);
                                }}
                                className="p-1 hover:bg-theme-secondary rounded text-text-tertiary hover:text-blue-600 transition-all bg-theme-tertiary border border-theme"
                                title="Copiar ID del Curso"
                              >
                                <Copy size={14} />
                              </button>
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
                      </div>

                      {/* Botón flotante para agregar certificado */}
                      {userRole !== "VIEWER" && onAddCertificate && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddCertificate(groupKey, courseName);
                          }}
                          className="absolute bottom-4 right-4 p-2 bg-blue-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-blue-700"
                          title="Agregar certificado"
                        >
                          <Plus size={18} weight="bold" />
                        </button>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Paginación de Cuadrícula */}
            {(() => {
              const totalGroups = Object.keys(groupedCerts).length;
              const totalPagesGroups = Math.ceil(totalGroups / GROUPS_PER_PAGE);
              if (totalPagesGroups <= 1) return null;

              return (
                <div className="flex items-center justify-between pt-6 border-t border-theme mt-6">
                  <button
                    onClick={() => {
                      setGroupsPage(p => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={groupsPage === 1}
                    className="px-4 py-2 text-sm border border-theme rounded-lg hover:bg-theme-tertiary disabled:opacity-50 flex items-center gap-2 bg-theme-secondary"
                  >
                    <ArrowLeft size={16} />
                    Anterior
                  </button>
                  <span className="text-sm font-medium">Página {groupsPage} de {totalPagesGroups}</span>
                  <button
                    onClick={() => {
                      setGroupsPage(p => Math.min(totalPagesGroups, p + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={groupsPage === totalPagesGroups}
                    className="px-4 py-2 text-sm border border-theme rounded-lg hover:bg-theme-tertiary disabled:opacity-50 flex items-center gap-2 bg-theme-secondary"
                  >
                    Siguiente
                    <ArrowRight size={16} />
                  </button>
                </div>
              );
            })()}
            {Object.keys(groupedCerts).length === 0 && (
              <div className="col-span-full text-center py-8 text-text-secondary">
                No se encontraron certificados con los filtros aplicados.
              </div>
            )}
          </>
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
                        Nombre / DNI
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
                        <div>{c.fullName}</div>
                        {c.identification && (
                          <div className="text-[10px] text-text-tertiary font-normal uppercase">DNI: {c.identification}</div>
                        )}
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
                          className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[c.deliveryStatus || "en_archivo"] ||
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
          </>
        )
      }

      {/* Paginación - Visible en vista lista si hay más de una página */}
      {viewMode === "list" && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-theme mt-6">
          <button
            onClick={() => {
              setCurrentPage((p) => Math.max(1, p - 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm border border-theme rounded-lg hover:bg-theme-tertiary disabled:opacity-50 disabled:cursor-not-allowed bg-theme-secondary text-text-primary shadow-sm transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Anterior
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary bg-theme-tertiary px-3 py-1 rounded-full border border-theme">
              Página {currentPage} de {totalPages}
            </span>
            <span className="text-xs text-text-secondary hidden sm:inline">
              ({pagination?.total || 0} registros en total)
            </span>
          </div>
          <button
            onClick={() => {
              setCurrentPage((p) => Math.min(totalPages, p + 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm border border-theme rounded-lg hover:bg-theme-tertiary disabled:opacity-50 disabled:cursor-not-allowed bg-theme-secondary text-text-primary shadow-sm transition-colors flex items-center gap-2"
          >
            Siguiente
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Menú desplegable fuera del contenedor con scroll - Funciona para ambas vistas */}
      {
        openMenuId && menuPosition && (
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
                    {userRole !== "VIEWER" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickViewCert(cert);
                          setQuickEditData({
                            deliveryStatus: cert.deliveryStatus || "en_archivo",
                            deliveryDate: cert.deliveryDate
                              ? new Date(cert.deliveryDate)
                                .toISOString()
                                .split("T")[0]
                              : "",
                            deliveredTo: cert.deliveredTo || "",
                          });
                          setOpenMenuId(null);
                          setMenuPosition(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-theme-tertiary flex items-center gap-2"
                      >
                        <Pencil size={16} />
                        Edición Rápida
                      </button>
                    )}
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
                    {(userRole !== "VIEWER") && (
                      <>
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
                    )}
                  </>
                );
              })()}
            </div>
          </>
        )
      }

      {/* Modal de Edición Rápida */}
      {
        quickViewCert && quickEditData && (
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
                  {quickViewCert.identification && (
                    <div>
                      <label className="block text-xs text-text-secondary uppercase mb-1">
                        Identificación
                      </label>
                      <p className="text-text-primary font-medium">{quickViewCert.identification}</p>
                    </div>
                  )}
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
        )
      }

      {/* Modal de Certificados del Curso (Vista Grid) */}
      {
        selectedGroupForModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4" onClick={() => setSelectedGroupForModal(null)}>
            <div className="bg-theme-secondary border border-theme rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header del Modal */}
              <div className="p-6 border-b border-theme space-y-4">
                <div className="flex items-center justify-between w-full">
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
                    {onAddCertificate && selectedGroupForModal.certs.length > 0 && userRole !== "VIEWER" && (
                      <button
                        onClick={() => {
                          const certCourseId = selectedGroupForModal.certs[0].courseId;
                          const courseName = selectedGroupForModal.certs[0].courseName;
                          if (certCourseId) {
                            const parts = certCourseId.split("-");
                            if (parts.length >= 3) {
                              const potentialCourseId = parts.slice(0, parts.length - 1).join("-");
                              onAddCertificate(potentialCourseId, courseName);
                              setSelectedGroupForModal(null); // Cerrar modal para mostrar el form
                            }
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm shadow-sm"
                      >
                        <Plus size={18} weight="bold" />
                        <span className="hidden sm:inline">Agregar nuevo</span>
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedGroupForModal(null)}
                      className="p-2 hover:bg-theme-tertiary rounded-lg transition-colors"
                    >
                      <X size={20} weight="bold" className="text-text-secondary" />
                    </button>
                  </div>
                </div>

                {/* Buscador interno en el modal */}
                <div className="relative max-w-md">
                  <MagnifyingGlass size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary" />
                  <input
                    type="text"
                    placeholder="Buscar en este curso (nombre, DNI, estado)..."
                    value={groupSearchTerms[selectedGroupForModal.groupKey] || ""}
                    onChange={(e) => {
                      setGroupSearchTerms({
                        ...groupSearchTerms,
                        [selectedGroupForModal.groupKey]: e.target.value,
                      });
                    }}
                    className="w-full pl-10 pr-4 py-2 bg-theme-tertiary border border-theme rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent text-text-primary"
                  />
                </div>
              </div>

              {/* Contenido del Modal - Tabla de certificados */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-theme-tertiary text-text-secondary uppercase text-xs sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left w-12 text-center">
                          <CheckSquare size={16} className="text-text-tertiary mx-auto" />
                        </th>
                        <th className="px-4 py-2 text-left">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSort("fullName"); }}
                            className="flex items-center gap-1 hover:text-text-primary"
                          >
                            Nombre / DNI
                            {getSortIcon("fullName")}
                          </button>
                        </th>
                        <th className="px-4 py-2 text-left">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSort("courseId"); }}
                            className="flex items-center gap-1 hover:text-text-primary"
                          >
                            ID Certificado
                            {getSortIcon("courseId")}
                          </button>
                        </th>
                        <th className="px-4 py-2 text-left hidden md:table-cell">Email / Tel</th>
                        <th className="px-4 py-2 text-left">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSort("deliveryStatus"); }}
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
                      {(() => {
                        // Obtener los certificados del grupo directamente de filteredCerts para que hereden el orden y filtros globales
                        const term = (groupSearchTerms[selectedGroupForModal.groupKey] || "").toLowerCase();

                        // Re-agrupar e identificar los certificados actuales que pertenecen a esta carpeta
                        const currentGroupCerts = filteredCerts.filter(cert => {
                          let derivedId = "SIN-CODIGO";
                          if (cert.courseId) {
                            const parts = cert.courseId.split("-");
                            derivedId = parts.length > 1 ? parts.slice(0, parts.length - 1).join("-") : cert.courseId;
                          }
                          return derivedId === selectedGroupForModal.groupKey;
                        });

                        // Aplicar búsqueda específica del modal si existe
                        const results = term
                          ? currentGroupCerts.filter(cert =>
                            cert.fullName.toLowerCase().includes(term) ||
                            cert.courseId.toLowerCase().includes(term) ||
                            cert.identification?.toLowerCase().includes(term)
                          )
                          : currentGroupCerts;

                        if (results.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-text-secondary">
                                No se encontraron certificados.
                              </td>
                            </tr>
                          );
                        }

                        return results.map((cert) => (
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
                              <div>{cert.fullName}</div>
                              {cert.identification && (
                                <div className="text-[10px] text-text-tertiary font-normal uppercase">DNI: {cert.identification}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-text-primary font-mono text-xs">
                              {cert.courseId}
                            </td>
                            <td className="px-4 py-3 text-text-secondary hidden md:table-cell">
                              <div>{cert.email || "—"}</div>
                              <div className="text-[10px]">{cert.phone || ""}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-3 py-1 rounded-full text-[10px] font-medium ${statusColors[cert.deliveryStatus || "en_archivo"] ||
                                  "bg-gray-100 text-gray-700"
                                  }`}
                              >
                                {statusLabels[cert.deliveryStatus || "en_archivo"] ||
                                  cert.deliveryStatus ||
                                  "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3 w-12">
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setMenuPosition({
                                      top: rect.bottom + 4,
                                      left: rect.right - 180,
                                    });
                                    setOpenMenuId(cert.id || null);
                                  }}
                                  className="p-1 hover:bg-theme-tertiary rounded transition-colors"
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
                                          deliveryDate: cert.deliveryDate || "",
                                          deliveredTo: cert.deliveredTo || "",
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
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
});

CertificateList.displayName = "CertificateList";

export default CertificateList;

