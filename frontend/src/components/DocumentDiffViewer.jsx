import { useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { AlertTriangle, Info, Eye, EyeOff, Loader2 } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Warna outline tiap bagian dokumen (mengikuti gambar perbandingan transkrip)
const SECTION_COLORS = {
  logo: '#ef4444',
  kop: '#65a30d',
  nomor_surat: '#4c1d95',
  identitas_mahasiswa: '#1e3a8a',
  keterangan_pendidikan: '#a21caf',
  tabel_nilai: '#dc2626',
  rekapitulasi: '#15803d',
  judul_skripsi: '#1e40af',
  skala_nilai: '#0f766e',
  pengesahan: '#7e22ce',
  lainnya: '#ea580c'
};

const STATUS_TEXT = {
  different: 'Berbeda',
  missing: 'Tidak ada di dokumen ini',
  added: 'Tidak ada di dokumen asli'
};

// Render satu halaman PDF ke canvas
function PdfPage({ pdf, pageIndex, children }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let task;
    let cancelled = false;
    (async () => {
      const page = await pdf.getPage(pageIndex + 1);
      if (cancelled) return;
      const viewport = page.getViewport({ scale: 2 });
      const canvas = canvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      task = page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport });
      await task.promise.catch(() => {});
    })();
    return () => {
      cancelled = true;
      if (task) task.cancel();
    };
  }, [pdf, pageIndex]);

  return (
    <div className="relative bg-white shadow-md border border-slate-200">
      <canvas ref={canvasRef} className="block w-full h-auto" />
      {children}
    </div>
  );
}

