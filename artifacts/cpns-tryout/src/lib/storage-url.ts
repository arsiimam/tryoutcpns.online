export function resolveStorageUrl(path: string, baseUrl?: string): string {
  const appBase = import.meta.env.BASE_URL.replace(/\/$/, "");
  if (path.startsWith("http")) return path;

  if (path.startsWith("/api/storage")) {
    return `${appBase}${path}`;
  }

  if (path.startsWith("/objects/")) {
    return `${appBase}/api/storage${path}`;
  }

  return baseUrl
    ? `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
    : path;
}