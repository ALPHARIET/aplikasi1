import { useMemo, useState } from 'react';
import { ShieldCheck, ShieldX } from 'lucide-react';
import BrandLogo from '../BrandLogo';
import { sha256Hex } from '../../utils/sha256';

// Transkrip contoh (fiktif). Sidik jari dihitung dari isi ini setiap kali ada perubahan.
const ORIGINAL = {
  nama: 'Rina Puspita Sari',
  nim: 'G1A022001',
  prodi: 'Informatika',
  courses: [
    { kode: 'TIF-2102', nama: 'Basis Data', sks: 3, nilai: 'A' },
    { kode: 'TIF-2105', nama: 'Struktur Data', sks: 3, nilai: 'A-' },
    { kode: 'TIF-3201', nama: 'Jaringan Komputer', sks: 3, nilai: 'B+' },
    { kode: 'TIF-3208', nama: 'Rekayasa Perangkat Lunak', sks: 3, nilai: 'A' },
  ],
  totalSks: 144,
  ipk: '3,77',
};

// Perubahan yang bisa dicoba pengunjung
const EDITS = [
  { key: 'ipk', label: 'Ubah IPK dari 3,77 menjadi 3,97', apply: (doc) => ({ ...doc, ipk: '3,97' }) },
  {
    key: 'jarkom',
    label: 'Ubah nilai Jaringan Komputer dari B+ menjadi A',
    apply: (doc) => ({
      ...doc,
      courses: doc.courses.map((c) => (c.kode === 'TIF-3201' ? { ...c, nilai: 'A' } : c)),
    }),
  },
];

const fingerprint = (doc) => sha256Hex(JSON.stringify(doc));
const RECORDED_HASH = fingerprint(ORIGINAL);

// Hash dua baris sama panjang (2 x 32 karakter); karakter yang berbeda dari catatan ditebalkan merah
function HashLine({ hash, compareTo, className }) {
  const renderChars = (start) =>
    hash.slice(start, start + 32).split('').map((ch, j) => {
      const i = start + j;
      const differs = compareTo && ch !== compareTo[i];
      return (
        <span
          // key ikut berubah saat karakternya berubah, supaya animasi kedip diputar ulang
          key={`${i}-${ch}`}
          className={differs ? 'hash-char-changed font-bold text-pub-down' : undefined}
        >
          {ch}
        </span>
      );
    });

  return (
    <code className={`block font-mono text-[12px] leading-relaxed sm:text-[13px] ${className}`}>
      <span className="block">{renderChars(0)}</span>
      <span className="block">{renderChars(32)}</span>
    </code>
  );
}

// Kotak merah seperti di penampil perbandingan dokumen aplikasi
const changedBox = 'outline outline-2 outline-[#DC2626] outline-offset-2 rounded-[2px] bg-[#FEE2E2]';

