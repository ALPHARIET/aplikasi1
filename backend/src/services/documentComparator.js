const fs = require('fs');

/**
 * Document Comparator
 *
 * Membandingkan file transkrip yang diupload (dicurigai) dengan file asli yang
 * tersimpan di server. Setiap bagian dokumen (logo, kop, nomor surat, identitas,
 * tabel nilai, rekapitulasi, judul skripsi, skala nilai, pengesahan) diekstrak
 * beserta posisinya di halaman, lalu dibandingkan field-by-field.
 *
 * Koordinat kotak (boxes) dalam satuan point PDF dengan origin di kiri-atas
 * halaman, sehingga frontend bisa menggambar kotak penanda di atas render PDF.
 */

let pdfjsPromise = null;
const loadPdfjs = () => {
  // pdfjs-dist adalah ES module, jadi di-import secara dinamis dari CommonJS
  if (!pdfjsPromise) pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjsPromise;
};

const SECTIONS = {
  logo: 'Logo Universitas',
  kop: 'Identitas Kementerian & Universitas',
  nomor_surat: 'Nomor Surat',
  identitas_mahasiswa: 'Identitas Mahasiswa',
  keterangan_pendidikan: 'Keterangan Pendidikan',
  tabel_nilai: 'Tabel Nilai',
  rekapitulasi: 'Rekapitulasi Hasil Studi',
  judul_skripsi: 'Judul Skripsi',
  skala_nilai: 'Skala Nilai',
  pengesahan: 'Pengesahan',
  lainnya: 'Teks Lainnya'
};

const COURSE_COLUMNS = [
  ['kode', 'Kode MK'],
  ['nama', 'Nama Mata Kuliah'],
  ['sks', 'SKS'],
  ['nilai', 'Nilai'],
  ['bobot', 'Bobot'],
  ['mutu', 'Mutu']
];

// ============================================================
//                    HELPER FUNCTIONS
// ============================================================

const compact = (s) => (s || '').toLowerCase().replace(/\s+/g, '');
const normalizeValue = (s) => (s || '').replace(/\s+/g, '');
const cleanText = (s) => (s || '').replace(/\s+/g, ' ').trim();

const unionBox = (items) => {
  if (!items.length) return null;
  const x0 = Math.min(...items.map(i => i.x0));
  const y0 = Math.min(...items.map(i => i.y0));
  const x1 = Math.max(...items.map(i => i.x1));
  const y1 = Math.max(...items.map(i => i.y1));
  return { page: items[0].page, x0, y0, x1, y1 };
};

const toBox = (b, pad = 2) => b && ({
  page: b.page,
  x: b.x0 - pad,
  y: b.y0 - pad,
  w: b.x1 - b.x0 + pad * 2,
  h: b.y1 - b.y0 + pad * 2
});

const inRect = (item, r) =>
  item.page === r.page &&
  item.cx >= r.x0 && item.cx < r.x1 &&
  item.cy >= r.y0 && item.cy < r.y1;

// Gabungkan item teks menjadi string dengan urutan baca (atas→bawah, kiri→kanan)
const joinItems = (items) => {
  const sorted = [...items].sort((a, b) => (Math.abs(a.cy - b.cy) < 2 ? a.x0 - b.x0 : a.cy - b.cy));
  let out = '';
  let prev = null;
  for (const it of sorted) {
    if (prev) {
      const sameLine = Math.abs(prev.cy - it.cy) < 2;
      out += sameLine && it.x0 - prev.x1 < 1 ? '' : ' ';
    }
    out += it.str;
    prev = it;
  }
  return cleanText(out);
};

// ============================================================
//                    EXTRACTION (PDF → items)
// ============================================================

const multiply = (m, n) => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5]
];

