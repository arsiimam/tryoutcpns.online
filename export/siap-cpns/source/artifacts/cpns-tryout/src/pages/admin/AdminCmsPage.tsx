import React, { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layouts/AdminLayout";
import {
  Copy, Check, Save, Eye, EyeOff, RefreshCw,
  Layers, Zap, BarChart2, MessageSquare, Package, HelpCircle, Megaphone, PanelBottom,
} from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL ?? "/";
function api(path: string) {
  return `${BASE_URL}api${path}`.replace(/\/+/g, "/").replace(":/", "://");
}

/* ── section metadata ───────────────────────────────────────────────── */
const SECTIONS = [
  { id: "hero",      label: "Hero",         icon: Layers,       desc: "Bagian utama halaman depan" },
  { id: "fitur",     label: "Keunggulan",   icon: Zap,          desc: "Daftar keunggulan / fitur" },
  { id: "statistik", label: "Statistik",    icon: BarChart2,    desc: "Counter angka-angka" },
  { id: "testimoni", label: "Testimoni",    icon: MessageSquare,desc: "Review & testimoni peserta" },
  { id: "paket",     label: "Paket Harga",  icon: Package,      desc: "Tabel/card harga paket" },
  { id: "faq",       label: "FAQ",          icon: HelpCircle,   desc: "Pertanyaan yang sering ditanya" },
  { id: "cta",       label: "CTA",          icon: Megaphone,    desc: "Call-to-action bawah halaman" },
  { id: "footer",    label: "Footer",       icon: PanelBottom,  desc: "Footer situs" },
] as const;

type SectionId = typeof SECTIONS[number]["id"];

/* ── helper: iframe srcdoc ──────────────────────────────────────────── */
function buildSrcdoc(html: string) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  body { margin: 0; font-family: 'Segoe UI', system-ui, sans-serif; font-size: 15px; background:#fff; color:#0f172a; }
  * { box-sizing: border-box; }
</style>
</head>
<body>${html}</body>
</html>`;
}

/* ── SectionEditor ──────────────────────────────────────────────────── */
function SectionEditor({
  sectionId,
  html,
  onChange,
}: {
  sectionId: SectionId;
  html: string;
  onChange: (val: string) => void;
}) {
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [copied, setCopied]     = useState(false);
  const [preview, setPreview]   = useState(false);
  const [error, setError]       = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      const r = await fetch(api("/admin/cms"), {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: sectionId, html }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Gagal");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const lineCount = html.split("\n").length;

  return (
    <div className="flex flex-col gap-3">
      {/* toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400 mr-auto">{lineCount} baris</span>

        <button
          onClick={() => setPreview(p => !p)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          {preview ? <EyeOff size={14} /> : <Eye size={14} />}
          {preview ? "Tutup Preview" : "Preview"}
        </button>

        <button
          onClick={copy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          {copied ? "Tersalin!" : "Copy HTML"}
        </button>

        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
          style={{ background: "#4f5eea" }}
        >
          {saving
            ? <RefreshCw size={14} className="animate-spin" />
            : saved
              ? <Check size={14} />
              : <Save size={14} />}
          {saving ? "Menyimpan…" : saved ? "Tersimpan!" : "Simpan"}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
      )}

      {/* editor */}
      <textarea
        value={html}
        onChange={e => onChange(e.target.value)}
        spellCheck={false}
        className="w-full font-mono text-sm border border-slate-200 rounded-xl p-4 resize-y focus:outline-none focus:ring-2"
        style={{
          minHeight: 260,
          background: "#1e1e2e",
          color: "#cdd6f4",
          lineHeight: 1.6,
          tabSize: 2,
        }}
        onKeyDown={e => {
          if (e.key === "Tab") {
            e.preventDefault();
            const el = e.currentTarget;
            const start = el.selectionStart;
            const end   = el.selectionEnd;
            const next  = html.slice(0, start) + "  " + html.slice(end);
            onChange(next);
            requestAnimationFrame(() => {
              el.selectionStart = el.selectionEnd = start + 2;
            });
          }
        }}
      />

      {/* preview iframe */}
      {preview && (
        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <span className="text-xs text-slate-400 ml-1">Preview — seksi {sectionId}</span>
          </div>
          <iframe
            srcDoc={buildSrcdoc(html)}
            title={`preview-${sectionId}`}
            className="w-full border-0"
            style={{ height: 340 }}
            sandbox="allow-scripts"
          />
        </div>
      )}
    </div>
  );
}

/* ── main page ──────────────────────────────────────────────────────── */
export function AdminCmsPage() {
  const [sections, setSections] = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(true);
  const [activeId, setActiveId] = useState<SectionId>("hero");

  useEffect(() => {
    fetch(api("/admin/cms"), { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        setSections(d.sections ?? {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const activeHtml    = sections[activeId] ?? "";
  const activeMeta    = SECTIONS.find(s => s.id === activeId)!;

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">

        {/* header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">CMS Landing Page</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Edit HTML setiap seksi landing page. Setiap seksi disimpan secara terpisah ke database.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-400">
            <RefreshCw size={20} className="animate-spin mr-2" /> Memuat konten…
          </div>
        ) : (
          <div className="flex gap-6 items-start">

            {/* ── sidebar nav ── */}
            <aside className="w-52 shrink-0">
              <nav className="flex flex-col gap-1">
                {SECTIONS.map(s => {
                  const isActive = s.id === activeId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveId(s.id)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition-all font-medium w-full"
                      style={{
                        background:  isActive ? "#eef1ff" : "transparent",
                        color:       isActive ? "#4147d5" : "#475569",
                        borderLeft:  isActive ? "3px solid #4f5eea" : "3px solid transparent",
                      }}
                    >
                      <s.icon size={15} />
                      {s.label}
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* ── editor panel ── */}
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "#eef1ff" }}
                  >
                    <activeMeta.icon size={17} style={{ color: "#4f5eea" }} />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 leading-tight">{activeMeta.label}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{activeMeta.desc}</p>
                  </div>
                </div>

                <SectionEditor
                  sectionId={activeId}
                  html={activeHtml}
                  onChange={val => setSections(prev => ({ ...prev, [activeId]: val }))}
                />
              </div>

              {/* hint */}
              <p className="text-xs text-slate-400 mt-3 px-1">
                💡 Paste HTML dari editor eksternal, klik <strong>Simpan</strong>, lalu reload landing page untuk melihat perubahan.
                Gunakan <strong>Preview</strong> untuk cek tampilan dasar sebelum simpan.
              </p>
            </div>

          </div>
        )}
      </div>
    </AdminLayout>
  );
}
