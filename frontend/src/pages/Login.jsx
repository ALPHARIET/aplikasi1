import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, User, ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import fotoUnib from '../assets/foto_unib.jpg';

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-unib-blue focus-visible:ring-offset-2';
// Input 48px; warna isian otomatis browser (biru muda) ditimpa putih supaya tetap rapi
const inputClass =
  '!h-12 !rounded-lg !border-[#C5CAD3] !bg-white !text-[15px] focus:!ring-unib-blue autofill:shadow-[inset_0_0_0_1000px_#fff] [&:-webkit-autofill]:[-webkit-text-fill-color:#0A0B0D]';

// Isi panel kiri dan formulir mengikuti peran yang dipilih
const ROLES = {
  student: {
    tab: 'Mahasiswa',
    panelTitle: 'Portal mahasiswa',
    perks: [
      'Ajukan permintaan transkrip ke admin',
      'Unduh transkrip resmi dalam bentuk PDF',
      'Bagikan Verification ID ke pemberi kerja atau kampus tujuan',
    ],
    heading: 'Masuk portal mahasiswa',
    sub: 'Pakai NIM dan kata sandi yang diberikan admin.',
    submit: 'Masuk ke portal',
    error: 'NIM atau kata sandi salah. Periksa lagi, lalu coba masuk.',
    demo: { identifier: 'G1A022001', password: 'demopassword123', label: 'Rina Puspita Sari, G1A022001' },
  },
  admin: {
    tab: 'Administrator',
    panelTitle: 'Ruang administrator',
    perks: [
      'Terbitkan transkrip dan catat sidik jarinya di blockchain',
      'Proses permintaan transkrip dari mahasiswa',
      'Cabut dokumen yang sudah tidak berlaku',
    ],
    heading: 'Masuk administrator',
    sub: 'Pakai email dan kata sandi akun admin.',
    submit: 'Masuk sebagai admin',
    error: 'Email atau kata sandi salah. Periksa lagi, lalu coba masuk.',
    demo: { identifier: 'admin@univ.edu', password: 'adminpassword123', label: 'admin@univ.edu' },
  },
};

function Wordmark() {
  return (
    <span className="flex items-center gap-3">
      <BrandLogo className="h-11 w-auto object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" alt="" />
      <span className="font-sans text-[16px] font-black uppercase leading-[1.02] tracking-[-0.02em] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
        Universitas
        <br />
        Bengkulu
      </span>
    </span>
  );
}

