export class ApiError extends Error {}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
    credentials: "include",
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : null;

  if (!res.ok) {
    throw new ApiError((data && (data as { error?: string }).error) || `Request failed (${res.status})`);
  }
  return data as T;
}

export function apiPost<T = unknown>(path: string, body?: unknown) {
  return api<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
}

export function apiPatch<T = unknown>(path: string, body?: unknown) {
  return api<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });
}

export function apiDelete<T = unknown>(path: string) {
  return api<T>(path, { method: "DELETE" });
}

export async function uploadFile(file: File) {
  const form = new FormData();
  form.append("file", file);
  return api<{ url: string; mimeType: string; fileType: "image" | "file"; size: number; originalName: string }>(
    "/api/upload",
    { method: "POST", body: form }
  );
}
