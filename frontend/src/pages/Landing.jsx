import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldX,
  Ban,
  FileQuestion,
  ArrowLeftRight,
  Briefcase,
  GraduationCap,
  Landmark,
  Plus,
  Upload,
  Link2,
  FileSearch,
  FileCheck2,
} from 'lucide-react';
import PublicLayout from '../components/public/PublicLayout';
import TamperDemo from '../components/public/TamperDemo';
import fotoUnib from '../assets/foto_unib.jpg';

const STEPS = [
  {
    icon: Upload,
    title: 'Bagian akademik mengunggah transkrip',
    body: 'Berkas PDF disimpan di server kampus. Sistem menghitung sidik jari SHA-256 dari isi berkas itu, byte demi byte.',
  },
  {
    icon: Link2,
    title: 'Sidik jari dicatat di blockchain',
    body: 'Smart contract menyimpan sidik jari bersama waktu terbit dan alamat penerbit. Hanya akun penerbit Universitas Bengkulu yang bisa menulis catatan ini. Pemilik transkrip mendapat Verification ID.',
  },
  {
    icon: FileSearch,
    title: 'Siapa pun bisa memeriksa',
    body: 'Pemeriksa memasukkan Verification ID dan mengunggah berkasnya. Sistem menghitung ulang sidik jarinya lalu mencocokkannya dengan catatan di blockchain.',
  },
];

// Baris hasil bergaya "asset row" Coinbase: ikon bulat, judul, penjelasan
const OUTCOMES = [
  {
    icon: ShieldCheck,
    title: 'Asli',
    body: 'Sidik jari cocok dan transkrip masih berlaku. Isinya sama persis dengan yang diterbitkan kampus.',
  },
  {
    icon: ShieldX,
    title: 'Sudah diubah',
    body: 'Sidik jari tidak cocok. Sistem membandingkan isi berkas dengan aslinya dan menandai kolom yang berubah dengan kotak merah, misalnya IPK atau nama.',
  },
  {
    icon: ArrowLeftRight,
    title: 'Terdaftar dengan Verification ID lain',
    body: 'Berkasnya asli, tetapi milik Verification ID yang berbeda. Biasanya karena ID tertukar atau salah ketik.',
  },
  {
    icon: Ban,
    title: 'Dicabut',
    body: 'Transkrip pernah terbit, lalu dicabut oleh bagian akademik. Alasan pencabutannya ikut ditampilkan.',
  },
  {
    icon: FileQuestion,
    title: 'Tidak terdaftar',
    body: 'Tidak ada catatan untuk Verification ID ini di blockchain. Periksa lagi penulisan ID-nya.',
  },
];

const AUDIENCES = [
  {
    icon: Briefcase,
    who: 'Pemberi kerja dan instansi',
    what: 'Periksa transkrip pelamar tanpa menyurati kampus dan tanpa membuat akun.',
    cta: { to: '/verify', label: 'Periksa dokumen' },
  },
  {
    icon: GraduationCap,
    who: 'Mahasiswa dan alumni',
    what: 'Ajukan permintaan transkrip, unduh berkasnya, dan salin Verification ID untuk dikirim ke perusahaan.',
    cta: { to: '/login', label: 'Masuk portal mahasiswa' },
  },
  {
    icon: Landmark,
    who: 'Bagian akademik',
    what: 'Terbitkan transkrip ke blockchain, proses permintaan mahasiswa, dan cabut transkrip yang keliru dengan alasan tertulis.',
    cta: { to: '/login', label: 'Masuk administrator' },
  },
];

