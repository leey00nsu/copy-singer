import { ZodError } from "zod";
import { SongCatalogAdminError } from "@/features/manage-song-catalog/index.server";

export function adminCatalogJson(value: unknown, status = 200) {
  return new Response(
    JSON.stringify(value, (_, item) => (typeof item === "bigint" ? item.toString() : item)),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}

export function adminCatalogError(error: unknown) {
  if (error instanceof SongCatalogAdminError) {
    return adminCatalogJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  if (error instanceof ZodError) {
    return adminCatalogJson(
      { error: { code: "INVALID_INPUT", message: "입력값을 확인해 주세요.", issues: error.issues } },
      400,
    );
  }
  if (error instanceof SyntaxError) {
    return adminCatalogJson({ error: { code: "INVALID_JSON", message: "올바른 JSON 요청이 아닙니다." } }, 400);
  }
  return adminCatalogJson({ error: { code: "INTERNAL_ERROR", message: "요청을 처리하지 못했습니다." } }, 500);
}
