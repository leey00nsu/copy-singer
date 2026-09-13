import { getRequestSession, unauthorizedResponse } from "@/features/authentication/index.server";
import {
  AdmissionError,
  admissionResponse,
  requestBuckets,
  requestPolicy,
  trustedClientIp,
  uploadSlots,
} from "@/shared/lib/admission/index.server";

export function withApiAdmission<Args extends unknown[]>(
  handler: (request: Request, ...args: Args) => Promise<Response>,
) {
  return async (request: Request, ...args: Args): Promise<Response> => {
    let release: (() => void) | undefined;
    try {
      const ip = trustedClientIp(request.headers);
      if (ip) requestBuckets.take(`ip:${ip}`, 600, 120);
      const session = await getRequestSession(request);
      if (!session) return unauthorizedResponse();
      const policy = requestPolicy(new URL(request.url).pathname, request.method);
      requestBuckets.take(`user:${session.user.id}:${policy.group}`, policy.rate, policy.burst);
      if (request.headers.get("Content-Type")?.toLowerCase().startsWith("multipart/form-data"))
        release = uploadSlots.acquire(session.user.id);
      return await handler(request, ...args);
    } catch (error) {
      if (error instanceof AdmissionError) return admissionResponse(error);
      throw error;
    } finally {
      release?.();
    }
  };
}

export function withAuthAdmission(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      const ip = trustedClientIp(request.headers);
      requestBuckets.take(`auth:${ip ?? "untrusted-ingress"}`, 120, 30);
      return await handler(request);
    } catch (error) {
      if (error instanceof AdmissionError) return admissionResponse(error);
      throw error;
    }
  };
}
