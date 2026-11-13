import { Routes, Route } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import DashboardHome from './admin/DashboardHome';
import StudentsManager from './admin/StudentsManager';
import DocumentsManager from './admin/DocumentsManager';
import IssueDocument from './admin/IssueDocument';
import TranscriptRequestsManager from './admin/TranscriptRequestsManager';

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<DashboardHome />} />
        <Route path="/students" element={<StudentsManager />} />
        <Route path="/transcript-requests" element={<TranscriptRequestsManager />} />
        <Route path="/documents" element={<DocumentsManager />} />
        <Route path="/issue" element={<IssueDocument />} />
      </Routes>
    </AdminLayout>
  );
}