// Sidik jari logo: average-hash 16x16 (bentuk) + rata-rata warna grid 4x4 (warna),
// agar logo yang sama tetap cocok walau di-encode ulang
const imageFingerprint = (img) => {
  if (!img || !img.data || !img.width || !img.height) return null;
  const { width, height, data } = img;
  const channels = Math.round(data.length / (width * height));
  if (channels !== 3 && channels !== 4) return null;
  const N = 16;
  const gray = [];
  const colors = Array.from({ length: 16 }, () => [0, 0, 0]);
  for (let gy = 0; gy < N; gy++) {
    for (let gx = 0; gx < N; gx++) {
      const px = Math.min(width - 1, Math.floor((gx + 0.5) * width / N));
      const py = Math.min(height - 1, Math.floor((gy + 0.5) * height / N));
      const i = (py * width + px) * channels;
      // Komposit di atas latar putih agar logo transparan tetap terbaca
      const alpha = channels === 4 ? data[i + 3] / 255 : 1;
      const rgb = [0, 1, 2].map(c => data[i + c] * alpha + 255 * (1 - alpha));
      gray.push(0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]);
      const cell = colors[Math.floor(gy / 4) * 4 + Math.floor(gx / 4)];
      rgb.forEach((v, c) => { cell[c] += v / 16; });
    }
  }
  const avg = gray.reduce((a, b) => a + b, 0) / gray.length;
  return { hash: gray.map(g => (g >= avg ? '1' : '0')).join(''), colors };
};

const hamming = (a, b) => {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
};

const sameLogo = (a, b) => {
  if (hamming(a.hash, b.hash) > 20) return false;
  const maxColorDiff = Math.max(...a.colors.flatMap((cell, i) => cell.map((v, c) => Math.abs(v - b.colors[i][c]))));
  return maxColorDiff <= 40;
};

const getObj = (objs, id) => new Promise((resolve) => {
  try {
    objs.get(id, resolve);
  } catch {
    resolve(null);
  }
});

async function extractPage(pdfjs, page, pageIndex) {
  const viewport = page.getViewport({ scale: 1 });
  const H = viewport.height;

  // --- Teks ---
  const textContent = await page.getTextContent();
  const items = [];
  for (const it of textContent.items) {
    if (!it.str || !it.str.trim()) continue;
    const t = it.transform;
    // Abaikan teks miring (watermark "DRAFT")
    if (Math.abs(t[1]) > 0.01 || Math.abs(t[2]) > 0.01) continue;
    const size = it.height || Math.hypot(t[2], t[3]);
    const x0 = t[4];
    const x1 = t[4] + it.width;
    const y0 = H - (t[5] + size * 0.85);
    const y1 = H - (t[5] - size * 0.2);
    items.push({
      page: pageIndex, str: it.str.trim(), x0, x1, y0, y1,
      cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, baseline: t[5]
    });
  }

  // --- Gambar (untuk logo) ---
  const images = [];
  const opList = await page.getOperatorList();
  const O = pdfjs.OPS;
  let ctm = [1, 0, 0, 1, 0, 0];
  const stack = [];
  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i];
    if (fn === O.save) stack.push(ctm);
    else if (fn === O.restore) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
    else if (fn === O.transform) ctm = multiply(ctm, args);
    else if (fn === O.paintFormXObjectBegin) {
      stack.push(ctm);
      if (args && args[0]) ctm = multiply(ctm, args[0]);
    } else if (fn === O.paintFormXObjectEnd) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
    else if (fn === O.paintImageXObject || fn === O.paintInlineImageXObject) {
      const corners = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([u, v]) => [
        ctm[0] * u + ctm[2] * v + ctm[4],
        ctm[1] * u + ctm[3] * v + ctm[5]
      ]);
      const xs = corners.map(c => c[0]);
      const ys = corners.map(c => H - c[1]);
      let img = fn === O.paintInlineImageXObject ? args[0] : null;
      if (!img) {
        const id = args[0];
        img = await getObj(id.startsWith('g_') ? page.commonObjs : page.objs, id);
      }
      images.push({
        page: pageIndex,
        x0: Math.min(...xs), x1: Math.max(...xs),
        y0: Math.min(...ys), y1: Math.max(...ys),
        fingerprint: imageFingerprint(img)
      });
    }
  }

  return { width: viewport.width, height: H, items, images };
}

async function extractPdf(filePath) {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = pdfjs.getDocument({
    data,
    isOffscreenCanvasSupported: false,
    useSystemFonts: false,
    verbosity: 0
  });
  const doc = await loadingTask.promise;

  try {
    const pages = [];
    for (let p = 1; p <= doc.numPages; p++) {
      pages.push(await extractPage(pdfjs, await doc.getPage(p), p - 1));
    }
    return pages;
  } finally {
    await loadingTask.destroy();
  }
}

// ============================================================
//              PARSING (items → field transkrip)
// ============================================================

