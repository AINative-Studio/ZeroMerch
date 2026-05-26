/**
 * Typed error classes for ZeroDB SDK
 */

export class ZeroDBError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ZeroDBError";
    // Maintain proper prototype chain in transpiled ES5
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** HTTP 400 — caller sent a bad request */
export class ZeroDBValidationError extends ZeroDBError {
  constructor(message: string, public readonly field?: string) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ZeroDBValidationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** HTTP 401 — missing or invalid credentials */
export class ZeroDBAuthError extends ZeroDBError {
  constructor(message = "Unauthorized: check ZERODB_API_TOKEN / ZERODB_API_KEY") {
    super(message, 401, "AUTH_ERROR");
    this.name = "ZeroDBAuthError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** HTTP 403 — authenticated but lacking permission */
export class ZeroDBForbiddenError extends ZeroDBError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
    this.name = "ZeroDBForbiddenError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** HTTP 404 — resource not found */
export class ZeroDBNotFoundError extends ZeroDBError {
  constructor(resource: string, id?: string) {
    const msg = id ? `${resource} '${id}' not found` : `${resource} not found`;
    super(msg, 404, "NOT_FOUND");
    this.name = "ZeroDBNotFoundError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** HTTP 409 — conflict (e.g. duplicate unique field) */
export class ZeroDBConflictError extends ZeroDBError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
    this.name = "ZeroDBConflictError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** HTTP 429 or 503 — rate limit hit or service temporarily unavailable */
export class ZeroDBRateLimitError extends ZeroDBError {
  constructor(
    public readonly retryAfterMs: number,
    statusCode: 429 | 503 = 429,
  ) {
    super(`Rate limited. Retry after ${retryAfterMs}ms`, statusCode, "RATE_LIMITED");
    this.name = "ZeroDBRateLimitError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Catch-all for unexpected server errors */
export class ZeroDBServerError extends ZeroDBError {
  constructor(message: string, statusCode = 500) {
    super(message, statusCode, "SERVER_ERROR");
    this.name = "ZeroDBServerError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Environment is misconfigured (missing required env vars) */
export class ZeroDBConfigError extends ZeroDBError {
  constructor(message: string) {
    super(message, undefined, "CONFIG_ERROR");
    this.name = "ZeroDBConfigError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Map an HTTP status code to the appropriate typed error class.
 * Falls back to ZeroDBError for unmapped codes.
 */
export function mapStatusToError(
  status: number,
  message: string,
  retryAfterHeader?: string | null,
): ZeroDBError {
  switch (status) {
    case 400:
      return new ZeroDBValidationError(message);
    case 401:
      return new ZeroDBAuthError(message);
    case 403:
      return new ZeroDBForbiddenError(message);
    case 404:
      return new ZeroDBNotFoundError(message);
    case 409:
      return new ZeroDBConflictError(message);
    case 429:
    case 503: {
      const retryMs = retryAfterHeader
        ? parseInt(retryAfterHeader, 10) * 1000
        : 1000;
      return new ZeroDBRateLimitError(retryMs, status as 429 | 503);
    }
    default:
      return new ZeroDBServerError(message, status);
  }
}
