import "server-only";

import { SYNTHESIS_PRESET } from "@/entities/recommendation/index.model";
import { ADMIN_CUSTOM_MIXING_LIMITS } from "../model/contract";

type ModalConfig = { url: string; key: string };

function modalConfig(): ModalConfig | null {
  const url = process.env.MODAL_API_URL?.replace(/\/$/, "");
  const key = process.env.MODAL_API_KEY;
  return url && key ? { url, key } : null;
}

export function modalUnavailableResponse() {
  return Response.json({ detail: "현재 커스텀 믹싱을 사용할 수 없어요." }, { status: 503 });
}

async function fetchReference(reference: { externalUrl: string; mimeType: string; fileName: string }) {
  let response: Response;
  try {
    response = await fetch(reference.externalUrl, { cache: "no-store", signal: AbortSignal.timeout(60_000) });
  } catch {
    return {
      error: Response.json({ detail: "보컬 reference를 불러오지 못했어요." }, { status: 502 }),
    };
  }
  if (!response.ok) return { error: Response.json({ detail: "보컬 reference를 불러오지 못했어요." }, { status: 502 }) };
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength === 0 || bytes.byteLength > ADMIN_CUSTOM_MIXING_LIMITS.referenceBytes) {
    return { error: Response.json({ detail: "보컬 reference 파일을 확인할 수 없어요." }, { status: 502 }) };
  }
  return {
    bytes,
    mimeType: reference.mimeType || response.headers.get("Content-Type")?.split(";")[0] || "audio/wav",
    fileName: reference.fileName || "reference.wav",
  };
}

function appendPreset(form: FormData) {
  for (const [name, value] of Object.entries(SYNTHESIS_PRESET)) form.append(name, String(value));
}

export async function submitAdminCustomMixing(
  reference: { externalUrl: string; mimeType: string; fileName: string },
  target: File,
) {
  const config = modalConfig();
  if (!config) return modalUnavailableResponse();
  const fetched = await fetchReference(reference);
  if ("error" in fetched) return fetched.error;

  const form = new FormData();
  form.append("prompt_audio", new Blob([fetched.bytes], { type: fetched.mimeType }), fetched.fileName);
  form.append("target_audio", target, target.name || "target-audio");
  appendPreset(form);

  let response: Response;
  try {
    response = await fetch(`${config.url}/v1/conversions`, {
      method: "POST",
      headers: { "X-API-Key": config.key },
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(15 * 60_000),
    });
  } catch {
    return Response.json({ detail: "커스텀 믹싱을 시작하지 못했어요." }, { status: 502 });
  }
  return new Response(response.body, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
  });
}

async function proxyConversion(_request: Request, id: string, method: "GET" | "DELETE") {
  const config = modalConfig();
  if (!config) return modalUnavailableResponse();
  const response = await fetch(`${config.url}/v1/conversions/${encodeURIComponent(id)}`, {
    method,
    headers: { "X-API-Key": config.key },
    cache: "no-store",
  });
  return new Response(response.body, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
  });
}

export function getAdminCustomMixingConversion(request: Request, id: string) {
  return proxyConversion(request, id, "GET");
}

export function deleteAdminCustomMixingConversion(request: Request, id: string) {
  return proxyConversion(request, id, "DELETE");
}

export async function getAdminCustomMixingAudio(request: Request, id: string) {
  const config = modalConfig();
  if (!config) return modalUnavailableResponse();
  const range = request.headers.get("Range");
  const response = await fetch(`${config.url}/v1/conversions/${encodeURIComponent(id)}/audio`, {
    headers: { "X-API-Key": config.key, ...(range ? { Range: range } : {}) },
    cache: "no-store",
  });
  const headers = new Headers();
  for (const name of ["Content-Type", "Content-Length", "Content-Range", "Accept-Ranges", "Content-Disposition"]) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(response.body, { status: response.status, headers });
}
