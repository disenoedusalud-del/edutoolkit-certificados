// src/lib/validation.ts
import { NextResponse } from "next/server";
import { Certificate } from "@/types/Certificate";
import { Course } from "@/types/Course";

/**
 * Resultado de validación
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Valida un email
 */
export function validateEmail(email: string | null | undefined): boolean {
  if (!email) return true; // Email es opcional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida un teléfono (formato flexible)
 */
export function validatePhone(phone: string | null | undefined): boolean {
  if (!phone) return true; // Teléfono es opcional
  // Acepta números con o sin espacios, guiones, paréntesis
  const phoneRegex = /^[\d\s\-\(\)\+]{8,20}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
}

/**
 * Valida un año
 */
export function validateYear(year: number | null | undefined): boolean {
  if (!year) return false;
  const currentYear = new Date().getFullYear();
  return year >= 2000 && year <= currentYear + 1;
}

/**
 * Valida un string no vacío
 */
export function validateRequiredString(
  value: string | null | undefined,
  fieldName: string
): ValidationResult {
  if (!value || typeof value !== "string" || value.trim().length === 0) {
    return {
      valid: false,
      errors: [`${fieldName} es requerido y no puede estar vacío`],
    };
  }

  if (value.length > 500) {
    return {
      valid: false,
      errors: [`${fieldName} no puede exceder 500 caracteres`],
    };
  }

  return { valid: true, errors: [] };
}

/**
 * Valida un array de strings (para IDs)
 */
export function validateStringArray(
  value: unknown,
  fieldName: string,
  minLength = 1
): ValidationResult {
  if (!Array.isArray(value)) {
    return {
      valid: false,
      errors: [`${fieldName} debe ser un array`],
    };
  }

  if (value.length < minLength) {
    return {
      valid: false,
      errors: [`${fieldName} debe tener al menos ${minLength} elemento(s)`],
    };
  }

  if (value.length > 100) {
    return {
      valid: false,
      errors: [`${fieldName} no puede tener más de 100 elementos`],
    };
  }

  // Validar que todos sean strings
  for (let i = 0; i < value.length; i++) {
    if (typeof value[i] !== "string" || value[i].trim().length === 0) {
      return {
        valid: false,
        errors: [`${fieldName}[${i}] debe ser un string no vacío`],
      };
    }
  }

  return { valid: true, errors: [] };
}

/**
 * Valida un certificado completo
 */
export function validateCertificate(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return {
      valid: false,
      errors: ["Los datos del certificado son inválidos"],
    };
  }

  const cert = data as Partial<Certificate>;

  // Validar campos requeridos
  const fullNameResult = validateRequiredString(cert.fullName, "Nombre completo");
  if (!fullNameResult.valid) errors.push(...fullNameResult.errors);

  const courseNameResult = validateRequiredString(cert.courseName, "Nombre del curso");
  if (!courseNameResult.valid) errors.push(...courseNameResult.errors);

  const courseIdResult = validateRequiredString(cert.courseId, "ID del curso");
  if (!courseIdResult.valid) errors.push(...courseIdResult.errors);

  const courseTypeResult = validateRequiredString(cert.courseType, "Tipo de curso");
  if (!courseTypeResult.valid) errors.push(...courseTypeResult.errors);

  // Validar año
  if (!validateYear(cert.year)) {
    errors.push("El año debe ser un número válido entre 2000 y el año actual + 1");
  }

  // Validar email si está presente
  if (cert.email && !validateEmail(cert.email)) {
    errors.push("El formato del email no es válido");
  }

  // Validar identificación si está presente
  if (cert.identification && typeof cert.identification === "string" && cert.identification.length > 100) {
    errors.push("La identificación no puede exceder los 100 caracteres");
  }

  // Validar teléfono si está presente
  if (cert.phone && !validatePhone(cert.phone)) {
    errors.push("El formato del teléfono no es válido");
  }

  // Validar deliveryStatus
  const validStatuses = [
    "en_archivo",
    "listo_para_entrega",
    "entregado",
    "digital_enviado",
    "anulado",
  ];
  if (cert.deliveryStatus && !validStatuses.includes(cert.deliveryStatus)) {
    errors.push(`Estado de entrega inválido. Debe ser uno de: ${validStatuses.join(", ")}`);
  }

  // Validar contactSource
  const validSources = ["ninguno", "inscripcion", "retiro_presencial"];
  if (cert.contactSource && !validSources.includes(cert.contactSource)) {
    errors.push(`Fuente de contacto inválida. Debe ser uno de: ${validSources.join(", ")}`);
  }

  // Validar origin
  if (cert.origin && !["historico", "nuevo"].includes(cert.origin)) {
    errors.push("Origen inválido. Debe ser 'historico' o 'nuevo'");
  }

  // Validar tipos de datos booleanos
  if (cert.emailSent !== undefined && typeof cert.emailSent !== "boolean") {
    errors.push("emailSent debe ser un booleano");
  }
  if (cert.whatsappSent !== undefined && typeof cert.whatsappSent !== "boolean") {
    errors.push("whatsappSent debe ser un booleano");
  }
  if (cert.marketingConsent !== undefined && typeof cert.marketingConsent !== "boolean") {
    errors.push("marketingConsent debe ser un booleano");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida un curso completo
 */
export function validateCourse(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return {
      valid: false,
      errors: ["Los datos del curso son inválidos"],
    };
  }

  const course = data as Partial<Course>;

  // Validar ID (código)
  if (!course.id || typeof course.id !== "string") {
    errors.push("El código del curso es requerido");
  } else {
    const codeRegex = /^[A-Z0-9\-]{1,20}$/;
    if (!codeRegex.test(course.id)) {
      errors.push("El código debe tener 1-20 caracteres (letras mayúsculas, números y guiones)");
    }
  }

  // Validar nombre
  const nameResult = validateRequiredString(course.name, "Nombre del curso");
  if (!nameResult.valid) errors.push(...nameResult.errors);

  // Validar courseType
  const validTypes = ["Curso", "Diplomado", "Webinar", "Taller", "Seminario", "Congreso", "Simposio"];
  if (course.courseType && !validTypes.includes(course.courseType)) {
    errors.push(`Tipo de curso inválido. Debe ser uno de: ${validTypes.join(", ")}`);
  }

  // Validar año
  if (!validateYear(course.year)) {
    errors.push("El año es requerido y debe ser un número válido entre 2000 y el año actual + 1");
  }

  // Validar status
  if (course.status && !["active", "archived"].includes(course.status)) {
    errors.push("El estado debe ser 'active' o 'archived'");
  }

  // Validar mes si está presente
  if (course.month !== null && course.month !== undefined) {
    const monthNum = Number(course.month);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      errors.push("El mes debe ser un número entre 1 y 12");
    }

    // Si hay mes, debe haber edición
    if (course.edition === null || course.edition === undefined) {
      errors.push("Si se especifica un mes, también debe especificarse una edición");
    }
  }

  // Validar edition si está presente
  if (course.edition !== null && course.edition !== undefined) {
    if (typeof course.edition !== "number" || course.edition < 1) {
      errors.push("La edición debe ser un número mayor a 0");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Helper para crear respuesta de validación fallida
 */
export function validationErrorResponse(errors: string[]): NextResponse {
  return NextResponse.json(
    {
      error: "Error de validación",
      details: errors,
    },
    { status: 400 }
  );
}

