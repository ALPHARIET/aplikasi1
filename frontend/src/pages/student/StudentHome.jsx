import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Clock,
  CheckCircle2,
  FilePlus,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonCard, SkeletonTableRow } from '../../components/ui/Skeleton';
import DataTable, { TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../../components/ui/DataTable';

export default function StudentHome() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchStudentData = async () => {
      setLoading(true);
      setError('');
      try {
        const [meRes, docsRes, reqsRes] = await Promise.all([
          api.get('/student/me'),
          api.get('/student/documents'),
          api.get('/student/transcript-requests'),
        ]);

        if (isMounted) {
          setProfile(meRes.data.student);
          setDocuments(docsRes.data.documents || []);
          setRequests(reqsRes.data.requests || []);
        }
      } catch (err) {
        if (isMounted) {
          console.error(err);
          setError('Gagal memuat data portal mahasiswa.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStudentData();
    return () => { isMounted = false; };
  }, []);

  const totalIssued = documents.filter((d) => d.status === 'issued' || d.status === 'valid').length;
  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const latestRequest = requests[0] || null;

  const todayFormatted = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Selamat datang, ${profile?.fullName || user?.name || 'Mahasiswa'}`}
        description={`${profile ? `NIM: ${profile.studentIdNumber} • ${profile.faculty} - ${profile.program || ''}` : 'Portal Mahasiswa BlockCertify'} • ${todayFormatted}`}
        action={
          <Link to="/student/requests">
            <Button variant="primary" icon={FilePlus}>
              Ajukan Transkrip
            </Button>
          </Link>
        }
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
            Muat Ulang
          </Button>
        </div>
      )}

      {/* Grid 3 StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              label="PERMINTAAN TERAKHIR"
              value={latestRequest ? latestRequest.status.toUpperCase() : 'BELUM ADA'}
              icon={Clock}
              iconBg={latestRequest?.status === 'pending' ? 'bg-amber-50' : 'bg-brand-50'}
              iconColor={latestRequest?.status === 'pending' ? 'text-amber-600' : 'text-brand-600'}
              helperText={
                latestRequest
                  ? `Diajukan pada ${new Date(latestRequest.requested_at).toLocaleDateString('id-ID')}`
                  : 'Belum ada pengajuan transkrip'
              }
            />
            <StatCard
              label="TRANSKRIP DITERBITKAN"
              value={totalIssued}
              icon={CheckCircle2}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              helperText="Tercatat sah di blockchain"
            />
            <StatCard
              label="PERMINTAAN MENUNGGU"
              value={pendingRequests.length}
              icon={FileText}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              helperText={pendingRequests.length > 0 ? 'Sedang diverifikasi bagian akademik' : 'Tidak ada permohonan antre'}
            />
          </>
        )}
      </div>

      {/* Banner status jika ada permohonan pending */}
      {!loading && pendingRequests.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-900">
                Permintaan Transkrip Sedang Diproses
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Pengajuan transkrip Anda sedang ditinjau oleh bagian akademik untuk penerbitan ke ledger blockchain.
              </p>
            </div>
          </div>
          <Link to="/student/requests">
            <Button variant="secondary" size="sm">
              Lihat Status
            </Button>
          </Link>
        </div>
      )}

      {/* Dua Kolom: Kiri (2/3) Dokumen Transkrip Terbit, Kanan (1/3) Riwayat Permintaan Singkat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-0 overflow-hidden">
            <div className="p-6 pb-4 flex items-center justify-between border-b border-border">
              <div>
                <h2 className="text-base font-semibold text-brand-900">Transkrip Nilai Akademik</h2>
                <p className="text-xs text-muted mt-0.5">Dokumen resmi yang telah diterbitkan ke blockchain</p>
              </div>
              <Link
                to="/student/documents"
                className="text-xs font-medium text-brand-600 hover:text-brand-900 inline-flex items-center gap-1 transition-colors"
              >
                <span>Lihat semua</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="p-6 space-y-3">
                <SkeletonTableRow columns={3} />
                <SkeletonTableRow columns={3} />
              </div>
            ) : documents.length === 0 ? (
              <div className="p-10">
                <EmptyState
                  icon={FileText}
                  title="Belum Ada Transkrip Terbit"
                  description="Transkrip nilai Anda belum diterbitkan ke blockchain. Silakan ajukan permohonan transkrip nilai."
                  action={
                    <Link to="/student/requests">
                      <Button variant="primary" size="sm" icon={FilePlus}>
                        Ajukan Transkrip Sekarang
                      </Button>
                    </Link>
                  }
                />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {documents.slice(0, 3).map((doc) => (
                  <div key={doc.id} className="p-5 flex items-center justify-between gap-4 hover:bg-canvas/50 transition-colors">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-brand-900 truncate">
                          {doc.doc_title}
                        </span>
                        <StatusBadge status={doc.status} />
                      </div>
                      <p className="text-[11px] text-muted">
                        Diterbitkan: {doc.issued_at ? new Date(doc.issued_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                      </p>
                    </div>

                    <Link to={`/verify/${doc.verification_id}`}>
                      <Button variant="secondary" size="sm" icon={ShieldCheck}>
                        Verifikasi
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Kolom Kanan: Aksi Cepat & Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader
              title="Aksi Cepat"
              description="Akses mudah ke layanan portal mahasiswa"
            />
            <div className="space-y-3">
              <Link
                to="/student/requests"
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-brand-500 hover:bg-brand-50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 group-hover:bg-brand-700 group-hover:text-white transition-colors">
                  <FilePlus className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-brand-900">Permohonan Transkrip</p>
                  <p className="text-[11px] text-muted truncate">Ajukan permohonan transkrip nilai baru</p>
                </div>
              </Link>

              <Link
                to="/student/documents"
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-brand-500 hover:bg-brand-50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-brand-900">Dokumen Saya</p>
                  <p className="text-[11px] text-muted truncate">Unduh transkrip resmi berformat PDF</p>
                </div>
              </Link>

              <Link
                to="/student/profile"
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-brand-500 hover:bg-brand-50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-[#0B0F33] group-hover:text-white transition-colors">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-brand-900">Profil & Kata Sandi</p>
                  <p className="text-[11px] text-muted truncate">Periksa data diri dan ubah kata sandi</p>
                </div>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

