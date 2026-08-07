import "server-only";

export async function proxyPrivateAudio(input: {
  request: Request;
  externalUrl: string;
  mimeType: string;
  fileName: string;
  fetchImpl?: typeof fetch;
}) {
  const range = input.request.headers.get("Range");
  const upstream = await (input.fetchImpl ?? fetch)(input.externalUrl, {
    headers: range ? { Range: range } : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });
  if (!upstream.ok && upstream.status !== 206) return null;

  const headers = new Headers();
  for (const name of ["Content-Type", "Content-Length", "Content-Range", "Accept-Ranges"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has("Content-Type")) headers.set("Content-Type", input.mimeType);
  headers.set("Content-Disposition", `inline; filename="${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}"`);
  headers.set("Cache-Control", "private, no-store");
  return new Response(upstream.body, { status: upstream.status, headers });
}