// Gabungkan item yang bersebelahan pada satu baris menjadi "segmen" (untuk cari label)
function buildSegments(items) {
  // Kelompokkan per baris (baseline berdekatan), lalu urutkan kiri→kanan dalam baris
  const byLine = [...items].sort((a, b) => a.page - b.page || b.baseline - a.baseline);
  const lines = [];
  for (const it of byLine) {
    const line = lines[lines.length - 1];
    if (line && line[0].page === it.page && Math.abs(line[0].baseline - it.baseline) < 1.5) line.push(it);
    else lines.push([it]);
  }
  const sorted = lines.flatMap(line => line.sort((a, b) => a.x0 - b.x0));

  const segments = [];
  let cur = null;
  for (const it of sorted) {
    const gap = cur ? it.x0 - cur.x1 : Infinity;
    if (cur && cur.page === it.page && Math.abs(cur.baseline - it.baseline) < 1.5 && gap > -2 && gap < 5) {
      cur.parts.push(it);
      cur.x1 = Math.max(cur.x1, it.x1);
      cur.y0 = Math.min(cur.y0, it.y0);
      cur.y1 = Math.max(cur.y1, it.y1);
    } else {
      cur = { page: it.page, baseline: it.baseline, x0: it.x0, x1: it.x1, y0: it.y0, y1: it.y1, parts: [it] };
      segments.push(cur);
    }
  }
  for (const s of segments) {
    s.str = joinItems(s.parts);
    s.key = compact(s.str);
    s.cx = (s.x0 + s.x1) / 2;
    s.cy = (s.y0 + s.y1) / 2;
  }
  return segments;
}