export default function TamperDemo() {
  const [active, setActive] = useState({});

  const doc = useMemo(
    () => EDITS.reduce((acc, edit) => (active[edit.key] ? edit.apply(acc) : acc), ORIGINAL),
    [active]
  );
  const currentHash = useMemo(() => fingerprint(doc), [doc]);
  const isMatch = currentHash === RECORDED_HASH;

  const toggle = (key) => setActive((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
      {/* Lembar transkrip contoh */}
      <div className="lg:col-span-6">
        <div className="transcript-paper relative overflow-hidden rounded border border-[#DBDBDB] bg-white text-[#1a1a1a]">
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex select-none items-center justify-center">
            <span className="-rotate-[24deg] font-sans text-[64px] font-bold tracking-[0.2em] text-[#15236A]/[0.06]">CONTOH</span>
          </span>

          <div className="relative px-7 pb-6 pt-7 font-transcript">
            <div className="flex items-center gap-3 border-b-2 border-double border-[#1a1a1a] pb-3">
              <BrandLogo className="h-11 w-auto object-contain" alt="" />
              <div className="leading-tight">
                <p className="text-[13px] font-bold tracking-wide">UNIVERSITAS BENGKULU</p>
                <p className="text-[11px]">Fakultas Teknik, Program Studi {doc.prodi}</p>
              </div>
            </div>

            <p className="mt-3 text-center text-[13px] font-bold tracking-[0.12em]">TRANSKRIP AKADEMIK</p>

            <dl className="mt-3 grid grid-cols-[88px_1fr] gap-y-0.5 text-[12px]">
              <dt>Nama</dt>
              <dd>: {doc.nama}</dd>
              <dt>NIM</dt>
              <dd>: {doc.nim}</dd>
            </dl>

            <table className="mt-3 w-full border-collapse text-[11.5px]">
              <thead>
                <tr className="border-y border-[#1a1a1a] text-left">
                  <th className="w-[72px] py-1 font-bold">Kode</th>
                  <th className="py-1 font-bold">Mata kuliah</th>
                  <th className="w-9 py-1 text-center font-bold">SKS</th>
                  <th className="w-11 py-1 text-center font-bold">Nilai</th>
                </tr>
              </thead>
              <tbody>
                {doc.courses.map((c) => {
                  const changed = c.nilai !== ORIGINAL.courses.find((o) => o.kode === c.kode).nilai;
                  return (
                    <tr key={c.kode}>
                      <td className="py-[3px]">{c.kode}</td>
                      <td className="py-[3px]">{c.nama}</td>
                      <td className="py-[3px] text-center">{c.sks}</td>
                      <td className="py-[3px] text-center">
                        <span className={`inline-block px-1 ${changed ? changedBox : ''}`}>{c.nilai}</span>
                      </td>
                    </tr>
                  );
                })}
                <tr aria-hidden="true">
                  <td colSpan={4} className="py-[3px] text-center text-[#6b6b6b]">. . .</td>
                </tr>
              </tbody>
            </table>

            <div className="mt-1 flex justify-between border-t border-[#1a1a1a] pt-1.5 text-[12px]">
              <span>Jumlah SKS: {doc.totalSks}</span>
              <span>
                Indeks Prestasi Kumulatif:
                <span className={`ml-1.5 inline-block px-1 font-bold ${doc.ipk !== ORIGINAL.ipk ? changedBox : ''}`}>{doc.ipk}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Kontrol + perbandingan sidik jari */}
      <div className="lg:col-span-6">
        <fieldset>
          <legend className="text-base font-semibold text-pub-ink">Perubahan pada transkrip</legend>
          <div className="mt-3 divide-y divide-pub-line border-y border-pub-line">
            {EDITS.map((edit) => (
              <label key={edit.key} className="flex cursor-pointer items-center gap-3 py-3.5 text-[15px] text-pub-ink">
                <input
                  type="checkbox"
                  checked={!!active[edit.key]}
                  onChange={() => toggle(edit.key)}
                  className="h-[18px] w-[18px] shrink-0 cursor-pointer accent-unib-navy"
                />
                {edit.label}
              </label>
            ))}
          </div>
        </fieldset>

        <h3 className="mt-8 text-base font-semibold text-pub-ink">Sidik jari SHA-256</h3>
        <table className="mt-3 w-full border-collapse text-left">
          <tbody>
            <tr className="border-t border-pub-line align-top">
              <th scope="row" className="w-[38%] py-3.5 pr-4 text-sm font-normal text-pub-body">Transkrip contoh</th>
              <td className="py-3.5">
                <HashLine hash={currentHash} compareTo={RECORDED_HASH} className="text-pub-ink" />
              </td>
            </tr>
            <tr className="border-y border-pub-line align-top">
              <th scope="row" className="py-3.5 pr-4 text-sm font-normal text-pub-body">Tercatat di blockchain saat terbit</th>
              <td className="py-3.5">
                <HashLine hash={RECORDED_HASH} className="text-pub-muted" />
              </td>
            </tr>
          </tbody>
        </table>

        <p role="status" aria-live="polite" className="mt-6 flex items-start gap-3 text-[15px] leading-normal text-pub-body">
          {isMatch ? (
            <ShieldCheck className="mt-0.5 w-5 h-5 shrink-0 text-pub-up" aria-hidden="true" />
          ) : (
            <ShieldX className="mt-0.5 w-5 h-5 shrink-0 text-pub-down" aria-hidden="true" />
          )}
          <span>
            <strong className="font-semibold text-pub-ink">{isMatch ? 'Cocok.' : 'Tidak cocok.'}</strong>{' '}
            {isMatch
              ? 'Isi transkrip sama dengan yang diterbitkan, jadi sidik jarinya sama persis.'
              : 'Isinya sudah diubah, jadi sidik jarinya berbeda total. Bagian yang berubah ditandai kotak merah.'}
          </span>
        </p>
      </div>
    </div>
  );
}
