export interface Course {
  id: string; // código corto (ej. "LM", "ND", "ECG")
  name: string; // nombre completo del curso
  courseType: "Curso" | "Diplomado" | "Webinar" | "Taller" | "Seminario"; // tipo de curso
  year: number; // año del curso (ej. 2025)
  edition?: number | null; // número de edición (1, 2, 3, 4, etc.)
  origin: "historico" | "nuevo"; // origen del curso
  status: "active" | "archived";
  driveFolderId?: string | null; // ID de la carpeta en Google Drive para este curso
  createdAt?: string | null;
  updatedAt?: string | null;
}