function parseTranscript(pages) {
  const items = pages.flatMap(p => p.items);
  const segments = buildSegments(items);
  const fields = [];

  const findSeg = (pred) => segments.find(s => pred(s.key, s));
  const addField = (section, key, label, srcItems, extraBox) => {
    const box = extraBox || unionBox(srcItems);
    fields.push({
      section,
      key,
      label,
      value: srcItems.length ? joinItems(srcItems) : '',
      boxes: box ? [toBox(box)] : []
    });
  };

  const titleSeg = findSeg(k => k.startsWith('transkripakademik'));
  const titlePage = titleSeg ? titleSeg.page : 0;

  // --- Logo: gambar terbesar di area kop halaman pertama ---
  const kopBottom = titleSeg ? titleSeg.y0 : pages[0].height * 0.25;
  const logos = pages[titlePage].images
    .filter(img => img.y1 <= kopBottom + 30)
    .sort((a, b) => (b.x1 - b.x0) * (b.y1 - b.y0) - (a.x1 - a.x0) * (a.y1 - a.y0));
  if (logos[0]) {
    fields.push({
      section: 'logo', key: 'logo', label: 'Logo',
      value: '[gambar logo]', fingerprint: logos[0].fingerprint,
      boxes: [toBox(logos[0])]
    });
  }

  // --- Kop surat (kementerian, universitas, dasar pendirian) ---
  if (titleSeg) {
    const kopSegs = segments.filter(s => s.page === titlePage && s.y1 <= titleSeg.y0 + 1);
    const kementerian = kopSegs.filter(s => s.key.includes('kementerian'));
    const universitas = kopSegs.filter(s => !s.key.includes('kementerian') && /^(universitas|institut|politeknik|sekolahtinggi)/.test(s.key));
    const dasar = kopSegs.filter(s => !kementerian.includes(s) && !universitas.includes(s));
    addField('kop', 'kop.kementerian', 'Nama Kementerian', kementerian.flatMap(s => s.parts));
    addField('kop', 'kop.universitas', 'Nama Universitas', universitas.flatMap(s => s.parts));
    addField('kop', 'kop.dasar', 'Dasar Pendirian', dasar.flatMap(s => s.parts));
    addField('kop', 'kop.judul', 'Judul Dokumen', titleSeg.parts);
  }

  // --- Nomor surat ---
  const nomorSeg = findSeg(k => k.startsWith('nomor/number'));
  if (nomorSeg) {
    // Ambil satu baris penuh, karena teks yang diedit bisa memutus segmen
    const lineItems = items.filter(it => it.page === nomorSeg.page && Math.abs(it.baseline - nomorSeg.baseline) < 1.5);
    addField('nomor_surat', 'nomor_surat', 'Nomor Surat / Nomor Ijazah', lineItems);
  }

  // --- Identitas mahasiswa & keterangan pendidikan (label → nilai di sebelah kanan) ---
  const tableHeader = findSeg(k => k === 'no' || k.startsWith('no') && k.includes('kode/'));
  const identityLabels = [
    { section: 'identitas_mahasiswa', key: 'nama', label: 'Nama', match: k => k === 'nama/' || k === 'nama/name' },
    { section: 'identitas_mahasiswa', key: 'nim', label: 'NIM', match: k => k.startsWith('nomorindukmahasiswa') },
    { section: 'identitas_mahasiswa', key: 'ttl', label: 'Tempat, Tanggal Lahir', match: k => k.startsWith('tempat,tanggallahir') },
    { section: 'identitas_mahasiswa', key: 'kode_pt', label: 'Kode Perguruan Tinggi', match: k => k.startsWith('kodeperguruantinggi') },
    { section: 'keterangan_pendidikan', key: 'jenjang', label: 'Jenjang Pendidikan', match: k => k.startsWith('jenjangpendidikan') },
    { section: 'keterangan_pendidikan', key: 'prodi', label: 'Program Studi', match: k => k.startsWith('programstudi') },
    { section: 'keterangan_pendidikan', key: 'kode_prodi', label: 'Kode Program Studi', match: k => k === 'kode/code' || k === 'kode/' },
    { section: 'keterangan_pendidikan', key: 'tanggal_lulus', label: 'Tanggal Lulus', match: k => k.startsWith('tanggallulus') }
  ];
  const found = identityLabels
    .map(def => ({ ...def, seg: findSeg((k, s) => def.match(k) && s.page === titlePage && (!tableHeader || s.y0 < tableHeader.y0)) }))
    .filter(def => def.seg);
  const leftCol = found.filter(d => d.section === 'identitas_mahasiswa');
  const rightCol = found.filter(d => d.section === 'keterangan_pendidikan');
  const rightColX = rightCol.length ? Math.min(...rightCol.map(d => d.seg.x0)) - 5 : pages[titlePage].width;
  const identityBottom = tableHeader ? tableHeader.y0 - 1 : Infinity;

  for (const col of [leftCol, rightCol]) {
    col.sort((a, b) => a.seg.y0 - b.seg.y0);
    col.forEach((def, i) => {
      const next = col[i + 1];
      const top = def.seg.y0 - 2;
      const bottom = next ? next.seg.y0 - 1 : Math.min(identityBottom, def.seg.y1 + 26);
      const right = col === leftCol ? rightColX : pages[titlePage].width;
      const valueItems = items.filter(it =>
        it.page === def.seg.page && it.x0 > def.seg.x0 + 10 && it.x0 < right &&
        it.cy >= top && it.cy < bottom &&
        !def.seg.parts.includes(it) && !compact(it.str).match(/^(name|studentidentificationnumber|place,dateofbirth|universitycode|educationlevel|studyprogram|graduationdate|code)$/)
      );
      addField(def.section, def.key, def.label, valueItems);
    });
  }

  // --- Tabel nilai ---
  const headerItems = (word) => items.filter(it => compact(it.str).startsWith(word));
  const sksHdr = headerItems('sks/');
  const nilaiHdr = headerItems('nilai/');
  const bobotHdr = headerItems('bobot/');
  const mutuHdr = headerItems('mutu/');
  const creditHdr = items.filter(it => compact(it.str).startsWith('credit'));
  const nearestRight = (list, ref) => list
    .filter(h => h.page === ref.page && h.x0 > ref.x0 && Math.abs(h.cy - ref.cy) < 12)
    .sort((a, b) => a.x0 - b.x0)[0];

  const codeItems = items.filter(it => /^[A-Z]{2,4}-\d{3,4}$/.test(it.str.replace(/\s+/g, '')));
  const groups = new Map();
  for (const code of codeItems) {
    const sks = sksHdr.filter(h => h.page === code.page && h.x0 > code.x1).sort((a, b) => a.x0 - b.x0)[0];
    if (!sks) continue;
    const id = `${code.page}:${Math.round(sks.x0)}`;
    if (!groups.has(id)) {
      const nilai = nearestRight(nilaiHdr, sks);
      const bobot = nilai && nearestRight(bobotHdr, nilai);
      const mutu = bobot && nearestRight(mutuHdr, bobot);
      if (!mutu) continue;
      const credit = creditHdr.filter(c => c.page === sks.page && c.y0 > sks.y0 && Math.abs(c.cx - sks.cx) < 20)[0];
      groups.set(id, { sks, nilai, bobot, mutu, headerBottom: (credit || sks).y1 + 2, codes: [] });
    }
    groups.get(id).codes.push(code);
  }

  for (const g of groups.values()) {
    const cS = g.sks.cx, cG = g.nilai.cx, cB = g.bobot.cx, cM = g.mutu.cx;
    const colBounds = {
      sks: [cS - (cG - cS) / 2, (cS + cG) / 2],
      nilai: [(cS + cG) / 2, (cG + cB) / 2],
      bobot: [(cG + cB) / 2, (cB + cM) / 2],
      mutu: [(cB + cM) / 2, cM + (cM - cB) / 2]
    };
    g.codes.sort((a, b) => a.cy - b.cy);
    let top = g.headerBottom;
    g.codes.forEach((code, i) => {
      // Isi sel tabel rata-tengah vertikal → batas bawah baris simetris terhadap kode MK
      let bottom = 2 * code.cy - top;
      const next = g.codes[i + 1];
      if (next) bottom = Math.max(code.cy + 3, Math.min(bottom, next.cy - 3));
      const band = { page: code.page, y0: top, y1: bottom };

      // Nomor baris = angka terdekat di kiri kode MK (bukan angka mutu "0" dari grup kolom sebelahnya)
      const noItem = items
        .filter(it =>
          it.page === code.page && /^\d{1,3}$/.test(it.str) &&
          it.x1 <= code.x0 + 1 && it.x0 > code.x0 - 45 && it.cy >= band.y0 && it.cy < band.y1
        )
        .sort((a, b) => b.x1 - a.x1)[0];
      const rowNo = noItem ? noItem.str : `?${code.str}`;
      const rowLeft = noItem ? noItem.x0 - 3 : code.x0 - 3;
      const cells = {
        kode: { x0: code.x0 - 2, x1: code.x1 + 2 },
        nama: { x0: code.x1 + 2, x1: colBounds.sks[0] },
        sks: { x0: colBounds.sks[0], x1: colBounds.sks[1] },
        nilai: { x0: colBounds.nilai[0], x1: colBounds.nilai[1] },
        bobot: { x0: colBounds.bobot[0], x1: colBounds.bobot[1] },
        mutu: { x0: colBounds.mutu[0], x1: colBounds.mutu[1] }
      };
      for (const [col, label] of COURSE_COLUMNS) {
        const rect = { page: code.page, x0: cells[col].x0, x1: cells[col].x1, y0: band.y0, y1: band.y1 };
        const cellItems = col === 'kode' ? [code] : items.filter(it => inRect(it, rect));
        fields.push({
          section: 'tabel_nilai',
          key: `mk.${rowNo}.${col}`,
          label: `No. ${rowNo} — ${label}`,
          row: rowNo,
          value: joinItems(cellItems),
          boxes: [toBox(rect, 0)]
        });
      }
      fields.push({
        section: 'tabel_nilai', key: `mk.${rowNo}.row`, row: rowNo, rowOnly: true,
        boxes: [toBox({ page: code.page, x0: rowLeft, x1: colBounds.mutu[1], y0: band.y0, y1: band.y1 }, 0)]
      });
      top = bottom;
    });
  }

  // --- Rekapitulasi ---
  const valueAfterColon = (seg) => {
    // Ambil item di sebelah kanan ":" pada baris yang sama
    const colonIdx = seg.parts.findIndex(p => p.str.includes(':'));
    const colonPart = seg.parts[colonIdx];
    if (colonIdx < 0) return [];
    const after = seg.parts.slice(colonIdx + 1);
    const tail = colonPart.str.split(':').slice(1).join(':').trim();
    if (tail) return [{ ...colonPart, str: tail }, ...after];
    return after;
  };
  const sksSeg = findSeg(k => k.includes('totalsks') || k.includes('totalcredits'));
  if (sksSeg) addField('rekapitulasi', 'total_sks', 'Total SKS', valueAfterColon(sksSeg), sksSeg);
  const ipkSeg = findSeg(k => k.includes('gradepointaverage'));
  if (ipkSeg) addField('rekapitulasi', 'ipk', 'IPK', valueAfterColon(ipkSeg), ipkSeg);

  const judulSeg = findSeg(k => k.startsWith('judulskripsi'));
  const skalaSeg = findSeg(k => k.startsWith('skalanilai'));
  const yudSeg = findSeg(k => k.includes('graduationjudicialpredicate'));
  if (yudSeg) {
    const limit = judulSeg && judulSeg.page === yudSeg.page ? judulSeg.y0 - 1 : yudSeg.y1 + 20;
    const below = items.filter(it =>
      it.page === yudSeg.page && it.x0 >= yudSeg.x0 - 5 && it.cy > yudSeg.y1 && it.cy < limit
    );
    const valueItems = [...valueAfterColon(yudSeg), ...below];
    addField('rekapitulasi', 'yudisium', 'Yudisium', valueItems, unionBox([yudSeg, ...valueItems]));
  }

  // --- Judul skripsi ---
  if (judulSeg) {
    const limit = skalaSeg && skalaSeg.page === judulSeg.page ? skalaSeg.y0 - 1 : judulSeg.y1 + 30;
    const below = items.filter(it => it.page === judulSeg.page && it.cy > judulSeg.y1 && it.cy < limit);
    const valueItems = [...valueAfterColon(judulSeg), ...below];
    addField('judul_skripsi', 'judul_skripsi', 'Judul Skripsi', valueItems, unionBox([judulSeg, ...valueItems]));
  }

  // --- Pengesahan ---
  const dekanSeg = findSeg(k => k.startsWith('dekan'));
  const nipSeg = findSeg(k => /^nip\.?\d/.test(k) || k.startsWith('nip'));
  const pengesahanLeft = dekanSeg ? dekanSeg.x0 - 10 : Infinity;
  const segAbove = (ref, minY = -Infinity) => segments
    .filter(s => s.page === ref.page && s.y1 <= ref.y0 + 1 && s.y0 > minY && s.x1 > ref.x0 - 20 && s.x0 < ref.x1 + 20 && s !== ref)
    .sort((a, b) => b.y0 - a.y0)[0];
  if (dekanSeg) {
    const dateSeg = segAbove(dekanSeg);
    if (dateSeg) addField('pengesahan', 'tanggal_pengesahan', 'Tempat & Tanggal', dateSeg.parts);
    const jabatan = segments.filter(s =>
      s.page === dekanSeg.page && s.y0 >= dekanSeg.y0 - 1 && s.y0 < dekanSeg.y1 + 12 && Math.abs(s.x0 - dekanSeg.x0) < 15
    );
    addField('pengesahan', 'jabatan', 'Jabatan Penandatangan', jabatan.flatMap(s => s.parts));
  }
  if (nipSeg) {
    const nameSeg = segAbove(nipSeg, dekanSeg && dekanSeg.page === nipSeg.page ? dekanSeg.y1 + 12 : -Infinity);
    if (nameSeg) addField('pengesahan', 'nama_penandatangan', 'Nama Penandatangan', nameSeg.parts);
    addField('pengesahan', 'nip', 'NIP', nipSeg.parts);
  }

  // --- Skala nilai ---
  if (skalaSeg) {
    const pageH = pages[skalaSeg.page].height;
    const skalaItems = items.filter(it =>
      it.page === skalaSeg.page && it.cy > skalaSeg.y1 && it.cy < pageH && it.x1 < pengesahanLeft
    );
    addField('skala_nilai', 'skala_nilai', 'Skala Nilai', skalaItems, unionBox([skalaSeg, ...skalaItems]));
  }

  return fields;
}

