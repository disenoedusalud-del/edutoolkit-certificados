"use client";

import { useEffect, useState } from "react";
import { Certificate } from "@/types/Certificate";
import Link from "next/link";
import CertificateForm from "./CertificateForm";
import { Check, X, Trash, Copy, ArrowLeft, Upload, File } from "phosphor-react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { LoadingSpinner, LoadingSkeleton } from "./LoadingSpinner";
import { useConfirm } from "@/contexts/ConfirmContext";

interface CertificateDetailProps {
  id: string;
}

export default function CertificateDetail({ id }: CertificateDetailProps) {
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  const { confirm } = useConfirm();

  const loadCertificate = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/certificates/${id}`);
      if (!res.ok) {
        throw new Error("Error al cargar el certificado");
      }
      const data = await res.json();
      setCertificate(data);
      setError(null);
    } catch (err: any) {
      console.error("Error loading certificate:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCertificate();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-4">
        <LoadingSpinner size={32} className="text-blue-600" />
        <p className="text-text-secondary text-sm">Cargando certificado...</p>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-600 text-sm mt-1">
            {error || "Certificado no encontrado"}
          </p>
        </div>
        <Link
          href="/admin/certificados"
          className="mt-4 inline-block text-blue-600 hover:text-blue-800"
        >
          ← Volver a la lista
        </Link>
      </div>
    );
  }

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

  if (editing && certificate) {
    return (
      <div className="space-y-6">
        <div className="mb-4">
          <button
            onClick={() => setEditing(false)}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={20} weight="bold" />
            <span>Volver al detalle</span>
          </button>
        </div>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-text-primary">
            Editar Certificado
          </h2>
        </div>
        <div className="bg-theme-secondary rounded-xl shadow border border-theme p-6">
          <CertificateForm
            certificate={certificate}
            onCancel={() => {
              setEditing(false);
              // Recargar los datos del certificado después de cancelar (por si acaso hubo cambios)
              loadCertificate();
            }}
            onSuccess={async () => {
              // Cuando se guarda exitosamente, salir del modo edición y recargar datos
              setEditing(false);
              // Recargar los datos del certificado inmediatamente
              await loadCertificate();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <button
          onClick={() => router.push("/admin/certificados")}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={20} weight="bold" />
          <span>Volver a la lista</span>
        </button>
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-primary">
          Detalle del Certificado
        </h2>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              if (!certificate) return;
              try {
                const { id, ...certificateData } = certificate;
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
                  const data = await response.json();
                  toast.success("Certificado duplicado correctamente");
                  router.push(`/admin/certificados/${data.id}`);
                } else {
                  toast.error("Error al duplicar el certificado");
                }
              } catch (error) {
                console.error("Error:", error);
                toast.error("Error al duplicar el certificado");
              }
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm transition-colors flex items-center gap-2"
          >
            <Copy size={16} weight="bold" />
            Duplicar
          </button>
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
          >
            Editar
          </button>
          <button
            onClick={async () => {
              const confirmed = await confirm({
                title: "Eliminar Certificado",
                message: "¿Estás seguro de eliminar este certificado?\n\nEsta acción no se puede deshacer.",
                variant: "danger",
                confirmText: "Eliminar",
                cancelText: "Cancelar",
              });

              if (confirmed) {
                try {
                  const response = await fetch(`/api/certificates/${id}`, {
                    method: "DELETE",
                  });

                  if (response.ok) {
                    toast.success("Certificado eliminado correctamente");
                    router.push("/admin/certificados");
                  } else {
                    toast.error("Error al eliminar el certificado");
                  }
                } catch (error) {
                  console.error("Error:", error);
                  toast.error("Error al eliminar el certificado");
                }
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm transition-colors flex items-center gap-2"
          >
            <Trash size={16} weight="bold" />
            Eliminar
          </button>
          <Link
            href="/admin/certificados"
            className="px-4 py-2 text-text-secondary hover:text-text-primary text-sm"
          >
            ← Volver
          </Link>
        </div>
      </div>

      <div className="bg-theme-secondary rounded-xl shadow border border-theme p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Información Personal */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary border-b border-theme pb-2">
              Información Personal
            </h3>
            <div>
              <label className="text-xs text-text-secondary uppercase">Nombre Completo</label>
              <p className="text-text-primary font-medium">{certificate.fullName}</p>
            </div>
            <div>
              <label className="text-xs text-text-secondary uppercase">Email</label>
              <p className="text-text-primary">
                {certificate.email || <span className="text-text-tertiary">No registrado</span>}
              </p>
            </div>
            <div>
              <label className="text-xs text-text-secondary uppercase">Teléfono</label>
              <p className="text-text-primary">
                {certificate.phone || <span className="text-text-tertiary">No registrado</span>}
              </p>
            </div>
          </div>

          {/* Información del Curso */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary border-b border-theme pb-2">
              Información del Curso
            </h3>
            <div>
              <label className="text-xs text-text-secondary uppercase">Nombre del Curso</label>
              <p className="text-text-primary font-medium">{certificate.courseName}</p>
            </div>
            <div>
              <label className="text-xs text-text-secondary uppercase">Tipo de Curso</label>
              <p className="text-text-primary">{certificate.courseType}</p>
            </div>
            <div>
              <label className="text-xs text-text-secondary uppercase">Año</label>
              <p className="text-text-primary">{certificate.year}</p>
            </div>
            <div>
              <label className="text-xs text-text-secondary uppercase">Origen</label>
              <p className="text-text-primary">
                <span className="px-2 py-1 bg-theme-tertiary rounded text-xs border border-theme">
                  {certificate.origin === "historico" ? "Histórico" : "Nuevo"}
                </span>
              </p>
            </div>
          </div>

          {/* Estado de Entrega */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary border-b border-theme pb-2">
              Estado de Entrega
            </h3>
            <div>
              <label className="text-xs text-text-secondary uppercase">Estado</label>
              <p className="mt-1">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    statusColors[certificate.deliveryStatus] || "bg-gray-100 text-gray-700"
                  }`}
                >
                  {statusLabels[certificate.deliveryStatus] || certificate.deliveryStatus}
                </span>
              </p>
            </div>
            {certificate.deliveryDate && (
              <div>
                <label className="text-xs text-text-secondary uppercase">Fecha de Entrega</label>
                <p className="text-text-primary">
                  {new Date(certificate.deliveryDate).toLocaleDateString("es-ES")}
                </p>
              </div>
            )}
            {certificate.deliveredTo && (
              <div>
                <label className="text-xs text-text-secondary uppercase">Entregado a</label>
                <p className="text-text-primary">{certificate.deliveredTo}</p>
              </div>
            )}
            {certificate.physicalLocation && (
              <div>
                <label className="text-xs text-text-secondary uppercase">Ubicación Física</label>
                <p className="text-text-primary">{certificate.physicalLocation}</p>
              </div>
            )}
            {certificate.folioCode && (
              <div>
                <label className="text-xs text-text-secondary uppercase">Código de Folio</label>
                <p className="text-text-primary font-mono">{certificate.folioCode}</p>
              </div>
            )}
          </div>

          {/* Información Adicional */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary border-b border-theme pb-2">
              Información Adicional
            </h3>
            <div>
              <label className="text-xs text-text-secondary uppercase">Fuente de Contacto</label>
              <p className="text-text-primary">
                {certificate.contactSource === "inscripcion"
                  ? "Inscripción"
                  : certificate.contactSource === "retiro_presencial"
                  ? "Retiro Presencial"
                  : "Ninguno"}
              </p>
            </div>
            <div className="flex gap-4">
              <div>
                <label className="text-xs text-text-secondary uppercase">Email Enviado</label>
                <p className="text-text-primary flex items-center gap-1">
                  {certificate.emailSent ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <Check size={16} weight="bold" />
                      Sí
                    </span>
                  ) : (
                    <span className="text-text-tertiary flex items-center gap-1">
                      <X size={16} weight="bold" />
                      No
                    </span>
                  )}
                </p>
              </div>
              <div>
                <label className="text-xs text-text-secondary uppercase">WhatsApp Enviado</label>
                <p className="text-text-primary flex items-center gap-1">
                  {certificate.whatsappSent ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <Check size={16} weight="bold" />
                      Sí
                    </span>
                  ) : (
                    <span className="text-text-tertiary flex items-center gap-1">
                      <X size={16} weight="bold" />
                      No
                    </span>
                  )}
                </p>
              </div>
              <div>
                <label className="text-xs text-text-secondary uppercase">Consentimiento Marketing</label>
                <p className="text-text-primary flex items-center gap-1">
                  {certificate.marketingConsent ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <Check size={16} weight="bold" />
                      Sí
                    </span>
                  ) : (
                    <span className="text-text-tertiary flex items-center gap-1">
                      <X size={16} weight="bold" />
                      No
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div>
              <label className="text-xs text-text-secondary uppercase mb-2 block">
                Archivo en Google Drive
              </label>
              {certificate.driveFileId ? (
                <>
                  <div className="flex gap-2 mb-2">
                    <a
                      href={certificate.driveWebViewLink || `https://drive.google.com/file/d/${certificate.driveFileId}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors flex items-center gap-1"
                    >
                      <File size={14} weight="bold" />
                      Ver en Drive
                    </a>
                    <a
                      href={`https://drive.google.com/uc?export=download&id=${certificate.driveFileId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-theme-tertiary text-text-primary rounded text-xs hover:bg-theme-secondary transition-colors border border-theme"
                    >
                      Descargar
                    </a>
                  </div>
                  <p className="text-text-secondary text-xs mt-1 font-mono break-all mb-2">
                    ID: {certificate.driveFileId}
                  </p>
                </>
              ) : (
                <p className="text-text-tertiary text-xs mb-2">No hay archivo asociado</p>
              )}
              <div>
                <label
                  htmlFor={`file-upload-${id}`}
                  className={`px-3 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors inline-flex items-center gap-1 cursor-pointer ${
                    uploading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <Upload size={14} weight="bold" />
                  {uploading ? "Subiendo..." : certificate.driveFileId ? "Reemplazar PDF" : "Subir PDF"}
                </label>
                <input
                  id={`file-upload-${id}`}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  disabled={uploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    if (file.type !== "application/pdf") {
                      toast.error("El archivo debe ser un PDF");
                      return;
                    }

                    if (file.size > 10 * 1024 * 1024) {
                      toast.error("El archivo es demasiado grande. Máximo 10MB");
                      return;
                    }

                    setUploading(true);
                    try {
                      const formData = new FormData();
                      formData.append("file", file);

                      const response = await fetch(`/api/certificates/${id}/upload`, {
                        method: "POST",
                        body: formData,
                      });

                      const data = await response.json();

                      if (response.ok && data.ok !== false) {
                        toast.success("PDF subido exitosamente a Google Drive");
                        await loadCertificate(); // Recargar el certificado
                      } else {
                        toast.error(data.error || "Error al subir el archivo");
                      }
                    } catch (err) {
                      console.error("Error uploading file:", err);
                      toast.error("Error al subir el archivo");
                    } finally {
                      setUploading(false);
                      // Limpiar el input
                      e.target.value = "";
                    }
                  }}
                />
                <p className="text-text-tertiary text-xs mt-1">
                  Solo archivos PDF, máximo 10MB
                </p>
              </div>
            </div>
            {certificate.createdAt && (
              <div>
                <label className="text-xs text-text-secondary uppercase">Fecha de Creación</label>
                <p className="text-text-primary text-sm">
                  {new Date(certificate.createdAt).toLocaleString("es-ES")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

