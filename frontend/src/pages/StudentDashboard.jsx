import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { FileText, LogOut, Download, CheckCircle, ShieldAlert, Clock, Loader2 } from 'lucide-react';

const STATUS_STYLE = {
  issued: { label: 'Valid', box: 'bg-emerald-50 text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle },
  revoked: { label: 'Revoked', box: 'bg-red-50 text-red-600', badge: 'bg-red-100 text-red-700', Icon: ShieldAlert },
  pending: { label: 'Pending', box: 'bg-amber-50 text-amber-600', badge: 'bg-amber-100 text-amber-700', Icon: Clock }
};

export default function StudentDashboard() {
  const { logout, user } = useAuth();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/documents/my-documents')
      .then(res => setDocuments(res.data.documents || []))
      .catch(err => setError(err.response?.data?.error || 'Gagal memuat dokumen.'))
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
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2 text-indigo-600">
          <FileText className="w-6 h-6" />
          <span className="font-bold text-xl tracking-tight text-slate-900">Student Portal</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-900">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">My Documents</h1>
        
        {loading && (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>
        )}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && documents.length === 0 && (
          <p className="text-slate-500">Belum ada dokumen yang diterbitkan.</p>
        )}

        <div className="grid gap-6">
          {documents.map((doc) => {
            const style = STATUS_STYLE[doc.status] || STATUS_STYLE.pending;
            return (
            <div key={doc.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:shadow-md transition-shadow">
              
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${style.box}`}>
                  <style.Icon className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-lg text-slate-900">{doc.doc_title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.badge}`}>{style.label}</span>
                  </div>
                  <div className="text-sm text-slate-500 mt-1 flex flex-col gap-1">
                    <p className="break-all"><span className="font-medium text-slate-700">Verification ID:</span> {doc.verification_id}</p>
                    <p><span className="font-medium text-slate-700">Issued Date:</span> {doc.issued_at ? new Date(doc.issued_at).toLocaleDateString('id-ID') : '-'}</p>
                    {doc.status === 'revoked' && doc.revocation_reason && (
                      <p className="text-red-600"><span className="font-medium">Alasan dicabut:</span> {doc.revocation_reason}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link
                  to={`/verify/${doc.verification_id}`}
                  className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Verify Page
                </Link>
                <button
                  onClick={() => handleDownload(doc)}
                  className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>

            </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