// ============================================================
//                       COMPARISON
// ============================================================

function compareFields(originalFields, uploadedFields) {
  const origMap = new Map(originalFields.map(f => [f.key, f]));
  const upMap = new Map(uploadedFields.map(f => [f.key, f]));
  const results = [];

  const statusOf = (o, u) => {
    if (o && !u) return 'missing';
    if (!o && u) return 'added';
    if (o.key === 'logo') {
      if (!o.fingerprint || !u.fingerprint) return 'match';
      return sameLogo(o.fingerprint, u.fingerprint) ? 'match' : 'different';
    }
    return normalizeValue(o.value) === normalizeValue(u.value) ? 'match' : 'different';
  };

  // Urutan mengikuti dokumen yang diupload, lalu field asli yang hilang
  const keys = [...upMap.keys(), ...[...origMap.keys()].filter(k => !upMap.has(k))];
  for (const key of keys) {
    const o = origMap.get(key);
    const u = upMap.get(key);
    const ref = u || o;
    if (ref.rowOnly) continue;
    const status = statusOf(o, u);
    const isLogo = key === 'logo';
    results.push({
      key,
      section: ref.section,
      sectionLabel: SECTIONS[ref.section],
      label: ref.label,
      row: ref.row,
      original: o ? (isLogo ? 'Logo resmi universitas' : o.value) : null,
      uploaded: u ? (isLogo ? (status === 'match' ? 'Logo sama' : 'Gambar logo berbeda') : u.value) : null,
      status,
      boxes: u ? u.boxes : []
    });
  }

  // Baris mata kuliah yang tidak ada di dokumen asli/diupload → tandai seluruh baris
  const rowKeys = new Set(uploadedFields.filter(f => f.rowOnly).map(f => f.key));
  const origRows = new Set(originalFields.filter(f => f.rowOnly).map(f => f.key));
  for (const key of rowKeys) {
    if (origRows.has(key)) continue;
    const rowFields = results.filter(r => r.section === 'tabel_nilai' && r.row === upMap.get(key).row);
    const rowBox = upMap.get(key).boxes;
    rowFields.forEach((r, i) => { r.boxes = i === 0 ? rowBox : []; });
  }

  return results;
}

