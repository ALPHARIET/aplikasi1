// Test karakterisasi: mengunci hasil pembacaan dan perbandingan transkrip demo saat ini.
// Kalau snapshot berubah, perilaku comparator berubah. Perbarui snapshot hanya kalau
// perubahannya memang disengaja: npm run test:update-snapshots
const { test } = require('node:test');
const fs = require('fs');
const path = require('path');
const { compareDocuments, extractPdf, parseTranscript } = require('../../src/services/documentComparator');

const DIR = path.join(__dirname, '../../database/seeds/demo-transcripts');
const files = fs.existsSync(path.join(DIR, 'asli')) ? fs.readdirSync(path.join(DIR, 'asli')).sort() : [];
const skip = files.length ? false : 'Fixture demo belum ada. Jalankan npm run seed:demo dulu.';

const round = (n) => Math.round(n * 10) / 10;
const boxes = (list) => (list || []).map((b) => ({ page: b.page, x: round(b.x), y: round(b.y), w: round(b.w), h: round(b.h) }));

// Field transkrip apa adanya, termasuk kotak koordinat yang dipakai penampil perbandingan
const describeFields = (fields) => fields.map((f) => ({
  section: f.section, key: f.key, label: f.label, row: f.row, rowOnly: f.rowOnly,
  value: f.value, boxes: boxes(f.boxes)
}));

for (const asli of files) {
  const palsu = asli.replace(/\.pdf$/, '-palsu.pdf');

  test(`parseTranscript: ${asli}`, { skip }, async (t) => {
    t.assert.snapshot(describeFields(parseTranscript(await extractPdf(path.join(DIR, 'asli', asli)))));
  });

  test(`parseTranscript: ${palsu}`, { skip }, async (t) => {
    t.assert.snapshot(describeFields(parseTranscript(await extractPdf(path.join(DIR, 'palsu', palsu)))));
  });

  test(`compareDocuments: ${asli} vs versi palsu`, { skip }, async (t) => {
    const result = await compareDocuments(path.join(DIR, 'asli', asli), path.join(DIR, 'palsu', palsu), 'application/pdf');
    t.assert.snapshot({
      ...result,
      fields: result.fields.map((f) => ({ ...f, boxes: boxes(f.boxes) }))
    });
  });
}

test('compareDocuments: dokumen asli dengan dirinya sendiri tidak punya perbedaan', { skip }, async (t) => {
  const file = path.join(DIR, 'asli', files[0]);
  const result = await compareDocuments(file, file, 'application/pdf');
  t.assert.deepStrictEqual(result.summary.differences, 0);
});

test('compareDocuments: berkas bukan PDF tidak didukung', async (t) => {
  const result = await compareDocuments('asli.pdf', 'foto.png', 'image/png');
  t.assert.equal(result.supported, false);
});

test('compareDocuments: berkas asli yang hilang dilaporkan', async (t) => {
  const result = await compareDocuments(path.join(DIR, 'tidak-ada.pdf'), 'x.pdf', 'application/pdf');
  t.assert.deepStrictEqual(result, { supported: false, reason: 'File asli tidak ditemukan di server.' });
});
