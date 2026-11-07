import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const user = await login(email, password);
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/student');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Email atau kata sandi tidak valid. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col lg:flex-row">
      {/* Panel Kiri - Branding Institusional (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-950 text-white flex-col justify-between p-12 lg:p-16 border-r border-white/10 select-none">
        <div>
          <div className="flex items-center gap-3.5">
            <BrandLogo className="h-12 w-auto object-contain" />
            <div>
              <span className="font-semibold text-xl tracking-tight text-white block">
                BlockCertify
              </span>
              <span className="text-xs text-slate-400 tracking-wider uppercase font-medium">
                Universitas Bengkulu
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-md my-auto py-12">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-700/80 text-brand-100 border border-brand-500/30 mb-6">
            Sistem Verifikasi Berbasis Blockchain
          </div>
          <h1 className="text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-tight mb-4">
            Registri Dokumen Akademik yang Tepercaya, Aman, dan Permanen.
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Menjamin keaslian ijazah dan transkrip nilai lulusan Universitas Bengkulu dengan pencatatan kriptografi anti-pemalsuan pada smart contract blockchain.
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
            <h1 className="text-2xl font-semibold text-brand-900 tracking-tight">BlockCertify</h1>
            <p className="text-xs text-muted mt-1">Registri Dokumen Akademik Universitas Bengkulu</p>
          </div>

          <div className="bg-surface rounded-xl border border-border p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-brand-900">Masuk ke Akun</h2>
              <p className="text-xs text-muted mt-1">
                Silakan masukkan alamat email dan kata sandi Anda.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
              <Input
                label="Alamat Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@univ.edu"
                icon={Mail}
                autoComplete="email"
              />

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
                  {isSubmitting ? 'Memproses...' : 'Masuk'}
                </Button>
              </div>
            </form>

            {/* Catatan demo khusus DEV */}
            {import.meta.env.DEV && (
              <div className="mt-6 pt-5 border-t border-border">
                <div className="p-3 bg-brand-50 rounded-lg border border-brand-100 text-[11px] text-muted space-y-1">
                  <p className="font-semibold text-brand-900">Catatan Demo (Mode Pengembangan):</p>
                  <p>
                    <span className="font-medium text-ink">Admin:</span> admin@univ.edu / adminpassword123
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