const FAQS = [
  {
    q: 'Apakah nama dan nilai saya disimpan di blockchain?',
    a: 'Tidak. Blockchain hanya menyimpan sidik jari SHA-256 berkas, alamat penerbit, waktu terbit, dan status berlaku atau dicabut. Nama, NIM, dan nilai tetap di basis data kampus. Sidik jari tidak bisa dibalik menjadi isi dokumen.',
  },
  {
    q: 'Dari mana saya mendapat Verification ID?',
    a: 'Dari pemilik transkrip. Mahasiswa bisa menyalinnya di Portal Mahasiswa, menu Dokumen. Formatnya seperti DOC-2026-G1A022001-OU6Q21.',
  },
  {
    q: 'Kenapa berkas hasil scan dinyatakan tidak cocok?',
    a: 'Sidik jari dihitung dari berkas digital aslinya. Berkas yang dicetak lalu dipindai, disimpan ulang, atau dikompres menghasilkan sidik jari berbeda walaupun isinya terlihat sama. Minta berkas PDF asli kepada pemiliknya.',
  },
  {
    q: 'Bisakah transkrip yang sudah terbit diubah?',
    a: 'Tidak bisa. Kalau ada kesalahan, bagian akademik mencabut transkrip itu dengan alasan tertulis lalu menerbitkan yang baru dengan Verification ID baru. Status dicabut tetap terlihat setiap kali transkrip lama diperiksa.',
  },
  {
    q: 'Siapa yang bisa menerbitkan transkrip?',
    a: 'Hanya akun penerbit milik Universitas Bengkulu. Smart contract menolak penerbitan dan pencabutan dari alamat lain.',
  },
];

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-unib-blue focus-visible:ring-offset-2';
const pillNavy = `inline-flex h-11 items-center justify-center rounded-full bg-unib-navy px-5 text-base font-semibold text-white transition-colors hover:bg-[#1D2F86] active:bg-unib-night ${focusRing}`;
const pillSoft = `inline-flex h-11 items-center justify-center rounded-full bg-pub-strong px-5 text-base font-semibold text-pub-ink transition-colors hover:bg-pub-line ${focusRing}`;

// Judul bagian: tipografi display Coinbase (tebal 400) + garis kuning khas unib.ac.id
function SectionTitle({ title, children, align = 'center' }) {
  const centered = align === 'center';
  return (
    <div className={centered ? 'mx-auto max-w-2xl text-center' : 'max-w-xl'}>
      <span aria-hidden="true" className={`block h-1 w-12 rounded-full bg-unib-yellow ${centered ? 'mx-auto' : ''}`} />
      <h2 className="mt-5 text-[2rem] font-normal leading-[1.1] tracking-[-0.02em] text-pub-ink sm:text-[2.75rem]">{title}</h2>
      {children && <p className="mt-4 text-base leading-normal text-pub-body sm:text-lg">{children}</p>}
    </div>
  );
}

function VerifyForm() {
  const [id, setId] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = id.trim();
    navigate(trimmed ? `/verify/${encodeURIComponent(trimmed)}` : '/verify');
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="hero-verification-id" className="block text-sm font-semibold text-pub-ink">
        Verification ID
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="hero-verification-id"
          type="text"
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="DOC-2026-G1A022001-OU6Q21"
          autoComplete="off"
          spellCheck={false}
          aria-describedby="hero-verification-hint"
          className="h-12 w-full min-w-0 rounded-md border border-[#C5CAD3] bg-white px-4 font-mono text-[15px] text-pub-ink placeholder:text-[#A8ACB3] focus:border-2 focus:border-unib-blue focus:px-[15px] focus:outline-none sm:flex-1"
        />
        <button
          type="submit"
          className={`h-12 rounded-md bg-unib-navy px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#1D2F86] active:bg-unib-night ${focusRing}`}
        >
          Periksa dokumen
        </button>
      </div>
      <p id="hero-verification-hint" className="mt-3 text-sm text-pub-muted">
        Setelah ini Anda mengunggah berkas PDF dari pemilik transkrip.
      </p>
    </form>
  );
}

