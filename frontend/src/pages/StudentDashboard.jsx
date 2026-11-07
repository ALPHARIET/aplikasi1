import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { LogOut, Download, CheckCircle, ShieldAlert, Clock, Loader2, FileText, ShieldCheck } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import CopyText from '../components/ui/CopyText';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';

const STATUS_CONFIG = {
  issued: { label: 'Valid', box: 'bg-emerald-50 text-emerald-600', Icon: CheckCircle },
  revoked: { label: 'Dicabut', box: 'bg-red-50 text-red-600', Icon: ShieldAlert },
  pending: { label: 'Menunggu', box: 'bg-amber-50 text-amber-600', Icon: Clock },
};

export default function StudentDashboard() {
  const { logout, user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/documents/my-documents')
      .then((res) => setDocuments(res.data.documents || []))
      .catch((err) => setError(err.response?.data?.error || 'Gagal memuat dokumen mahasiswa.'))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (doc) => {
    try {
      const res = await api.get(`/documents/${doc.verification_id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.verification_id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Gagal mengunduh dokumen.');
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      {/* Navbar Mahasiswa */}
      <nav className="bg-surface border-b border-border px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-9 w-auto object-contain" />
          <div>
            <span className="font-semibold text-base tracking-tight text-brand-900 block">
              BlockCertify
            </span>
            <span className="text-[10px] text-muted tracking-wider uppercase font-medium">
              Portal Mahasiswa
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-ink">{user?.name}</p>
            <p className="text-[11px] text-muted">{user?.email}</p>
          </div>
          <Button
            variant="dangerOutline"
            size="sm"
            onClick={logout}
            icon={LogOut}
          >
            Keluar
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-brand-900 tracking-tight">Dokumen Saya</h1>
          <p className="text-xs text-muted mt-1">
            Daftar ijazah dan transkrip nilai akademik Anda yang tercatat secara sah di blockchain.
          </p>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
            <span className="text-xs">Memuat dokumen akademik Anda...</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && documents.length === 0 && (
          <Card className="py-12">
            <EmptyState
              icon={FileText}
              title="Belum Ada Dokumen"
              description="Belum ada ijazah atau transkrip nilai yang diterbitkan untuk akun mahasiswa Anda."
            />
          </Card>
        )}

        <div className="grid gap-4">
          {documents.map((doc) => {
            const config = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
            const Icon = config.Icon;
            return (
              <Card
                key={doc.id}
                className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-brand-500 transition-colors"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className={`p-3 rounded-xl ${config.box} shrink-0`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h2 className="font-semibold text-base text-brand-900">{doc.doc_title}</h2>
                      <StatusBadge status={doc.status} />
                    </div>
                    <div className="text-xs text-muted space-y-1 pt-1">
                      <div className="flex items-center gap-1.5">
                        <span>Verification ID:</span>
                        <CopyText text={doc.verification_id} />
                      </div>
                      <p>
                        <span>Tanggal Terbit: </span>
                        <span className="text-ink font-medium">
                          {doc.issued_at
                            ? new Date(doc.issued_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })
                            : '-'}
                        </span>
                      </p>
                      {doc.status === 'revoked' && doc.revocation_reason && (
                        <p className="text-red-700 font-medium">
                          Alasan dicabut: {doc.revocation_reason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Link to={`/verify/${doc.verification_id}`}>
                    <Button variant="secondary" size="sm" icon={ShieldCheck}>
                      Halaman Verifikasi
                    </Button>
                  </Link>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Download}
                    onClick={() => handleDownload(doc)}
                  >
                    Unduh Berkas
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
