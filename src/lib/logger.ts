// src/lib/logger.ts
/**
 * Logger estructurado para el proyecto
 * Formato JSON para facilitar parsing y análisis en producción
 */

interface LogMeta {
  [key: string]: any;
}

interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  [key: string]: any;
}

/**
 * Crea una entrada de log estructurada
 */
function createLogEntry(
  level: string,
  message: string,
  meta?: LogMeta
): LogEntry {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  if (meta) {
    Object.assign(entry, meta);
  }

  return entry;
}

/**
 * Logger estructurado
 */
export const logger = {
  /**
   * Log de información general
   */
  info: (message: string, meta?: LogMeta): void => {
    const entry = createLogEntry("info", message, meta);
    console.log(JSON.stringify(entry));
  },

  /**
   * Log de advertencias
   */
  warn: (message: string, meta?: LogMeta): void => {
    const entry = createLogEntry("warn", message, meta);
    console.warn(JSON.stringify(entry));
  },

  /**
   * Log de errores
   */
  error: (message: string, error?: Error | unknown, meta?: LogMeta): void => {
    const entry = createLogEntry("error", message, meta);

    if (error instanceof Error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    } else if (error) {
      entry.error = String(error);
    }

    console.error(JSON.stringify(entry));
  },

  /**
   * Log de debug (solo en desarrollo)
   */
  debug: (message: string, meta?: LogMeta): void => {
    if (process.env.NODE_ENV === "development") {
      const entry = createLogEntry("debug", message, meta);
      console.debug(JSON.stringify(entry));
    }
  },
};

