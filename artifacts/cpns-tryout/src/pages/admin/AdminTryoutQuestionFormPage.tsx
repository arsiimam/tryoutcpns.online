/**
 * AdminTryoutQuestionFormPage — Add / Edit a single question in a tryout section.
 * Adapted from AdminQuestionFormPage, uses tryout-specific API.
 */
import React from "react";
import { useParams, useLocation } from "wouter";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import { KatexRenderer } from "../../components/KatexRenderer";
import { QuestionRenderer } from "../../components/QuestionRenderer";
import {
  ArrowLeft, Plus, Trash2, Eye, Save,
  Upload, X, Image as ImageIcon, ChevronUp, ChevronDown,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ── LaTeX toolbar ─────────────────────────────────────── */
const LATEX_SYMBOLS = [
  { label: "½",  insert: "\\frac{a}{b}" },
  { label: "√",  insert: "\\sqrt{x}" },
  { label: "xⁿ", insert: "x^{n}" },
  { label: "∫",  insert: "\\int_{a}^{b}" },
  { label: "Σ",  insert: "\\sum_{i=1}^{n}" },
  { label: "π",  insert: "\\pi" },
  { label: "≤",  insert: "\\leq" },
  { label: "≥",  insert: "\\geq" },
  { label: "≠",  insert: "\\neq" },
  { label: "±",  insert: "\\pm" },
  { label: "∞",  insert: "\\infty" },
  { label: "°",  insert: "^{\\circ}" },
];

function LatexToolbar({ onInsert }: { onInsert: (s: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 mb-1">
      {LATEX_SYMBOLS.map(sym => (
        <button key={sym.insert} type="button" onClick={() => onInsert(sym.insert)}
          className="px-2 py-0.5 rounded text-xs border border-slate-200 hover:bg-slate-100 font-mono"
          title={sym.insert}>{sym.label}</button>
      ))}
    </div>
  );
}

function LatexField({ label, value, onChange, rows = 3, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  function insertAtCursor(text: string) {
    const el = ref.current; if (!el) return;
    const start = el.selectionStart; const end = el.selectionEnd;
    const next = value.slice(0, start) + `$${text}$` + value.slice(end);
    onChange(next);
    setTimeout(() => { el.focus(); el.setSelectionRange(start + text.length + 2, start + text.length + 2); }, 0);
  }
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-500 uppercase">{label}</label>
      <LatexToolbar onInsert={insertAtCursor} />
      <textarea ref={ref} rows={rows} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-300" />
      {value && (
        <div className="border border-slate-100 rounded-lg p-3 bg-slate-50 text-sm">
          <span className="text-xs text-slate-400 block mb-1">Preview:</span>
          <KatexRenderer content={value} className="prose prose-sm max-w-none" />
        </div>
      )}
    </div>
  );
}

function ImageUploader({ value, onChange, label }: { value: string; onChange: (url: string) => void; label: string }) {
  const [uploading, setUploading] = React.useState(false);
  const [err, setErr] = React.useState("");
  async function handleFile(file: File) {
    setErr(""); setUploading(true);
    try {
      const res = await fetch(`${BASE}/api/storage/uploads/request-url`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      const { uploadURL, objectPath } = await res.json();
      await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      onChange(`/api/storage${objectPath}`);
    } catch { setErr("Upload gagal."); }
    finally { setUploading(false); }
  }
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-500 uppercase">{label}</label>
      {value ? (
        <div className="flex items-start gap-2">
          <img src={`${BASE}${value}`} alt="preview" className="h-24 rounded border border-slate-200 object-contain" />
          <button type="button" onClick={() => onChange("")} className="text-red-400 hover:text-red-600"><X size={16} /></button>
        </div>
      ) : (
        <label className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 text-sm text-slate-500">
          <ImageIcon size={16} />
          {uploading ? "Mengupload..." : "Pilih gambar"}
          <input type="file" accept="image/*" className="hidden" disabled={uploading}
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </label>
      )}
      {err && <p className="text-xs text-red-500">{err}</p>}
    </div>
  );
}

interface Option { key: string; text: string; imageUrl: string }
interface Step   { text: string }

function defaultOptions(): Option[] {
  return ["A", "B", "C", "D"].map(k => ({ key: k, text: "", imageUrl: "" }));
}

/* ── Main ──────────────────────────────────────────────── */
export function AdminTryoutQuestionFormPage() {
  const params = useParams<{ tryoutId: string; sectionId?: string; questionId?: string }>();
  const [, navigate] = useLocation();
  const { tryoutId, sectionId, questionId } = params;

  const [tryoutName,  setTryoutName]  = React.useState("");
  const [sectionName, setSectionName] = React.useState("");

  const [subtes,     setSubtes]     = React.useState("");
  const [difficulty, setDifficulty] = React.useState("sedang");
  const [tags,       setTags]       = React.useState<string[]>([]);
  const [tagInput,   setTagInput]   = React.useState("");
  const [type,       setType]       = React.useState("pilihan_ganda");
  const [stem,       setStem]       = React.useState("");
  const [stemImage,  setStemImage]  = React.useState("");
  const [options,    setOptions]    = React.useState<Option[]>(defaultOptions);
  const [correctKey,  setCorrectKey]  = React.useState("A");
  const [correctKeys, setCorrectKeys] = React.useState<string[]>(["A"]);
  const [ringkasan,   setRingkasan]   = React.useState("");
  const [steps,       setSteps]       = React.useState<Step[]>([{ text: "" }]);
  const [pembahasanImage, setPembahasanImage] = React.useState("");

  const [saving,    setSaving]    = React.useState(false);
  const [saveError, setSaveError] = React.useState("");
  const [showPreview, setShowPreview] = React.useState(false);

  /* Load data */
  React.useEffect(() => {
    // Load tryout name + section name
    fetch(`${BASE}/api/admin/tryouts/${tryoutId}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        setTryoutName(d.name ?? "");
        if (sectionId) {
          const sec = d.sections?.find((s: any) => String(s.id) === sectionId);
          if (sec) setSectionName(sec.name ?? "");
        }
      });

    if (questionId) {
      fetch(`${BASE}/api/admin/tryouts/${tryoutId}/questions/${questionId}`, { credentials: "include" })
        .then(r => r.json())
        .then(q => {
          setStem(q.content ?? "");
          setType(q.type ?? "pilihan_ganda");
          setOptions(
            Array.isArray(q.options) && q.options.length
              ? q.options.map((o: any) => ({ key: o.key, text: o.text ?? "", imageUrl: o.imageUrl ?? "" }))
              : defaultOptions()
          );
          const ca = q.correctAnswer ?? "A";
          const isPgk = (q.type ?? "") === "pilihan_ganda_kompleks";
          const caKeys = isPgk && typeof ca === "string" && ca.includes(",") ? ca.split(",") : [ca];
          setCorrectKey(caKeys[0] ?? "A");
          setCorrectKeys(caKeys);
          const meta = q.metadata ?? {};
          setRingkasan(meta.pembahasan?.ringkasan ?? "");
          setSteps(
            meta.pembahasan?.langkah?.length
              ? meta.pembahasan.langkah.map((t: string) => ({ text: t }))
              : q.explanation ? [{ text: q.explanation }] : [{ text: "" }]
          );
          setStemImage(meta.gambar_soal?.[0] ?? "");
          setPembahasanImage(meta.pembahasan?.gambar_pembahasan?.[0] ?? "");
          setSubtes(meta.subtes ?? "");
          setDifficulty(meta.tingkat_kesulitan ?? "sedang");
          setTags(meta.pembahasan?.tag ?? []);
        });
    }
  }, [tryoutId, sectionId, questionId]);

  /* Option helpers */
  function addOption() {
    const key = "ABCDEFGHIJ"[options.length] ?? String(options.length + 1);
    setOptions(prev => [...prev, { key, text: "", imageUrl: "" }]);
  }
  function removeOption(i: number) { if (options.length > 2) setOptions(prev => prev.filter((_, j) => j !== i)); }
  function updateOption(i: number, field: keyof Option, val: string) {
    setOptions(prev => prev.map((o, j) => j === i ? { ...o, [field]: val } : o));
  }

  /* Step helpers */
  function addStep()  { setSteps(prev => [...prev, { text: "" }]); }
  function removeStep(i: number) { if (steps.length > 1) setSteps(prev => prev.filter((_, j) => j !== i)); }
  function updateStep(i: number, val: string) { setSteps(prev => prev.map((s, j) => j === i ? { text: val } : s)); }
  function moveStep(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    setSteps(prev => { const a = [...prev]; [a[i], a[j]] = [a[j], a[i]]; return a; });
  }

  /* Tag helpers */
  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput("");
  }

  /* Build payload */
  function buildPayload() {
    const finalCorrectAnswer = type === "pilihan_ganda_kompleks" ? correctKeys : correctKey;
    const langkah = steps.map(s => s.text).filter(Boolean);
    return {
      type,
      content: stem,
      options: options.map(o => ({ key: o.key, text: o.text, ...(o.imageUrl ? { imageUrl: o.imageUrl } : {}) })),
      correctAnswer: finalCorrectAnswer,
      explanation: langkah.join("\n\n"),
      metadata: {
        subtes,
        tingkat_kesulitan: difficulty,
        ...(stemImage ? { gambar_soal: [stemImage] } : {}),
        pembahasan: {
          ringkasan,
          langkah,
          ...(pembahasanImage ? { gambar_pembahasan: [pembahasanImage] } : {}),
          tag: tags,
        },
      },
    };
  }

  async function handleSave() {
    if (!stem.trim()) { setSaveError("Teks soal tidak boleh kosong."); return; }
    setSaving(true); setSaveError("");
    try {
      const url = questionId
        ? `${BASE}/api/admin/tryouts/${tryoutId}/questions/${questionId}`
        : `${BASE}/api/admin/tryouts/${tryoutId}/sections/${sectionId}/questions`;
      const res = await fetch(url, {
        method: questionId ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) { const d = await res.json(); setSaveError(d.error ?? "Gagal menyimpan."); return; }
      navigate(`/admin/tryouts/${tryoutId}`);
    } catch (e: any) { setSaveError(e.message); }
    finally { setSaving(false); }
  }

  const previewQuestion = {
    content: stem,
    options: options.map(o => ({ key: o.key, text: o.text, imageUrl: o.imageUrl || undefined })),
    correctAnswer: type === "pilihan_ganda_kompleks" ? correctKeys[0] : correctKey,
    explanation: steps.map(s => s.text).filter(Boolean).join("\n"),
    metadata: {
      gambar_soal: stemImage ? [stemImage] : [],
      pembahasan: {
        ringkasan,
        langkah: steps.map(s => s.text).filter(Boolean),
        gambar_pembahasan: pembahasanImage ? [pembahasanImage] : [],
        tag: tags,
      },
    },
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/admin/tryouts/${tryoutId}`)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {questionId ? "Edit Soal" : "Tambah Soal Baru"}
            </h1>
            <p className="text-sm text-slate-500">
              {tryoutName}{sectionName ? ` › ${sectionName}` : ""}
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
              <Eye size={15} /> Preview Soal
            </button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: saving ? "#94a3b8" : "#1E4D9C" }}>
              <Save size={15} /> {saving ? "Menyimpan..." : "Simpan Soal"}
            </button>
          </div>
        </div>

        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{saveError}</div>
        )}

        {/* Info dasar */}
        <section className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
          <h2 className="font-semibold text-slate-700 text-sm">Info Dasar</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Subtes</label>
              <input value={subtes} onChange={e => setSubtes(e.target.value)}
                placeholder="cth: Penalaran Matematika"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Tingkat Kesulitan</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="mudah">Mudah</option>
                <option value="sedang">Sedang</option>
                <option value="sulit">Sulit</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Tipe Soal</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="pilihan_ganda">Pilihan Ganda</option>
                <option value="pilihan_ganda_kompleks">Pilihan Ganda Kompleks</option>
                <option value="isian_singkat">Isian Singkat</option>
                <option value="benar_salah">Benar/Salah</option>
              </select>
            </div>
          </div>
          {/* Tags */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Tag</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map(t => (
                <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                  {t}
                  <button type="button" onClick={() => setTags(prev => prev.filter(x => x !== t))}><X size={11} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Ketik tag lalu Enter"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              <button type="button" onClick={addTag} className="px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50">
                <Plus size={15} />
              </button>
            </div>
          </div>
        </section>

        {/* Stem */}
        <section className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
          <h2 className="font-semibold text-slate-700 text-sm">Teks Soal</h2>
          <LatexField label="Soal" value={stem} onChange={setStem} rows={4}
            placeholder="Tulis soal di sini. Gunakan $...$ untuk rumus inline, $$...$$ untuk block." />
          <ImageUploader value={stemImage} onChange={setStemImage} label="Gambar Soal (opsional)" />
        </section>

        {/* Options */}
        <section className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-700 text-sm">Pilihan Jawaban</h2>
            {type !== "isian_singkat" && (
              <button type="button" onClick={addOption} disabled={options.length >= 10}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600">
                <Plus size={13} /> Tambah Opsi
              </button>
            )}
          </div>
          {type === "isian_singkat" ? (
            <LatexField label="Jawaban Benar" value={correctKey} onChange={setCorrectKey} rows={1} />
          ) : (
            <div className="space-y-4">
              {options.map((opt, i) => {
                const isCorrect = type === "pilihan_ganda_kompleks" ? correctKeys.includes(opt.key) : correctKey === opt.key;
                return (
                  <div key={opt.key} className="border border-slate-100 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2"
                        style={{ borderColor: isCorrect ? "#16a34a" : "#e2e8f0", color: isCorrect ? "#16a34a" : "#64748b", background: isCorrect ? "#f0fdf4" : "white" }}>
                        {opt.key}
                      </div>
                      <span className="text-xs font-semibold text-slate-500">Opsi {opt.key}</span>
                      {type === "pilihan_ganda_kompleks" ? (
                        <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                          <input type="checkbox" checked={correctKeys.includes(opt.key)} className="accent-green-600"
                            onChange={e => setCorrectKeys(prev => e.target.checked ? [...prev, opt.key] : prev.filter(k => k !== opt.key))} />
                          Benar
                        </label>
                      ) : (
                        <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                          <input type="radio" name="correctAnswer" checked={correctKey === opt.key} className="accent-green-600"
                            onChange={() => setCorrectKey(opt.key)} />
                          Jawaban Benar
                        </label>
                      )}
                      {options.length > 2 && (
                        <button type="button" onClick={() => removeOption(i)} className="text-red-400 hover:text-red-600 ml-2">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <LatexField label={`Teks Opsi ${opt.key}`} value={opt.text}
                      onChange={v => updateOption(i, "text", v)} rows={2} placeholder={`Teks untuk pilihan ${opt.key}`} />
                    <ImageUploader value={opt.imageUrl} onChange={v => updateOption(i, "imageUrl", v)} label="Gambar opsi (opsional)" />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Explanation */}
        <section className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
          <h2 className="font-semibold text-slate-700 text-sm">Pembahasan</h2>
          <LatexField label="Ringkasan Pendekatan" value={ringkasan} onChange={setRingkasan} rows={1}
            placeholder="Satu kalimat strategi/pendekatan solusi" />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">Langkah-langkah</span>
              <button type="button" onClick={addStep}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600">
                <Plus size={13} /> Tambah Langkah
              </button>
            </div>
            {steps.map((step, i) => (
              <div key={i} className="flex gap-2">
                <div className="flex flex-col gap-1 pt-1">
                  <button type="button" onClick={() => moveStep(i, -1)} disabled={i === 0} className="text-slate-300 hover:text-slate-500 disabled:opacity-30">
                    <ChevronUp size={14} />
                  </button>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: "#1E4D9C" }}>{i + 1}</div>
                  <button type="button" onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1} className="text-slate-300 hover:text-slate-500 disabled:opacity-30">
                    <ChevronDown size={14} />
                  </button>
                </div>
                <div className="flex-1">
                  <LatexField label={`Langkah ${i + 1}`} value={step.text} onChange={v => updateStep(i, v)}
                    rows={2} placeholder={`Langkah ${i + 1}...`} />
                </div>
                {steps.length > 1 && (
                  <button type="button" onClick={() => removeStep(i)} className="text-red-400 hover:text-red-600 mt-6">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <ImageUploader value={pembahasanImage} onChange={setPembahasanImage} label="Gambar Pendukung Pembahasan (opsional)" />
        </section>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold">Preview Soal</h2>
              <button onClick={() => setShowPreview(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <QuestionRenderer question={previewQuestion} selectedKey={correctKey} showAnswer />
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowPreview(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50">Tutup</button>
              <button onClick={() => { setShowPreview(false); handleSave(); }}
                className="px-4 py-2 rounded-lg text-sm text-white font-medium" style={{ background: "#1E4D9C" }}>
                Simpan Soal
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
