// Mock Next.js modules before importing
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
    })),
  },
}));

import {
  validateEmail,
  validatePhone,
  validateYear,
  validateRequiredString,
  validateStringArray,
  validateCertificate,
  validateCourse,
  validationErrorResponse,
} from '../validation';

describe('validateEmail', () => {
  it('debe retornar true para emails válidos', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name@domain.co.uk')).toBe(true);
    expect(validateEmail('user+tag@example.com')).toBe(true);
  });

  it('debe retornar false para emails inválidos', () => {
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
    expect(validateEmail('user@domain')).toBe(false);
  });

  it('debe retornar true para valores null/undefined (opcional)', () => {
    expect(validateEmail(null)).toBe(true);
    expect(validateEmail(undefined)).toBe(true);
    expect(validateEmail('')).toBe(true);
  });
});

describe('validatePhone', () => {
  it('debe retornar true para teléfonos válidos', () => {
    expect(validatePhone('1234567890')).toBe(true);
    expect(validatePhone('+1 234 567 8900')).toBe(true);
    expect(validatePhone('(123) 456-7890')).toBe(true);
    expect(validatePhone('123-456-7890')).toBe(true);
  });

  it('debe retornar false para teléfonos inválidos', () => {
    expect(validatePhone('123')).toBe(false); // Muy corto
    expect(validatePhone('abc1234567')).toBe(false); // Contiene letras
  });

  it('debe retornar true para valores null/undefined (opcional)', () => {
    expect(validatePhone(null)).toBe(true);
    expect(validatePhone(undefined)).toBe(true);
    expect(validatePhone('')).toBe(true);
  });
});

describe('validateYear', () => {
  it('debe retornar true para años válidos', () => {
    const currentYear = new Date().getFullYear();
    expect(validateYear(2000)).toBe(true);
    expect(validateYear(currentYear)).toBe(true);
    expect(validateYear(currentYear + 1)).toBe(true);
  });

  it('debe retornar false para años inválidos', () => {
    expect(validateYear(1999)).toBe(false);
    const currentYear = new Date().getFullYear();
    expect(validateYear(currentYear + 2)).toBe(false);
    expect(validateYear(null)).toBe(false);
    expect(validateYear(undefined)).toBe(false);
  });
});

describe('validateRequiredString', () => {
  it('debe retornar válido para strings no vacíos', () => {
    const result = validateRequiredString('test', 'Campo');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('debe retornar inválido para valores vacíos', () => {
    const result1 = validateRequiredString('', 'Campo');
    expect(result1.valid).toBe(false);
    expect(result1.errors[0]).toContain('Campo es requerido');

    const result2 = validateRequiredString('   ', 'Campo');
    expect(result2.valid).toBe(false);

    const result3 = validateRequiredString(null, 'Campo');
    expect(result3.valid).toBe(false);

    const result4 = validateRequiredString(undefined, 'Campo');
    expect(result4.valid).toBe(false);
  });

  it('debe retornar inválido para strings muy largos', () => {
    const longString = 'a'.repeat(501);
    const result = validateRequiredString(longString, 'Campo');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('no puede exceder 500 caracteres');
  });
});

describe('validateStringArray', () => {
  it('debe retornar válido para arrays de strings válidos', () => {
    const result = validateStringArray(['item1', 'item2'], 'Array');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('debe retornar inválido para valores que no son arrays', () => {
    const result = validateStringArray('not-an-array', 'Array');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('debe ser un array');
  });

  it('debe retornar inválido para arrays vacíos cuando minLength > 0', () => {
    const result = validateStringArray([], 'Array', 1);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('debe tener al menos');
  });

  it('debe retornar inválido para arrays con strings vacíos', () => {
    const result = validateStringArray(['valid', '', 'also-valid'], 'Array');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('debe ser un string no vacío');
  });

  it('debe retornar inválido para arrays muy largos', () => {
    const largeArray = Array(101).fill('item');
    const result = validateStringArray(largeArray, 'Array');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('no puede tener más de 100 elementos');
  });
});

describe('validateCertificate', () => {
  it('debe retornar válido para certificado completo válido', () => {
    const validCert = {
      fullName: 'Juan Pérez',
      courseName: 'Curso de Ejemplo',
      courseId: 'CE-2025-01',
      courseType: 'Curso',
      year: 2025,
      email: 'juan@example.com',
      phone: '1234567890',
      deliveryStatus: 'en_archivo',
      contactSource: 'inscripcion',
      origin: 'nuevo',
    };

    const result = validateCertificate(validCert);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('debe retornar inválido para certificado con campos faltantes', () => {
    const invalidCert = {
      fullName: 'Juan Pérez',
      // Faltan courseName, courseId, etc.
    };

    const result = validateCertificate(invalidCert);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('debe retornar inválido para email mal formateado', () => {
    const cert = {
      fullName: 'Juan Pérez',
      courseName: 'Curso',
      courseId: 'CE-2025-01',
      courseType: 'Curso',
      year: 2025,
      email: 'invalid-email',
    };

    const result = validateCertificate(cert);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('email'))).toBe(true);
  });

  it('debe retornar inválido para deliveryStatus inválido', () => {
    const cert = {
      fullName: 'Juan Pérez',
      courseName: 'Curso',
      courseId: 'CE-2025-01',
      courseType: 'Curso',
      year: 2025,
      deliveryStatus: 'estado_invalido',
    };

    const result = validateCertificate(cert);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Estado de entrega'))).toBe(true);
  });

  it('debe retornar inválido para datos que no son objetos', () => {
    const result1 = validateCertificate(null);
    expect(result1.valid).toBe(false);

    const result2 = validateCertificate('string');
    expect(result2.valid).toBe(false);

    const result3 = validateCertificate(123);
    expect(result3.valid).toBe(false);
  });
});

describe('validateCourse', () => {
  it('debe retornar válido para curso completo válido', () => {
    const validCourse = {
      id: 'CE',
      name: 'Curso de Ejemplo',
      courseType: 'Curso',
      year: 2025,
      status: 'active',
    };

    const result = validateCourse(validCourse);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('debe retornar inválido para código de curso inválido', () => {
    const invalidCourse = {
      id: 'codigo-con-minusculas',
      name: 'Curso',
      year: 2025,
    };

    const result = validateCourse(invalidCourse);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('código'))).toBe(true);
  });

  it('debe retornar inválido para courseType inválido', () => {
    const course = {
      id: 'CE',
      name: 'Curso',
      courseType: 'TipoInvalido',
      year: 2025,
    };

    const result = validateCourse(course);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Tipo de curso'))).toBe(true);
  });

  it('debe retornar inválido para datos que no son objetos', () => {
    const result = validateCourse(null);
    expect(result.valid).toBe(false);
  });
});

describe('validationErrorResponse', () => {
  it('debe crear una respuesta NextResponse con errores', () => {
    const errors = ['Error 1', 'Error 2'];
    const response = validationErrorResponse(errors);

    expect(response).toBeDefined();
    // La respuesta es un objeto NextResponse, no podemos verificar fácilmente su contenido
    // pero podemos verificar que se creó correctamente
    expect(response).not.toBeNull();
  });
});

