/**
 * Utilidades para trabajar con Google Drive
 */

/**
 * Extrae el ID de un archivo de Google Drive desde una URL o ID directo
 * Soporta múltiples formatos de URL de Google Drive
 */
export function extractDriveFileId(input: string | null | undefined): string | null {
  if (!input || !input.trim()) {
    return null;
  }

  const trimmed = input.trim();

  // Si ya es solo un ID (sin caracteres especiales de URL), retornarlo
  if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return trimmed;
  }

  // Patrones comunes de URLs de Google Drive
  const patterns = [
    // https://drive.google.com/file/d/FILE_ID/view
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    // https://drive.google.com/open?id=FILE_ID
    /[?&]id=([a-zA-Z0-9_-]+)/,
    // https://docs.google.com/document/d/FILE_ID/edit
    /\/document\/d\/([a-zA-Z0-9_-]+)/,
    // https://docs.google.com/spreadsheets/d/FILE_ID/edit
    /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
    // https://docs.google.com/presentation/d/FILE_ID/edit
    /\/presentation\/d\/([a-zA-Z0-9_-]+)/,
    // https://drive.google.com/uc?id=FILE_ID
    /\/uc[?&]id=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Si no coincide con ningún patrón, retornar el valor original (por si acaso)
  return trimmed;
}

