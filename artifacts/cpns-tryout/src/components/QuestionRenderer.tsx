/**
 * QuestionRenderer — shared component for rendering a question card.
 * Supports:
 *  - KaTeX inline/block math in stem, options, explanation steps
 *  - Images (gambar_soal, gambar_pembahasan) with lightbox
 *  - Step-by-step explanation (pembahasan.langkah array in metadata)
 *  - Legacy plain HTML content (dangerouslySetInnerHTML pass-through)
 */
import React from "react";
import { KatexRenderer } from "./KatexRenderer";
import { X, ZoomIn } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface QuestionOption {
  key: string;
  text: string;
  /** Optional image URL for this option */
  imageUrl?: string;
}

export type AnswerState = "unanswered" | "correct" | "incorrect" | "selected";

export interface QuestionData {
  /** Question stem — may contain LaTeX or HTML */
  content: string;
  options: QuestionOption[];
  correctAnswer: string;
  /** Legacy single-string explanation (HTML or text) */
  explanation?: string;
  /** Structured metadata from the new format */
  metadata?: {
    gambar_soal?: string[];
    pembahasan?: {
      ringkasan?: string;
      langkah?: string[];
      gambar_pembahasan?: string[];
      tag?: string[];
    };
  };
}

// ── Lightbox ───────────────────────────────────────────────────────────────

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white"
        onClick={onClose}
      >
        <X size={28} />
      </button>
      <img
        src={src}
        alt="Preview"
        className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}

// ── Image gallery ──────────────────────────────────────────────────────────

function ImageGallery({ images, baseUrl }: { images: string[]; baseUrl?: string }) {
  const [lightbox, setLightbox] = React.useState<string | null>(null);

  if (!images || images.length === 0) return null;

  function resolveUrl(path: string) {
    if (path.startsWith("http") || path.startsWith("/api/storage")) return path;
    return baseUrl ? `${baseUrl}/${path}` : path;
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-2">
        {images.map((img, i) => (
          <div key={i} className="relative group cursor-zoom-in" onClick={() => setLightbox(resolveUrl(img))}>
            <img
              src={resolveUrl(img)}
              alt={`Gambar ${i + 1}`}
              className="h-32 w-auto max-w-xs object-contain rounded-lg border border-slate-200 bg-slate-50"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 rounded-lg transition-opacity">
              <ZoomIn size={20} className="text-white drop-shadow" />
            </div>
          </div>
        ))}
      </div>
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface QuestionRendererProps {
  question: QuestionData;
  /** Currently selected answer key */
  selectedKey?: string;
  /** Whether to show correct/incorrect highlighting */
  showAnswer?: boolean;
  /** Called when user clicks an option */
  onSelect?: (key: string) => void;
  questionNumber?: number | string;
  /** Base URL for serving stored images */
  storageBaseUrl?: string;
}

export function QuestionRenderer({
  question,
  selectedKey,
  showAnswer = false,
  onSelect,
  questionNumber,
  storageBaseUrl = "/api/storage/objects",
}: QuestionRendererProps) {
  const { content, options, correctAnswer, explanation, metadata } = question;
  const pembahasan = metadata?.pembahasan;
  const gambarSoal = metadata?.gambar_soal ?? [];
  const gambarPembahasan = pembahasan?.gambar_pembahasan ?? [];
  const langkah = pembahasan?.langkah ?? [];
  const tag = pembahasan?.tag ?? [];

  function optionState(key: string): AnswerState {
    if (!showAnswer) {
      return key === selectedKey ? "selected" : "unanswered";
    }
    if (key === correctAnswer) return "correct";
    if (key === selectedKey && key !== correctAnswer) return "incorrect";
    return "unanswered";
  }

  const optionStyle: Record<AnswerState, { border: string; bg: string; label: string }> = {
    unanswered: { border: "#e2e8f0", bg: "#ffffff", label: "#64748b" },
    selected:   { border: "#1E4D9C", bg: "#EFF4FF", label: "#1E4D9C" },
    correct:    { border: "#16a34a", bg: "#f0fdf4", label: "#16a34a" },
    incorrect:  { border: "#dc2626", bg: "#fef2f2", label: "#dc2626" },
  };

  return (
    <div className="space-y-4">
      {/* Question number + stem */}
      <div>
        {questionNumber !== undefined && (
          <div className="text-xs font-semibold text-slate-400 uppercase mb-1">
            Soal {questionNumber}
          </div>
        )}
        <KatexRenderer content={content} className="prose prose-sm max-w-none text-slate-800" />
        <ImageGallery images={gambarSoal} baseUrl={storageBaseUrl} />
      </div>

      {/* Options */}
      {options.length > 0 && (
        <div className="space-y-2">
          {options.map(opt => {
            const state = optionState(opt.key);
            const style = optionStyle[state];
            return (
              <button
                key={opt.key}
                onClick={() => onSelect?.(opt.key)}
                disabled={showAnswer}
                className="w-full flex items-start gap-3 p-3 rounded-lg border text-sm text-left transition-colors"
                style={{
                  borderColor: style.border,
                  background: style.bg,
                  cursor: showAnswer ? "default" : "pointer",
                }}
              >
                <span
                  className="font-bold w-5 shrink-0 mt-0.5"
                  style={{ color: style.label }}
                >
                  {opt.key}
                </span>
                <div className="flex-1">
                  <KatexRenderer content={opt.text} block={false} />
                  {opt.imageUrl && (
                    <img
                      src={opt.imageUrl}
                      alt={`Opsi ${opt.key}`}
                      className="mt-1 max-h-24 rounded border border-slate-200"
                      loading="lazy"
                    />
                  )}
                </div>
                {showAnswer && state === "correct" && (
                  <span className="text-green-600 shrink-0 font-bold text-lg leading-none">✓</span>
                )}
                {showAnswer && state === "incorrect" && (
                  <span className="text-red-500 shrink-0 font-bold text-lg leading-none">✗</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Explanation — shown when showAnswer = true */}
      {showAnswer && (explanation || langkah.length > 0 || pembahasan?.ringkasan) && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: "rgba(30,77,156,0.06)", border: "1px solid rgba(30,77,156,0.15)" }}
        >
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#1E4D9C" }}>
            Pembahasan
          </p>

          {/* Ringkasan */}
          {pembahasan?.ringkasan && (
            <KatexRenderer
              content={pembahasan.ringkasan}
              className="text-sm font-medium text-slate-700 italic"
            />
          )}

          {/* Step-by-step (structured) */}
          {langkah.length > 0 ? (
            <ol className="space-y-2">
              {langkah.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-700">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 text-white"
                    style={{ background: "#1E4D9C" }}
                  >
                    {i + 1}
                  </span>
                  <KatexRenderer content={step} block={false} className="flex-1 leading-relaxed" />
                </li>
              ))}
            </ol>
          ) : explanation ? (
            /* Legacy HTML explanation */
            <KatexRenderer content={explanation} className="prose prose-sm max-w-none text-slate-700" />
          ) : null}

          {/* Explanation images */}
          <ImageGallery images={gambarPembahasan} baseUrl={storageBaseUrl} />

          {/* Tags */}
          {tag.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tag.map(t => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: "rgba(30,77,156,0.1)", color: "#1E4D9C" }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
