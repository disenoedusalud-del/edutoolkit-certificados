import { Certificate } from "@/types/Certificate";

/**
 * Convierte un array de certificados a formato CSV
 */
export function exportToCSV(certificates: Certificate[]): string {
  if (certificates.length === 0) {
    return "";
  }

  // Encabezados
  const headers = [
    "ID",
    "Nombre Completo",
    "Email",
    "Teléfono",
    "Curso",
    "ID Curso",
    "Tipo Curso",
    "Año",
    "Origen",
    "Estado",
    "Fecha Entrega",
    "Entregado a",
    "Ubicación Física",
    "Código Folio",
    "Fuente Contacto",
    "Email Enviado",
    "WhatsApp Enviado",
    "Consentimiento Marketing",
    "ID Drive",
    "Fecha Creación",
    "Fecha Actualización",
  ];

  // Filas de datos
  const rows = certificates.map((cert) => {
    return [
      cert.id || "",
      cert.fullName || "",
      cert.email || "",
      cert.phone || "",
      cert.courseName || "",
      cert.courseId || "",
      cert.courseType || "",
      cert.year?.toString() || "",
      cert.origin === "historico" ? "Histórico" : "Nuevo",
      getStatusLabel(cert.deliveryStatus || "en_archivo"),
      cert.deliveryDate
        ? new Date(cert.deliveryDate).toLocaleDateString("es-ES")
        : "",
      cert.deliveredTo || "",
      cert.physicalLocation || "",
      cert.folioCode || "",
      getContactSourceLabel(cert.contactSource || "ninguno"),
      cert.emailSent ? "Sí" : "No",
      cert.whatsappSent ? "Sí" : "No",
      cert.marketingConsent ? "Sí" : "No",
      cert.driveFileId || "",
      cert.createdAt
        ? new Date(cert.createdAt).toLocaleString("es-ES")
        : "",
      cert.updatedAt
        ? new Date(cert.updatedAt).toLocaleString("es-ES")
        : "",
    ];
  });

  // Combinar encabezados y filas
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCSV(cell)).join(","))
    .join("\n");

  return csvContent;
}

/**
 * Escapa valores para CSV (maneja comillas y comas)
 */
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
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

