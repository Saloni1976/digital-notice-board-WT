import { useEffect, useState, useCallback } from 'react';
const K = 'nb_token';
export const getToken = () => localStorage.getItem(K);
export const setToken = t => (t ? localStorage.setItem(K, t) : localStorage.removeItem(K));
export async function api(url, o = {}) {
  const h = { ...(o.headers || {}) }; let body = o.body;
  if (getToken()) h.Authorization = 'Bearer ' + getToken();
  if (body && !(body instanceof FormData)) { h['Content-Type'] = 'application/json'; body = JSON.stringify(body); }
  const r = await fetch('/api' + url, { ...o, headers: h, body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { if (r.status === 401 && getToken()) { setToken(null); location.hash = '#/admin'; } throw new Error(j.errors?.join(', ') || j.error || 'Request failed'); }
  return j;
}
// Fetches data now and again every 5 seconds -> live updates without page refresh.
export function useLive(url, ms = 5000) {
  const [data, setData] = useState(null);
  const load = useCallback(() => api(url).then(setData).catch(() => {}), [url]);
  useEffect(() => { setData(null); load(); const t = setInterval(load, ms); return () => clearInterval(t); }, [load, ms]);
  return [data, load];
}
export const fmt = d => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-');
export const fmtDay = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
