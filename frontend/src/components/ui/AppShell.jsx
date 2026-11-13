import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  FileText,
  FilePlus,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ClipboardList,
  UserCheck,
} from 'lucide-react';
import BrandLogo from '../BrandLogo';
import api from '../../services/api';

const ADMIN_NAVIGATION = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, exact: true },
  { name: 'Mahasiswa', href: '/admin/students', icon: Users },
  { name: 'Permintaan Transkrip', href: '/admin/transcript-requests', icon: ClipboardList, hasBadge: true },
  { name: 'Dokumen', href: '/admin/documents', icon: FileText },
  { name: 'Terbitkan Dokumen', href: '/admin/issue', icon: FilePlus },
];

const STUDENT_NAVIGATION = [
  { name: 'Dashboard', href: '/student', icon: LayoutDashboard, exact: true },
  { name: 'Permintaan Transkrip', href: '/student/requests', icon: ClipboardList },
  { name: 'Dokumen Saya', href: '/student/documents', icon: FileText },
  { name: 'Profil dan Keamanan', href: '/student/profile', icon: UserCheck },
];

export default function AppShell({ children, navigation }) {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const isStudent = user?.role === 'student';
  const navItems = navigation || (isStudent ? STUDENT_NAVIGATION : ADMIN_NAVIGATION);
  const portalTitle = isStudent ? 'Portal Mahasiswa' : 'Admin Portal';
  const homeLink = isStudent ? '/student' : '/admin';

  // Ambil jumlah pending requests untuk admin
  useEffect(() => {
    if (!isStudent && user) {
      api.get('/admin/transcript-requests/pending-count')
        .then((res) => setPendingCount(res.data.count || 0))
        .catch(() => {});
    }
  }, [isStudent, user, location.pathname]);

  const isItemActive = (item) => {
    if (item.exact) {
      return location.pathname === item.href || location.pathname === `${item.href}/`;
    }
    return location.pathname.startsWith(item.href);
  };

  const navContent = (
    <div className="flex flex-col h-full bg-[#0B0F33] text-white select-none">
      {/* Brand Header */}
      <div className="h-20 flex items-center px-6 border-b border-white/10 shrink-0">
        <Link to={homeLink} className="flex items-center gap-3.5 group" onClick={() => setMobileOpen(false)}>
          <BrandLogo className="h-10 w-auto object-contain shrink-0" />
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-lg tracking-tight text-white group-hover:text-slate-100 transition-colors">
              BlockCertify
            </span>
            <span className="text-[11px] text-slate-300 font-medium tracking-wider uppercase">
              {portalTitle}
            </span>
          </div>
        </Link>
      </div>

      {/* Nav Items */}
      <div className="flex-1 py-6 px-3.5 space-y-1.5 overflow-y-auto">
        <p className="px-3 pb-2 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
          MENU UTAMA
        </p>
        {navItems.map((item) => {
          const active = isItemActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B3FA8] ${
                active
                  ? 'bg-[#1E2A78] text-white font-semibold shadow-sm'
                  : 'text-[#E2E8F0] font-medium hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-[#CBD5E1]'}`} />
                <span>{item.name}</span>
              </div>
              {item.hasBadge && pendingCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-slate-950">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}

        <div className="pt-6">
          <p className="px-3 pb-2 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
            TAUTAN CEPAT
          </p>
          <Link
            to="/verify"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-[#E2E8F0] hover:text-white hover:bg-white/[0.08] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B3FA8]"
          >
            <ShieldCheck className="w-4 h-4 text-[#CBD5E1]" />
            <span>Verifikasi Publik</span>
          </Link>
        </div>
      </div>

      {/* User Profile & Logout */}
      <div className="p-4 border-t border-white/10 shrink-0 bg-[#0B0F33]">
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          <div className="w-9 h-9 rounded-full bg-[#1E2A78] flex items-center justify-center text-white font-bold text-sm border border-[#CBD5E1]/30 shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() || (isStudent ? 'M' : 'A')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {user?.name || (isStudent ? 'Mahasiswa' : 'Administrator')}
            </p>
            <p className="text-xs text-[#94A3B8] truncate">
              {user?.student?.student_id_number ? `NIM: ${user.student.student_id_number}` : (user?.email || '')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-[#FCA5A5] bg-[#151B54] border border-[#334155] rounded-lg hover:bg-[#B91C1C] hover:text-white hover:border-transparent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B3FA8]"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F6F7FB] overflow-hidden">
      {/* Desktop Sidebar (w-64 = 256px) */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col shrink-0 border-r border-[#E3E6F0]">
        {navContent}
      </aside>

      {/* Mobile Sidebar Drawer (< lg) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 bg-[#0B0F33]/70 backdrop-blur-sm transition-opacity"
          />
          <div className="relative w-64 max-w-xs flex-1 flex flex-col z-50">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-2 text-white hover:bg-white/[0.1] rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Tutup menu"
            >
              <X className="w-5 h-5" />
            </button>
            {navContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Topbar (< lg) */}
        <header className="lg:hidden h-16 bg-white border-b border-[#E3E6F0] flex items-center justify-between px-4 shrink-0 z-10">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#E6EAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B3FA8]"
            aria-label="Buka menu navigasi"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <BrandLogo className="h-8 w-auto object-contain" />
            <span className="font-bold text-base text-[#151B54]">BlockCertify</span>
          </div>
          <div className="w-8" />
        </header>

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto focus:outline-none p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
