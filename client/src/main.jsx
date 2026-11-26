import React, { useEffect, useState } from 'react'; import { createRoot } from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css'; import 'bootstrap-icons/font/bootstrap-icons.css'; import './styles.css';
import Public from './Public.jsx'; import Admin from './Admin.jsx';
function App() {
  const [h, setH] = useState(location.hash);
  useEffect(() => { const f = () => setH(location.hash); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return h.startsWith('#/admin') ? <Admin /> : <Public />;
}
createRoot(document.getElementById('root')).render(<App />);