// Teks di dokumen upload yang tidak berada di field mana pun dan tidak ada di dokumen asli
function findUnmatchedText(originalPages, uploadedPages, uploadedFields) {
  const origCounts = new Map();
  for (const it of originalPages.flatMap(p => p.items)) {
    const k = normalizeValue(it.str);
    origCounts.set(k, (origCounts.get(k) || 0) + 1);
  }
  const covered = uploadedFields.flatMap(f => f.boxes);
  const isCovered = (it) => covered.some(b =>
    b.page === it.page && it.cx >= b.x && it.cx <= b.x + b.w && it.cy >= b.y && it.cy <= b.y + b.h
  );

  const extras = [];
  for (const it of uploadedPages.flatMap(p => p.items)) {
    if (isCovered(it)) continue;
    const k = normalizeValue(it.str);
    if (origCounts.get(k) > 0) {
      origCounts.set(k, origCounts.get(k) - 1);
      continue;
    }
    extras.push(it);
  }
  return extras.map((it, i) => ({
    key: `lainnya.${i}`,
    section: 'lainnya',
    sectionLabel: SECTIONS.lainnya,
    label: 'Teks tidak ditemukan di dokumen asli',
    original: null,
    uploaded: it.str,
    status: 'added',
    boxes: [toBox(it)]
  }));
}

