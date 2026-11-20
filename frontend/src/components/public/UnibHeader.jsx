import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, LogIn, Menu, X } from 'lucide-react';
import BrandLogo from '../BrandLogo';

// Navbar meniru unib.ac.id. Sebagian besar item hanya tampilan (belum diarahkan ke mana pun).
const TOP_LINKS = ['Unib English', 'Webmail', 'Kemendikbud', 'Site Map', 'Timeline'];

const MENU = [
  { label: 'Beranda', to: '/' },
  {
    label: 'Profil',
    items: ['Sejarah', 'Lambang', 'Visi dan Misi', 'Tugas, Fungsi, dan Tujuan', 'Pejabat Selingkung Universitas Bengkulu', 'Maturity Rating'],
  },
  {
    label: 'Fakultas',
    items: [
      'Fakultas Keguruan dan Ilmu Pendidikan',
      'Fakultas Hukum',
      'Fakultas Ekonomi dan Bisnis',
      'Fakultas Ilmu Sosial dan Ilmu Politik',
      'Fakultas Pertanian',
      'Fakultas Matematika dan Ilmu Pengetahuan Alam',
      'Fakultas Teknik',
      'Fakultas Kedokteran dan Ilmu Kesehatan',
    ],
  },
  {
    label: 'Biro dan Lembaga',
    items: ['Biro Akademik dan Kemahasiswaan', 'Biro PKU', 'LPPM', 'LPMPP'],
  },
  {
    label: 'Unit',
    items: [
      'UPA Perpustakaan',
      'UPA Bahasa',
      'UPA Teknologi, Informasi, dan Komunikasi',
      'UPA Bimbingan Konseling',
      'UPA Pengembangan Karir dan Kewirausahaan',
      'Badan Pengembangan Bisnis',
      'Unit Layanan Pengadaan',
      'LPSE',
    ],
  },
  { label: 'Pusat Informasi' },
  { label: 'Admisi' },
  { label: 'Peraturan' },
];

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1565C0] focus-visible:ring-offset-2';

// Item tanpa tujuan dirender sebagai tombol, supaya tidak memicu navigasi
function DummyItem({ children, className }) {
  return (
    <button type="button" className={className}>
      {children}
    </button>
  );
}

