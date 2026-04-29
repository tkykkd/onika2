import PublicPortfolioPage from '@/src/pages/PublicPortfolioPage';
import AdminPage from '@/src/pages/AdminPage';

export default function App() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  if (pathname === '/admin') return <AdminPage />;
  return <PublicPortfolioPage />;
}
