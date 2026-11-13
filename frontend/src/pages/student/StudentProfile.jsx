import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Shield,
  KeyRound,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SkeletonCard } from '../../components/ui/Skeleton';

export default function StudentProfile() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form Ubah Kata Sandi
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api.get('/student/me')
      .then((res) => {
        if (isMounted) setProfile(res.data.student);
      })
      .catch((err) => {
        if (isMounted) setError('Gagal memuat profil mahasiswa.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwdError('Semua kolom kata sandi wajib diisi.');
      return;
    }

    if (newPassword.length < 6) {
      setPwdError('Kata sandi baru minimal 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    if (currentPassword === newPassword) {
      setPwdError('Kata sandi baru tidak boleh sama dengan kata sandi saat ini.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.put('/student/password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setPwdSuccess(res.data.message || 'Kata sandi berhasil diubah! Anda akan dialihkan ke halaman login...');

      // Sesuai Catatan 5: Logout dan arahkan ke login ulang
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 2000);

    } catch (err) {
      setPwdError(err.response?.data?.error || 'Gagal mengubah kata sandi. Silakan periksa kembali kata sandi saat ini.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil & Keamanan Akun"
        description="Informasi data diri akademik dan pengelolaan keamanan kata sandi portal mahasiswa."
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Kolom Kiri: Profil Mahasiswa (Read-only) */}
        <Card>
          <CardHeader
            title="Informasi Akademik Mahasiswa"
            description="Data resmi terdaftar pada pangkalan data akademik universitas"
          />

          {loading ? (
            <div className="space-y-4">
              <SkeletonCard />
            </div>
          ) : profile ? (
            <div className="space-y-4">
              <div className="p-4 bg-canvas rounded-xl border border-border">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                  Nomor Induk Mahasiswa (NIM)
                </span>
                <span className="font-mono text-lg font-bold text-brand-900 block mt-0.5">
                  {profile.studentIdNumber}
                </span>
              </div>

              <div className="divide-y divide-border text-xs">
                <div className="py-3 flex justify-between gap-4">
                  <span className="text-muted">Nama Lengkap</span>
                  <span className="font-semibold text-ink text-right">{profile.fullName}</span>
                </div>
                <div className="py-3 flex justify-between gap-4">
                  <span className="text-muted">Alamat Email</span>
                  <span className="font-mono text-ink text-right">{profile.email}</span>
                </div>
                <div className="py-3 flex justify-between gap-4">
                  <span className="text-muted">Fakultas</span>
                  <span className="font-semibold text-ink text-right">{profile.faculty}</span>
                </div>
                <div className="py-3 flex justify-between gap-4">
                  <span className="text-muted">Program Studi</span>
                  <span className="font-semibold text-ink text-right">{profile.program || '-'}</span>
                </div>
                <div className="py-3 flex justify-between gap-4">
                  <span className="text-muted">Status / Tahun Lulus</span>
                  <span className="font-semibold text-ink text-right">
                    {profile.graduationYear ? `Lulus Tahun ${profile.graduationYear}` : 'Mahasiswa Aktif'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-brand-50 rounded-lg border border-brand-100 flex items-start gap-2.5 text-[11px] text-muted">
                <Shield className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                <p>
                  Perubahan data identitas dan status akademik hanya dapat dilakukan oleh Administrator Akademik Universitas.
                </p>
              </div>
            </div>
          ) : null}
        </Card>

        {/* Kolom Kanan: Form Ubah Kata Sandi */}
        <Card>
          <CardHeader
            title="Ubah Kata Sandi"
            description="Perbarui kata sandi akun portal mahasiswa Anda secara berkala"
          />

          {pwdError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700 mb-4">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{pwdError}</span>
            </div>
          )}

          {pwdSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-xs text-emerald-800 mb-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold">{pwdSuccess}</span>
                <p className="text-[11px] text-emerald-700">Mengarahkan ke halaman masuk...</p>
              </div>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4" autoComplete="off">
            <Input
              label="Kata Sandi Saat Ini"
              type={showCurrent ? 'text' : 'password'}
              required
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={submitting || !!pwdSuccess}
              autoComplete="current-password"
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  aria-label={showCurrent ? 'Sembunyikan' : 'Tampilkan'}
                  className="p-1 rounded text-muted hover:text-ink"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <Input
              label="Kata Sandi Baru"
              type={showNew ? 'text' : 'password'}
              required
              placeholder="Minimal 6 karakter"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={submitting || !!pwdSuccess}
              hint="Gunakan kombinasi huruf dan angka untuk keamanan lebih baik."
              autoComplete="new-password"
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  aria-label={showNew ? 'Sembunyikan' : 'Tampilkan'}
                  className="p-1 rounded text-muted hover:text-ink"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <Input
              label="Konfirmasi Kata Sandi Baru"
              type={showConfirm ? 'text' : 'password'}
              required
              placeholder="Ulangi kata sandi baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting || !!pwdSuccess}
              autoComplete="new-password"
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label={showConfirm ? 'Sembunyikan' : 'Tampilkan'}
                  className="p-1 rounded text-muted hover:text-ink"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                icon={KeyRound}
                loading={submitting}
                disabled={submitting || !!pwdSuccess}
              >
                {submitting ? 'Memperbarui...' : 'Simpan Kata Sandi Baru'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

