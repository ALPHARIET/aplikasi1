import { Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import api from '../services/api';
import { Loader2, PlusCircle, CheckCircle, Upload } from 'lucide-react';

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
  const [formData, setFormData] = useState({ studentId: '', docType: 'ijazah', docTitle: '' });
  const [file, setFile] = useState(null);

  useEffect(() => {
    api.get('/students').then(res => setStudents(res.data.students)).catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a file to upload");
    
    setLoading(true);
    const data = new FormData();
    data.append('studentId', formData.studentId);
    data.append('docType', formData.docType);
    data.append('docTitle', formData.docTitle);
    data.append('document', file);

    try {
      const res = await api.post('/documents/issue', data, { headers: { 'Content-Type': 'multipart/form-data' }});
      alert(`Success! Issued to Blockchain.\nVerification ID: ${res.data.verificationId}\nTX: ${res.data.txHash}`);
      setFormData({ studentId: '', docType: 'ijazah', docTitle: '' });
      setFile(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to issue document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl">
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
            <label className="block text-sm font-medium mb-1">Upload PDF File</label>
            <input type="file" accept=".pdf,image/*" required onChange={e=>setFile(e.target.files[0])} className="w-full p-2 border rounded bg-slate-50" />
            <p className="text-xs text-slate-500 mt-1">This file will be hashed (SHA-256) and the hash will be stored on the blockchain.</p>
          </div>

          <button disabled={loading} type="submit" className="w-full bg-indigo-600 text-white p-3 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
            {loading ? 'Issuing to Blockchain...' : 'Issue Document'}
          </button>
        </form>
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
        <Route path="/issue" element={<IssueDocument />} />
      </Routes>
    </AdminLayout>
  );
}
