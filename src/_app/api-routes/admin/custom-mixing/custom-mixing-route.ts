import {
  ADMIN_CUSTOM_MIXING_LIMITS,
  getAdminCustomMixingReference,
  submitAdminCustomMixing,
} from "@/features/admin-custom-mixing/index.server";
import { requireAdminApi } from "@/features/authentication/index.server";
import {
  MultipartBodyTooLargeError,
  multipartBodyLimit,
  readBoundedMultipartFormData,
} from "@/shared/api/index.server";

function invalidMultipartResponse() {
  return Response.json({ detail: "보컬 프로필과 target 음원을 확인해 주세요." }, { status: 400 });
}

function profileNotFoundResponse() {
  return Response.json({ detail: "선택한 보컬 프로필을 찾을 수 없거나 사용할 수 없어요." }, { status: 404 });
}

export async function POST(request: Request) {
  const access = await requireAdminApi(request);
  if (access.response) return access.response;

  const contentType = request.headers.get("content-type");
  if (!contentType?.startsWith("multipart/form-data") || !request.body) return invalidMultipartResponse();

  let form: FormData;
  try {
    form = await readBoundedMultipartFormData(request, multipartBodyLimit(ADMIN_CUSTOM_MIXING_LIMITS.targetBytes));
  } catch (error) {
    if (error instanceof MultipartBodyTooLargeError) {
      return Response.json({ detail: "target 음원은 256MB 이하여야 해요." }, { status: 400 });
    }
    return invalidMultipartResponse();
  }

  const profileValue = form.get("profileId");
  const profileId = typeof profileValue === "string" ? profileValue.trim() : "";
  const target = form.get("target_audio");
  if (!profileId || !(target instanceof File)) return invalidMultipartResponse();
  if (target.size === 0) {
    return Response.json({ detail: "target 음원 파일이 비어 있어요." }, { status: 400 });
  }
  if (target.size > ADMIN_CUSTOM_MIXING_LIMITS.targetBytes) {
    return Response.json({ detail: "target 음원은 256MB 이하여야 해요." }, { status: 400 });
  }
  if (!(target.type.startsWith("audio/") || /\.(wav|mp3|flac|m4a|ogg|aac|webm)$/i.test(target.name))) {
    return Response.json({ detail: "지원하지 않는 오디오 형식이에요." }, { status: 400 });
  }

  const reference = await getAdminCustomMixingReference(access.session.user.id, profileId);
  if (!reference) return profileNotFoundResponse();

  return submitAdminCustomMixing(reference, target);
}
