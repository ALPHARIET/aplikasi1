import { Link } from 'react-router-dom';
import { ExternalLink, MapPin } from 'lucide-react';
import BrandLogo from '../BrandLogo';

const UNIB_URL = 'https://www.unib.ac.id/';

// Footer navy seperti unib.ac.id, dengan tipografi tautan dan pita legal ala Coinbase
export default function UnibFooter() {
  const year = new Date().getFullYear();
  const linkClass = 'text-sm text-[#B9C3E6] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-unib-yellow rounded';

  return (
    <footer className="bg-unib-navy">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-16 sm:px-6 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-12 w-auto object-contain" alt="" />
            <span className="text-[17px] font-black uppercase leading-[0.95] text-white">
              Universitas
              <br />
              Bengkulu
            </span>
          </div>
          <p className="mt-6 flex gap-2.5 text-sm leading-relaxed text-[#B9C3E6]">
            <MapPin className="mt-0.5 w-4 h-4 shrink-0 text-unib-yellow" aria-hidden="true" />
            <span>
              Gedung Rektorat, Jl. W.R. Supratman, Kandang Limun,
              <br />
              Bengkulu 38122, Indonesia
            </span>
          </p>
        </div>

        <div className="md:col-span-3">
          <h2 className="text-base font-semibold text-white">Layanan BlockCertify</h2>
          <ul className="mt-5 space-y-3">
            <li><Link to="/verify" className={linkClass}>Periksa dokumen</Link></li>
            <li><Link to="/login" className={linkClass}>Portal mahasiswa</Link></li>
            <li><Link to="/login" className={linkClass}>Administrator</Link></li>
          </ul>
        </div>

        <div className="md:col-span-4">
          <h2 className="text-base font-semibold text-white">Informasi</h2>
          <ul className="mt-5 space-y-3">
            <li><a href="/#cara-kerja" className={linkClass}>Cara kerja pemeriksaan</a></li>
            <li><a href="/#pertanyaan" className={linkClass}>Pertanyaan yang sering diajukan</a></li>
            <li>
              <a href={UNIB_URL} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1.5 ${linkClass}`}>
                Situs resmi Universitas Bengkulu
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 bg-unib-night">
        <p className="mx-auto max-w-[1200px] px-4 py-5 text-[13px] text-[#8D99C7] sm:px-6">
          &copy; {year} Universitas Bengkulu. BlockCertify, registri transkrip akademik berbasis blockchain.
        </p>
      </div>
    </footer>
  );
}
