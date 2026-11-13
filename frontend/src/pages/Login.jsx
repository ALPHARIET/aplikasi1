import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, User, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function Login() {
  const [role, setRole] = useState('student'); // 'student' atau 'admin'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSwitchRole = (newRole) => {
    setRole(newRole);
    setIdentifier('');
    setPassword('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const user = await login(identifier, password);
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/student');
      }
    } catch (err) {
      const defaultMsg = role === 'student'
        ? 'NIM atau kata sandi salah. Silakan periksa kembali.'
        : 'Email atau kata sandi salah. Silakan coba lagi.';
      setError(err.response?.data?.error || defaultMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col lg:flex-row">
      {/* Panel Kiri - Branding Institusional (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0B0F33] text-white flex-col justify-between p-12 lg:p-16 border-r border-white/10 select-none">
        <div>
          <div className="flex items-center gap-3.5">
            <BrandLogo className="h-12 w-auto object-contain" />
            <div>
              <span className="font-bold text-xl tracking-tight text-white block">
                BlockCertify
              </span>
              <span className="text-xs text-slate-300 tracking-wider uppercase font-medium">
                Universitas Bengkulu
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-md my-auto py-12">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#1E2A78] text-white border border-[#CBD5E1]/30 mb-6">
            Sistem Verifikasi Berbasis Blockchain
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight mb-4">
            Registri Transkrip Nilai Akademik yang Sah, Aman, dan Permanen.
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Menjamin keaslian transkrip nilai lulusan Universitas Bengkulu dengan pencatatan kriptografi anti-pemalsuan pada smart contract ledger blockchain.
          </p>
        </div>

        <div className="text-xs text-slate-400 pt-6 border-t border-white/10 flex items-center justify-between">
          <span>&copy; {new Date().getFullYear()} Universitas Bengkulu</span>
          <span className="text-slate-400">v1.0.0</span>
        </div>
      </div>

      {/* Panel Kanan - Form Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-md">
          {/* Mobile Header Branding */}
          <div className="lg:hidden flex flex-col items-center text-center mb-8">
            <BrandLogo className="h-16 w-auto object-contain mb-3" />
            <h1 className="text-2xl font-bold text-brand-900 tracking-tight">BlockCertify</h1>
            <p className="text-xs text-muted mt-1">Registri Dokumen Akademik Universitas Bengkulu</p>
          </div>

          <div className="bg-surface rounded-xl border border-border p-8 shadow-sm">
            {/* Pilihan Peran: Mahasiswa vs Administrator */}
            <div className="flex rounded-lg bg-canvas p-1 border border-border mb-6">
              <button
                type="button"
                onClick={() => handleSwitchRole('student')}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                  role === 'student'
                    ? 'bg-[#151B54] text-white shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Portal Mahasiswa
              </button>
              <button
                type="button"
                onClick={() => handleSwitchRole('admin')}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                  role === 'admin'
                    ? 'bg-[#151B54] text-white shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Administrator
              </button>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-brand-900">
                {role === 'student' ? 'Masuk Portal Mahasiswa' : 'Masuk Administrator'}
              </h2>
              <p className="text-xs text-muted mt-1">
                {role === 'student'
                  ? 'Silakan masukkan NIM dan kata sandi akun mahasiswa Anda.'
                  : 'Silakan masukkan alamat email dan kata sandi admin Anda.'}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              {role === 'student' ? (
                <Input
                  label="Nomor Induk Mahasiswa (NIM)"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Contoh: G1A022001"
                  icon={User}
                  autoComplete="username"
                  hint="NIM terdaftar yang dibuatkan akun oleh admin."
                />
              ) : (
                <Input
                  label="Alamat Email Admin"
                  type="email"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@univ.edu"
                  icon={Mail}
                  autoComplete="email"
                />
              )}

              <Input
                label="Kata Sandi"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                icon={Lock}
                autoComplete="current-password"
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    className="p-1 rounded-md bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#E6EAFB] hover:text-[#151B54] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B3FA8]"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full py-3 text-sm font-semibold"
                  loading={isSubmitting}
                >
                  {isSubmitting ? 'Memproses...' : (role === 'student' ? 'Masuk ke Portal' : 'Masuk sebagai Admin')}
                </Button>
              </div>
            </form>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => handleSwitchRole(role === 'student' ? 'admin' : 'student')}
                className="text-xs text-brand-600 hover:text-brand-900 font-medium inline-flex items-center gap-1.5 transition-colors"
              >
                <span>
                  {role === 'student' ? 'Beralih ke Login Administrator' : 'Beralih ke Login Mahasiswa (NIM)'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Catatan demo khusus DEV */}
            {import.meta.env.DEV && (
              <div className="mt-6 pt-5 border-t border-border">
                <div className="p-3 bg-brand-50 rounded-lg border border-brand-100 text-[11px] text-muted space-y-1">
                  <p className="font-semibold text-brand-900">Catatan Demo (Mode Pengembangan):</p>
                  <p>
                    <span className="font-medium text-ink">Admin:</span> admin@univ.edu / adminpassword123
                  </p>
                  <p>
                    <span className="font-medium text-ink">Mahasiswa:</span> Login pakai NIM dan kata sandi yang dibuat di menu Kelola Mahasiswa.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
