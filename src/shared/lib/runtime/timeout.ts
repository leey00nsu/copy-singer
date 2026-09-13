export async function withDeadline<T>(
  milliseconds: number,
  operation: (signal: AbortSignal) => Promise<T>,
  parent?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort(parent?.reason);
  if (parent?.aborted) abort();
  else parent?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(
    () => controller.abort(new DOMException("Operation deadline exceeded", "TimeoutError")),
    milliseconds,
  );
  try {
    controller.signal.throwIfAborted();
    return await operation(controller.signal);
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener("abort", abort);
  }
}

// The signal remains attached to the response body until it is consumed/canceled.
export function boundedFetch(url: string | URL, init: RequestInit = {}, milliseconds = 15_000) {
  const deadline = AbortSignal.timeout(milliseconds);
  return fetch(url, { ...init, signal: init.signal ? AbortSignal.any([init.signal, deadline]) : deadline });
}
