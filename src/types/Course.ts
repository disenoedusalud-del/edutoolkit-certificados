export interface Course {
  id: string; // código corto (ej. "LM", "ND", "ECG")
  name: string; // nombre completo del curso
  courseType: "Curso" | "Diplomado" | "Webinar" | "Taller" | "Seminario"; // tipo de curso
  edition?: number | null; // número de edición (1, 2, 3, 4, etc.)
  status: "active" | "archived";
  createdAt?: string | null;
  updatedAt?: string | null;
}