export default function Landing() {
  return (
    <PublicLayout>
      {/* Hero foto kampus seperti slider unib.ac.id: foto penuh, lapisan navy agar teks terbaca, tepi miring kuning */}
      <section className="relative overflow-hidden bg-unib-deep text-white">
        <img
          src={fotoUnib}
          alt=""
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-[center_40%]"
        />
        {/* Lapisan navy: pekat di kiri (tempat teks), menipis ke kanan supaya gedung tetap terlihat */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,32,76,0.94)_0%,rgba(0,32,76,0.82)_40%,rgba(0,32,76,0.35)_75%,rgba(0,32,76,0.2)_100%)] max-lg:bg-[rgba(0,32,76,0.82)]"
        />
        <div className="relative mx-auto max-w-[1140px] px-4 pb-44 pt-20 sm:px-6 lg:px-[10px] lg:pb-52 lg:pt-28">
          <h1 className="max-w-2xl text-[2.25rem] font-semibold leading-tight tracking-[-0.02em] text-balance sm:text-5xl">
            Periksa keaslian transkrip lulusan Universitas Bengkulu
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-normal text-[#DCE2F7]">
            Cocokkan berkas transkrip dengan catatan yang diterbitkan kampus di blockchain. Tidak perlu akun.
          </p>
        </div>
        <div className="absolute inset-x-0 top-4">
          <p className="mx-auto max-w-[1140px] px-4 text-right text-xs text-white/80 [text-shadow:0_1px_2px_rgba(0,0,0,0.6)] sm:px-6 lg:px-[10px]">
            Gedung Rektorat Universitas Bengkulu
          </p>
        </div>

        <svg aria-hidden="true" className="absolute bottom-0 left-0 h-[48px] w-full sm:h-[72px]" viewBox="0 0 1440 72" preserveAspectRatio="none">
          <polygon points="0,6 1440,62 1440,72 0,16" fill="#FBEB00" />
          <polygon points="0,16 1440,72 0,72" fill="#FFFFFF" />
        </svg>
      </section>

      {/* Kartu form, menumpuk di tepi bawah foto */}
      <div className="relative z-10 mx-auto -mt-32 max-w-[1140px] px-4 sm:px-6 lg:-mt-36 lg:px-[10px]">
        <div className="grid gap-8 rounded-lg border border-[#DBDBDB] bg-white p-6 shadow-[0_16px_40px_-12px_rgba(0,32,76,0.35)] sm:p-8 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-7">
            <VerifyForm />
          </div>
          <div className="border-t border-pub-line pt-6 md:col-span-5 md:border-l md:border-t-0 md:pl-10 md:pt-0">
            <h2 className="text-sm font-semibold text-pub-ink">Yang perlu disiapkan</h2>
            <ul className="mt-3 space-y-2.5 text-[15px] text-pub-body">
              <li className="flex gap-2.5">
                <FileCheck2 className="mt-0.5 w-[18px] h-[18px] shrink-0 text-unib-navy" aria-hidden="true" />
                Verification ID dari pemilik transkrip
              </li>
              <li className="flex gap-2.5">
                <FileCheck2 className="mt-0.5 w-[18px] h-[18px] shrink-0 text-unib-navy" aria-hidden="true" />
                Berkas PDF asli, bukan hasil scan
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Demo: transkrip contoh yang bisa diubah, disajikan datar tanpa hiasan */}
      <section id="coba" className="scroll-mt-32 bg-white pb-24 pt-20">
        <div className="mx-auto max-w-[1140px] px-4 sm:px-6 lg:px-[10px]">
          <SectionTitle title="Coba ubah satu nilai" align="left">
            Transkrip di bawah ini contoh fiktif. Centang salah satu perubahan, lalu bandingkan sidik jarinya dengan yang
            tercatat saat transkrip diterbitkan.
          </SectionTitle>
          <div className="mt-10">
            <TamperDemo />
          </div>
        </div>
      </section>

      {/* Cara kerja: memang berurutan, jadi diberi label langkah */}
      <section id="cara-kerja" className="scroll-mt-32 bg-white py-24">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <SectionTitle title="Cara kerjanya">
            Berkas transkrip tetap di server kampus. Yang masuk ke blockchain hanya sidik jarinya.
          </SectionTitle>

          <ol className="mt-16 grid gap-6 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="rounded-3xl border border-pub-line bg-white p-8">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pub-strong text-unib-navy">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <span className="rounded-full bg-pub-strong px-3 py-1 text-xs font-semibold text-pub-ink">Langkah {i + 1}</span>
                </div>
                <h3 className="mt-8 text-lg font-semibold leading-snug text-pub-ink">{title}</h3>
                <p className="mt-3 text-base leading-normal text-pub-body">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Hasil pemeriksaan */}
      <section id="hasil" className="scroll-mt-32 bg-pub-soft py-24">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-4 sm:px-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionTitle title="Hasil yang akan Anda lihat" align="left">
              Pemeriksaan selalu berakhir di salah satu dari lima hasil ini, lengkap dengan penjelasan apa yang terjadi
              pada berkas yang Anda unggah.
            </SectionTitle>
            <Link to="/verify" className={`mt-8 ${pillNavy}`}>
              Periksa dokumen
            </Link>
          </div>

          <ul className="rounded-3xl border border-pub-line bg-white px-6 sm:px-8 lg:col-span-8">
            {OUTCOMES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4 border-b border-pub-line py-6 last:border-b-0 sm:gap-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pub-strong text-unib-navy">
                  <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-pub-ink">{title}</h3>
                  <p className="mt-1.5 text-base leading-normal text-pub-body">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pengguna */}
      <section id="pengguna" className="scroll-mt-32 bg-white py-24">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          <SectionTitle title="Siapa memakai BlockCertify" />

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {AUDIENCES.map(({ icon: Icon, who, what, cta }) => (
              <div key={who} className="flex flex-col rounded-3xl border border-pub-line bg-white p-8 transition-shadow hover:shadow-soft">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF8B8] text-unib-navy">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <h3 className="mt-8 text-lg font-semibold text-pub-ink">{who}</h3>
                <p className="mt-3 flex-1 text-base leading-normal text-pub-body">{what}</p>
                <Link to={cta.to} className={`mt-8 self-start ${pillSoft}`}>
                  {cta.label}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pita kuning khas unib.ac.id, disusun seperti CTA band Coinbase */}
      <section className="bg-unib-yellow py-20">
        <div className="mx-auto max-w-[1200px] px-4 text-center sm:px-6">
          <h2 className="mx-auto max-w-2xl text-[2rem] font-normal leading-[1.1] tracking-[-0.02em] text-unib-navy sm:text-[2.75rem]">
            Ada transkrip yang perlu Anda periksa?
          </h2>
          <p className="mt-4 text-lg text-[#2A3570]">Siapkan Verification ID dan berkas PDF-nya. Tidak perlu akun.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/verify" className={`h-14 px-8 ${pillNavy}`}>
              Periksa dokumen
            </Link>
            <Link
              to="/login"
              className={`inline-flex h-14 items-center rounded-full border border-unib-navy px-8 text-base font-semibold text-unib-navy transition-colors hover:bg-unib-navy hover:text-white ${focusRing}`}
            >
              Masuk
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ: baris berpembatas tipis, ikon plus di pelat bulat */}
      <section id="pertanyaan" className="scroll-mt-32 bg-white py-24">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-4 sm:px-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionTitle title="Pertanyaan yang sering diajukan" align="left" />
          </div>
          <div className="border-t border-pub-line lg:col-span-8">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group border-b border-pub-line">
                <summary className={`flex cursor-pointer list-none items-center justify-between gap-6 rounded-lg py-6 text-lg font-semibold text-pub-ink [&::-webkit-details-marker]:hidden ${focusRing}`}>
                  {q}
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pub-strong transition-colors group-open:bg-unib-yellow">
                    <Plus
                      className="w-4 h-4 text-unib-navy transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </span>
                </summary>
                <p className="max-w-2xl pb-6 text-base leading-normal text-pub-body">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
