import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import api from '../services/api';
import { Loader2, PlusCircle, CheckCircle, Upload, ScanLine, Copy } from 'lucide-react';

const DashboardHome = () => {
  const [stats, setStats] = useState({ docs: 0, students: 0, revoked: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [docsRes, studentsRes] = await Promise.all([
          api.get('/documents'),
          api.get('/students')
        ]);
        
        const docs = docsRes.data.documents || [];
        const students = studentsRes.data.students || [];
        const revoked = docs.filter(d => d.status === 'revoked').length;
        
        setStats({ docs: docs.length, students: students.length, revoked });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="p-8"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 mb-1">Total Documents</h3>
          <p className="text-3xl font-bold text-slate-900">{stats.docs}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 mb-1">Total Students</h3>
          <p className="text-3xl font-bold text-slate-900">{stats.students}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm border-l-4 border-l-red-500">
          <h3 className="text-sm font-medium text-slate-500 mb-1">Revoked</h3>
          <p className="text-3xl font-bold text-red-600">{stats.revoked}</p>
        </div>
      </div>
    </div>
  );
};

const StudentsManager = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Add student form state
  const [formData, setFormData] = useState({
    fullName: '', studentIdNumber: '', email: '', password: '', faculty: '', program: '', graduationYear: ''
  });

  const fetchStudents = async () => {
    try {
      const res = await api.get('/students');
      setStudents(res.data.students);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudents(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/students', formData);
      alert('Student created successfully!');
      setFormData({ fullName: '', studentIdNumber: '', email: '', password: '', faculty: '', program: '', graduationYear: '' });
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create student');
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Manage Students</h1>
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><PlusCircle className="w-5 h-5" /> Add Student</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" placeholder="Full Name" required value={formData.fullName} onChange={e=>setFormData({...formData, fullName: e.target.value})} className="w-full p-2 border rounded" />
            <input type="text" placeholder="Student ID (NIM)" required value={formData.studentIdNumber} onChange={e=>setFormData({...formData, studentIdNumber: e.target.value})} className="w-full p-2 border rounded" />
            <input type="email" placeholder="Email" required value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="w-full p-2 border rounded" />
            <input type="password" placeholder="Password for Login" required value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} className="w-full p-2 border rounded" />
            <input type="text" placeholder="Faculty" required value={formData.faculty} onChange={e=>setFormData({...formData, faculty: e.target.value})} className="w-full p-2 border rounded" />
            <input type="text" placeholder="Program" value={formData.program} onChange={e=>setFormData({...formData, program: e.target.value})} className="w-full p-2 border rounded" />
            <input type="number" placeholder="Graduation Year" value={formData.graduationYear} onChange={e=>setFormData({...formData, graduationYear: e.target.value})} className="w-full p-2 border rounded" />
            <button type="submit" className="w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700">Add Student</button>
          </form>
        </div>
        
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase">
                <tr>
                  <th className="px-6 py-3">NIM</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Faculty</th>
                  <th className="px-6 py-3">Email</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium">{s.student_id_number}</td>
                    <td className="px-6 py-4">{s.full_name}</td>
                    <td className="px-6 py-4">{s.faculty}</td>
                    <td className="px-6 py-4">{s.email}</td>
                  </tr>
                ))}
                {students.length === 0 && !loading && (
                  <tr><td colSpan="4" className="px-6 py-4 text-center">No students found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const IssueDocument = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [formData, setFormData] = useState({ studentId: '', docType: 'ijazah', docTitle: '' });
  const [file, setFile] = useState(null);

  // State untuk data konten transkrip
  const [transcriptData, setTranscriptData] = useState({
    totalSks: '',
    ipk: '',
    tahunMasuk: '',
    courses: [{ kodeMk: '', namaMk: '', sks: '', nilai: '', semester: '' }]
  });

  useEffect(() => {
    api.get('/students').then(res => setStudents(res.data.students)).catch(console.error);
  }, []);

  const addCourse = () => {
    setTranscriptData(prev => ({
      ...prev,
      courses: [...prev.courses, { kodeMk: '', namaMk: '', sks: '', nilai: '', semester: '' }]
    }));
  };

  const removeCourse = (index) => {
    setTranscriptData(prev => ({
      ...prev,
      courses: prev.courses.filter((_, i) => i !== index)
    }));
  };

  const updateCourse = (index, field, value) => {
    setTranscriptData(prev => ({
      ...prev,
      courses: prev.courses.map((c, i) => i === index ? { ...c, [field]: value } : c)
    }));
  };

  const handleScan = async () => {
    if (!file) return alert("Please select a file to scan first");
    
    setScanning(true);
    const data = new FormData();
    data.append('document', file);

    try {
      const res = await api.post('/documents/scan', data, { 
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const { totalSks, ipk, tahunMasuk, courses } = res.data.data;
      
      setTranscriptData({
        totalSks: totalSks || '',
        ipk: ipk || '',
        tahunMasuk: tahunMasuk || '',
        courses: courses && courses.length > 0 ? courses : [{ kodeMk: '', namaMk: '', sks: '', nilai: '', semester: '' }]
      });

      alert('Scan berhasil! Silakan periksa kembali data di bawah.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to scan document');
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a file to upload");
    
    setLoading(true);
    const data = new FormData();
    data.append('studentId', formData.studentId);
    data.append('docType', formData.docType);
    data.append('docTitle', formData.docTitle);
    data.append('document', file);

    // Jika tipe transkrip, sertakan data konten transkrip
    if (formData.docType === 'transkrip') {
      data.append('transcriptData', JSON.stringify(transcriptData));
    }

    try {
      const res = await api.post('/documents/issue', data, { headers: { 'Content-Type': 'multipart/form-data' }});
      alert(`Success! Issued to Blockchain.\nVerification ID: ${res.data.verificationId}\nTX: ${res.data.txHash}`);
      setFormData({ studentId: '', docType: 'ijazah', docTitle: '' });
      setFile(null);
      setTranscriptData({
        totalSks: '', ipk: '', tahunMasuk: '',
        courses: [{ kodeMk: '', namaMk: '', sks: '', nilai: '', semester: '' }]
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to issue document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Upload className="text-indigo-600" />
        Issue New Document to Blockchain
      </h1>
      
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">Select Student</label>
            <select required value={formData.studentId} onChange={e=>setFormData({...formData, studentId: e.target.value})} className="w-full p-2 border rounded">
              <option value="">-- Choose Student --</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.student_id_number} - {s.full_name}</option>)}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Document Type</label>
              <select value={formData.docType} onChange={e=>setFormData({...formData, docType: e.target.value})} className="w-full p-2 border rounded">
                <option value="ijazah">Ijazah</option>
                <option value="transkrip">Transkrip</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Document Title</label>
              <input type="text" required placeholder="e.g. Ijazah Sarjana" value={formData.docTitle} onChange={e=>setFormData({...formData, docTitle: e.target.value})} className="w-full p-2 border rounded" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Upload PDF / Image File</label>
            <div className="flex gap-3">
              <input type="file" accept=".pdf,image/*" required onChange={e=>setFile(e.target.files[0])} className="flex-1 p-2 border rounded bg-slate-50" />
              {formData.docType === 'transkrip' && (
                <button 
                  type="button" 
                  onClick={handleScan}
                  disabled={scanning || !file}
                  className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded font-semibold hover:bg-indigo-200 disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                  {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
                  {scanning ? 'Scanning...' : 'Scan File'}
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">This file will be hashed (SHA-256) and the hash will be stored on the blockchain.</p>
          </div>

          {/* Form Data Transkrip — hanya muncul jika docType = transkrip */}
          {formData.docType === 'transkrip' && (
            <div className="border-t border-slate-200 pt-5 mt-5 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  📋 Data Konten Transkrip
                </h3>
              </div>
              <p className="text-sm text-slate-500 -mt-3">
                Data ini bisa didapat otomatis dengan klik tombol <strong>Scan File</strong> di atas. Pastikan mengecek ulang hasilnya.
              </p>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tahun Masuk</label>
                  <input type="text" placeholder="2022" value={transcriptData.tahunMasuk}
                    onChange={e => setTranscriptData({...transcriptData, tahunMasuk: e.target.value})}
                    className="w-full p-2 border rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Total SKS</label>
                  <input type="number" placeholder="144" value={transcriptData.totalSks}
                    onChange={e => setTranscriptData({...transcriptData, totalSks: e.target.value})}
                    className="w-full p-2 border rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">IPK</label>
                  <input type="number" step="0.01" placeholder="3.75" value={transcriptData.ipk}
                    onChange={e => setTranscriptData({...transcriptData, ipk: e.target.value})}
                    className="w-full p-2 border rounded text-sm" />
                </div>
              </div>

              {/* Tabel Mata Kuliah */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-slate-700">Daftar Mata Kuliah</label>
                  <button type="button" onClick={addCourse}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium px-3 py-1.5 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
                    <PlusCircle className="w-3.5 h-3.5" /> Tambah MK
                  </button>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-xs">Kode MK</th>
                        <th className="px-3 py-2 text-left font-medium text-xs">Nama Mata Kuliah</th>
                        <th className="px-3 py-2 text-left font-medium text-xs w-16">SKS</th>
                        <th className="px-3 py-2 text-left font-medium text-xs w-20">Nilai</th>
                        <th className="px-3 py-2 text-left font-medium text-xs w-20">Semester</th>
                        <th className="px-3 py-2 text-left font-medium text-xs w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {transcriptData.courses.map((course, idx) => (
                        <tr key={idx} className="border-t border-slate-100">
                          <td className="px-2 py-1.5">
                            <input type="text" placeholder="INF101" value={course.kodeMk}
                              onChange={e => updateCourse(idx, 'kodeMk', e.target.value)}
                              className="w-full p-1.5 border rounded text-xs" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="text" placeholder="Pemrograman Dasar" value={course.namaMk}
                              onChange={e => updateCourse(idx, 'namaMk', e.target.value)}
                              className="w-full p-1.5 border rounded text-xs" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" placeholder="3" value={course.sks}
                              onChange={e => updateCourse(idx, 'sks', e.target.value)}
                              className="w-full p-1.5 border rounded text-xs" />
                          </td>
                          <td className="px-2 py-1.5">
                            <select value={course.nilai}
                              onChange={e => updateCourse(idx, 'nilai', e.target.value)}
                              className="w-full p-1.5 border rounded text-xs">
                              <option value="">-</option>
                              <option value="A">A</option>
                              <option value="A-">A-</option>
                              <option value="B+">B+</option>
                              <option value="B">B</option>
                              <option value="B-">B-</option>
                              <option value="C+">C+</option>
                              <option value="C">C</option>
                              <option value="D">D</option>
                              <option value="E">E</option>
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" placeholder="1" value={course.semester}
                              onChange={e => updateCourse(idx, 'semester', e.target.value)}
                              className="w-full p-1.5 border rounded text-xs" />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {transcriptData.courses.length > 1 && (
                              <button type="button" onClick={() => removeCourse(idx)}
                                className="text-red-400 hover:text-red-600 text-lg leading-none" title="Hapus">
                                ×
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <button disabled={loading} type="submit" className="w-full bg-indigo-600 text-white p-3 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
            {loading ? 'Issuing to Blockchain...' : 'Issue Document'}
          </button>
        </form>
      </div>
    </div>
  );
};

const DocumentsManager = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/documents');
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (loading) return <div className="p-8"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Document Management</h1>
        <Link to="/admin/issue" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          Issue New Document
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-sm font-semibold text-slate-600">Document Type</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Student ID</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Status</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Verification ID</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Transaction Hash</th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">No documents found.</td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-4">
                      <div className="font-semibold text-slate-900 uppercase text-sm">{doc.doc_type}</div>
                      <div className="text-xs text-slate-500">{new Date(doc.issued_at).toLocaleDateString()}</div>
                    </td>
                    <td className="p-4 text-sm text-slate-700">{doc.student_id_number}</td>
                    <td className="p-4">
                      {doc.status === 'issued' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Valid</span>
                      ) : doc.status === 'revoked' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Revoked</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Pending</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-600 truncate max-w-[150px] block" title={doc.verification_id}>
                          {doc.verification_id}
                        </span>
                        <button onClick={() => copyToClipboard(doc.verification_id)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-600 truncate max-w-[150px] block" title={doc.tx_hash}>
                          {doc.tx_hash}
                        </span>
                        <button onClick={() => copyToClipboard(doc.tx_hash)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<DashboardHome />} />
        <Route path="/students" element={<StudentsManager />} />
        <Route path="/documents" element={<DocumentsManager />} />
        <Route path="/issue" element={<IssueDocument />} />
      </Routes>
    </AdminLayout>
  );
}
