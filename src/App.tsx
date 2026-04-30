import { useEffect, useState } from 'react';
import PublicPortfolioPage from '@/src/pages/PublicPortfolioPage';
import AdminPage from '@/src/pages/AdminPage';

export default function App() {
  const [routeKey, setRouteKey] = useState(() => `${window.location.pathname}${window.location.hash}`);

  useEffect(() => {
    const onRouteChange = () => setRouteKey(`${window.location.pathname}${window.location.hash}`);
    window.addEventListener('hashchange', onRouteChange);
    window.addEventListener('popstate', onRouteChange);
    return () => {
      window.removeEventListener('hashchange', onRouteChange);
      window.removeEventListener('popstate', onRouteChange);
    };
  }, []);

  const [pathnamePart, hashPart = ''] = routeKey.split('#');
  const pathname = pathnamePart.replace(/\/+$/, '') || '/';
  const trimmedHash = hashPart.trim();
  const hash = trimmedHash ? (trimmedHash.startsWith('/') ? trimmedHash : `/${trimmedHash}`) : '';
  const isAdminByHash = hash === '/admin';
  const isAdminByPath = pathname === '/admin' || pathname.endsWith('/admin');
  if (isAdminByHash || isAdminByPath) return <AdminPage />;
  return <PublicPortfolioPage />;
}
