import { useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { AlertTriangle, Info, Eye, EyeOff, Loader2 } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Warna outline tiap bagian dokumen (mengikuti standar institusional)
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
  lainnya: '#ea580c',
};

const STATUS_TEXT = {
  different: 'Berbeda',
  missing: 'Tidak ada di dokumen ini',
  added: 'Tidak ada di dokumen asli',
};

// Render satu halaman PDF ke canvas
function PdfPage({ pdf, pageIndex, children }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let task;
    let cancelled = false;
    (async () => {
      try {
        const page = await pdf.getPage(pageIndex + 1);
        if (cancelled) return;
        const viewport = page.getViewport({ scale: 2 });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        task = page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport });
        await task.promise.catch(() => {});
      } catch {
        // Render cancelled
      }
    })();
    return () => {
      cancelled = true;
      if (task) task.cancel();
    };
  }, [pdf, pageIndex]);

  return (
    <div className="relative bg-white shadow-md border border-slate-200 w-full overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-auto" />
      {children}
    </div>
  );
}

export default function DocumentDiffViewer({ file, comparison }) {
  const [pdf, setPdf] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [showSections, setShowSections] = useState(true);
  const [activeGroupKey, setActiveGroupKey] = useState(null);
  const groupRefs = useRef({});

  // 1. Ambil semua field yang berbeda dari data asli
  const rawDifferences = useMemo(
    () => (comparison?.fields || []).filter((f) => f.status !== 'match'),
    [comparison]
  );

  // 2. KELOMPOKKAN PERBEDAAN UNTUK PENANDAAN DI PREVIEW PDF:
  // Jika dalam satu bagian (seperti tabel nilai) terdapat banyak sel berbeda (misal 107 perbedaan),
  // kelompokkan per (section, page) agar menjadi SATU kotak pembungkus dengan SATU badge nomor,
  // sehingga badge angka tidak bertumpuk menjadi gumpalan merah di atas pratinjau dokumen.
  const { differenceGroups, fieldToGroupMap } = useMemo(() => {
    const groupsMap = new Map();
    const fMap = new Map();

    rawDifferences.forEach((f) => {
      // Kelompokkan berdasarkan section dan page kotak pertamanya (atau 'default:0')
      const firstBox = f.boxes?.[0];
      const page = firstBox ? firstBox.page : 0;
      const groupKey = `${f.section || 'lainnya'}:${page}`;

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          key: groupKey,
          section: f.section || 'lainnya',
          sectionLabel: f.sectionLabel || 'Bagian Dokumen',
          page,
          fields: [],
          boxes: [],
        });
      }

      const grp = groupsMap.get(groupKey);
      grp.fields.push(f);
      if (f.boxes && f.boxes.length > 0) {
        grp.boxes.push(...f.boxes);
      }
      fMap.set(f.key, groupKey);
    });

    // Hitung nomor urut dan gabungan bounding box untuk setiap kelompok
    const groupsList = Array.from(groupsMap.values()).map((grp, idx) => {
      let x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity;

      grp.boxes.forEach((b) => {
        if (b.page === grp.page) {
          x0 = Math.min(x0, b.x);
          y0 = Math.min(y0, b.y);
          x1 = Math.max(x1, b.x + b.w);
          y1 = Math.max(y1, b.y + b.h);
        }
      });

      return {
        ...grp,
        no: idx + 1,
        hasBounds: x0 !== Infinity,
        x0: Math.max(0, x0 - 2),
        y0: Math.max(0, y0 - 2),
        x1: x1 + 2,
        y1: y1 + 2,
      };
    });

    return { differenceGroups: groupsList, fieldToGroupMap: fMap };
  }, [rawDifferences]);

  // Outline per bagian: batas area bagian dokumen (misal batas tabel nilai, kop, logo, dll.)
  const sectionOutlines = useMemo(() => {
    const map = new Map();
    for (const f of comparison?.fields || []) {
      if (f.section === 'lainnya') continue;
      for (const b of f.boxes || []) {
        const id = `${f.section}:${b.page}`;
        const cur = map.get(id);
        if (!cur) {
          map.set(id, {
            section: f.section,
            label: f.sectionLabel,
            page: b.page,
            x0: b.x,
            y0: b.y,
            x1: b.x + b.w,
            y1: b.y + b.h,
          });
        } else {
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

  const focusGroup = (groupKey) => {
    setActiveGroupKey(groupKey);
    groupRefs.current[groupKey]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const pct = (v, total) => `${(v / total) * 100}%`;
  const affected = comparison.summary?.sectionsAffected || [];

  return (
    <div className="mt-6 text-left space-y-6">
      {/* Ringkasan Panel Peringatan */}
      <div
        className={`rounded-xl p-5 border-2 flex items-start gap-3.5 ${
          rawDifferences.length ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
        }`}
      >
        <AlertTriangle
          className={`w-6 h-6 flex-shrink-0 ${
            rawDifferences.length ? 'text-red-600' : 'text-amber-600'
          }`}
        />
        <div className="min-w-0 flex-1">
          {rawDifferences.length ? (
            <>
              <p className="font-bold text-red-900 text-base">
                Ditemukan {rawDifferences.length} perbedaan pada {affected.length} bagian dokumen
              </p>
              <p className="text-sm text-red-700 mt-1">
                Field yang berbeda dari dokumen asli ditandai dengan kotak merah bernomor.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {affected.map((s) => (
                  <span
                    key={s}
                    className="text-xs font-semibold px-2.5 py-1 rounded-full text-white shadow-sm"
                    style={{ background: SECTION_COLORS[s] || '#dc2626' }}
                  >
                    {comparison.sections[s] || s}
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

          {rawDifferences.length > 20 && (
            <p className="text-sm text-red-800 mt-2 font-medium">
              Perbedaannya sangat banyak ({rawDifferences.length} perbedaan). Pastikan Verification ID yang dimasukkan memang milik dokumen ini — kemungkinan ini dokumen lain, bukan sekadar dokumen yang diedit.
            </p>
          )}

          {comparison.pageCount &&
            comparison.pageCount.original !== comparison.pageCount.uploaded && (
              <p className="text-sm text-red-700 mt-2">
                Jumlah halaman berbeda: asli {comparison.pageCount.original} halaman, dokumen ini {comparison.pageCount.uploaded} halaman.
              </p>
            )}
        </div>
      </div>

      {/* Dokumen dengan Penanda (SELEBAR KARTU) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-bold text-slate-900 text-lg">Dokumen yang Diupload</h4>
          <button
            type="button"
            onClick={() => setShowSections((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border-[1.5px] border-[#151B54] text-[#151B54] hover:bg-[#F3F5FD] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B3FA8] focus-visible:ring-offset-2"
          >
            {showSections ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showSections ? 'Sembunyikan Bagian' : 'Tampilkan Bagian'}
          </button>
        </div>

        {/* Container Pratinjau Selebar Penuh */}
        <div className="space-y-6 bg-slate-100 p-4 rounded-xl border border-slate-200 overflow-hidden w-full">
          {loadError && <p className="text-sm text-red-600 font-medium p-4">{loadError}</p>}
          {!pdf && !loadError && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-[#151B54] animate-spin" />
              <span className="text-sm text-slate-600 font-medium">Memuat pratinjau dokumen...</span>
            </div>
          )}

          {pdf &&
            comparison.pages.map((pg, pageIndex) => (
              <PdfPage key={pageIndex} pdf={pdf} pageIndex={pageIndex}>
                {/* 1. Garis halus batas per bagian dokumen */}
                {showSections &&
                  sectionOutlines
                    .filter((o) => o.page === pageIndex)
                    .map((o) => (
                      <div
                        key={`${o.section}-${pageIndex}`}
                        className="absolute pointer-events-none border-2 rounded-sm"
                        style={{
                          left: pct(o.x0 - 3, pg.width),
                          top: pct(o.y0 - 3, pg.height),
                          width: pct(o.x1 - o.x0 + 6, pg.width),
                          height: pct(o.y1 - o.y0 + 6, pg.height),
                          borderColor: SECTION_COLORS[o.section] || '#475569',
                          opacity: 0.65,
                        }}
                      />
                    ))}

                {/* 2. Kotak merah bernomor yang dikelompokkan rapi tanpa tumpang tindih */}
                {differenceGroups
                  .filter((grp) => grp.page === pageIndex && grp.hasBounds)
                  .map((grp) => {
                    const isActive = activeGroupKey === grp.key;
                    return (
                      <button
                        type="button"
                        key={grp.key}
                        ref={(el) => {
                          groupRefs.current[grp.key] = el;
                        }}
                        onClick={() => setActiveGroupKey(grp.key)}
                        title={`${grp.sectionLabel} (${grp.fields.length} perbedaan)`}
                        className={`absolute border-2 border-red-600 rounded-sm transition-all ${
                          isActive
                            ? 'bg-red-500/40 ring-4 ring-red-400 z-30'
                            : 'bg-red-500/15 hover:bg-red-500/30 z-20'
                        }`}
                        style={{
                          left: pct(grp.x0, pg.width),
                          top: pct(grp.y0, pg.height),
                          width: pct(grp.x1 - grp.x0, pg.width),
                          height: pct(grp.y1 - grp.y0, pg.height),
                        }}
                      >
                        {/* Badge angka nomor tunggal di sudut kiri atas kotak */}
                        <span className="absolute -top-3 -left-3 min-w-6 h-6 px-1.5 rounded-full bg-red-600 text-white text-xs leading-6 font-bold text-center shadow-md border-2 border-white">
                          {grp.no}
                        </span>
                      </button>
                    );
                  })}
              </PdfPage>
            ))}
        </div>
      </div>

      {/* Daftar Perbedaan: TABEL TIGA KOLOM PENUH SELEBAR KARTU */}
      {rawDifferences.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="font-bold text-slate-900 text-lg">
            Rincian Perbedaan Data ({rawDifferences.length})
          </h4>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5 w-12 text-center">#</th>
                    <th className="px-5 py-3.5 w-1/3">Bagian / Field</th>
                    <th className="px-5 py-3.5 w-1/3 text-emerald-800">Data Asli (Terdaftar)</th>
                    <th className="px-5 py-3.5 w-1/3 text-red-700">Di Dokumen Ini</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rawDifferences.map((f, idx) => {
                    const groupKey = fieldToGroupMap.get(f.key);
                    const grp = differenceGroups.find((g) => g.key === groupKey);
                    const grpNo = grp ? grp.no : idx + 1;
                    const isSelected = activeGroupKey === groupKey;

                    return (
                      <tr
                        key={f.key}
                        onClick={() => focusGroup(groupKey)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-red-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-4 py-3 text-center align-top">
                          <span className="inline-block min-w-5 h-5 px-1.5 rounded-full bg-red-600 text-white text-[11px] leading-5 font-bold text-center shadow-sm">
                            {grpNo}
                          </span>
                        </td>
                        <td className="px-5 py-3 align-top">
                          <div
                            className="text-xs font-semibold tracking-wide uppercase"
                            style={{ color: SECTION_COLORS[f.section] || '#475569' }}
                          >
                            {f.sectionLabel}
                          </div>
                          <div className="text-slate-900 font-semibold text-sm mt-0.5">
                            {f.label}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {STATUS_TEXT[f.status] || f.status}
                          </div>
                        </td>
                        <td className="px-5 py-3 align-top text-emerald-800 font-medium break-words">
                          {f.original || <span className="text-slate-400 font-normal">—</span>}
                        </td>
                        <td className="px-5 py-3 align-top text-red-700 font-bold break-words">
                          {f.uploaded || <span className="text-slate-400 font-normal">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
