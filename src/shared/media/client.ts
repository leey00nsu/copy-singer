import "server-only";

export type LeemageConfig = {
  baseUrl: string;
  apiKey: string;
  projectId: string;
};

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

  private async apiRequest(path: string, init: RequestInit, maxAttempts = 3) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      let response: Response;
      try {
        response = await this.fetchImpl(`${this.config.baseUrl}${path}`, {
          ...init,
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            ...(init.body ? { "Content-Type": "application/json" } : {}),
            ...init.headers,
          },
          cache: "no-store",
        });
      } catch (error) {
        if (attempt + 1 < maxAttempts) {
          await sleep(200 * 2 ** attempt);
          continue;
        }
        throw new LeemageError(error instanceof Error ? error.message : "Media storage is unavailable.", null, true);
      }

      if (response.ok) return response;
      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt + 1 < maxAttempts) {
        await sleep(retryDelay(response, attempt));
        continue;
      }
      throw new LeemageError(await responseMessage(response), response.status, retryable);
    }
    throw new LeemageError("Media storage request exhausted its retry limit.", null, true);
  }

  async uploadFile(input: { fileName: string; mimeType: string; bytes: Uint8Array }): Promise<LeemageStoredFile> {
    const presign = await this.apiRequest(`/projects/${encodeURIComponent(this.config.projectId)}/files/presign`, {
      method: "POST",
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

    const uploaded = await this.fetchImpl(allocation.presignedUrl, {
      method: "PUT",
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
    await this.apiRequest(`/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
    });
  }
}

export function createLeemageClient(fetchImpl?: FetchLike) {
  return new LeemageClient(leemageConfigFromEnv(), fetchImpl);
}
