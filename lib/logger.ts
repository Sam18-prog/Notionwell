/**
 * Notionwell Production Logger
 * Provides structured server-side logs while ensuring that tokens,
 * passwords, API keys, and sensitive user data are automatically redacted.
 */

const SENSITIVE_KEYS = [
  'password',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'cookie',
  'secret',
  'key',
  'service_role',
  'api_key',
];

function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const isSensitive = SENSITIVE_KEYS.some((sk) => k.toLowerCase().includes(sk));
    if (isSensitive) {
      sanitized[k] = '[REDACTED]';
    } else if (typeof v === 'object') {
      sanitized[k] = sanitizeObject(v);
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}

export const logger = {
  info(message: string, context?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    if (context) {
      console.log(`[${timestamp}] [INFO] ${message}`, JSON.stringify(sanitizeObject(context)));
    } else {
      console.log(`[${timestamp}] [INFO] ${message}`);
    }
  },

  warn(message: string, context?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    if (context) {
      console.warn(`[${timestamp}] [WARN] ${message}`, JSON.stringify(sanitizeObject(context)));
    } else {
      console.warn(`[${timestamp}] [WARN] ${message}`);
    }
  },

  error(message: string, error?: any, context?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const payload: Record<string, any> = {
      message: error?.message || String(error),
      code: error?.code,
      status: error?.status,
      ...context,
    };
    console.error(`[${timestamp}] [ERROR] ${message}`, JSON.stringify(sanitizeObject(payload)));
  },
};

export function logInfo(message: string, context?: Record<string, any>) {
  logger.info(message, context);
}

export function logWarn(message: string, context?: Record<string, any>) {
  logger.warn(message, context);
}

export function logError(message: string, error?: any, context?: Record<string, any>) {
  logger.error(message, error, context);
}
