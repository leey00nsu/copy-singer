import type { z } from "zod";
import { ApiError } from "./api-error";

type RequestJsonOptions<TSchema extends z.ZodType> = Omit<RequestInit, "body"> & {
  schema: TSchema;
  body?: BodyInit | null;
  json?: unknown;
};

type ErrorDetails = {
  code: string | null;
  message: string;
  retryable: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readErrorDetails(payload: unknown, status: number): ErrorDetails {
  const fallback = `Request failed (${status})`;
  if (!isRecord(payload)) {
    return { code: null, message: fallback, retryable: status === 429 || status >= 500 };
  }

  if (typeof payload.detail === "string") {
    return {
      code: typeof payload.reasonCode === "string" ? payload.reasonCode : null,
      message: payload.detail,
      retryable: typeof payload.retryable === "boolean" ? payload.retryable : status === 429 || status >= 500,
    };
  }

  if (typeof payload.error === "string") {
    return { code: null, message: payload.error, retryable: status === 429 || status >= 500 };
  }

  if (isRecord(payload.error)) {
    const error = payload.error;
    const message =
      typeof error.message === "string" ? error.message : typeof error.detail === "string" ? error.detail : fallback;
    return {
      code: typeof error.code === "string" ? error.code : null,
      message,
      retryable: typeof error.retryable === "boolean" ? error.retryable : status === 429 || status >= 500,
    };
  }

  return { code: null, message: fallback, retryable: status === 429 || status >= 500 };
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError("The API returned invalid JSON.", {
      kind: "contract",
      status: response.status,
      code: "INVALID_JSON_RESPONSE",
    });
  }
}

export async function requestJson<TSchema extends z.ZodType>(
  input: RequestInfo | URL,
  options: RequestJsonOptions<TSchema>,
  fetchImpl: typeof fetch = fetch,
): Promise<z.output<TSchema>> {
  const { body, headers: initialHeaders, json, schema, ...init } = options;
  if (body !== undefined && json !== undefined) {
    throw new ApiError("A request cannot include both body and json.", {
      kind: "contract",
      code: "AMBIGUOUS_REQUEST_BODY",
    });
  }

  const headers = new Headers(initialHeaders);
  let requestBody = body;
  if (json !== undefined) {
    if (!headers.has("content-type")) headers.set("content-type", "application/json");
    requestBody = JSON.stringify(json);
  }

  let response: Response;
  try {
    response = await fetchImpl(input, { ...init, headers, body: requestBody });
  } catch (error) {
    throw new ApiError(init.signal?.aborted ? "The request was canceled." : "Could not reach the API.", {
      kind: "network",
      code: init.signal?.aborted ? "REQUEST_ABORTED" : "NETWORK_ERROR",
      retryable: !init.signal?.aborted,
      cause: error,
    });
  }

  let payload: unknown;
  try {
    payload = await readJson(response);
  } catch (error) {
    if (error instanceof ApiError && !response.ok) {
      throw new ApiError(`Request failed (${response.status})`, {
        kind: "http",
        status: response.status,
        retryable: response.status === 429 || response.status >= 500,
        cause: error,
      });
    }
    throw error;
  }

  if (!response.ok) {
    const details = readErrorDetails(payload, response.status);
    throw new ApiError(details.message, {
      kind: "http",
      status: response.status,
      code: details.code ?? undefined,
      retryable: details.retryable,
    });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError("The API response did not match the expected contract.", {
      kind: "contract",
      status: response.status,
      code: "INVALID_API_RESPONSE",
      cause: parsed.error,
    });
  }
  return parsed.data;
}
