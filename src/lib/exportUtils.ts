import { Certificate } from "@/types/Certificate";

/**
 * Convierte un array de certificados a formato CSV
 * Usa el mismo formato que la plantilla de importación
 */
export function exportToCSV(certificates: Certificate[]): string {
  if (certificates.length === 0) {
    return "";
  }

  // Encabezados (mismo formato que la plantilla de importación)
  const headers = [
    "Nombre Completo (requerido)",
    "Nombre del Curso (requerido)",
    "Tipo de Curso (requerido si es nuevo)",
    "Año (requerido)",
    "Email (opcional)",
    "Teléfono (opcional)",
    "Origen (opcional)",
    "Estado (opcional)",
  ];

  // Filas de datos
  const rows = certificates.map((cert) => {
    return [
      cert.fullName || "",
      cert.courseName || "",
      cert.courseType || "",
      cert.year?.toString() || "",
      cert.email || "",
      cert.phone || "",
      cert.origin || "nuevo",
      cert.deliveryStatus || "en_archivo",
    ];
  });

  // Combinar encabezados y filas
  // Usar punto y coma como separador (formato Excel español)
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCSV(cell)).join(";"))
    .join("\n");

  return csvContent;
}

/**
 * Escapa valores para CSV (maneja comillas, comas y punto y coma)
 */
function escapeCSV(value: string): string {
  // Manejar punto y coma también (usado en formato Excel español)
  if (value.includes(",") || value.includes(";") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Descarga un archivo CSV
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Obtiene la etiqueta en español del estado
 */
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    en_archivo: "En archivo",
    listo_para_entrega: "Listo para entrega",
    entregado: "Entregado",
    digital_enviado: "Digital enviado",
    anulado: "Anulado",
  };
  return labels[status] || status;
}

/**
 * Obtiene la etiqueta en español de la fuente de contacto
 */
function getContactSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    ninguno: "Ninguno",
    inscripcion: "Inscripción",
    retiro_presencial: "Retiro Presencial",
  };
  return labels[source] || source;
}

