import PublicPortfolioPage from '@/src/pages/PublicPortfolioPage';
import AdminPage from '@/src/pages/AdminPage';

export default function App() {
  const hash = window.location.hash.replace(/^#/, '');
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const isAdminByHash = hash === '/admin';
  const isAdminByPath = pathname === '/admin' || pathname.endsWith('/admin');
  if (isAdminByHash || isAdminByPath) return <AdminPage />;
  return <PublicPortfolioPage />;
}
