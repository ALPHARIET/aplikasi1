import { Routes, Route } from 'react-router-dom';
import AppShell from '../components/ui/AppShell';
import StudentHome from './student/StudentHome';
import StudentRequests from './student/StudentRequests';
import StudentDocuments from './student/StudentDocuments';
import StudentProfile from './student/StudentProfile';

export default function StudentDashboard() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<StudentHome />} />
        <Route path="/requests" element={<StudentRequests />} />
        <Route path="/documents" element={<StudentDocuments />} />
        <Route path="/profile" element={<StudentProfile />} />
      </Routes>
    </AppShell>
  );
}
