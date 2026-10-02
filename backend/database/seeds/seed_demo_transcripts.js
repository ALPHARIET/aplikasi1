/**
 * Seed 10 mahasiswa demo, masing-masing dengan akun + 1 transkrip akhir yang langsung
 * diterbitkan ke blockchain, ditambah 1 versi palsu (dimanipulasi) per mahasiswa.
 *
 * Prasyarat: hardhat node, contract ter-deploy, MySQL, dan backend (npm run dev) sudah berjalan.
 * Jalankan: npm run seed:demo
 *
 * Hasil (database/seeds/demo-transcripts/):
 *  - asli/   10 transkrip yang diterbitkan  → verifikasi: valid
 *  - palsu/  10 versi manipulasi, TIDAK diterbitkan → verifikasi: field yang diubah ditandai
 *  - DAFTAR-VERIFICATION-ID.txt  pasangan akun, Verification ID, dan file
 *
 * Semua data fiktif (Universitas Contoh Nusantara, watermark "CONTOH").
 * PDF dibuat deterministik, jadi file asli yang dibuat ulang tetap identik (hash sama).
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const PDFDocument = require('pdfkit');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const API_URL = process.env.SEED_API_URL || `http://localhost:${process.env.PORT || 5000}/api/v1`;
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@univ.edu';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'adminpassword123';
const DEMO_PASSWORD = process.env.DEMO_STUDENT_PASSWORD || 'demopassword123'; // Hanya untuk demo lokal

// Akun demo versi lama (1 mahasiswa berisi 10 transkrip) — dibersihkan otomatis
const LEGACY_DEMO_EMAIL = 'demo.mahasiswa@univ.edu';

// [nama, NIM, tempat lahir, tanggal lahir (ID), tanggal lahir (EN), judul skripsi, bias nilai (0 = paling bagus)]
const STUDENT_ROWS = [
  ['Rina Puspita Sari', 'G1A022001', 'Bengkulu', '14 Februari 2004', 'February 14, 2004', 'KLASIFIKASI CITRA DAUN KOPI MENGGUNAKAN CONVOLUTIONAL NEURAL NETWORK', 0],
  ['Dimas Arya Pratama', 'G1A022014', 'Curup', '03 Mei 2004', 'May 3, 2004', 'SISTEM REKOMENDASI WISATA BERBASIS COLLABORATIVE FILTERING', 1],
  ['Salsabila Nur Azizah', 'G1A022027', 'Manna', '21 Agustus 2003', 'August 21, 2003', 'ANALISIS SENTIMEN ULASAN APLIKASI MENGGUNAKAN NAIVE BAYES', 0],
  ['Fajar Ramadhan', 'G1A021033', 'Argamakmur', '11 November 2003', 'November 11, 2003', 'RANCANG BANGUN APLIKASI PRESENSI BERBASIS QR CODE', 2],
  ['Nadia Kartika Putri', 'G1A022045', 'Palembang', '29 Januari 2004', 'January 29, 2004', 'DETEKSI PENYAKIT DAUN PADI MENGGUNAKAN YOLO', 1],
  ['Bagas Saputra', 'G1A021052', 'Kepahiang', '07 Juli 2003', 'July 7, 2003', 'IMPLEMENTASI BLOCKCHAIN UNTUK VERIFIKASI IJAZAH DIGITAL', 2],
  ['Aulia Rahmawati', 'G1A022068', 'Lubuklinggau', '16 Maret 2004', 'March 16, 2004', 'SISTEM INFORMASI GEOGRAFIS SEBARAN UMKM BERBASIS WEB', 1],
  ['Rizky Maulana Hakim', 'G1A021079', 'Bengkulu', '25 September 2003', 'September 25, 2003', 'PREDIKSI CURAH HUJAN MENGGUNAKAN LONG SHORT-TERM MEMORY', 0],
  ['Putri Ayu Lestari', 'G1A022086', 'Mukomuko', '02 Desember 2003', 'December 2, 2003', 'CHATBOT LAYANAN AKADEMIK MENGGUNAKAN RETRIEVAL AUGMENTED GENERATION', 1],
  ['Yoga Pratama Putra', 'G1A021094', 'Seluma', '19 Juni 2003', 'June 19, 2003', 'OPTIMASI RUTE DISTRIBUSI LOGISTIK DENGAN ALGORITMA GENETIKA', 2]
];

const DEMO_STUDENTS = STUDENT_ROWS.map(([fullName, nim, birthPlace, birthId, birthEn, thesis, bias], i) => ({
  no: String(i + 1).padStart(2, '0'),
  email: `${fullName.split(' ')[0].toLowerCase()}.${nim.slice(-3)}@demo.univ.edu`,
  password: DEMO_PASSWORD,
  studentIdNumber: nim,
  fullName,
  faculty: 'Teknik',
  program: 'Informatika',
  graduationYear: 2026,
  birth: [`${birthPlace}, ${birthId}/`, birthEn],
  thesis,
  bias,
  slug: fullName.toLowerCase().replace(/[^a-z]+/g, '-')
}));

const OUTPUT_DIR = path.join(__dirname, 'demo-transcripts');
const docTitleOf = (student) => `Transkrip Akademik - ${student.fullName}`;

// ============================================================
//                         DATA
// ============================================================

const COURSES = [
  ['MFG-101', 'KALKULUS/ CALCULUS', 3],
  ['MFG-102', 'FISIKA/ PHYSICS', 2],
  ['MKU-102', 'PANCASILA/ PANCASILA', 2],
  ['MKU-105', 'BAHASA INGGRIS/ ENGLISH', 2],
  ['MKU-106', 'KOMPUTER DAN PEMROGRAMAN/ COMPUTER AND PROGRAMMING', 3],
  ['TIF-1105', 'PENGANTAR TEKNOLOGI INFORMASI/ INTRODUCTION TO INFORMATION TECHNOLOGY', 2],
  ['TIF-1106', 'SISTEM DIGITAL/ DIGITAL SYSTEM', 3],
  ['TIF-1109', 'SISTEM MULTIMEDIA/ MULTIMEDIA SYSTEMS', 2],
  ['TIF-1110', 'PROYEK SISTEM MULTIMEDIA/ MULTIMEDIA SYSTEM PROJECT', 1],
  ['MFG-121', 'BAHASA INGGRIS TEKNIK/ ENGLISH FOR ENGINEERING', 2],
  ['MKU-101', 'PENDIDIKAN AGAMA/ RELIGIOUS EDUCATION', 3],
  ['MKU-103', 'BAHASA INDONESIA/ BAHASA INDONESIA', 3],
  ['MKU-104', 'KEWARGANEGARAAN/ CIVIC EDUCATION', 2],
  ['TIF-1201', 'STRUKTUR DATA DAN ALGORITMA/ DATA STRUCTURES AND ALGORITHMS', 2],
  ['TIF-1202', 'PROYEK STRUKTUR DATA/ DATA STRUCTURES PROJECT', 1],
  ['TIF-1203', 'MATEMATIKA DISKRIT/ DISCRETE MATHEMATICS', 3],
  ['TIF-1204', 'MANAJEMEN SISTEM INFORMASI/ INFORMATION SYSTEMS MANAGEMENT', 3],
  ['TIF-1205', 'PEMROGRAMAN BERORIENTASI OBJEK/ OBJECT-ORIENTED PROGRAMMING', 2],
  ['TIF-1206', 'PROYEK PBO/ OBJECT-ORIENTED PROGRAMMING PROJECT', 1],
  ['TIF-2101', 'ALJABAR LINEAR/ LINEAR ALGEBRA', 2],
  ['TIF-2102', 'PROYEK ALJABAR LINEAR/ LINEAR ALGEBRA PROJECT', 1],
  ['TIF-2103', 'SISTEM OPERASI/ OPERATING SYSTEM', 2],
  ['TIF-2104', 'PROYEK SISTEM OPERASI/ OPERATING SYSTEM PROJECT', 1],
  ['TIF-2105', 'ORGANISASI DAN ARSITEKTUR KOMPUTER/ COMPUTER ARCHITECTURE', 3],
  ['TIF-2106', 'PENGANTAR BASIS DATA/ INTRODUCTION TO DATABASES', 2],
  ['TIF-2107', 'PROYEK BASIS DATA/ DATABASES PROJECT', 1],
  ['TIF-2108', 'REKAYASA PERANGKAT LUNAK/ SOFTWARE ENGINEERING', 2],
  ['TIF-2109', 'PROYEK RPL/ SOFTWARE ENGINEERING PROJECT', 1],
  ['TIF-2110', 'STATISTIK TERAPAN/ APPLIED STATISTICS', 3],
  ['TIF-2111', 'KOMUNIKASI DATA/ DATA COMMUNICATION', 3],
  ['TIF-2201', 'INTERAKSI MANUSIA DAN KOMPUTER/ HUMAN-COMPUTER INTERACTION', 3],
  ['TIF-2202', 'PEMROGRAMAN WEB/ WEB PROGRAMMING', 2],
  ['TIF-2203', 'PROYEK PEMROGRAMAN WEB/ WEB PROGRAMMING PROJECT', 1],
  ['TIF-2204', 'TEORI BAHASA DAN AUTOMATA/ THEORY OF LANGUAGE AND AUTOMATA', 3],
  ['TIF-2205', 'KECERDASAN BUATAN/ ARTIFICIAL INTELLIGENCE', 3],
  ['TIF-2206', 'BASIS DATA LANJUT/ ADVANCED DATABASE', 2],
  ['TIF-2207', 'PROYEK BASIS DATA LANJUT/ ADVANCED DATABASE PROJECT', 1],
  ['TIF-2208', 'GRAFIKA KOMPUTER/ COMPUTER GRAPHICS', 3],
  ['TIF-2209', 'JARINGAN KOMPUTER/ COMPUTER NETWORK', 2],
  ['TIF-2210', 'PROYEK JARINGAN KOMPUTER/ COMPUTER NETWORK PROJECT', 1],
  ['TIF-3106', 'DESAIN DAN ANALISIS ALGORITMA/ ALGORITHM DESIGN AND ANALYSIS', 3],
  ['TIF-3202', 'KRIPTOGRAFI/ CRYPTOGRAPHY', 3]
];

const GRADES = [['A', 4.0], ['A-', 3.75], ['B+', 3.5], ['B', 3.0], ['B-', 2.75], ['C+', 2.5], ['C', 2.0], ['D', 1.0]];
const GRADING_SCALE = [
  ['A', '4.00', '85.00-100.00'], ['A-', '3.75', '80.00-84.99'], ['B+', '3.5', '75.00-79.99'],
  ['B', '3', '70.00-74.99'], ['B-', '2.75', '65.00-69.99'], ['C+', '2.5', '60.00-64.99'],
  ['C', '2', '55.00-59.99'], ['D', '1.00', '45.00-54.99'], ['E', '0.00', '0.00-44.99']
];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// PRNG deterministik agar hasil seed selalu sama
const mulberry32 = (seed) => () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

function buildTranscriptData(student, index) {
  const rand = mulberry32(2000 + index);
  const courses = COURSES.map(([code, name, sks]) => {
    const g = Math.min(GRADES.length - 1, Math.floor(rand() * rand() * 5 + student.bias * rand() * 1.6));
    const [grade, points] = GRADES[g];
    return { code, name, sks, grade, points: points.toFixed(2), score: (points * sks).toFixed(2) };
  });
  const totalSks = courses.reduce((a, c) => a + c.sks, 0);
  const ipk = courses.reduce((a, c) => a + Number(c.score), 0) / totalSks;
  const yudisium = ipk >= 3.51 ? 'Dengan Pujian/ Cum Laude'
    : ipk >= 3.01 ? 'Sangat Memuaskan/ Very Satisfactory'
      : 'Memuaskan/ Satisfactory';
  const day = 2 + index * 2;

  return {
    nomor: `${String(40 + index * 7).padStart(2, '0')}-TA/UCN/FT/S-1/2026`,
    courses,
    totalSks,
    ipk: ipk.toFixed(2),
    yudisium,
    thesis: student.thesis,
    graduationDate: [`${String(day).padStart(2, '0')} Desember 2026/`, `December ${day}, 2026`],
    signedAt: `Bengkulu, ${String(day + 1).padStart(2, '0')} ${MONTHS[11]} 2026/ ${MONTHS_EN[11]} ${day + 1}, 2026`,
    logoColor: [23, 37, 84]
  };
}

// Versi manipulasi: tiap file mengubah kombinasi field yang berbeda
function tamper(data, index) {
  const fakeNames = ['ANDI PRATAMA WIJAYA', 'MELATI SUKMA DEWI', 'HENDRA KUSUMA'];
  const t = JSON.parse(JSON.stringify(data));
  const changes = [];
  const pick = (list) => list[index % list.length];
  const mutations = [
    () => { t.ipk = (Math.min(4, Number(t.ipk) + 0.6)).toFixed(2); changes.push('IPK'); },
    () => {
      const c = t.courses.find(x => x.grade && x.grade !== 'A');
      if (!c) return;
      c.grade = 'A'; c.points = '4.00'; c.score = (4 * c.sks).toFixed(2);
      changes.push(`Nilai ${c.code}`);
    },
    () => { t.studentName = pick(fakeNames); changes.push('Nama'); },
    () => { t.nomor = '999-TA/UNX/FT/S-1/2027'; changes.push('Nomor surat'); },
    () => { t.university = 'UNIVERSITAS HARAPAN BANGSA'; changes.push('Nama universitas'); },
    () => {
      t.yudisium = t.yudisium.startsWith('Dengan Pujian') ? 'Sangat Memuaskan/ Very Satisfactory' : 'Dengan Pujian/ Cum Laude';
      changes.push('Yudisium');
    },
    () => { t.thesis = 'SISTEM PAKAR DIAGNOSA PENYAKIT TANAMAN BERBASIS ANDROID'; changes.push('Judul skripsi'); },
    () => { t.logoColor = [120, 20, 20]; changes.push('Logo'); },
    () => { t.dean = 'Prof. Dr. Ir. Budi Santoso, M.Kom.'; changes.push('Penandatangan'); },
    () => { t.totalSks += 12; changes.push('Total SKS'); }
  ];
  // 3 mutasi per file, bergeser sesuai index
  for (let k = 0; k < 3; k++) mutations[(index * 3 + k) % mutations.length]();
  return { data: t, changes };
}

// ============================================================
//                      LOGO (PNG)
// ============================================================

function createLogoPng([r, g, b], size = 120) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const c = size / 2;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c + 0.5, y - c + 0.5);
      const angle = Math.atan2(y - c, x - c);
      const star = c * (0.38 + 0.12 * Math.cos(5 * angle));
      let px = [0, 0, 0, 0];
      if (d < c * 0.96) px = [r, g, b, 255];
      if (d < c * 0.86 && d > c * 0.78) px = [234, 179, 8, 255];
      if (d < star) px = [234, 179, 8, 255];
      if (d < c * 0.16) px = [255, 255, 255, 255];
      raw.set(px, y * (size * 4 + 1) + 1 + x * 4);
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// ============================================================
//                    PDF (layout transkrip)
// ============================================================

const PAGE_W = 841.92;
const PAGE_H = 594.96;
// Kolom satu grup tabel: NO, KODE, NAMA, SKS, NILAI, BOBOT, MUTU
const COLS = [18, 38, 96, 26, 26, 27, 30];
const GROUP_W = COLS.reduce((a, b) => a + b, 0);
const TABLE_X = 30;

function watermark(doc) {
  doc.lineWidth(0.5);
  doc.save();
  doc.rotate(-32, { origin: [PAGE_W / 2, PAGE_H / 2] });
  doc.font('Times-Bold').fontSize(120).fillColor('#ececec')
    .text('CONTOH', PAGE_W / 2 - 260, PAGE_H / 2 - 70, { lineBreak: false });
  doc.restore();
  doc.fillColor('black');
}

function labelPair(doc, id, en, x, y) {
  doc.font('Times-Roman').fontSize(9).text(id, x, y, { lineBreak: false });
  doc.font('Times-Italic').fontSize(9).text(en, x, y + 11, { lineBreak: false });
}

function valuePair(doc, line1, line2, x, y) {
  doc.font('Times-Bold').fontSize(9).text(line1, x, y, { lineBreak: false });
  if (line2) doc.font('Times-BoldItalic').fontSize(9).text(line2, x, y + 11, { lineBreak: false });
}

function drawTableHeader(doc, y) {
  const headers = [['NO', ''], ['KODE/', 'CODE'], ['NAMA MATA KULIAH/', 'COURSE'], ['SKS/', 'CREDIT'], ['NILAI/', 'GRADE'], ['BOBOT/', 'POINTS'], ['MUTU/', 'SCORE']];
  const h = 22;
  for (let g = 0; g < 3; g++) {
    let x = TABLE_X + g * GROUP_W;
    headers.forEach(([l1, l2], i) => {
      doc.rect(x, y, COLS[i], h).stroke();
      doc.font('Times-Bold').fontSize(6.5).text(l1, x, y + (l2 ? 4 : 8), { width: COLS[i], align: 'center', lineBreak: false });
      if (l2) doc.font('Times-BoldItalic').fontSize(6.5).text(l2, x, y + 12, { width: COLS[i], align: 'center', lineBreak: false });
      x += COLS[i];
    });
  }
  return y + h;
}

function drawTableRows(doc, y, rowsPerGroup) {
  // rowsPerGroup: array 3 grup, tiap grup array baris {no, course}
  const rowCount = Math.max(...rowsPerGroup.map(r => r.length));
  doc.fontSize(6.5);
  for (let r = 0; r < rowCount; r++) {
    doc.font('Times-Roman');
    const nameHeights = rowsPerGroup.map(rows => rows[r] ? doc.heightOfString(rows[r].course.name, { width: COLS[2] - 4 }) : 0);
    const rowH = Math.max(18, Math.max(...nameHeights) + 6);
    rowsPerGroup.forEach((rows, g) => {
      const row = rows[r];
      let x = TABLE_X + g * GROUP_W;
      const cells = row
        ? [String(row.no), row.course.code, row.course.name, String(row.course.sks), row.course.grade, row.course.points, row.course.score]
        : ['', '', '', '', '', '', ''];
      cells.forEach((text, i) => {
        doc.rect(x, y, COLS[i], rowH).stroke();
        if (text) {
          const isName = i === 2;
          const opts = { width: COLS[i] - 4, align: isName ? 'left' : 'center' };
          const th = doc.heightOfString(text, opts);
          // Isi sel rata-tengah vertikal (parser memakai kode MK sebagai titik tengah baris)
          doc.text(text, x + 2, y + (rowH - th) / 2, opts);
        }
        x += COLS[i];
      });
    });
    y += rowH;
  }
  return y;
}

function generateTranscriptPdf(filePath, student, data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [PAGE_W, PAGE_H],
      margin: 0,
      autoFirstPage: false,
      // Tanggal tetap → PDF deterministik (hash file asli selalu sama saat dibuat ulang)
      info: { Title: 'Transkrip Akademik (Contoh)', Producer: 'Diploma Registry Demo Seeder', CreationDate: new Date('2026-12-01T00:00:00Z') }
    });
    const out = fs.createWriteStream(filePath);
    doc.pipe(out);

    const university = data.university || 'UNIVERSITAS CONTOH NUSANTARA';
    const studentName = data.studentName || student.fullName.toUpperCase();
    const groups = (offsets, count) => offsets.map(start =>
      Array.from({ length: count }, (_, k) => ({ no: start + k, course: data.courses[start + k - 1] }))
    );

    // ---------------- Halaman 1 ----------------
    doc.addPage();
    watermark(doc);
    doc.image(createLogoPng(data.logoColor), 30, 22, { width: 78, height: 78 });
    doc.font('Times-Roman').fontSize(15).text('KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI', 0, 30, { width: PAGE_W, align: 'center' });
    doc.font('Times-Bold').fontSize(16).text(university, 0, 50, { width: PAGE_W, align: 'center' });
    doc.font('Times-Roman').fontSize(8.5).text('(Didirikan berdasarkan Keputusan Presiden RI Nomor 99 Tahun 1990/', 0, 72, { width: PAGE_W, align: 'center' });
    doc.font('Times-Italic').fontSize(8.5).text('Established under the Decree of the President of the Republic of Indonesia Number 99 of 1990)', 0, 83, { width: PAGE_W, align: 'center' });
    doc.font('Times-Bold').fontSize(11).text('TRANSKRIP AKADEMIK/ ACADEMIC TRANSCRIPT', 0, 99, { width: PAGE_W, align: 'center' });
    doc.font('Times-Roman').fontSize(9).text(`Nomor/ Number: ${data.nomor}, Nomor Ijazah/ Certificate Number:`, 0, 114, { width: PAGE_W, align: 'center' });

    labelPair(doc, 'Nama/', 'Name', 30, 132);
    valuePair(doc, studentName, null, 223, 132);
    labelPair(doc, 'Nomor Induk Mahasiswa/', 'Student Identification Number', 30, 157);
    valuePair(doc, student.studentIdNumber, null, 223, 157);
    labelPair(doc, 'Tempat, Tanggal Lahir/', 'Place, Date of Birth', 30, 182);
    valuePair(doc, student.birth[0], student.birth[1], 223, 182);
    labelPair(doc, 'Kode Perguruan Tinggi/', 'University Code', 30, 207);
    valuePair(doc, '009999', null, 223, 207);

    labelPair(doc, 'Jenjang Pendidikan/', 'Education Level', 490, 132);
    valuePair(doc, 'Sarjana/', "Bachelor's Degree", 700, 132);
    labelPair(doc, 'Program Studi/', 'Study Program', 490, 157);
    valuePair(doc, 'Informatika/', 'Informatics', 700, 157);
    doc.font('Times-Roman').fontSize(9).text('Kode/ Code', 490, 182, { lineBreak: false });
    valuePair(doc, '55201', null, 700, 182);
    labelPair(doc, 'Tanggal lulus/', 'Graduation Date', 490, 196);
    valuePair(doc, data.graduationDate[0], data.graduationDate[1], 700, 196);

    let y = drawTableHeader(doc, 236);
    drawTableRows(doc, y, groups([1, 15, 29], 9));

    // ---------------- Halaman 2 ----------------
    doc.addPage();
    watermark(doc);
    y = drawTableHeader(doc, 30);
    y = drawTableRows(doc, y, groups([10, 24, 38], 5)) + 8;

    doc.font('Times-Roman').fontSize(9).text(`A.  Total SKS/ Total Credits : ${data.totalSks} SKS`, 32, y, { lineBreak: false });
    doc.text('B.', 300, y, { lineBreak: false });
    doc.text('Indeks Prestasi Kumulatif/', 314, y, { lineBreak: false });
    doc.text(`Grade Point Average : ${data.ipk}`, 314, y + 11, { lineBreak: false });
    doc.text('C.', 560, y, { lineBreak: false });
    doc.text('Dinyatakan Lulus Dengan Yudisium/', 574, y, { lineBreak: false });
    doc.text('Graduation Judicial Predicate:', 574, y + 11, { lineBreak: false });
    doc.font('Times-Bold').text(data.yudisium, 574, y + 23, { lineBreak: false });

    y += 42;
    doc.font('Times-BoldItalic').fontSize(9).text('Judul Skripsi/ Title of Undergraduate Thesis:', 32, y, { lineBreak: false });
    doc.font('Times-Bold').text(data.thesis, 32, y + 11, { lineBreak: false });

    y += 32;
    doc.font('Times-BoldItalic').fontSize(9).text('Skala Nilai/ Grading Scale:', 32, y, { lineBreak: false });
    y += 13;
    const scaleCols = [30, 30, 58];
    for (let half = 0; half < 2; half++) {
      let sy = y;
      const rows = [['Nilai/', 'Bobot/', 'Rentang/'], ...GRADING_SCALE.slice(half * 5, half * 5 + 5)];
      rows.forEach((row, ri) => {
        let sx = 32 + half * 118;
        row.forEach((cell, ci) => {
          doc.rect(sx, sy, scaleCols[ci], 12).stroke();
          doc.font(ri === 0 ? 'Times-Bold' : 'Times-Roman').fontSize(6.5)
            .text(cell, sx, sy + 3, { width: scaleCols[ci], align: 'center', lineBreak: false });
          sx += scaleCols[ci];
        });
        sy += 12;
      });
    }

    // Blok pengesahan sejajar dengan judul "Skala Nilai" (di bawah judul skripsi)
    const py = y - 13;
    doc.font('Times-Roman').fontSize(9).text(data.signedAt, 560, py, { lineBreak: false });
    doc.text('Dekan Fakultas Teknik/', 560, py + 14, { lineBreak: false });
    doc.font('Times-Italic').text('Dean of Faculty of Engineering,', 560, py + 25, { lineBreak: false });
    doc.rect(560, py + 40, 40, 44).stroke();
    doc.font('Times-Bold').text(data.dean || 'Dr. Ir. Siti Rahmawati, S.T., M.T.', 560, py + 92, { lineBreak: false });
    doc.font('Times-Roman').text('NIP 198001012005012001', 560, py + 104, { lineBreak: false });

    doc.end();
    out.on('finish', resolve);
    out.on('error', reject);
  });
}

// ============================================================
//                        API HELPERS
// ============================================================

async function api(method, url, token, body) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  let payload = body;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${API_URL}${url}`, { method, headers, body: payload });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

const dbConnect = () => mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'diploma_registry'
});

const unlinkFiles = (docs) => {
  for (const d of docs) {
    for (const file of [d.file_path, d.qr_code_path]) {
      if (file && fs.existsSync(file)) fs.unlinkSync(file);
    }
  }
};

// Hapus dokumen demo yang tidak valid lagi (mis. Hardhat di-restart) atau bukan transkrip yang diharapkan
async function removeDocuments(docs) {
  const conn = await dbConnect();
  try {
    for (const d of docs) await conn.query('DELETE FROM documents WHERE id = ?', [d.id]);
  } finally {
    await conn.end();
  }
  unlinkFiles(docs);
}

// Hapus akun demo versi lama (1 akun berisi 10 transkrip) beserta dokumennya
async function removeLegacyDemoAccount() {
  const conn = await dbConnect();
  try {
    const [users] = await conn.query('SELECT id FROM users WHERE email = ?', [LEGACY_DEMO_EMAIL]);
    if (!users.length) return;
    const [docs] = await conn.query(
      'SELECT d.file_path, d.qr_code_path FROM documents d JOIN students s ON s.id = d.student_id WHERE s.user_id = ?',
      [users[0].id]
    );
    await conn.query('DELETE FROM students WHERE user_id = ?', [users[0].id]); // dokumen ikut terhapus (CASCADE)
    await conn.query('DELETE FROM users WHERE id = ?', [users[0].id]);
    unlinkFiles(docs);
    console.log(`🧹 Akun demo lama ${LEGACY_DEMO_EMAIL} dan ${docs.length} transkripnya dihapus`);
  } finally {
    await conn.end();
  }
}

async function ensureStudent(token, student) {
  const created = await api('POST', '/students', token, student);
  if (created.status === 201) return created.data.studentId;
  if (created.status === 409) {
    const list = await api('GET', '/students', token);
    const existing = (list.data.students || []).find(s => s.student_id_number === student.studentIdNumber);
    if (existing && existing.email === student.email) return existing.id;
    throw new Error(`Email/NIM ${student.email} (${student.studentIdNumber}) sudah dipakai data lain: ${created.data.error}`);
  }
  throw new Error(`Gagal membuat mahasiswa ${student.fullName}: ${created.data.error || created.status}`);
}

async function main() {
  console.log(`Seeding demo transcripts via ${API_URL} ...`);

  const login = await api('POST', '/auth/login', null, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (!login.data.token) throw new Error(`Login admin gagal (${login.status}). Pastikan backend berjalan dan seed_admin sudah dijalankan.`);
  const token = login.data.token;

  await removeLegacyDemoAccount();

  // Folder output dibuat ulang (isinya hanya hasil generate)
  for (const dir of ['asli', 'palsu']) {
    fs.rmSync(path.join(OUTPUT_DIR, dir), { recursive: true, force: true });
    fs.mkdirSync(path.join(OUTPUT_DIR, dir), { recursive: true });
  }

  const allDocs = (await api('GET', '/documents', token)).data.documents || [];
  const rows = [];

  for (const [i, student] of DEMO_STUDENTS.entries()) {
    const studentId = await ensureStudent(token, student);
    const title = docTitleOf(student);
    const data = buildTranscriptData(student, i);
    const { data: fakeData, changes } = tamper(data, i);

    const asliFile = `${student.no}-${student.slug}.pdf`;
    const palsuFile = `${student.no}-${student.slug}-palsu.pdf`;
    const asliPath = path.join(OUTPUT_DIR, 'asli', asliFile);
    await generateTranscriptPdf(asliPath, student, data);
    await generateTranscriptPdf(path.join(OUTPUT_DIR, 'palsu', palsuFile), student, fakeData);

    // Pertahankan transkrip yang masih valid di blockchain; sisanya dihapus
    let verificationId = null;
    const stale = [];
    for (const d of allDocs.filter(x => x.student_id === studentId)) {
      const check = d.status === 'issued' && d.doc_title === title && !verificationId
        ? await api('GET', `/documents/verify/${d.verification_id}`)
        : { data: {} };
      if (check.data.isValid) verificationId = d.verification_id;
      else stale.push(d);
    }
    if (stale.length) await removeDocuments(stale);

    let action = 'sudah terdaftar';
    if (!verificationId) {
      const form = new FormData();
      form.append('studentId', String(studentId));
      form.append('docType', 'transkrip');
      form.append('docTitle', title);
      form.append('document', new Blob([fs.readFileSync(asliPath)], { type: 'application/pdf' }), asliFile);
      const issued = await api('POST', '/documents/issue', token, form);
      if (issued.status !== 201) throw new Error(`Gagal menerbitkan ${title}: ${issued.data.error || issued.status}`);
      verificationId = issued.data.verificationId;
      action = 'diterbitkan';
    }

    console.log(`✅ ${student.no}. ${student.fullName} → ${verificationId} (${action})`);
    rows.push({ student, verificationId, ipk: data.ipk, asliFile, palsuFile, changes });
  }

  // Pastikan file asli benar-benar cocok dengan yang terdaftar
  let mismatches = 0;
  for (const r of rows) {
    const form = new FormData();
    form.append('verificationId', r.verificationId);
    form.append('document', new Blob([fs.readFileSync(path.join(OUTPUT_DIR, 'asli', r.asliFile))], { type: 'application/pdf' }), r.asliFile);
    const res = await api('POST', '/documents/verify-file', null, form);
    if (!res.data.isValid) {
      mismatches++;
      console.error(`❌ ${r.asliFile} tidak cocok dengan ${r.verificationId}`);
    }
  }

  console.table(rows.map(r => ({
    nama: r.student.fullName,
    email: r.student.email,
    verificationId: r.verificationId,
    ipk: r.ipk,
    palsuMengubah: r.changes.join(', ')
  })));

  const listPath = path.join(OUTPUT_DIR, 'DAFTAR-VERIFICATION-ID.txt');
  fs.writeFileSync(listPath, [
    'Transkrip demo: 10 mahasiswa, masing-masing 1 transkrip asli (terdaftar) + 1 versi palsu.',
    'Upload file dengan Verification ID pasangannya di halaman verifikasi.',
    `Password semua akun mahasiswa demo: ${DEMO_PASSWORD}`,
    '',
    ...rows.map(r => [
      `${r.student.no}. ${r.student.fullName} (NIM ${r.student.studentIdNumber}, login: ${r.student.email})`,
      `    Verification ID : ${r.verificationId}`,
      `    asli  : asli/${r.asliFile}`,
      `    palsu : palsu/${r.palsuFile}  (diubah: ${r.changes.join(', ')})`
    ].join('\n'))
  ].join('\n') + '\n');

  console.log(`\nDaftar akun & Verification ID: ${listPath}`);
  console.log(`Password semua akun mahasiswa demo: ${DEMO_PASSWORD}`);
  console.log(mismatches ? `\n❌ ${mismatches} file asli tidak cocok` : '\n✅ Ke-10 file asli terverifikasi valid di blockchain');
  if (mismatches) process.exitCode = 1;
}

if (require.main === module) {
  main().catch(err => {
    console.error('❌', err.message);
    process.exit(1);
  });
}

module.exports = { buildTranscriptData, tamper, generateTranscriptPdf, DEMO_STUDENTS };
