import { StrictMode } from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.addEventListener('error', (event) => {
  const root = document.getElementById('root');
  if (!root) return;
  root.innerHTML = `<div style="padding:16px;font-family:sans-serif"><h1 style="font-weight:700;margin-bottom:8px">Runtime error</h1><p>${event.message}</p></div>`;
});

window.addEventListener('unhandledrejection', (event) => {
  const root = document.getElementById('root');
  if (!root) return;
  const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
  root.innerHTML = `<div style="padding:16px;font-family:sans-serif"><h1 style="font-weight:700;margin-bottom:8px">Unhandled promise rejection</h1><p>${reason}</p></div>`;
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
