export type ApiErrorKind = "network" | "http" | "contract";

type ApiErrorOptions = {
  kind: ApiErrorKind;
  status?: number;
  code?: string;
  retryable?: boolean;
  cause?: unknown;
};

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly code: string | null;
  readonly retryable: boolean;

  constructor(message: string, options: ApiErrorOptions) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "ApiError";
    this.kind = options.kind;
    this.status = options.status ?? null;
    this.code = options.code ?? null;
    this.retryable = options.retryable ?? false;
  }
}

export function shouldRetryQuery(failureCount: number, error: unknown) {
  return error instanceof ApiError && error.retryable && failureCount < 2;
}
