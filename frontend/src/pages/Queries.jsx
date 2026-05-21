import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Queries() {
  const [stats, setStats] = useState(null);
  const [topSlow, setTopSlow] = useState([]);
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [s, t, q] = await Promise.all([
        api.get('/queries/stats'),
        api.get('/queries/top-slow'),
        api.get('/queries?limit=20')
      ]);
      setStats(s.data);
      setTopSlow(t.data);
      setQueries(q.data);
    } catch {
      toast.error('Error cargando queries');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      await api.post('/queries/simulate', { db_id: 1, count: 20 });
      toast.success('20 queries simuladas correctamente');
      loadData();
    } catch {
      toast.error('Error simulando queries');
    } finally {
      setSimulating(false);
    }
  };

  const s = {
    page: { minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'Segoe UI, sans-serif' },
    nav: { background: '#161b22', borderBottom: '1px solid #30363d', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    main: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
    btn: (bg) => ({ background: bg, border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }),
    card: { background: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '20px', marginBottom: '24px' },
    grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
    statCard: (color) => ({ background: '#161b22', border: `1px solid ${color}44`, borderLeft: `4px solid ${color}`, borderRadius: '12px', padding: '20px' }),
    num: (color) => ({ fontSize: '32px', fontWeight: 'bold', color, margin: '8px 0' }),
    label: { color: '#8b949e', fontSize: '13px' },
    badge: (c) => ({ background: `${c}22`, color: c, padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }),
    title: { color: '#e6edf3', fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '1px solid #30363d', paddingBottom: '8px' },
    th: { color: '#8b949e', padding: '10px 8px', textAlign: 'left', fontSize: '13px', borderBottom: '1px solid #30363d' },
    td: { padding: '10px 8px', borderBottom: '1px solid #21262d', fontSize: '13px' }
  };

  const categoryColor = (cat) => {
    if (cat === 'CRITICAL') return '#f85149';
    if (cat === 'SLOW') return '#d29922';
    if (cat === 'MEDIUM') return '#58a6ff';
    return '#3fb950';
  };

  const chartData = stats?.by_category?.map(c => ({
    name: c.category,
    avg: c.avg_duration_ms,
    total: parseInt(c.total)
  })) || [];

  if (loading) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8b949e' }}>⏳ Cargando queries...</p>
    </div>
  );

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <span style={{ color: '#58a6ff', fontWeight: 'bold', fontSize: '18px' }}>🖥️ DataOps Control Center</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[['📊 Dashboard', '/dashboard'], ['🔌 Conexiones', '/connections'], ['📈 Métricas', '/metrics'], ['🔍 Queries', '/queries'], ['💾 Backups', '/backups'], ['🔔 Alertas', '/alerts']].map(([label, path]) => (
            <button key={path} onClick={() => navigate(path)} style={s.btn(location.pathname === path ? '#1f6feb' : '#21262d')}>{label}</button>
          ))}
        </div>
        <button onClick={() => { localStorage.clear(); navigate('/login'); }} style={s.btn('#da3633')}>Salir</button>
      </nav>

      <main style={s.main}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2>🔍 Slow Query Analyzer</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={loadData} style={s.btn('#1f6feb')}>🔄 Actualizar</button>
            <button onClick={handleSimulate} disabled={simulating} style={s.btn('#238636')}>
              {simulating ? '⏳ Simulando...' : '▶️ Simular 20 Queries'}
            </button>
          </div>
        </div>

        {/* Stats por categoría */}
        <div style={s.grid4}>
          {[
            { label: 'CRITICAL (>2000ms)', color: '#f85149', key: 'CRITICAL' },
            { label: 'SLOW (500-2000ms)', color: '#d29922', key: 'SLOW' },
            { label: 'MEDIUM (100-500ms)', color: '#58a6ff', key: 'MEDIUM' },
            { label: 'FAST (<100ms)', color: '#3fb950', key: 'FAST' },
          ].map(item => {
            const cat = stats?.by_category?.find(c => c.category === item.key);
            return (
              <div key={item.key} style={s.statCard(item.color)}>
                <div style={s.label}>{item.label}</div>
                <div style={s.num(item.color)}>{cat?.total || 0}</div>
                <div style={s.label}>Avg: {cat?.avg_duration_ms || 0}ms</div>
              </div>
            );
          })}
        </div>

        {/* Gráfica */}
        <div style={s.card}>
          <div style={s.title}>📊 Duración Promedio por Categoría (ms)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis dataKey="name" stroke="#8b949e" />
              <YAxis stroke="#8b949e" />
              <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', color: '#e6edf3' }} />
              <Bar dataKey="avg" fill="#58a6ff" name="Avg ms" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top 10 queries lentas */}
        <div style={s.card}>
          <div style={s.title}>🐢 Top 10 Queries Más Lentas</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['#', 'Query', 'Duración', 'Filas', 'Índice', 'Categoría', 'Fecha'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topSlow.map((q, i) => (
                <tr key={q.id}>
                  <td style={s.td}>{i + 1}</td>
                  <td style={{ ...s.td, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#8b949e' }}>
                    {q.query_text}
                  </td>
                  <td style={{ ...s.td, color: categoryColor(q.category), fontWeight: 'bold' }}>{q.duration_ms}ms</td>
                  <td style={s.td}>{q.rows_returned}</td>
                  <td style={s.td}>
                    <span style={s.badge(q.index_used ? '#3fb950' : '#f85149')}>
                      {q.index_used || 'Sin índice'}
                    </span>
                  </td>
                  <td style={s.td}>
                    <span style={s.badge(categoryColor(q.category))}>{q.category}</span>
                  </td>
                  <td style={{ ...s.td, color: '#8b949e', fontSize: '12px' }}>
                    {new Date(q.created_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Últimas queries */}
        <div style={s.card}>
          <div style={s.title}>📋 Últimas 20 Queries Registradas</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['ID', 'Query', 'Duración', 'Categoría', 'Fecha'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queries.map(q => (
                <tr key={q.id}>
                  <td style={s.td}>{q.id}</td>
                  <td style={{ ...s.td, maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#8b949e' }}>
                    {q.query_text}
                  </td>
                  <td style={{ ...s.td, color: categoryColor(q.category) }}>{q.duration_ms}ms</td>
                  <td style={s.td}>
                    <span style={s.badge(categoryColor(q.category))}>{q.category}</span>
                  </td>
                  <td style={{ ...s.td, color: '#8b949e', fontSize: '12px' }}>
                    {new Date(q.created_at).toLocaleTimeString()}
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