export default function Login() {
  const [role, setRole] = useState('student'); // 'student' atau 'admin'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [actualRole, setActualRole] = useState(null); // diisi kalau akun ternyata milik tab lain
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const copy = ROLES[role];

  const handleSwitchRole = (newRole) => {
    if (newRole === role) return;
    setRole(newRole);
    setIdentifier('');
    setPassword('');
    setError('');
    setActualRole(null);
  };

  // Pindah ke tab yang sesuai dengan akun, isian tetap dipertahankan supaya tinggal tekan Masuk
  const switchToActualRole = () => {
    setRole(actualRole);
    setError('');
    setActualRole(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setActualRole(null);
    setIsSubmitting(true);

    try {
      const user = await login(identifier, password, role);
      navigate(user.role === 'admin' ? '/admin' : '/student');
    } catch (err) {
      if (err.response?.data?.code === 'ROLE_MISMATCH') setActualRole(err.response.data.actualRole);
      // Kredensial salah memakai kalimat sesuai peran; galat lain memakai pesan dari server
      setError(err.response?.status === 401 ? copy.error : err.response?.data?.error || 'Tidak bisa terhubung ke server. Coba lagi sebentar lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemo = () => {
    setIdentifier(copy.demo.identifier);
    setPassword(copy.demo.password);
    setError('');
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-pub-ink lg:flex-row">
      {/* Panel foto: tepi kanan miring dengan garis kuning, seperti hero beranda */}
      <aside className="relative h-48 shrink-0 select-none sm:h-56 lg:sticky lg:top-0 lg:h-screen lg:w-[50%] xl:w-[52%]">
        <div aria-hidden="true" className="absolute inset-0 bg-unib-yellow [clip-path:polygon(0_0,100%_0,100%_calc(100%_-_24px),0_100%)] lg:[clip-path:polygon(0_0,100%_0,calc(100%_-_110px)_100%,0_100%)]" />
        <div className="absolute inset-0 overflow-hidden bg-unib-deep [clip-path:polygon(0_0,100%_0,100%_calc(100%_-_34px),0_calc(100%_-_12px))] lg:[clip-path:polygon(0_0,calc(100%_-_14px)_0,calc(100%_-_124px)_100%,0_100%)]">
          <img src={fotoUnib} alt="" className="absolute inset-0 h-full w-full object-cover object-[center_40%]" />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[rgba(0,32,76,0.72)] lg:bg-[linear-gradient(180deg,rgba(0,32,76,0.5)_0%,rgba(0,32,76,0.25)_35%,rgba(0,32,76,0.92)_78%,rgba(0,32,76,0.97)_100%)]"
          />
        </div>

        <div className="relative flex h-full flex-col justify-between px-5 pb-10 pt-6 text-white sm:px-8 lg:px-12 lg:pb-12 lg:pr-40 lg:pt-10 xl:px-16 xl:pr-44">
          <Link to="/" className={`self-start rounded ${focusRing}`} aria-label="Universitas Bengkulu, kembali ke beranda">
            <Wordmark />
          </Link>

          {/* Daftar yang berubah sesuai peran; disembunyikan di layar kecil */}
          <div className="hidden max-w-md lg:block" aria-live="polite">
            <p className="text-sm font-semibold text-unib-yellow">BlockCertify</p>
            <h1 className="mt-2 text-[2.5rem] font-semibold leading-[1.08] tracking-[-0.02em] xl:text-[2.875rem]">{copy.panelTitle}</h1>
            <ul className="mt-6 space-y-3.5">
              {copy.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-3 text-[17px] leading-snug text-[#DCE2F7]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-unib-yellow text-unib-deep">
                    <Check className="w-3 h-3" strokeWidth={3.5} aria-hidden="true" />
                  </span>
                  {perk}
                </li>
              ))}
            </ul>
            <p className="mt-10 text-xs text-white/60">Foto: Gedung Rektorat Universitas Bengkulu</p>
          </div>
        </div>
      </aside>

      {/* Formulir */}
      <main className="flex w-full flex-1 flex-col px-5 pb-10 pt-6 sm:px-8 lg:px-12 lg:py-10">
        <Link
          to="/"
          className={`inline-flex items-center gap-1.5 self-start rounded-md py-1 text-sm font-semibold text-pub-body hover:text-unib-navy ${focusRing}`}
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Kembali ke beranda
        </Link>

        {/* Rata atas, bukan tengah: formulir tidak melompat saat tab diganti */}
        <div className="flex flex-1 justify-center pt-8 lg:pt-[9vh]">
          <div className="w-full max-w-[400px]">
            {/* Pilihan peran bergaya tab navbar UNIB: garis bawah navy pada yang aktif */}
            <div role="tablist" aria-label="Jenis akun" className="flex border-b border-[#DBDBDB]">
              {Object.entries(ROLES).map(([value, r]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  id={`tab-${value}`}
                  aria-selected={role === value}
                  aria-controls="panel-masuk"
                  onClick={() => handleSwitchRole(value)}
                  className={`-mb-px border-b-[3px] px-1 pb-3 pt-1 text-[15px] font-semibold transition-colors first:mr-7 ${focusRing} ${
                    role === value ? 'border-unib-navy text-unib-navy' : 'border-transparent text-[#666666] hover:text-unib-navy'
                  }`}
                >
                  {r.tab}
                </button>
              ))}
            </div>

            <div id="panel-masuk" role="tabpanel" aria-labelledby={`tab-${role}`}>
              <h2 className="mt-9 text-[1.875rem] font-semibold leading-tight tracking-[-0.02em] text-pub-ink">{copy.heading}</h2>
              <p className="mt-2 text-base text-pub-body">{copy.sub}</p>

              {error && (
                <div role="alert" className="mt-6 flex items-start gap-2.5 rounded-lg border-l-4 border-pub-down bg-[#FDECEE] p-4 text-sm text-[#A3101C]">
                  <AlertCircle className="mt-0.5 w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="font-medium leading-relaxed">
                    {error}
                    {actualRole && ROLES[actualRole] && (
                      <button
                        type="button"
                        onClick={switchToActualRole}
                        className={`mt-1 block rounded font-semibold text-unib-navy underline underline-offset-2 hover:no-underline ${focusRing}`}
                      >
                        Pindah ke tab {ROLES[actualRole].tab}
                      </button>
                    )}
                  </span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                {role === 'student' ? (
                  <Input
                    id="login-nim"
                    label="Nomor Induk Mahasiswa (NIM)"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Contoh: G1A022001"
                    icon={User}
                    autoComplete="username"
                    className={inputClass}
                  />
                ) : (
                  <Input
                    id="login-email"
                    label="Email admin"
                    type="email"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="nama@unib.ac.id"
                    icon={Mail}
                    autoComplete="username"
                    className={inputClass}
                  />
                )}

                <Input
                  id="login-password"
                  label="Kata sandi"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={Lock}
                  autoComplete="current-password"
                  className={inputClass}
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                      className={`rounded-md p-1.5 text-pub-body hover:bg-pub-strong hover:text-pub-ink ${focusRing}`}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="!mt-7 !h-12 w-full !rounded-lg !bg-unib-navy text-base font-semibold hover:!bg-[#1D2F86]"
                  loading={isSubmitting}
                >
                  {isSubmitting ? 'Memproses…' : copy.submit}
                </Button>
              </form>

              {role === 'student' && (
                <p className="mt-5 text-sm leading-relaxed text-pub-body">
                  Belum punya akun atau lupa kata sandi? Akun mahasiswa dibuat oleh admin, jadi hubungi Biro Akademik dan Kemahasiswaan.
                </p>
              )}

              {/* Akun demo, hanya muncul saat pengembangan */}
              {import.meta.env.DEV && (
                <div className="mt-8 flex items-center justify-between gap-4 rounded-lg border border-dashed border-[#C5CAD3] px-4 py-3">
                  <p className="min-w-0 text-[13px] leading-snug text-pub-body">
                    <span className="block font-semibold text-pub-ink">Akun demo</span>
                    <span className="block truncate">{copy.demo.label}</span>
                  </p>
                  <button
                    type="button"
                    onClick={fillDemo}
                    className={`shrink-0 rounded-md bg-pub-strong px-3 py-2 text-[13px] font-semibold text-unib-navy hover:bg-[#E2E6EE] ${focusRing}`}
                  >
                    Isi otomatis
                  </button>
                </div>
              )}
            </div>

            <p className="mt-10 border-t border-[#DBDBDB] pt-6 text-sm text-pub-body">
              Hanya ingin memeriksa keaslian transkrip?{' '}
              <Link to="/verify" className={`rounded font-semibold text-unib-blue underline-offset-2 hover:underline ${focusRing}`}>
                Periksa tanpa akun
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
