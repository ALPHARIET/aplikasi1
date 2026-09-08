import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FileText, LogOut, Download, CheckCircle, ShieldAlert } from 'lucide-react';

export default function StudentDashboard() {
  const { logout, user } = useAuth();

  // Placeholder data
  const documents = [
    {
      id: 1,
      verificationId: 'DOC-2026-123456-ABC',
      docType: 'ijazah',
      docTitle: 'Ijazah Sarjana Komputer',
      status: 'issued',
      issuedAt: '2026-09-08T09:00:00Z',
    }
  ];

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
        
        <div className="grid gap-6">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:shadow-md transition-shadow">
              
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${doc.status === 'issued' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {doc.status === 'issued' ? <CheckCircle className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{doc.docTitle}</h3>
                  <div className="text-sm text-slate-500 mt-1 flex flex-col gap-1">
                    <p><span className="font-medium text-slate-700">Verification ID:</span> {doc.verificationId}</p>
                    <p><span className="font-medium text-slate-700">Issued Date:</span> {new Date(doc.issuedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link
                  to={`/verify/${doc.verificationId}`}
                  className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Verify Page
                </Link>
                <button
                  className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>

            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
