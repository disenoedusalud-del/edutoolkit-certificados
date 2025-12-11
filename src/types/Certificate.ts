export interface Certificate {
  id?: string;

  fullName: string;
  courseName: string;
  courseId: string;
  courseType: string;
  year: number;

  origin: "historico" | "nuevo";

  email: string | null;
  phone: string | null;
  contactSource: "ninguno" | "inscripcion" | "retiro_presencial";

  driveFileId: string | null;

  deliveryStatus:
    | "en_archivo"
    | "listo_para_entrega"
    | "entregado"
    | "digital_enviado"
    | "anulado";

  deliveryDate: string | null;
  deliveredTo: string | null;

  physicalLocation: string | null;
  folioCode: string | null;

  emailSent: boolean;
  whatsappSent: boolean;
  marketingConsent: boolean;

  createdAt: string | null;
  updatedAt: string | null;
}