/**
 * Bandingkan file asli dengan file yang diupload.
 * @returns {Promise<object>} Hasil perbandingan untuk dikirim ke frontend
 */
async function compareDocuments(originalPath, uploadedPath, uploadedMime) {
  const isPdf = (p) => /\.pdf$/i.test(p);
  if (uploadedMime !== 'application/pdf' || !isPdf(originalPath)) {
    return {
      supported: false,
      reason: 'Perbandingan per-field saat ini hanya mendukung dokumen PDF (asli dan yang diupload).'
    };
  }
  if (!fs.existsSync(originalPath)) {
    return { supported: false, reason: 'File asli tidak ditemukan di server.' };
  }

  const [origPages, upPages] = await Promise.all([extractPdf(originalPath), extractPdf(uploadedPath)]);
  const origFields = parseTranscript(origPages);
  const upFields = parseTranscript(upPages);

  const fields = [
    ...compareFields(origFields, upFields),
    ...findUnmatchedText(origPages, upPages, upFields)
  ];

  const differences = fields.filter(f => f.status !== 'match');
  return {
    supported: true,
    pages: upPages.map(p => ({ width: p.width, height: p.height })),
    pageCount: { original: origPages.length, uploaded: upPages.length },
    sections: SECTIONS,
    summary: {
      totalFields: fields.length,
      differences: differences.length,
      sectionsAffected: [...new Set(differences.map(f => f.section))]
    },
    fields
  };
}

module.exports = { compareDocuments, extractPdf, parseTranscript };
