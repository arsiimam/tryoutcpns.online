type UnknownRecord = Record<string, unknown>;

function parseMetadata(value: unknown): UnknownRecord {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as UnknownRecord
        : {};
    } catch {
      return {};
    }
  }
  return typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function imageList(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.flatMap((item) => {
    if (typeof item === "string") return item.trim() ? [item.trim()] : [];
    if (!item || typeof item !== "object") return [];
    const record = item as UnknownRecord;
    const url = record.url ?? record.path ?? record.objectPath ?? record.imageUrl;
    return typeof url === "string" && url.trim() ? [url.trim()] : [];
  });
}

/** Read current and legacy question-image metadata formats safely. */
export function getQuestionImages(metadata: unknown): string[] {
  const parsed = parseMetadata(metadata);
  return imageList(
    parsed.gambar_soal
      ?? parsed.gambar
      ?? parsed.questionImage
      ?? parsed.questionImages
      ?? parsed.images,
  );
}

/** Read current and legacy explanation-image metadata formats safely. */
export function getExplanationImages(metadata: unknown): string[] {
  const parsed = parseMetadata(metadata);
  const explanation = parseMetadata(parsed.pembahasan ?? parsed.explanation);
  return imageList(
    explanation.gambar_pembahasan
      ?? explanation.gambar
      ?? explanation.images,
  );
}

export function resolveStorageUrl(path: string, baseUrl?: string): string {
  const rawPath = String(path ?? "").trim();
  if (!rawPath) return "";

  // Keep absolute, data, and blob URLs untouched.
  if (/^(https?:|data:|blob:|\/\/)/i.test(rawPath)) return rawPath;

  const appBase = import.meta.env.BASE_URL.replace(/\/$/, "");
  const withAppBase = (urlPath: string) =>
    `${appBase}${urlPath.startsWith("/") ? urlPath : `/${urlPath}`}`;

  if (rawPath.startsWith("/api/storage")) return withAppBase(rawPath);
  if (rawPath.startsWith("/objects/")) return withAppBase(`/api/storage${rawPath}`);
  if (rawPath.startsWith("objects/")) return withAppBase(`/api/storage/${rawPath}`);
  if (rawPath.startsWith("/uploads/")) return withAppBase(`/api/storage/objects${rawPath}`);
  if (rawPath.startsWith("uploads/")) return withAppBase(`/api/storage/objects/${rawPath}`);

  // Imported/legacy records may contain only the object id/path.
  if (baseUrl) {
    return `${baseUrl.replace(/\/$/, "")}/${rawPath.replace(/^\/+/, "")}`;
  }
  return withAppBase(`/api/storage/objects/${rawPath.replace(/^\/+/, "")}`);
}