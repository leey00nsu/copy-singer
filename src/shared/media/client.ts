import "server-only";
import { runtimeLimits, withDeadline } from "@/shared/lib/runtime/index.server";

export type LeemageConfig = {
  baseUrl: string;
  apiKey: string;
  projectId: string;
};

export type UploadAllocation = { fileId: string; objectName: string };

export type LeemageStoredFile = {
  projectId: string;
  fileId: string;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export class LeemageError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "LeemageError";
  }
}

type FetchLike = typeof fetch;

function envValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new LeemageError(`${name} is required for media storage.`, null, false);
  return value;
}

export function leemageConfigFromEnv(): LeemageConfig {
  return {
    baseUrl: (process.env.LEEMAGE_BASE_URL?.trim() || "https://leemage.leey00nsu.com/api/v1").replace(/\/$/, ""),
    apiKey: envValue("LEEMAGE_API_KEY"),
    projectId: envValue("LEEMAGE_PROJECT_ID"),
  };
}

function retryDelay(response: Response, attempt: number) {
  const retryAfter = response.headers.get("Retry-After");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.min(Math.max(seconds * 1_000, 0), 5_000);
  }
  return Math.min(200 * 2 ** attempt, 2_000);
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function responseMessage(response: Response) {
  const payload = (await response.json().catch(() => null)) as { message?: unknown } | null;
  return typeof payload?.message === "string" ? payload.message : `Media storage request failed (${response.status}).`;
}

export class LeemageClient {
  constructor(
    private readonly config: LeemageConfig,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  private async apiRequest(path: string, init: RequestInit, maxAttempts = init.method === "POST" ? 1 : 3) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      let response: Response;
      try {
        response = await this.fetchImpl(`${this.config.baseUrl}${path}`, {
          ...init,
          signal: init.signal
            ? AbortSignal.any([init.signal, AbortSignal.timeout(runtimeLimits().metadataMs)])
            : AbortSignal.timeout(runtimeLimits().metadataMs),
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            ...(init.body ? { "Content-Type": "application/json" } : {}),
            ...init.headers,
          },
          cache: "no-store",
        });
      } catch (error) {
        if (!init.signal?.aborted && attempt + 1 < maxAttempts) {
          await sleep(200 * 2 ** attempt);
          continue;
        }
        throw new LeemageError(error instanceof Error ? error.message : "Media storage is unavailable.", null, true);
      }

      if (response.ok) return response;
      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt + 1 < maxAttempts) {
        await response.body?.cancel();
        await sleep(retryDelay(response, attempt));
        continue;
      }
      throw new LeemageError(await responseMessage(response), response.status, retryable);
    }
    throw new LeemageError("Media storage request exhausted its retry limit.", null, true);
  }

  async uploadFile(input: {
    fileName: string;
    mimeType: string;
    bytes: Uint8Array;
    signal?: AbortSignal;
    onAllocated?: (allocation: UploadAllocation) => Promise<void>;
  }): Promise<LeemageStoredFile> {
    return withDeadline(runtimeLimits().uploadMs, (signal) => this.uploadWithinDeadline(input, signal), input.signal);
  }

  private async uploadWithinDeadline(
    input: {
      fileName: string;
      mimeType: string;
      bytes: Uint8Array;
      onAllocated?: (allocation: UploadAllocation) => Promise<void>;
    },
    signal: AbortSignal,
  ): Promise<LeemageStoredFile> {
    const presign = await this.apiRequest(`/projects/${encodeURIComponent(this.config.projectId)}/files/presign`, {
      method: "POST",
      signal,
      body: JSON.stringify({
        fileName: input.fileName,
        contentType: input.mimeType,
        fileSize: input.bytes.byteLength,
      }),
    });
    const allocation = (await presign.json()) as {
      presignedUrl?: unknown;
      objectName?: unknown;
      fileId?: unknown;
    };
    if (
      typeof allocation.presignedUrl !== "string" ||
      typeof allocation.objectName !== "string" ||
      typeof allocation.fileId !== "string"
    ) {
      throw new LeemageError("Media storage returned an invalid presign response.", 502, false);
    }

    await input.onAllocated?.({ fileId: allocation.fileId, objectName: allocation.objectName });
    signal.throwIfAborted();
    const uploaded = await this.fetchImpl(allocation.presignedUrl, {
      method: "PUT",
      signal: AbortSignal.any([signal, AbortSignal.timeout(runtimeLimits().fileMs)]),
      headers: { "Content-Type": input.mimeType },
      body: Uint8Array.from(input.bytes).buffer,
    });
    if (!uploaded.ok) {
      throw new LeemageError(
        `Media object upload failed (${uploaded.status}).`,
        uploaded.status,
        uploaded.status >= 500,
      );
    }

    const confirmed = await this.apiRequest(`/projects/${encodeURIComponent(this.config.projectId)}/files/confirm`, {
      method: "POST",
      signal,
      body: JSON.stringify({
        fileId: allocation.fileId,
        objectName: allocation.objectName,
        fileName: input.fileName,
        contentType: input.mimeType,
        fileSize: input.bytes.byteLength,
      }),
    });
    const confirmation = (await confirmed.json()) as { file?: { id?: unknown; url?: unknown } };
    if (typeof confirmation.file?.id !== "string" || typeof confirmation.file.url !== "string") {
      throw new LeemageError("Media storage returned an invalid confirm response.", 502, false);
    }
    if (confirmation.file.id !== allocation.fileId)
      throw new LeemageError("Media confirmation identity mismatch.", 502, false);
    return {
      projectId: this.config.projectId,
      fileId: confirmation.file.id,
      url: confirmation.file.url,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.bytes.byteLength,
    };
  }

  async deleteFile(projectId: string, fileId: string) {
    try {
      const response = await this.apiRequest(
        `/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(fileId)}`,
        {
          method: "DELETE",
        },
      );
      await response.body?.cancel();
    } catch (error) {
      if (!(error instanceof LeemageError && error.status === 404)) throw error;
    }
  }
}

export function createLeemageClient(fetchImpl?: FetchLike) {
  return new LeemageClient(leemageConfigFromEnv(), fetchImpl);
}
