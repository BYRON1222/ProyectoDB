import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Metrics() {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [s, h] = await Promise.all([
        api.get('/metrics/summary'),
        api.get('/metrics/1/history?limit=20')
      ]);
      setSummary(s.data);
      setHistory(h.data.reverse().map((m, i) => ({
        time: i + 1,
        cpu: parseFloat(m.cpu),
        memory: parseFloat(m.memory),
        connections: m.connections_count,
        locks: m.locks
      })));
    } catch {
      toast.error('Error cargando métricas');
    } finally {
      setLoading(false);
    }
  };

  const s = {
    page: { minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'Segoe UI, sans-serif' },
    nav: { background: '#161b22', borderBottom: '1px solid #30363d', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    main: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
    btn: (bg) => ({ background: bg, border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }),
    card: { background: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '20px', marginBottom: '24px' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' },
    grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
    statCard: (color) => ({ background: '#161b22', border: `1px solid ${color}44`, borderLeft: `4px solid ${color}`, borderRadius: '12px', padding: '20px' }),
    num: (color) => ({ fontSize: '32px', fontWeight: 'bold', color, margin: '8px 0' }),
    label: { color: '#8b949e', fontSize: '13px' },
    badge: (c) => ({ background: `${c}22`, color: c, padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }),
    title: { color: '#e6edf3', fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '1px solid #30363d', paddingBottom: '8px' }
  };

  if (loading) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8b949e' }}>⏳ Cargando métricas...</p>
    </div>
  );

  const db = summary?.databases?.[0];

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
          <h2>📈 Métricas en Tiempo Real</h2>
          <button onClick={loadData} style={s.btn('#1f6feb')}>🔄 Actualizar</button>
        </div>

        {/* KPIs actuales */}
        <div style={s.grid4}>
          {[
            { label: 'CPU', value: `${parseFloat(db?.cpu || 0).toFixed(1)}%`, color: parseFloat(db?.cpu) > 85 ? '#f85149' : parseFloat(db?.cpu) > 70 ? '#d29922' : '#3fb950' },
            { label: 'Memoria RAM', value: `${parseFloat(db?.memory || 0).toFixed(1)}%`, color: parseFloat(db?.memory) > 90 ? '#f85149' : parseFloat(db?.memory) > 75 ? '#d29922' : '#3fb950' },
            { label: 'Conexiones', value: db?.connections_count || 0, color: '#58a6ff' },
            { label: 'Bloqueos', value: db?.locks || 0, color: (db?.locks || 0) > 5 ? '#f85149' : '#3fb950' },
          ].map(item => (
            <div key={item.label} style={s.statCard(item.color)}>
              <div style={s.label}>{item.label}</div>
              <div style={s.num(item.color)}>{item.value}</div>
              <div style={s.label}>
                <span style={s.badge(
                  db?.health_status === 'HEALTHY' ? '#3fb950' :
                  db?.health_status === 'WARNING' ? '#d29922' : '#f85149'
                )}>{db?.health_status || 'N/A'}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Gráfica CPU */}
        <div style={s.card}>
          <div style={s.title}>📊 Historial CPU % (últimas 20 capturas)</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis dataKey="time" stroke="#8b949e" />
              <YAxis stroke="#8b949e" domain={[0, 100]} />
              <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', color: '#e6edf3' }} />
              <Line type="monotone" dataKey="cpu" stroke="#f85149" strokeWidth={2} dot={false} name="CPU %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfica RAM */}
        <div style={s.card}>
          <div style={s.title}>🧠 Historial RAM % (últimas 20 capturas)</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis dataKey="time" stroke="#8b949e" />
              <YAxis stroke="#8b949e" domain={[0, 100]} />
              <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', color: '#e6edf3' }} />
              <Line type="monotone" dataKey="memory" stroke="#58a6ff" strokeWidth={2} dot={false} name="RAM %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfica Conexiones */}
        <div style={s.card}>
          <div style={s.title}>🔗 Historial de Conexiones Activas</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis dataKey="time" stroke="#8b949e" />
              <YAxis stroke="#8b949e" />
              <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', color: '#e6edf3' }} />
              <Line type="monotone" dataKey="connections" stroke="#3fb950" strokeWidth={2} dot={false} name="Conexiones" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tabla de BDs */}
        <div style={s.card}>
          <div style={s.title}>🗄️ Estado Actual de Todas las Bases</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Nombre', 'Motor', 'CPU %', 'RAM %', 'Conexiones', 'Deadlocks', 'Disco MB', 'Estado', 'Última captura'].map(h => (
                  <th key={h} style={{ color: '#8b949e', padding: '10px 8px', textAlign: 'left', fontSize: '13px', borderBottom: '1px solid #30363d' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary?.databases?.map(db => (
                <tr key={db.id}>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #21262d' }}>{db.nombre}</td>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #21262d' }}><span style={s.badge('#58a6ff')}>{db.motor}</span></td>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #21262d', color: parseFloat(db.cpu) > 85 ? '#f85149' : '#e6edf3' }}>{parseFloat(db.cpu || 0).toFixed(1)}%</td>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #21262d', color: parseFloat(db.memory) > 90 ? '#f85149' : '#e6edf3' }}>{parseFloat(db.memory || 0).toFixed(1)}%</td>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #21262d' }}>{db.connections_count || 0}</td>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #21262d', color: db.deadlocks > 3 ? '#f85149' : '#e6edf3' }}>{db.deadlocks || 0}</td>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #21262d' }}>{parseFloat(db.disk_usage || 0).toFixed(0)}</td>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #21262d' }}>
                    <span style={s.badge(db.health_status === 'HEALTHY' ? '#3fb950' : db.health_status === 'WARNING' ? '#d29922' : '#f85149')}>
                      {db.health_status || 'N/A'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', borderBottom: '1px solid #21262d', color: '#8b949e', fontSize: '12px' }}>
                    {db.capture_time ? new Date(db.capture_time).toLocaleTimeString() : 'N/A'}
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