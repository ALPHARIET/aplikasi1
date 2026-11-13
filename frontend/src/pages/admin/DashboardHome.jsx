import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Users,
  CheckCircle2,
  ShieldAlert,
  FilePlus,
  ArrowRight,
  Eye,
  ShieldCheck,
  UserPlus,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import CopyText from '../../components/ui/CopyText';
import Drawer from '../../components/ui/Drawer';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonCard, SkeletonTableRow } from '../../components/ui/Skeleton';

export default function DashboardHome() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [students, setStudents] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboardData = async () => {
      setLoading(true);
      setError('');
      try {
        const [docsRes, studentsRes, pendingRes] = await Promise.all([
          api.get('/documents'),
          api.get('/students'),
          api.get('/admin/transcript-requests/pending-count').catch(() => ({ data: { count: 0 } })),
        ]);
        if (isMounted) {
          setDocs(docsRes.data.documents || []);
          setStudents(studentsRes.data.students || []);
          setPendingCount(pendingRes.data?.count || 0);
        }
      } catch (err) {
        if (isMounted) {
          console.error(err);
          setError('Gagal memuat data dashboard. Pastikan server backend sedang aktif.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDashboardData();
    return () => { isMounted = false; };
  }, []);

  // Format date in Indonesian: e.g. "Jumat, 6 November 2026"
  const todayFormatted = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const totalDocs = docs.length;
  const totalStudents = students.length;
  const validDocs = docs.filter((d) => d.status === 'issued' || d.status === 'valid').length;
  const revokedDocs = docs.filter((d) => d.status === 'revoked').length;

  const recentDocs = [...docs]
    .sort((a, b) => new Date(b.issued_at || b.created_at || 0) - new Date(a.issued_at || a.created_at || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Selamat datang, ${user?.name || 'Administrator'}`}
        description={`Ringkasan data registri dokumen akademik Universitas Bengkulu • ${todayFormatted}`}
        action={
          <Link to="/admin/issue">
            <Button variant="primary" icon={FilePlus}>
              Terbitkan Dokumen
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

      {/* Grid 5 StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              label="TOTAL DOKUMEN"
              value={totalDocs}
              icon={FileText}
              helperText="Transkrip terdaftar"
            />
            <StatCard
              label="TOTAL MAHASISWA"
              value={totalStudents}
              icon={Users}
              helperText="Mahasiswa di sistem"
            />
            <StatCard
              label="PERMINTAAN MENUNGGU"
              value={pendingCount}
              icon={ClipboardList}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              helperText="Permintaan transkrip pending"
            />
            <StatCard
              label="DOKUMEN VALID"
              value={validDocs}
              icon={CheckCircle2}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              helperText="Aktif di blockchain"
            />
            <StatCard
              label="DOKUMEN DICABUT"
              value={revokedDocs}
              icon={ShieldAlert}
              iconBg="bg-red-50"
              iconColor="text-red-600"
              helperText="Status dicabut / revoked"
            />
          </>
        )}
      </div>

      {/* Dua Kolom: Kiri (2/3) Dokumen Terbaru, Kanan (1/3) Aksi Cepat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Dokumen Terbaru */}
        <div className="lg:col-span-2">
          <Card className="p-0 overflow-hidden">
            <div className="p-6 pb-4 flex items-center justify-between border-b border-border">
              <div>
                <h2 className="text-base font-semibold text-brand-900">Dokumen Terbaru</h2>
                <p className="text-xs text-muted mt-0.5">5 dokumen yang baru diterbitkan ke blockchain</p>
              </div>
              <Link
                to="/admin/documents"
                className="text-xs font-medium text-brand-600 hover:text-brand-900 inline-flex items-center gap-1 transition-colors"
              >
                <span>Lihat semua</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="p-6">
                <table className="w-full">
                  <tbody>
                    <SkeletonTableRow columns={5} />
                    <SkeletonTableRow columns={5} />
                    <SkeletonTableRow columns={5} />
                  </tbody>
                </table>
              </div>
            ) : recentDocs.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Belum ada dokumen"
                description="Dokumen yang baru diterbitkan akan muncul di sini."
                action={
                  <Link to="/admin/issue">
                    <Button variant="primary" size="sm" icon={FilePlus}>
                      Terbitkan Dokumen Pertama
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-ink">
                  <thead className="bg-canvas/70 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted">
                    <tr>
                      <th className="px-6 py-3">Dokumen</th>
                      <th className="px-6 py-3">Mahasiswa</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Tanggal Terbit</th>
                      <th className="px-6 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentDocs.map((doc) => (
                      <tr key={doc.id} className="hover:bg-brand-50 transition-colors duration-150">
                        <td className="px-6 py-4">
                          <span className="font-semibold text-brand-900 block text-xs uppercase tracking-wide">
                            {doc.doc_type}
                          </span>
                          <span className="text-xs text-muted block truncate max-w-[180px]">
                            {doc.doc_title}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-ink block text-xs">
                            {doc.full_name}
                          </span>
                          <span className="text-[11px] font-mono text-muted block">
                            {doc.student_id_number}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={doc.status} />
                        </td>
                        <td className="px-6 py-4 text-xs text-muted tabular-nums">
                          {doc.issued_at
                            ? new Date(doc.issued_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedDoc(doc)}
                            aria-label="Lihat detail dokumen"
                            title="Lihat Detail"
                            className="p-1.5 rounded-lg bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#E6EAFB] hover:text-[#151B54] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B3FA8]"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Kolom Kanan: Aksi Cepat */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col justify-between">
            <div>
              <CardHeader
                title="Aksi Cepat"
                description="Pintasan ke tugas administrasi yang sering digunakan"
              />
              <div className="space-y-3">
                <Link
                  to="/admin/transcript-requests"
                  className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border hover:border-brand-500 hover:bg-brand-50 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-brand-900 group-hover:text-brand-700">
                        Permintaan Transkrip
                      </p>
                      {pendingCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-slate-950">
                          {pendingCount}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted truncate">
                      Tinjau dan proses permohonan transkrip nilai
                    </p>
                  </div>
                </Link>

                <Link
                  to="/admin/issue"
                  className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border hover:border-brand-500 hover:bg-brand-50 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 group-hover:bg-brand-700 group-hover:text-white transition-colors">
                    <FilePlus className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-brand-900 group-hover:text-brand-700">
                      Terbitkan Dokumen
                    </p>
                    <p className="text-[11px] text-muted truncate">
                      Unggah berkas transkrip nilai ke blockchain
                    </p>
                  </div>
                </Link>

                <Link
                  to="/admin/students"
                  className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border hover:border-brand-500 hover:bg-brand-50 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 group-hover:bg-brand-700 group-hover:text-white transition-colors">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-brand-900 group-hover:text-brand-700">
                      Kelola Mahasiswa
                    </p>
                    <p className="text-[11px] text-muted truncate">
                      Tambah data mahasiswa atau perbarui informasi
                    </p>
                  </div>
                </Link>

                <Link
                  to="/verify"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border hover:border-brand-500 hover:bg-brand-50 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 group-hover:bg-brand-700 group-hover:text-white transition-colors">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-brand-900 group-hover:text-brand-700">
                      Verifikasi Publik
                    </p>
                    <p className="text-[11px] text-muted truncate">
                      Cek keaslian berkas dan perbandingan perbedaan
                    </p>
                  </div>
                </Link>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-border bg-canvas/60 p-4 rounded-lg">
              <p className="text-[11px] font-semibold text-brand-900">Keamanan Smart Contract</p>
              <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
                Setiap dokumen yang diterbitkan tercatat dengan hash kriptografi SHA-256 yang permanen di jaringan blockchain.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Drawer Detail Dokumen */}
      <Drawer
        isOpen={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        title="Detail Dokumen"
        description="Informasi metadata dan rekaman blockchain dokumen"
        maxWidth="max-w-lg"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setSelectedDoc(null)}>
            Tutup
          </Button>
        }
      >
        {selectedDoc && (
          <div className="space-y-4">
            <div className="bg-canvas p-4 rounded-lg border border-border space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Status Dokumen</span>
                <StatusBadge status={selectedDoc.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Jenis Dokumen</span>
                <span className="text-xs font-semibold uppercase text-brand-900">
                  {selectedDoc.doc_type}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Judul Dokumen</span>
                <span className="text-xs font-medium text-ink">{selectedDoc.doc_title}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <p className="text-[11px] font-medium text-muted uppercase tracking-wider mb-1">
                  Nama Mahasiswa
                </p>
                <p className="text-sm font-semibold text-ink">{selectedDoc.full_name}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted uppercase tracking-wider mb-1">
                  NIM
                </p>
                <p className="text-xs font-mono font-medium text-ink">
                  {selectedDoc.student_id_number}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted uppercase tracking-wider mb-1">
                  Fakultas
                </p>
                <p className="text-xs text-ink">{selectedDoc.faculty || '-'}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted uppercase tracking-wider mb-1">
                  Tanggal Terbit
                </p>
                <p className="text-xs text-ink">
                  {selectedDoc.issued_at
                    ? new Date(selectedDoc.issued_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '-'}
                </p>
              </div>

              <div className="pt-3 border-t border-border space-y-3">
                <div>
                  <p className="text-[11px] font-medium text-muted uppercase tracking-wider mb-1">
                    Verification ID
                  </p>
                  <CopyText text={selectedDoc.verification_id} showFull className="w-full" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted uppercase tracking-wider mb-1">
                    TX Hash (Blockchain)
                  </p>
                  <CopyText text={selectedDoc.tx_hash} showFull className="w-full" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted uppercase tracking-wider mb-1">
                    File Hash (SHA-256)
                  </p>
                  <CopyText text={selectedDoc.file_hash} showFull className="w-full" />
                </div>
              </div>

              {selectedDoc.status === 'revoked' && selectedDoc.revocation_reason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <p className="font-semibold text-red-900 mb-0.5">Alasan Pencabutan:</p>
                  <p>{selectedDoc.revocation_reason}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