export default function DocumentDiffViewer({ file, comparison }) {
  const [pdf, setPdf] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [showSections, setShowSections] = useState(true);
  const [activeKey, setActiveKey] = useState(null);
  const boxRefs = useRef({});

  const differences = useMemo(
    () => (comparison?.fields || []).filter(f => f.status !== 'match').map((f, i) => ({ ...f, no: i + 1 })),
    [comparison]
  );

  // Outline per bagian: gabungan semua kotak field dalam satu bagian per halaman
  const sectionOutlines = useMemo(() => {
    const map = new Map();
    for (const f of comparison?.fields || []) {
      if (f.section === 'lainnya') continue;
      for (const b of f.boxes) {
        const id = `${f.section}:${b.page}`;
        const cur = map.get(id);
        if (!cur) map.set(id, { section: f.section, label: f.sectionLabel, page: b.page, x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.h });
        else {
          cur.x0 = Math.min(cur.x0, b.x);
          cur.y0 = Math.min(cur.y0, b.y);
          cur.x1 = Math.max(cur.x1, b.x + b.w);
          cur.y1 = Math.max(cur.y1, b.y + b.h);
        }
      }
    }
    return [...map.values()];
  }, [comparison]);

  useEffect(() => {
    if (!file || !comparison?.supported) return;
    let loadingTask;
    let cancelled = false;
    (async () => {
      try {
        const data = new Uint8Array(await file.arrayBuffer());
        loadingTask = pdfjsLib.getDocument({ data });
        const doc = await loadingTask.promise;
        if (!cancelled) setPdf(doc);
      } catch {
        if (!cancelled) setLoadError('Dokumen tidak dapat ditampilkan.');
      }
    })();
    return () => {
      cancelled = true;
      if (loadingTask) loadingTask.destroy();
    };
  }, [file, comparison]);

  if (!comparison) return null;

  if (!comparison.supported) {
    return (
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3 text-left">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">{comparison.reason}</p>
      </div>
    );
  }

  const focusField = (key) => {
    setActiveKey(key);
    boxRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const pct = (v, total) => `${(v / total) * 100}%`;
  const affected = comparison.summary.sectionsAffected;

  return (
    <div className="mt-6 text-left">
      {/* Ringkasan */}
      <div className={`rounded-xl p-5 border-2 flex items-start gap-3 ${differences.length ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-300'}`}>
        <AlertTriangle className={`w-6 h-6 flex-shrink-0 ${differences.length ? 'text-red-600' : 'text-amber-600'}`} />
        <div className="min-w-0">
          {differences.length ? (
            <>
              <p className="font-bold text-red-900">
                Ditemukan {differences.length} perbedaan pada {affected.length} bagian dokumen
              </p>
              <p className="text-sm text-red-700 mt-1">
                Field yang berbeda dari dokumen asli ditandai dengan kotak merah bernomor.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {affected.map(s => (
                  <span key={s} className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ background: SECTION_COLORS[s] }}>
                    {comparison.sections[s]}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="font-bold text-amber-900">Isi teks dan logo sama dengan dokumen asli</p>
              <p className="text-sm text-amber-800 mt-1">
                Namun file-nya tidak identik (hash berbeda), misalnya karena disimpan ulang, metadata diubah,
                atau ada perubahan visual non-teks. Dokumen tetap dinyatakan tidak sah.
              </p>
            </>
          )}
          {differences.length > 20 && (
            <p className="text-sm text-red-800 mt-2 font-medium">
              Perbedaannya sangat banyak. Pastikan Verification ID yang dimasukkan memang milik dokumen ini —
              kemungkinan ini dokumen lain, bukan sekadar dokumen yang diedit.
            </p>
          )}
          {comparison.pageCount.original !== comparison.pageCount.uploaded && (
            <p className="text-sm text-red-700 mt-2">
              Jumlah halaman berbeda: asli {comparison.pageCount.original} halaman, dokumen ini {comparison.pageCount.uploaded} halaman.
            </p>
          )}
        </div>
      </div>

      {/* Dokumen dengan penanda */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <h4 className="font-bold text-slate-900">Dokumen yang Diupload</h4>
        <button
          type="button"
          onClick={() => setShowSections(v => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          {showSections ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showSections ? 'Sembunyikan bagian' : 'Tampilkan bagian'}
        </button>
      </div>

      <div className="mt-3 space-y-4 bg-slate-100 p-3 rounded-xl overflow-hidden">
        {loadError && <p className="text-sm text-red-600">{loadError}</p>}
        {!pdf && !loadError && (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-slate-400 animate-spin" /></div>
        )}
        {pdf && comparison.pages.map((pg, pageIndex) => (
          <PdfPage key={pageIndex} pdf={pdf} pageIndex={pageIndex}>
            {showSections && sectionOutlines.filter(o => o.page === pageIndex).map(o => (
              <div
                key={`${o.section}-${pageIndex}`}
                className="absolute pointer-events-none border-2 rounded-sm"
                style={{
                  left: pct(o.x0 - 3, pg.width), top: pct(o.y0 - 3, pg.height),
                  width: pct(o.x1 - o.x0 + 6, pg.width), height: pct(o.y1 - o.y0 + 6, pg.height),
                  borderColor: SECTION_COLORS[o.section], opacity: 0.55
                }}
              />
            ))}
            {differences.flatMap(f => f.boxes.filter(b => b.page === pageIndex).map((b, i) => (
              <button
                type="button"
                key={`${f.key}-${i}`}
                ref={i === 0 ? el => { boxRefs.current[f.key] = el; } : undefined}
                onClick={() => setActiveKey(f.key)}
                title={`${f.label}\nAsli: ${f.original ?? '—'}\nDokumen ini: ${f.uploaded ?? '—'}`}
                className={`absolute border-2 border-red-600 rounded-sm transition-colors ${activeKey === f.key ? 'bg-red-500/40 ring-4 ring-red-300' : 'bg-red-500/15 hover:bg-red-500/30'}`}
                style={{ left: pct(b.x, pg.width), top: pct(b.y, pg.height), width: pct(b.w, pg.width), height: pct(b.h, pg.height) }}
              >
                {i === 0 && (
                  <span className="absolute -top-2 -left-2 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[10px] leading-4 font-bold text-center">
                    {f.no}
                  </span>
                )}
              </button>
            )))}
          </PdfPage>
        ))}
      </div>

      {/* Daftar perbedaan */}
      {differences.length > 0 && (
        <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium w-8">#</th>
                  <th className="px-3 py-2.5 text-left font-medium">Bagian / Field</th>
                  <th className="px-3 py-2.5 text-left font-medium">Data Asli (Terdaftar)</th>
                  <th className="px-3 py-2.5 text-left font-medium">Di Dokumen Ini</th>
                </tr>
              </thead>
              <tbody>
                {differences.map(f => (
                  <tr
                    key={f.key}
                    onClick={() => focusField(f.key)}
                    className={`border-t border-slate-100 cursor-pointer align-top ${activeKey === f.key ? 'bg-red-50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-3 py-2.5">
                      <span className="inline-block min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[11px] leading-5 font-bold text-center">{f.no}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-xs font-medium" style={{ color: SECTION_COLORS[f.section] }}>{f.sectionLabel}</div>
                      <div className="text-slate-900 font-medium">{f.label}</div>
                      <div className="text-xs text-slate-400">{STATUS_TEXT[f.status]}</div>
                    </td>
                    <td className="px-3 py-2.5 text-emerald-800 break-words max-w-xs">{f.original || <span className="text-slate-400">—</span>}</td>
                    <td className="px-3 py-2.5 text-red-700 font-medium break-words max-w-xs">{f.uploaded || <span className="text-slate-400">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
