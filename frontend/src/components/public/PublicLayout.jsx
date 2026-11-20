import UnibHeader from './UnibHeader';
import UnibFooter from './UnibFooter';

// Kerangka halaman publik (beranda, pemeriksaan dokumen): navbar UNIB + footer UNIB
export default function PublicLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-pub-ink antialiased">
      <UnibHeader />
      <main className="flex-1">{children}</main>
      <UnibFooter />
    </div>
  );
}
