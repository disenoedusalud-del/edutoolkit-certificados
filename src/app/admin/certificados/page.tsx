"use client";

import { useState, useRef } from "react";
import CertificateList from "@/components/CertificateList";
import CertificateForm from "@/components/CertificateForm";
import CertificateStats from "@/components/CertificateStats";
import CertificateImport from "@/components/CertificateImport";
import ImportExportMenu from "@/components/ImportExportMenu";
import CourseExportModal from "@/components/CourseExportModal";
import { ChartBar, Plus, BookOpen, ArrowLeft } from "phosphor-react";
import Link from "next/link";
import type { CertificateListHandle } from "@/components/CertificateList";

export default function Page() {
  const [showForm, setShowForm] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCourseExport, setShowCourseExport] = useState(false);
  const certificateListRef = useRef<CertificateListHandle>(null);
  const [initialCourseId, setInitialCourseId] = useState<string | undefined>(undefined);
  const [initialCourseName, setInitialCourseName] = useState<string | undefined>(undefined);

  const handleAddCertificate = (courseId?: string, courseName?: string) => {
    setInitialCourseId(courseId);
    setInitialCourseName(courseName);
    setShowForm(true);
  };

  return (
    <main className="min-h-screen bg-theme-primary p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">
          Gestión de Certificados
        </h1>
        {!showForm && (
          <div className="flex gap-2 items-center">
            <ImportExportMenu
              onImportClick={() => {
                setShowImport(!showImport);
                if (showImport) {
                  setShowStats(false);
                }
              }}
              onExportSelected={() => {
                certificateListRef.current?.exportSelected();
              }}
              onExportAll={() => {
                certificateListRef.current?.exportAll();
              }}
              onExportByCourse={() => {
                setShowCourseExport(true);
              }}
              getSelectedCount={() => certificateListRef.current?.selectedCount || 0}
              getHasSelected={() => certificateListRef.current?.hasSelected || false}
            />
            <Link
              href="/admin/cursos"
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors flex items-center gap-2 border border-theme btn-primary"
            >
              <BookOpen size={18} weight="bold" />
              Administrar Cursos
            </Link>
            <button
              onClick={() => setShowStats(!showStats)}
              className="px-4 py-2 bg-theme-secondary text-text-primary rounded-lg hover:bg-theme-tertiary transition-colors flex items-center gap-2 border border-theme btn-secondary"
            >
              <ChartBar size={18} weight="bold" />
              {showStats ? "Ocultar Estadísticas" : "Ver Estadísticas"}
            </button>
            <button
              onClick={() => handleAddCertificate()}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors flex items-center gap-2 border border-theme btn-primary"
            >
              <Plus size={18} weight="bold" />
              Nuevo Certificado
            </button>
          </div>
        )}
      </div>

      {showForm ? (
        <div className="bg-theme-secondary rounded-xl shadow p-6 border border-theme">
          <div className="mb-4">
            <button
              onClick={() => {
                setShowForm(false);
                setInitialCourseId(undefined);
                setInitialCourseName(undefined);
              }}
              className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft size={20} weight="bold" />
              <span>Volver a la lista</span>
            </button>
          </div>
          <CertificateForm
            onCancel={() => {
              setShowForm(false);
              setInitialCourseId(undefined);
              setInitialCourseName(undefined);
            }}
            initialCourseId={initialCourseId}
            initialCourseName={initialCourseName}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {showImport && (
            <CertificateImport onClose={() => setShowImport(false)} />
          )}
          {showStats && (
            <div className="bg-theme-secondary rounded-xl shadow p-6 border border-theme">
              <CertificateStats />
            </div>
          )}
          {showCourseExport && certificateListRef.current && (
            <CourseExportModal
              groupedCerts={certificateListRef.current.getGroupedCerts()}
              onClose={() => setShowCourseExport(false)}
            />
          )}
          <div className="bg-theme-secondary rounded-xl shadow p-4 border border-theme">
            <CertificateList
              ref={certificateListRef}
              onAddCertificate={handleAddCertificate}
            />
          </div>
        </div>
      )}
    </main>
  );
}