function DesktopMenuItem({ item, pathname }) {
  // Ukuran persis menu unib.ac.id: Helvetica 13px/13px tebal 600, padding 15px 11px, tanpa jarak antar-item
  const base = `inline-flex items-center px-[11px] py-[15px] font-unib text-[13px] font-semibold leading-[13px] transition-colors ${focusRing}`;

  if (item.to) {
    // Item halaman yang sedang dibuka bergaya navy tebal seperti "Beranda" di unib.ac.id
    const active = pathname === item.to;
    return (
      <Link to={item.to} aria-current={active ? 'page' : undefined} className={`${base} ${active ? 'text-unib-navy' : 'text-[#7A7A7A] hover:text-unib-navy'}`}>
        {item.label}
      </Link>
    );
  }

  if (!item.items) {
    return <DummyItem className={`${base} text-[#7A7A7A] hover:text-unib-navy`}>{item.label}</DummyItem>;
  }

  // Dropdown terbuka saat disorot atau difokus dengan keyboard
  return (
    <div className="group relative">
      <button type="button" aria-haspopup="true" className={`${base} text-[#7A7A7A] hover:text-unib-navy group-hover:text-unib-navy group-focus-within:text-unib-navy`}>
        {item.label}
        <ChevronDown strokeWidth={3.5} className="ml-[10px] -mr-[3px] w-3 h-3 transition-transform duration-150 group-hover:rotate-180 group-focus-within:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
      </button>
      <div className="invisible absolute left-0 top-full z-50 pt-3 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <ul className="min-w-[260px] overflow-hidden rounded-2xl border border-pub-line border-t-[3px] border-t-unib-yellow bg-white py-2 shadow-soft">
          {item.items.map((sub) => (
            <li key={sub}>
              <DummyItem className="block w-full px-4 py-2.5 text-left text-sm text-[#3B4569] hover:bg-[#F0F3FB] hover:text-unib-navy focus-visible:bg-[#F0F3FB] focus-visible:outline-none">
                {sub}
              </DummyItem>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function UnibHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <>
      {/* Bar atas: tautan kuning + blok cari yang lebih gelap */}
      <div className="bg-unib-navy">
        <div className="mx-auto flex h-[43px] max-w-[1140px] items-stretch justify-between xl:px-0">
          <nav aria-label="Tautan cepat" className="hidden items-center md:flex">
            {TOP_LINKS.map((label) => (
              <DummyItem
                key={label}
                className="px-[11px] py-[15px] font-unib text-[13px] font-semibold leading-[13px] text-[#FFEC00] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-unib-yellow"
              >
                {label}
              </DummyItem>
            ))}
          </nav>
          {/* Kanan: tautan masuk, di posisi ikon cari pada unib.ac.id, menyatu dengan bar navy */}
          <div className="ml-auto flex items-center justify-end">
            <Link
              to="/login"
              className="inline-flex h-full items-center gap-2 px-[11px] font-unib text-[13px] font-semibold leading-[13px] text-[#FFEC00] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-unib-yellow"
            >
              <LogIn className="w-4 h-4" strokeWidth={2.75} aria-hidden="true" />
              Masuk
            </Link>
          </div>
        </div>
      </div>

      {/* Header utama putih */}
      <header className="sticky top-0 z-40 border-b-4 border-[#DBDBDB] bg-white">
        <div className="mx-auto flex max-w-[1140px] items-center justify-between gap-6 px-[6px] py-5 xl:px-0">
          <Link to="/" className={`m-[10px] flex h-[43px] shrink-0 items-center gap-2 rounded ${focusRing}`}>
            <BrandLogo className="h-[34px] w-auto object-contain" alt="" />
            <span className="font-sans text-[15px] font-black uppercase leading-[1.02] tracking-[-0.02em] text-unib-navy">
              Universitas
              <br />
              Bengkulu
            </span>
            {/* Nama layanan ini, di posisi logo mitra pada unib.ac.id */}
            <span className="ml-2 hidden border-l-2 border-[#DBDBDB] pl-3 leading-tight sm:block">
              <span className="block font-unib text-[14px] font-bold text-[#1565C0]">BlockCertify</span>
              <span className="block font-unib text-[11px] text-[#7A7A7A]">Verifikasi Transkrip</span>
            </span>
          </Link>

          <nav aria-label="Navigasi utama" className="m-[10px] hidden items-center xl:flex">
            {MENU.map((item) => (
              <DesktopMenuItem key={item.label} item={item} pathname={pathname} />
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="menu-ponsel"
            aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
            className={`rounded-lg p-2 text-unib-navy hover:bg-[#F0F3FB] xl:hidden ${focusRing}`}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {menuOpen && (
          <nav id="menu-ponsel" aria-label="Navigasi ponsel" className="max-h-[70vh] overflow-y-auto border-t border-pub-line bg-white xl:hidden">
            <ul className="mx-auto max-w-[1140px] px-4 py-3 sm:px-6">
              {MENU.map((item) =>
                item.items ? (
                  <li key={item.label}>
                    <details className="group">
                      <summary className={`flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-3 font-medium text-[#3B4569] hover:bg-[#F0F3FB] [&::-webkit-details-marker]:hidden ${focusRing}`}>
                        {item.label}
                        <ChevronDown strokeWidth={3.5} className="ml-[10px] -mr-[3px] w-3 h-3 transition-transform group-open:rotate-180" aria-hidden="true" />
                      </summary>
                      <ul className="mb-2 ml-3 border-l-2 border-unib-yellow pl-2">
                        {item.items.map((sub) => (
                          <li key={sub}>
                            <DummyItem className="block w-full rounded-md px-3 py-2 text-left text-sm text-[#4A5578] hover:bg-[#F0F3FB]">
                              {sub}
                            </DummyItem>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                ) : (
                  <li key={item.label}>
                    {item.to ? (
                      <Link to={item.to} onClick={() => setMenuOpen(false)} className={`block rounded-lg px-3 py-3 font-semibold text-unib-navy hover:bg-[#F0F3FB] ${focusRing}`}>
                        {item.label}
                      </Link>
                    ) : (
                      <DummyItem className={`block w-full rounded-lg px-3 py-3 text-left font-medium text-[#3B4569] hover:bg-[#F0F3FB] ${focusRing}`}>
                        {item.label}
                      </DummyItem>
                    )}
                  </li>
                )
              )}
              <li className="mt-2 grid grid-cols-2 gap-2 border-t border-pub-line pt-3">
                <Link to="/login" className={`rounded-full border-[1.5px] border-unib-navy py-2.5 text-center text-sm font-semibold text-unib-navy ${focusRing}`}>
                  Masuk
                </Link>
                <Link to="/verify" className={`rounded-full bg-unib-navy py-2.5 text-center text-sm font-semibold text-white ${focusRing}`}>
                  Periksa dokumen
                </Link>
              </li>
            </ul>
          </nav>
        )}
      </header>
    </>
  );
}
