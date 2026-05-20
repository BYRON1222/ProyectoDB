import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const res = await api.get('/metrics/summary');
      setSummary(res.data);
    } catch (error) {
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const s = {
    page: { minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'Segoe UI, sans-serif' },
    nav: { background: '#161b22', borderBottom: '1px solid #30363d', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    main: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
    card: (color) => ({ background: '#161b22', border: `1px solid ${color}44`, borderLeft: `4px solid ${color}`, borderRadius: '12px', padding: '20px' }),
    num: (color) => ({ fontSize: '40px', fontWeight: 'bold', color, margin: '8px 0' }),
    label: { color: '#8b949e', fontSize: '14px' },
    btn: (bg) => ({ background: bg, border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }),
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '8px' },
    th: { color: '#8b949e', padding: '10px 8px', textAlign: 'left', fontSize: '13px', borderBottom: '1px solid #30363d' },
    td: { padding: '10px 8px', borderBottom: '1px solid #21262d', fontSize: '14px' },
    badge: (c) => ({ background: `${c}22`, color: c, padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' })
  };

  if (loading) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8b949e', fontSize: '18px' }}>⏳ Cargando...</p>
    </div>
  );

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <span style={{ color: '#58a6ff', fontWeight: 'bold', fontSize: '18px' }}>🖥️ DataOps Control Center</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            ['📊 Dashboard', '/dashboard'],
            ['🔌 Conexiones', '/connections'],
            ['📈 Métricas', '/metrics'],
            ['🔍 Queries', '/queries'],
            ['💾 Backups', '/backups'],
            ['🔔 Alertas', '/alerts'],
          ].map(([label, path]) => (
            <button key={path} onClick={() => navigate(path)}
              style={s.btn(location.pathname === path ? '#1f6feb' : '#21262d')}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ color: '#8b949e', fontSize: '14px' }}>👤 {user.username}</span>
          <button onClick={handleLogout} style={s.btn('#da3633')}>Salir</button>
        </div>
      </nav>

      <main style={s.main}>
        <h2 style={{ marginBottom: '24px' }}>Panel de Control</h2>

        <div style={s.grid}>
          <div style={s.card('#3fb950')}>
            <div style={s.label}>Bases Healthy</div>
            <div style={s.num('#3fb950')}>{summary?.healthy || 0}</div>
            <div style={s.label}>de {summary?.total || 0} totales</div>
          </div>
          <div style={s.card('#d29922')}>
            <div style={s.label}>En Warning</div>
            <div style={s.num('#d29922')}>{summary?.warning || 0}</div>
            <div style={s.label}>requieren atención</div>
          </div>
          <div style={s.card('#f85149')}>
            <div style={s.label}>Críticas</div>
            <div style={s.num('#f85149')}>{summary?.critical || 0}</div>
            <div style={s.label}>acción inmediata</div>
          </div>
          <div style={s.card('#58a6ff')}>
            <div style={s.label}>Total BDs</div>
            <div style={s.num('#58a6ff')}>{summary?.total || 0}</div>
            <div style={s.label}>registradas</div>
          </div>
        </div>

        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ marginBottom: '16px', borderBottom: '1px solid #30363d', paddingBottom: '8px' }}>
            🗄️ Estado de Bases de Datos
          </h3>
          <table style={s.table}>
            <thead>
              <tr>
                {['Nombre', 'Motor', 'Host', 'CPU %', 'RAM %', 'Conexiones', 'Estado'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary?.databases?.map(db => (
                <tr key={db.id}>
                  <td style={s.td}>{db.nombre}</td>
                  <td style={s.td}><span style={s.badge('#58a6ff')}>{db.motor}</span></td>
                  <td style={{ ...s.td, color: '#8b949e' }}>{db.host}</td>
                  <td style={{ ...s.td, color: parseFloat(db.cpu) > 85 ? '#f85149' : '#e6edf3' }}>
                    {parseFloat(db.cpu || 0).toFixed(1)}%
                  </td>
                  <td style={{ ...s.td, color: parseFloat(db.memory) > 90 ? '#f85149' : '#e6edf3' }}>
                    {parseFloat(db.memory || 0).toFixed(1)}%
                  </td>
                  <td style={s.td}>{db.connections_count || 0}</td>
                  <td style={s.td}>
                    <span style={s.badge(
                      db.health_status === 'HEALTHY' ? '#3fb950' :
                      db.health_status === 'WARNING' ? '#d29922' : '#f85149'
                    )}>{db.health_status || 'N/A'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}