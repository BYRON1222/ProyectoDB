import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [rules, setRules] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [a, r, s] = await Promise.all([
        api.get('/alerts'),
        api.get('/alerts/rules'),
        api.get('/alerts/stats')
      ]);
      setAlerts(a.data);
      setRules(r.data);
      setStats(s.data);
    } catch {
      toast.error('Error cargando alertas');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const res = await api.post('/alerts/evaluate');
      toast.success(res.data.message);
      loadData();
    } catch {
      toast.error('Error evaluando alertas');
    } finally {
      setEvaluating(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await api.patch(`/alerts/${id}/resolve`);
      toast.success('Alerta resuelta');
      loadData();
    } catch {
      toast.error('Error resolviendo alerta');
    }
  };

  const handleToggleRule = async (rule) => {
    try {
      await api.patch(`/alerts/rules/${rule.id}`, { activa: !rule.activa });
      toast.success(`Regla ${!rule.activa ? 'activada' : 'desactivada'}`);
      loadData();
    } catch {
      toast.error('Error actualizando regla');
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

  const severityColor = (sev) => {
    if (sev === 'CRITICAL') return '#f85149';
    if (sev === 'WARNING') return '#d29922';
    return '#58a6ff';
  };

  if (loading) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#8b949e' }}>⏳ Cargando alertas...</p>
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
          <h2>🔔 Motor de Alertas</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={loadData} style={s.btn('#1f6feb')}>🔄 Actualizar</button>
            <button onClick={handleEvaluate} disabled={evaluating} style={s.btn('#238636')}>
              {evaluating ? '⏳ Evaluando...' : '⚡ Evaluar Alertas'}
            </button>
            <button onClick={() => setShowRules(!showRules)} style={s.btn('#8b949e')}>
              {showRules ? '🔔 Ver Alertas' : '⚙️ Ver Reglas'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={s.grid4}>
          {[
            { label: 'Total Alertas', value: stats?.total || 0, color: '#58a6ff' },
            { label: 'Abiertas', value: stats?.abiertas || 0, color: '#d29922' },
            { label: 'Críticas', value: stats?.criticas || 0, color: '#f85149' },
            { label: 'Resueltas', value: stats?.resueltas || 0, color: '#3fb950' },
          ].map(item => (
            <div key={item.label} style={s.statCard(item.color)}>
              <div style={s.label}>{item.label}</div>
              <div style={s.num(item.color)}>{item.value}</div>
            </div>
          ))}
        </div>

        {!showRules ? (
          /* Lista de alertas */
          <div style={s.card}>
            <div style={s.title}>🚨 Alertas Registradas</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['ID', 'Condición', 'Valor Actual', 'Severidad', 'Acción', 'Estado', 'Fecha', 'Acciones'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alerts.length === 0 ? (
                  <tr><td colSpan="8" style={{ ...s.td, textAlign: 'center', color: '#8b949e' }}>No hay alertas registradas</td></tr>
                ) : alerts.map(a => (
                  <tr key={a.id}>
                    <td style={s.td}>{a.id}</td>
                    <td style={{ ...s.td, color: '#e6edf3' }}>{a.condicion}</td>
                    <td style={{ ...s.td, color: severityColor(a.severidad), fontWeight: 'bold' }}>{a.valor_actual}</td>
                    <td style={s.td}>
                      <span style={s.badge(severityColor(a.severidad))}>{a.severidad}</span>
                    </td>
                    <td style={{ ...s.td, color: '#8b949e' }}>{a.accion_tomada}</td>
                    <td style={s.td}>
                      <span style={s.badge(
                        a.estado === 'RESOLVED' ? '#3fb950' :
                        a.estado === 'OPEN' ? '#f85149' : '#d29922'
                      )}>{a.estado}</span>
                    </td>
                    <td style={{ ...s.td, color: '#8b949e', fontSize: '12px' }}>
                      {new Date(a.created_at).toLocaleString()}
                    </td>
                    <td style={s.td}>
                      {a.estado === 'OPEN' && (
                        <button onClick={() => handleResolve(a.id)}
                          style={{ ...s.btn('#238636'), padding: '4px 10px', fontSize: '12px' }}>
                          ✅ Resolver
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Reglas de alerta */
          <div style={s.card}>
            <div style={s.title}>⚙️ Reglas de Alerta — Configurables sin Redeploy</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Nombre', 'Métrica', 'Condición', 'Umbral', 'Severidad', 'Acción', 'Estado'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map(r => (
                  <tr key={r.id}>
                    <td style={s.td}>{r.nombre}</td>
                    <td style={{ ...s.td, color: '#8b949e' }}>{r.metrica}</td>
                    <td style={s.td}>{r.operador}</td>
                    <td style={{ ...s.td, color: '#58a6ff', fontWeight: 'bold' }}>{r.umbral}</td>
                    <td style={s.td}>
                      <span style={s.badge(severityColor(r.severidad))}>{r.severidad}</span>
                    </td>
                    <td style={s.td}>{r.accion}</td>
                    <td style={s.td}>
                      <button onClick={() => handleToggleRule(r)}
                        style={s.btn(r.activa ? '#238636' : '#da3633')}>
                        {r.activa ? '✅ Activa' : '❌ Inactiva'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}